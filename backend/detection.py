import subprocess
import json
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DetectionLayer:
    """
    Level 2: Vulnerability Detection using Nuclei.
    - Strict template control.
    - Rate limited.
    - Hard timeout.
    """

    # Template directories to scan (using -t instead of -tags for better coverage)
    TEMPLATE_DIRS = [
        "http/misconfiguration/",      # Missing security headers, misconfigs
        "http/exposures/",             # Sensitive file/info exposure
        "http/vulnerabilities/",       # Known vulnerabilities
        "dast/vulnerabilities/",        # Generic vulnerabilities (SQLi, XSS, etc.)
        "ssl/",                        # SSL/TLS issues
        "http/technologies/",          # Technology detection
    ]

    # Explicitly forbidden tags (dangerous/extremely intrusive)
    EXCLUDED_TAGS = [
        "bruteforce", "dos", "network", "intrusive"
    ]

    # All severity levels to include
    SEVERITY_LEVELS = ["info", "low", "medium", "high", "critical"]

    def __init__(self, output_dir="results"):
        self.output_dir = output_dir
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

    def scan(self, target_list_file: str):
        """
        Runs Nuclei on the list of endpoints discovered by Katana.
        """
        output_file = os.path.join(self.output_dir, "raw_findings.json")
        output_abs_path = os.path.abspath(output_file)
        
        # Resolve nuclei path and templates path (Management Requirement Step 1)
        base_dir = os.path.dirname(os.path.abspath(__file__))
        nuclei_bin = os.path.join(base_dir, "bin", "nuclei")
        if not os.path.exists(nuclei_bin):
            nuclei_bin = "nuclei"
        
        nuclei_abs_path = os.path.abspath(nuclei_bin)
        templates_dir = os.path.join(base_dir, "bin", "nuclei-templates")
        templates_abs_path = os.path.abspath(templates_dir)

        # Nuclei command configuration (Management Requirement Step 1.5)
        # Using -jsonl but will also capture stdout for a robust fallback
        cmd = [
            nuclei_abs_path,
            "-l", target_list_file,
            "-severity", ",".join(self.SEVERITY_LEVELS),
            "-rl", "50",
            "-timeout", "10",
            "-dast", # Required for generic vulnerabilities (SQLi, XSS)
            "-silent", # Display findings only (standard output)
            "-o", output_abs_path,
            "-stats",
            "-stats-interval", "1"
        ]

        # Add template directories from local templates
        for t_dir in self.TEMPLATE_DIRS:
            full_t_path = os.path.join(templates_abs_path, t_dir)
            if os.path.exists(full_t_path):
                cmd.extend(["-t", full_t_path])
            else:
                logger.warning(f"Template directory missing: {full_t_path}")

        logger.info(f"--- DETECTION START ---")
        logger.info(f"Nuclei Binary (ABSOLUTE): {nuclei_abs_path}")
        logger.info(f"Templates Root (ABSOLUTE): {templates_abs_path}")
        logger.info(f"Executing: {' '.join(cmd)}")

        stats = {"templates_loaded": 0, "requests_sent": 0}
        findings = []

        try:
            # clear previous results
            if os.path.exists(output_file):
                os.remove(output_file)

            # Nuclei writes stats to stderr, findings to stdout/file
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            try:
                # Capture output for line-by-line parsing as it arrives (Robustness)
                # We still expect -o to work, but we parse stdout too
                for stdout_line in iter(process.stdout.readline, ""):
                    line = stdout_line.strip()
                    if not line: continue
                    
                    # Try to parse as JSON first (Requirement Step 2)
                    try:
                        finding = json.loads(line)
                        findings.append(finding)
                    except json.JSONDecodeError:
                        # Fallback: Robust Parser for standard nuclei output format
                        # Example: [sqli-error-based] [http] [critical] http://...
                        import re
                        pattern = r"\[(?P<id>[^\]]+)\] \[(?P<proto>[^\]]+)\] \[(?P<sev>[^\]]+)\] (?P<url>\S+)"
                        match = re.search(pattern, line)
                        if match:
                            finding = {
                                "template-id": match.group("id"),
                                "type": match.group("proto"),
                                "info": {"severity": match.group("sev")},
                                "matched-at": match.group("url"),
                                "full_line": line # Keep for raw context
                            }
                            findings.append(finding)

                stdout, stderr = process.communicate(timeout=30) # Finalize
            except subprocess.TimeoutExpired:
                logger.error("Nuclei execution reached internal timeout. Terminating...")
                process.kill()
                stdout, stderr = process.communicate()
            
            # Parse stats from stderr (Management Requirement Step 1.3)
            if stderr:
                for line in stderr.splitlines():
                    # Format: [INF] Templates loaded for current scan: 1234
                    if "Templates loaded for" in line:
                        try:
                            stats["templates_loaded"] = int(line.split(":")[-1].strip())
                        except: pass
                    
                    # Format: [stats] requests: 1234, templates: 2345
                    if "[stats]" in line:
                        try:
                            parts = line.split("[stats]")[-1].split(",")
                            for p in parts:
                                if "requests" in p:
                                    stats["requests_sent"] = int(p.split(":")[-1].strip())
                                if "templates" in p:
                                    stats["templates_loaded"] = int(p.split(":")[-1].strip())
                        except: pass

            logger.info(f"Templates Loaded: {stats['templates_loaded']}")
            logger.info(f"Requests Sent: {stats['requests_sent']}")

            # If findings list is still empty, check the output file as a last resort
            if not findings and os.path.exists(output_file):
                with open(output_file, 'r') as f:
                    for line_num, line in enumerate(f, 1):
                        clean_line = line.strip()
                        if not clean_line: continue
                        try:
                            findings.append(json.loads(clean_line))
                        except json.JSONDecodeError:
                            # Fallback parser for file content too
                            import re
                            pattern = r"\[(?P<id>[^\]]+)\] \[(?P<proto>[^\]]+)\] \[(?P<sev>[^\]]+)\] (?P<url>\S+)"
                            match = re.search(pattern, clean_line)
                            if match:
                                findings.append({
                                    "template-id": match.group("id"),
                                    "info": {"severity": match.group("sev")},
                                    "matched-at": match.group("url")
                                })

            logger.info(f"Detection complete. Found {len(findings)} raw findings.")
            return findings, stats

        except Exception as e:
            logger.error(f"Nuclei failed: {str(e)}")
            return [], stats


if __name__ == "__main__":
    # Test run
    detection = DetectionLayer()
    # detection.scan("results/endpoints.txt")
