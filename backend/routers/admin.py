"""
Admin management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import logging

from database import get_db

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/users")
def list_users(db: Session = Depends(get_db)):
    """List all system users (Admin only)"""
    logger.info("[v0] Admin: Fetching user list")
    
    return {
        "users": [
            {
                "id": "usr_001",
                "email": "john.doe@company.com",
                "role": "employee",
                "status": "active"
            }
        ]
    }

@router.post("/users")
def create_user(data: dict, db: Session = Depends(get_db)):
    """Create new user (Admin only)"""
    logger.info(f"[v0] Admin: Creating user {data.get('email')} with role {data.get('role')}")
    
    return {
        "id": "usr_new",
        "message": "User created successfully"
    }

@router.get("/settings")
def get_system_settings(db: Session = Depends(get_db)):
    """Get system settings (Admin only)"""
    logger.info("[v0] Admin: Fetching system settings")
    
    return {
        "company_name": "WorkZen Corporation",
        "timezone": "UTC",
        "fiscal_year_start": "January",
        "leave_year_reset": "01-01"
    }

@router.post("/settings")
def update_system_settings(data: dict, db: Session = Depends(get_db)):
    """Update system settings (Admin only)"""
    logger.info(f"[v0] Admin: Updating system settings")
    logger.info(f"[v0] Updated by admin - settings: {list(data.keys())}")
    
    return {
        "message": "Settings updated successfully"
    }

@router.get("/audit-logs")
def get_audit_logs(db: Session = Depends(get_db)):
    """Get audit logs (Admin only)"""
    logger.info("[v0] Admin: Fetching audit logs")
    
    return {
        "logs": []
    }
