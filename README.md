# SNL: Security Next Layer

Production-ready security scanner for fast-moving developers.

## Architecture
1. **Level 1 — Discovery**: Uses Katana to crawl the attack surface (depth 2, JS enabled).
2. **Level 2 — Detection**: Uses Nuclei with strict template control (SQLi, XSS, CSRF, Headers, TLS, Rate Limiting).
3. **Level 3 — Filtering**: Custom prioritization logic ranking findings by `impact × ease_of_fix`.
4. **Level 4 — AI Interpretation**: Uses GPT-4o-mini to translate findings into plain English developer tasks.
5. **Level 5 — API**: FastAPI endpoint for easy integration.

## Usage

### 1. Install Dependencies
Follow the instructions in `setup.md`.

### 2. Run the API
```bash
export OPENAI_API_KEY='your-key'
python main.py
```

### 3. Trigger a Scan
```bash
curl -X POST "http://localhost:8000/scan" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://example.com"}'
```

The output will prioritize: **"What should the developer fix first?"**
