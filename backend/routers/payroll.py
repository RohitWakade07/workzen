"""
Payroll management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import logging

from database import get_db

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/runs")
def list_payruns(db: Session = Depends(get_db)):
    """List all payruns"""
    logger.info("[v0] Fetching payrun list")
    
    return {
        "payruns": [
            {
                "id": "pr_202411",
                "month": "November",
                "year": 2025,
                "status": "submitted",
                "employees": 156,
                "total": 287500
            }
        ]
    }

@router.post("/runs")
def create_payrun(data: dict, db: Session = Depends(get_db)):
    """Create new payrun"""
    logger.info(f"[v0] Creating payrun for {data.get('month')} {data.get('year')}")
    
    return {
        "id": "pr_new",
        "status": "draft",
        "message": "Payrun created"
    }

@router.post("/approve/{payrun_id}")
def approve_payrun(payrun_id: str, data: dict, db: Session = Depends(get_db)):
    """Approve payrun (Admin only)"""
    logger.info(f"[v0] Approving payrun: {payrun_id}")
    logger.info(f"[v0] Approved by: {data.get('approved_by')}")
    
    return {
        "id": payrun_id,
        "status": "approved",
        "message": "Payrun approved successfully"
    }

@router.get("/{employee_id}/payslips")
def get_employee_payslips(employee_id: str, db: Session = Depends(get_db)):
    """Get employee payslips"""
    logger.info(f"[v0] Fetching payslips for employee: {employee_id}")
    
    return {
        "employee_id": employee_id,
        "payslips": []
    }
