# Installation & Setup Guide for SNL (Security Next Layer)

This guide will help you install the mandatory tools required for the Security Next Layer system.

## 1. Install Go (Golang)
Katana and Nuclei are built in Go. You need Go installed to build them.

```bash
# Update package list
sudo apt update

# Install Go
sudo apt install -y golang-go
```

## 2. Install Katana
Katana is a next-generation crawling and spidering framework.

```bash
go install github.com/projectdiscovery/katana/cmd/katana@latest
```

## 3. Install Nuclei
Nuclei is used for template-based vulnerability scanning.

```bash
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
```

## 4. Update your PATH
After installing, the binaries are usually located in `~/go/bin`. You need to add this to your system's PATH so the SNL backend can find them.

```bash
# Add to current session
export PATH=$PATH:$(go env GOPATH)/bin

# Add to your shell profile (e.g., .bashrc or .zshrc) for persistence
echo 'export PATH=$PATH:$(go env GOPATH)/bin' >> ~/.bashrc
source ~/.bashrc
```

## 5. Verify Installation
Run these commands to ensure everything is working:

```bash
katana -version
nuclei -version
```

## 6. Python Environment
SNL requires Python 3.9+ and FastAPI.

```bash
# Create a virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn openai pydantic python-dotenv
```

## 7. Configuration
You will need an OpenAI API key for Level 4 (AI Interpretation). Create a `.env` file in the `backend/` directory:

```bash
touch backend/.env
```

Add your API key to the `.env` file:

```env
OPENAI_API_KEY=your-api-key-here
```
