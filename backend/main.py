import os
import time
import logging
import uuid
import json
from datetime import datetime
from fastapi import FastAPI, BackgroundTasks, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv

# Import our layers
from discovery import DiscoveryLayer
from detection import DetectionLayer
from filter import FilteringLayer
from ai_layer import AIInterpretationLayer
from auth_utils import get_current_user, User
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Add local bin directory to PATH for Katana/Nuclei
current_dir = os.path.dirname(os.path.abspath(__file__))
bin_dir = os.path.join(current_dir, "bin")
if os.path.exists(bin_dir):
    os.environ["PATH"] = bin_dir + os.pathsep + os.environ["PATH"]

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="SNL: Security Next Layer",
    description="Production-ready security scanner for fast-moving developers.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize layers
discovery_layer = DiscoveryLayer()
detection_layer = DetectionLayer()
filter_layer = FilteringLayer()
ai_layer = AIInterpretationLayer()

# Supabase Client Initialization
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") # Use Service Role for backend write-through
supabase: Client = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Supabase client initialized.")
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
else:
    logger.warning("Supabase configuration missing. Database persistence disabled.")

# -----------------
# JOB STORE (In-Memory + File Persistence)
# -----------------
HISTORY_FILE = os.path.join(current_dir, "results", "scan_history.json")
jobs: Dict[str, Dict[str, Any]] = {}

def load_history():
    """Load scan history from file"""
    global jobs
    try:
        if os.path.exists(HISTORY_FILE):
            with open(HISTORY_FILE, 'r') as f:
                jobs = json.load(f)
                logger.info(f"Loaded {len(jobs)} scans from history")
    except Exception as e:
        logger.error(f"Failed to load history: {e}")
        jobs = {}

def save_history():
    """Save scan history to file"""
    try:
        os.makedirs(os.path.dirname(HISTORY_FILE), exist_ok=True)
        with open(HISTORY_FILE, 'w') as f:
            json.dump(jobs, f, indent=2, default=str)
    except Exception as e:
        logger.error(f"Failed to save history: {e}")

# Load history on startup
load_history()

class ScanRequest(BaseModel):
    url: HttpUrl
    mode: Optional[str] = "quick"  # quick or deep

class JobCreatedResponse(BaseModel):
    scan_id: str
    message: str

class ScanSummary(BaseModel):
    target: str
    status: str
    total_endpoints: int
    raw_findings_count: int
    top_issues_count: int
    params_found: int = 0
    templates_loaded: int = 0
    requests_sent: int = 0
    duration_seconds: float

class ScanResult(BaseModel):
    summary: ScanSummary
    findings: List[dict]

class ScanJobStatus(BaseModel):
    scan_id: str
    status: str  # pending, running, completed, failed
    target: Optional[str] = None
    submitted_at: Optional[str] = None
    result: Optional[ScanResult] = None
    error: Optional[str] = None

def run_scan_job(scan_id: str, target_url: str, mode: str = "quick", user_id: str = None):
    logger.info(f"Starting job {scan_id} for {target_url} (mode: {mode})")
    jobs[scan_id]["status"] = "running"
    jobs[scan_id]["start_time"] = time.time()
    if user_id:
        jobs[scan_id]["user_id"] = user_id
    save_history()
    
    # 0. Sync Status to Supabase
    if supabase and user_id:
        try:
            supabase.table("scans").update({"status": "running"}).eq("scan_id", scan_id).execute()
        except Exception as e:
            logger.error(f"Failed to update scan status in Supabase: {e}")
    
    try:
        # 1. DISCOVER (Management Step 3)
        logger.info(f"Step 1: Discovering endpoints for {target_url}")
        endpoints = discovery_layer.discover(str(target_url))
        
        # 2. DETECT (Management Step 1)
        # discovery_layer puts output in "results/endpoints.txt"
        endpoints_file = os.path.join(current_dir, "results", "endpoints.txt")
        logger.info("Step 2: Detecting vulnerabilities")
        raw_findings, stats = detection_layer.scan(endpoints_file, mode=mode)

        # 3. Validation Check (Management Requirement Step 5 - MANDATORY)
        # If benchmark target returns 0, we must FAIL FAST.
        if "testphp.vulnweb.com" in str(target_url):
            if len(raw_findings) == 0:
                logger.error("CRITICAL: Scanner validation failed on testphp.vulnweb.com")
                raise Exception("Scanner validation failed: No findings on benchmark target.")

        # 4. DECIDE (Filter & Prioritize - Management Step 4)
        logger.info("Step 3: Filtering findings")
        prioritized = filter_layer.prioritize(raw_findings)

        # 5. EXPLAIN (AI Interpretation - Management Step 6: Explanation only)
        logger.info("Step 4: AI Interpretation")
        final_report = ai_layer.interpret(prioritized)

        duration = round(time.time() - jobs[scan_id]["start_time"], 2)

        # 6. Summary Requirements (Management Step 7)
        summary = ScanSummary(
            target=str(target_url),
            status="completed",
            total_endpoints=len(endpoints),
            raw_findings_count=len(raw_findings),
            top_issues_count=len(final_report),
            params_found=len([e for e in endpoints if "?" in e]), # Count endpoints with params
            templates_loaded=stats.get("templates_loaded", 0),
            requests_sent=stats.get("requests_sent", 0),
            duration_seconds=duration
        )

        result = ScanResult(
            summary=summary,
            findings=final_report
        )

        jobs[scan_id]["status"] = "completed"
        jobs[scan_id]["result"] = result.model_dump()
        save_history()
        logger.info(f"Job {scan_id} completed successfully. Found {len(raw_findings)} findings.")

        # 7. Sync Completion to Supabase
        if supabase and user_id:
            try:
                # Update scan record
                supabase.table("scans").update({
                    "status": "completed",
                    "completed_at": datetime.now().isoformat()
                }).eq("scan_id", scan_id).execute()
                
                # Insert results
                for f in final_report:
                    supabase.table("scan_results").insert({
                        "scan_id": scan_id,
                        "severity": f.get("severity"),
                        "title": f.get("name"),
                        "description": f.get("interpretation", {}).get("what_is_wrong"),
                        "remediation": f.get("interpretation", {}).get("how_to_fix"),
                        "raw_json": f
                    }).execute()
                logger.info(f"Synced {len(final_report)} results to Supabase.")
            except Exception as e:
                logger.error(f"Failed to sync to Supabase: {e}")

    except Exception as e:
        logger.error(f"Job {scan_id} failed: {str(e)}")
        jobs[scan_id]["status"] = "failed"
        jobs[scan_id]["error"] = str(e)
        save_history()
        
        # Sync failure to Supabase
        if supabase and user_id:
            try:
                supabase.table("scans").update({
                    "status": "failed",
                    "error_message": str(e),
                    "completed_at": datetime.now().isoformat()
                }).eq("scan_id", scan_id).execute()
            except Exception as se:
                logger.error(f"Failed to sync failure to Supabase: {se}")

@app.get("/")
async def root():
    return {"message": "SNL API v2.0 is running. POST to /scan to start."}

@app.post("/scan", response_model=JobCreatedResponse)
async def start_scan(request: ScanRequest, background_tasks: BackgroundTasks, user: User = Depends(get_current_user)):
    scan_id = str(uuid.uuid4())
    logger.info(f"User {user.id} queueing scan {scan_id} for {request.url}")
    
    jobs[scan_id] = {
        "scan_id": scan_id,
        "user_id": user.id,
        "target": str(request.url),
        "mode": request.mode or "quick",
        "status": "pending",
        "submitted_at": datetime.now().isoformat(),
        "result": None,
        "error": None
    }
    save_history()
    
    # Write to Supabase (Initial Record)
    if supabase:
        try:
            supabase.table("scans").insert({
                "scan_id": scan_id,
                "user_id": user.id,
                "target_url": str(request.url),
                "scan_mode": request.mode or "quick",
                "status": "pending"
            }).execute()
        except Exception as e:
            logger.error(f"Failed to create scan record in Supabase: {e}")

    background_tasks.add_task(run_scan_job, scan_id, request.url, request.mode or "quick", user.id)
    
    return JobCreatedResponse(
        scan_id=scan_id,
        message="Scan started successfully."
    )

@app.get("/scan/{scan_id}", response_model=ScanJobStatus)
async def get_scan_status(scan_id: str):
    if scan_id not in jobs:
        raise HTTPException(status_code=404, detail="Scan ID not found")
    
    job = jobs[scan_id]
    
    # Convert result dict back to model if it exists
    result = None
    if job.get("result"):
        result = ScanResult(**job["result"])
    
    return ScanJobStatus(
        scan_id=job["scan_id"],
        status=job["status"],
        target=job.get("target"),
        submitted_at=job.get("submitted_at"),
        result=result,
        error=job.get("error")
    )

@app.get("/scans", response_model=List[ScanJobStatus])
async def get_all_scans(user: User = Depends(get_current_user)):
    """Get scan history for current user"""
    # 1. Try Supabase first
    if supabase:
        try:
            response = supabase.table("scans").select("*").eq("user_id", user.id).order("started_at", desc=True).execute()
            db_scans = response.data
            
            history = []
            for s in db_scans:
                # Find in-memory job if available for real-time status
                job = jobs.get(s["scan_id"])
                
                if job:
                    result_data = None
                    if job.get("result"):
                        try:
                            result_data = ScanResult(**job["result"])
                        except: pass
                    
                    history.append(ScanJobStatus(
                        scan_id=job["scan_id"],
                        status=job["status"],
                        target=job.get("target"),
                        submitted_at=job.get("submitted_at"),
                        result=result_data,
                        error=job.get("error")
                    ))
                else:
                    # Construct from DB data
                    history.append(ScanJobStatus(
                        scan_id=s["scan_id"],
                        status=s["status"],
                        target=s["target_url"],
                        submitted_at=s.get("started_at"),
                        result=None, 
                        error=s.get("error_message")
                    ))
            return history
        except Exception as e:
            logger.error(f"Supabase history fetch failed: {e}")

    # 2. Fallback to JSON (Filtered by user_id)
    result = []
    for scan_id, job in jobs.items():
        if job.get("user_id") != user.id:
            continue
            
        scan_result = None
        if job.get("result"):
            try:
                scan_result = ScanResult(**job["result"])
            except:
                pass
        
        result.append(ScanJobStatus(
            scan_id=job["scan_id"],
            status=job["status"],
            target=job.get("target"),
            submitted_at=job.get("submitted_at"),
            result=scan_result,
            error=job.get("error")
        ))
    
    # Sort by submitted_at descending (newest first)
    result.sort(key=lambda x: x.submitted_at or "", reverse=True)
    return result

@app.delete("/scan/{scan_id}")
async def delete_scan(scan_id: str, user: User = Depends(get_current_user)):
    """Delete a scan from history (user must own it)"""
    if scan_id not in jobs:
        # Check DB if not in memory
        if supabase:
            try:
                check = supabase.table("scans").select("user_id").eq("scan_id", scan_id).execute()
                if not check.data or check.data[0]["user_id"] != user.id:
                    raise HTTPException(status_code=403, detail="Not authorized to delete this scan")
                supabase.table("scans").delete().eq("scan_id", scan_id).execute()
                return {"message": "Scan deleted successfully", "scan_id": scan_id}
            except Exception as e:
                logger.error(f"Failed to delete from Supabase: {e}")
        
        raise HTTPException(status_code=404, detail="Scan ID not found")
    
    if jobs[scan_id].get("user_id") != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this scan")
    
    del jobs[scan_id]
    save_history()
    
    if supabase:
        try:
            supabase.table("scans").delete().eq("scan_id", scan_id).execute()
        except: pass
    
    return {"message": "Scan deleted successfully", "scan_id": scan_id}

@app.post("/scan/{scan_id}/cancel")
async def cancel_scan(scan_id: str, user: User = Depends(get_current_user)):
    """Cancel a running scan (user must own it)"""
    if scan_id not in jobs:
        raise HTTPException(status_code=404, detail="Scan ID not found")
    
    job = jobs[scan_id]
    if job.get("user_id") != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this scan")

    if job["status"] in ["pending", "running"]:
        job["status"] = "cancelled"
        job["error"] = "Scan was cancelled by user"
        save_history()
        
        if supabase:
            try:
                supabase.table("scans").update({
                    "status": "cancelled",
                    "error_message": "Scan was cancelled by user",
                    "completed_at": datetime.now().isoformat()
                }).eq("scan_id", scan_id).execute()
            except: pass
            
        logger.info(f"Scan {scan_id} cancelled by user {user.id}")
        return {"message": "Scan cancelled successfully", "scan_id": scan_id}
    else:
        return {"message": f"Scan already {job['status']}", "scan_id": scan_id}

if __name__ == "__main__":
    import uvicorn
    # Check for API key
    if not os.getenv("OPENAI_API_KEY"):
        logger.warning("OPENAI_API_KEY not found. AI Interpretation will fail.")

    uvicorn.run(app, host="0.0.0.0", port=8000)
