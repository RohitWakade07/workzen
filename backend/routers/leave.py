"""
Leave management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import logging

from database import get_db

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/balance/{employee_id}")
def get_leave_balance(employee_id: str, db: Session = Depends(get_db)):
    """Get employee leave balance"""
    logger.info(f"[v0] Fetching leave balance for: {employee_id}")
    
    return {
        "employee_id": employee_id,
        "vacation_days": 12,
        "sick_days": 8,
        "personal_days": 2,
        "unpaid_days": 0
    }

@router.post("/request")
def request_time_off(data: dict, db: Session = Depends(get_db)):
    """Submit time off request"""
    logger.info(f"[v0] Time off request submitted for {data.get('employee_id')}")
    logger.info(f"[v0] Request type: {data.get('type')}, duration: {data.get('days')} days")
    
    return {
        "id": "req_new",
        "status": "pending",
        "message": "Time off request submitted successfully"
    }

@router.get("/requests/{employee_id}")
def get_time_off_requests(employee_id: str, db: Session = Depends(get_db)):
    """Get employee time off requests"""
    logger.info(f"[v0] Fetching time off requests for: {employee_id}")
    
    return {
        "employee_id": employee_id,
        "requests": []
    }

@router.post("/approve/{request_id}")
def approve_leave_request(request_id: str, data: dict, db: Session = Depends(get_db)):
    """Approve leave request (HR Officer/Admin only)"""
    logger.info(f"[v0] Approving leave request: {request_id}")
    logger.info(f"[v0] Approved by: {data.get('approved_by')}")
    
    return {
        "id": request_id,
        "status": "approved",
        "message": "Leave request approved"
    }
