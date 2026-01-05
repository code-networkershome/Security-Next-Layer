# Rebuild Prompt: SNL (Security Next Layer)

**Role:** You are a Senior Security Engineer and Full-Stack Developer.
**Objective:** Build a production-ready, AI-powered web vulnerability scanner called "SNL: Security Next Layer".

---

### 🏛️ Project Structure
Create a project with the following hierarchy:
```text
vulnerability_scanner/
├── backend/
│   ├── main.py (FastAPI entry point)
│   ├── discovery.py (Level 1: Katana crawler)
│   ├── detection.py (Level 2: Nuclei scanner)
│   ├── filter.py (Level 3: Scoring & Prioritization)
│   ├── ai_layer.py (Level 4: OpenAI Interpretation)
│   ├── bin/ (Tool binaries & Nuclei templates)
│   └── results/ (JSON storage for scans)
├── frontend/
│   ├── src/
│   │   ├── components/ (Dashboard, History, Progress, Sidebar, ThemeToggle)
│   │   ├── App.js (Main logic)
│   │   └── index.css (Premium Glassmorphism styling)
│   └── package.json (React dependencies)
└── README.md (Usage instructions)
```

---

### ⚙️ Backend Requirements (Python/FastAPI)
1.  **Async Job Queue:** Use FastAPI `BackgroundTasks` to run scans without blocking the API. Use UUIDs for `scan_id`.
2.  **Level 1 (Discovery):** Execute `katana` via `subprocess`. Use flags `-d 2` (depth), `-jc` (JS crawl), and `-fx` (form extraction). Output to JSONL.
3.  **Level 2 (Detection):** Execute `nuclei` via `subprocess`. Use specific template directories (misconfig, exposures, vulnerabilities, dast, ssl). SEVERITY: info, low, medium, high, critical.
4.  **Level 3 (Filtering):** Implement logic to score findings using `Impact × Ease_of_fix × Confidence`. Limit results to top 10.
5.  **Level 4 (AI Interpretation):** Integrate OpenAI GPT-4o-mini. System prompt must force the AI to explain: "What is wrong", "Why it matters", and "How to fix" in plain English, avoiding jargon.
6.  **Persistence:** Save scan history to `results/scan_history.json`.

---

### 🎨 Frontend Requirements (React/Tailwind/Lucide)
1.  **Theme:** Default to a high-end Dark Mode with vibrant accent colors (indigo/violet).
2.  **UI Components:**
    -   **Glassmorphism Dashboard:** Transparent cards with blurry backgrounds and subtle borders.
    -   **Progress Animation:** A multi-step visual bar showing the 4-level pipeline as it happens.
    -   **Interactive Results:** Accordion-style cards for findings with color-coded severity badges.
    -   **History Page:** A table to view, rescan, or delete previous scan results.
3.  **UX:** Use `framer-motion` for smooth page transitions and entry animations.

---

### 🛠️ Technology Stack
-   **Backend:** FastAPI, Pydantic, Python `subprocess`, OpenAI API.
-   **Frontend:** React, Lucide-React (Icons), Framer Motion (Animations), Axios (API calls).
-   **Security Tools:** Project Discovery's `Katana` and `Nuclei`.

---

### 🚀 Execution Flow
1.  User submits URL via Frontend.
2.  Backend starts scan and returns `scan_id`.
3.  Frontend polls `/scan/{id}` for status.
4.  Backend runs 4-level pipeline: Crawl → Scan → Filter → Interpret.
5.  When status is `completed`, Frontend displays the AI-enriched report.
