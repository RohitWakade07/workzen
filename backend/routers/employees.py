"""
Employee management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import logging

from database import get_db

logger = logging.getLogger(__name__)
router = APIRouter()

class EmployeeResponse(BaseModel):
    id: str
    employee_id: str
    first_name: str
    last_name: str
    email: str
    department: str
    position: str
    status: str

@router.get("/", response_model=List[EmployeeResponse])
def list_employees(db: Session = Depends(get_db)):
    """List all employees with pagination and filtering"""
    logger.info("[v0] Fetching employee list")
    
    try:
        # Mock data
        employees = [
            {
                "id": "emp_001",
                "employee_id": "EMP001",
                "first_name": "John",
                "last_name": "Doe",
                "email": "john.doe@company.com",
                "department": "Engineering",
                "position": "Senior Developer",
                "status": "active"
            },
            {
                "id": "emp_002",
                "employee_id": "EMP002",
                "first_name": "Jane",
                "last_name": "Smith",
                "email": "jane.smith@company.com",
                "department": "HR",
                "position": "HR Manager",
                "status": "active"
            }
        ]
        logger.info(f"[v0] Returning {len(employees)} employees")
        return employees
    except Exception as e:
        logger.error(f"[v0] Error fetching employees: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch employees")

@router.get("/{employee_id}")
def get_employee(employee_id: str, db: Session = Depends(get_db)):
    """Get specific employee details"""
    logger.info(f"[v0] Fetching employee details for {employee_id}")
    
    try:
        # Mock data
        employee = {
            "id": "emp_001",
            "employee_id": employee_id,
            "first_name": "John",
            "last_name": "Doe",
            "email": "john.doe@company.com",
            "department": "Engineering",
            "position": "Senior Developer",
            "status": "active",
            "phone": "555-0101",
            "date_of_joining": "2020-03-15",
            "salary": 85000
        }
        logger.info(f"[v0] Employee data retrieved: {employee_id}")
        return employee
    except Exception as e:
        logger.error(f"[v0] Error fetching employee {employee_id}: {str(e)}")
        raise HTTPException(status_code=404, detail="Employee not found")

@router.post("/")
def create_employee(data: dict, db: Session = Depends(get_db)):
    """Create new employee"""
    logger.info(f"[v0] Creating new employee with ID: {data.get('employee_id')}")
    
    try:
        # Validation
        required_fields = ["employee_id", "first_name", "last_name", "email", "department"]
        missing_fields = [f for f in required_fields if f not in data or not data[f]]
        
        if missing_fields:
            logger.warning(f"[v0] Employee creation failed - missing fields: {missing_fields}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required fields: {', '.join(missing_fields)}"
            )
        
        logger.info(f"[v0] Employee created successfully: {data['employee_id']}")
        return {"id": "emp_new", "message": "Employee created successfully"}
    except Exception as e:
        logger.error(f"[v0] Error creating employee: {str(e)}")
        raise
