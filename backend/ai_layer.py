import os
import json
import logging
from openai import OpenAI

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AIInterpretationLayer:
    """
    Level 4: AI Interpretation Layer.
    - Uses OpenAI to translate findings.
    - Focuses on simple language and concrete fix steps.
    """

    SYSTEM_PROMPT = """
You are a senior security engineer.
Your goal is to translate raw security tool findings into plain, actionable English for developers.

RULES:
1. Use simple language. Avoid hacking jargon.
2. DO NOT use terms like "POC", "Exploit", "Payload", "CVE".
3. Focus on ONLY three things per finding:
   - "what_is_wrong": Clear one-sentence description.
   - "why_it_matters": Business/safety impact.
   - "how_to_fix": 1-2 concrete steps (code/config).
4. Return a JSON OBJECT with a key "findings" containing a list.
5. Order corresponds exactly to the input list.

Output JSON Structure:
{
  "findings": [
    {
      "what_is_wrong": "...",
      "why_it_matters": "...",
      "how_to_fix": "..."
    }
  ]
}
"""

    def __init__(self, output_dir="results"):
        self.output_dir = output_dir
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    def interpret(self, prioritized_findings):
        if not prioritized_findings:
            return []

        # Prepare a minimal version of findings to save tokens and focus AI
        minimal_findings = []
        for f in prioritized_findings:
            minimal_findings.append({
                "template-id": f.get("template-id"),
                "name": f.get("info", {}).get("name"),
                "severity": f.get("info", {}).get("severity"),
                "description": f.get("info", {}).get("description"),
                "matched-at": f.get("matched-at")
            })

        logger.info("Requesting AI interpretation from OpenAI...")
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT},
                    {"role": "user", "content": json.dumps(minimal_findings)}
                ],
                response_format={"type": "json_object"}
            )

            # Extract the interpretation
            ai_data = json.loads(response.choices[0].message.content)
            # Response is expected to be {"findings": [...]} or similar depending on AI behavior
            # We'll normalize it.
            interpretations = ai_data.get("findings") if "findings" in ai_data else list(ai_data.values())[0] if isinstance(ai_data, dict) and len(ai_data) == 1 else []

            # If the AI returns a list directly or in a different key, we handle it
            if not interpretations and isinstance(ai_data, dict):
                 # Try to find a list in the values
                 for v in ai_data.values():
                     if isinstance(v, list):
                         interpretations = v
                         break

            # Zip interpretations back to findings
            final_report = []
            for i, f in enumerate(prioritized_findings):
                interpretation = interpretations[i] if i < len(interpretations) else {
                    "what_is_wrong": f.get("info", {}).get("name"),
                    "why_it_matters": "Security risk detected.",
                    "how_to_fix": "Refer to official documentation for " + f.get("template-id")
                }

                report_item = {
                    "id": f.get("template-id"),
                    "name": f.get("info", {}).get("name"),
                    "severity": f.get("info", {}).get("severity"),
                    "url": f.get("matched-at"),
                    "interpretation": interpretation
                }
                final_report.append(report_item)

            # Save output
            output_file = os.path.join(self.output_dir, "final_report.json")
            with open(output_file, 'w') as f:
                json.dump(final_report, f, indent=2)

            logger.info("AI interpretation complete.")
            return final_report

        except Exception as e:
            logger.error(f"AI Interpretation failed: {str(e)}")
            # Return basic info if AI fails
            return [{
                "id": f.get("template-id"),
                "name": f.get("info", {}).get("name"),
                "severity": f.get("info", {}).get("severity"),
                "url": f.get("matched-at"),
                "interpretation": {
                    "what_is_wrong": "Automated finding: " + f.get("info", {}).get("name"),
                    "why_it_matters": "Security risk.",
                    "how_to_fix": "Check " + f.get("template-id")
                }
            } for f in prioritized_findings]

if __name__ == "__main__":
    # Test run
    # ai_layer = AIInterpretationLayer()
    pass
