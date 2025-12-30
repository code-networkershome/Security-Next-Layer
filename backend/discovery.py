import subprocess
import json
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DiscoveryLayer:
    """
    Level 1: Attack Surface Discovery using Katana.
    - Crawl depth: 2
    - JS parsing: enabled
    - Form discovery: enabled
    - No payloads/POST execution
    """

    def __init__(self, output_dir="results"):
        self.output_dir = output_dir
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

    def discover(self, target_url: str):
        output_file = os.path.join(self.output_dir, "endpoints.json")
        
        # Resolve katana path
        base_dir = os.path.dirname(os.path.abspath(__file__))
        katana_bin = os.path.join(base_dir, "bin", "katana")
        if not os.path.exists(katana_bin):
             katana_bin = "katana" # Fallback to path if not in local bin
        
        katana_abs_path = os.path.abspath(katana_bin)

        # Katana command configuration (STRICT MATCHING Management Requirement Step 3)
        # -d 2: Crawl depth = 2
        # -jc: JavaScript parsing ENABLED
        # -fx: Form extraction ENABLED
        # -silent: Output only results
        # -jsonl: Output in JSON lines for parsing
        cmd = [
            katana_abs_path,
            "-u", target_url,
            "-d", "2",
            "-jc",
            "-fx",
            "-silent",
            "-jsonl",
            "-o", output_file
        ]

        logger.info(f"--- DISCOVERY START ---")
        logger.info(f"Target: {target_url}")
        logger.info(f"Katana Binary: {katana_abs_path}")
        logger.info(f"Executing: {' '.join(cmd)}")
        
        try:
            # clear previous results
            if os.path.exists(output_file):
                os.remove(output_file)

            # Execution
            result = subprocess.run(cmd, check=True, capture_output=True, timeout=120)

            # Read JSONL output
            endpoints = []
            if os.path.exists(output_file):
                with open(output_file, 'r') as f:
                    for line in f:
                        if not line.strip(): continue
                        try:
                            data = json.loads(line.strip())
                            # Katana jsonl usually has 'request' object with 'endpoint' field
                            if "request" in data and "endpoint" in data["request"]:
                                url = data["request"]["endpoint"]
                                endpoints.append(url)
                            elif "url" in data:
                                endpoints.append(data["url"])
                        except json.JSONDecodeError:
                            continue
            
            # Remove duplicates
            unique_urls = list(set(endpoints))
            
            # Check for 0 URLs (Management Requirement Step 3)
            if not unique_urls:
                logger.error("CRITICAL: No attack surface discovered by Katana.")
                # Return standardized error message
                raise Exception("No attack surface discovered")

            logger.info(f"Discovery complete. Found {len(unique_urls)} unique URLs.")
            
            # Log sample of discovered endpoints (Management Requirement Step 3)
            sample_count = min(5, len(unique_urls))
            logger.info(f"Sample discovered endpoints: {unique_urls[:sample_count]}")

            # Create simple text file for Nuclei
            txt_output = os.path.join(self.output_dir, "endpoints.txt")
            with open(txt_output, 'w') as f:
                for url in unique_urls:
                    f.write(url + "\n")

            return unique_urls

        except subprocess.TimeoutExpired:
             logger.error("Katana execution timed out.")
             raise Exception("Discovery timed out")
        except subprocess.CalledProcessError as e:
            logger.error(f"Katana failed: {e.stderr.decode() if e.stderr else 'Unknown error'}")
            raise Exception(f"Discovery failed: {e.stderr.decode() if e.stderr else 'Unknown error'}")
        except FileNotFoundError:
            logger.error(f"Katana binary not found at {katana_abs_path}")
            raise Exception("Katana binary missing")

if __name__ == "__main__":
    # Test run
    discovery = DiscoveryLayer()
    # discovery.discover("https://example.com")
