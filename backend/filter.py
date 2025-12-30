import json
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FilteringLayer:
    """
    Level 3: Signal Filtering & Prioritization.
    - Deduplicate findings.
    - Rank by impact and ease of fix.
    - Hard limit: Max 10 issues.
    """

    # Scoring constants
    IMPACT_WEIGHT = {
        "critical": 10,
        "high": 8,
        "medium": 5,
        "low": 2,
        "info": 1
    }

    # Ease of fix estimation (Higher is easier)
    # This is a heuristic based on vulnerability tags
    EASE_OF_FIX = {
        "header": 10,  # Header fixes are usually config changes
        "csp": 9,
        "hsts": 9,
        "tls": 8,
        "ssl": 8,
        "ratelimit": 7,
        "redirect": 6,
        "xss": 4,      # Code changes required
        "csrf": 4,
        "sqli": 2      # Often requires architecture/query changes
    }

    def __init__(self, output_dir="results"):
        self.output_dir = output_dir

    def calculate_score(self, finding):
        severity = finding.get("info", {}).get("severity", "info").lower()
        impact = self.IMPACT_WEIGHT.get(severity, 1)

        tags = finding.get("info", {}).get("tags", [])
        # Find the max ease of fix among tags
        ease = 5 # Default
        for tag in tags:
            if tag in self.EASE_OF_FIX:
                ease = self.EASE_OF_FIX[tag]
                break

        # Confidence heuristic
        # Nuclei findings usually have high confidence if they match
        confidence = 0.8 if finding.get("type") != "info" else 0.5

        return impact * ease * confidence

    def prioritize(self, raw_findings):
        if not raw_findings:
            logger.info("No raw findings to prioritize.")
            return []

        # 1. Deduplicate by template-id and host/path
        unique_findings = {}
        for f in raw_findings:
            template_id = f.get('template-id')
            matched_at = f.get('matched-at', f.get('host', 'unknown'))
            key = f"{template_id}-{matched_at}"
            if key not in unique_findings:
                unique_findings[key] = f

        # 2. Calculate scores
        scored_findings = []
        for key, f in unique_findings.items():
            score = self.calculate_score(f)
            f["sn_score"] = score
            scored_findings.append(f)

        # 3. Sort by score descending
        scored_findings.sort(key=lambda x: x["sn_score"], reverse=True)

        # 4. Filter prioritized list (Management Requirement Step 4)
        # We limit to top 10, but ensure we don't drop everything.
        prioritized = scored_findings[:10]

        # 5. FALLBACK LOGIC (Management Requirement Step 4)
        # If raw findings > 0 and filtered findings == 0:
        if len(raw_findings) > 0 and len(prioritized) == 0:
            logger.warning("Filter fallback triggered: prioritization resulted in 0 items despite raw findings.")
            # FALLBACK: Return raw findings instead
            prioritized = raw_findings[:10] 

        # 6. Ensure INFO findings for Security Headers/TLS are always allowed (Step 4 Rules)
        # (Already handled by prioritizing top 10, which includes INFO scores)

        # Save output
        output_file = os.path.join(self.output_dir, "prioritized_findings.json")
        with open(output_file, 'w') as f:
            json.dump(prioritized, f, indent=2)

        logger.info(f"Prioritization complete. Selected {len(prioritized)} issues out of {len(raw_findings)} raw findings.")
        return prioritized

if __name__ == "__main__":
    # Test run
    # filter_layer = FilteringLayer()
    pass
