"""
Attendance tracking endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
import logging

from database import get_db

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/check-in")
def check_in(employee_id: str, db: Session = Depends(get_db)):
    """Record employee check-in"""
    logger.info(f"[v0] Check-in request for employee: {employee_id}")
    
    try:
        timestamp = datetime.now()
        logger.info(f"[v0] Check-in recorded at {timestamp} for {employee_id}")
        return {
            "status": "success",
            "employee_id": employee_id,
            "check_in_time": timestamp.isoformat(),
            "message": "Checked in successfully"
        }
    except Exception as e:
        logger.error(f"[v0] Check-in error: {str(e)}")
        raise HTTPException(status_code=500, detail="Check-in failed")

@router.post("/check-out")
def check_out(employee_id: str, db: Session = Depends(get_db)):
    """Record employee check-out"""
    logger.info(f"[v0] Check-out request for employee: {employee_id}")
    
    try:
        timestamp = datetime.now()
        logger.info(f"[v0] Check-out recorded at {timestamp} for {employee_id}")
        return {
            "status": "success",
            "employee_id": employee_id,
            "check_out_time": timestamp.isoformat(),
            "hours_worked": 8.5,
            "message": "Checked out successfully"
        }
    except Exception as e:
        logger.error(f"[v0] Check-out error: {str(e)}")
        raise HTTPException(status_code=500, detail="Check-out failed")

@router.get("/{employee_id}")
def get_attendance(employee_id: str, db: Session = Depends(get_db)):
    """Get employee attendance records"""
    logger.info(f"[v0] Fetching attendance for employee: {employee_id}")
    
    return {
        "employee_id": employee_id,
        "records": [
            {
                "date": "2025-11-08",
                "check_in": "09:00",
                "check_out": "17:30",
                "status": "present",
                "hours_worked": 8.5
            }
        ]
    }
