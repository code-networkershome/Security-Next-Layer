# SNL: Security Next Layer - Project Walkthrough

Welcome! You are looking at **SNL (Security Next Layer)**, a modern, lightweight web vulnerability scanner designed for developers. Instead of overwhelming you with thousands of technical "vulnerability" alerts, SNL uses AI to tell you exactly what is wrong and how to fix it in plain English.

---

## 🏗️ Project Architecture: The 4-Layer System

The project is built as a pipeline. Every time you scan a URL, it passes through these four levels:

1.  **Level 1: Discovery (The Scout)** 🕵️‍♂️
    -   **Tool:** `Katana`
    -   **Job:** It "crawls" the website you provide, clicking links and finding all the different pages and forms (endpoints).
2.  **Level 2: Detection (The Inspector)** 🔍
    -   **Tool:** `Nuclei`
    -   **Job:** It takes the list of pages from Level 1 and checks them for common security issues like SQL Injection, Cross-Site Scripting (XSS), and missing security headers.
3.  **Level 3: Filtering (The Sorter)** 🧹
    -   **Logic:** Custom Python code.
    -   **Job:** Scanners often find "noise" (unimportant stuff). This layer ranks findings by how dangerous they are and how easy they are to fix, picking the top 10 most important ones.
4.  **Level 4: AI Interpretation (The Translator)** 🤖
    -   **Tool:** `OpenAI (GPT-4o-mini)`
    -   **Job:** It takes the technical "hacker speak" from the scanner and translates it into three simple parts: What's wrong, Why it matters, and How to fix it.

---

## 📁 Folder & File Breakdown

### 📂 `root/` (The Main Project Folder)
-   `README.md`: A quick intro and basic usage guide.
-   `setup.md`: Instructions on how to install the tools (Go, Katana, Nuclei).
-   `run.md`: Commands to start the backend and frontend.
-   `walkthrough.md`: (This file) Your guide to the project.
-   `prompt.md`: A "master instruction" to rebuild this project from scratch.

### 📂 `backend/` (The Brains - Python/FastAPI)
The backend is where all the actual security scanning logic lives.
-   `main.py`: **The Nervous System.** It connects the frontend to the scanning layers. It handles "jobs" (scans), saves history, and provides the API.
-   `discovery.py`: Handles **Level 1**. Runs `katana` to find URLs.
-   `detection.py`: Handles **Level 2**. Runs `nuclei` to find vulnerabilities.
-   `filter.py`: Handles **Level 3**. Uses a scoring system (`impact × ease_of_fix`) to prioritize issues.
-   `ai_layer.py`: Handles **Level 4**. Sends prioritized findings to OpenAI for a simple explanation.
-   `📂 bin/`: Contains the actual scanner tools (`katana`, `nuclei`) and their security templates.
-   `📂 results/`: Where the scanner stores temporary data like discovered URLs or raw scan results.
-   `.env`: Stores your secret OpenAI API key.

### 📂 `frontend/` (The Face - React/Custom CSS)
The frontend is the beautiful dashboard you see in your browser.
-   `src/App.js`: The main controller of the website. It handles state (like "is the scan running?") and layout.
-   `📂 src/components/`:
    -   `Dashboard.js`: The landing page showing quick stats.
    -   `ScanHistory.js`: A list of all past scans so you can revisit them.
    -   `ScanProgress.js`: The cool animation showing the scanner moving through the 4 levels.
    -   `Sidebar.js`: The navigation menu on the left.
    -   `ThemeToggle.js`: Switches between Dark Mode and Light Mode.
-   `src/index.css`: Contains the "Glassmorphism" design (vibrant colors, blurry backgrounds).

---

## 🚀 How it Works (The Workflow)

## �🚀 How it Works (The Workflow)

1.  **Input:** You type a URL (e.g., `https://example.com`) in the dashboard.
2.  **Request:** The React frontend (App.js) sends a POST request to the FastAPI backend (main.py).
3.  **The Job:** The backend creates a unique "Scan ID" and starts a background task.
4.  **Scanning Pipeline:**
    -   `discovery.py` finds the pages.
    -   `detection.py` checks for bugs.
    -   `filter.py` keeps the important stuff.
    -   `ai_layer.py` explains it simply.
5.  **Polling:** The frontend keeps asking the backend "Are you done yet?" every few seconds.
6.  **Results:** Once finished, the backend sends the final AI-explained report back to the frontend, which displays it with beautiful badges and animations.

---

## 🎓 Summary for Beginners
This project isn't just a "scanner"; it's a **Security Translator**. It takes complex tools used by professionals and wraps them in a friendly interface with AI to make security accessible to any developer.
