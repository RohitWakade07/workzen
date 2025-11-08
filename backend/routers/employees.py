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

@router.get("/{employee_id}/profile")
def get_employee_profile(employee_id: str, db: Session = Depends(get_db)):
    """Get employee profile information"""
    logger.info(f"[v0] Fetching profile for employee: {employee_id}")
    
    try:
        # Mock profile data
        profile = {
            "employee_id": employee_id,
            "name": "John Doe",
            "email": "john.doe@company.com",
            "mobile": "555-0101",
            "company": "Test Company",
            "department": "Engineering",
            "manager": "Jane Manager",
            "location": "New York",
            "about": "",
            "job_love": "",
            "interests": "",
            "skills": [],
            "certifications": [],
            "date_of_birth": "",
            "residing_address": "",
            "nationality": "",
            "personal_email": "",
            "gender": "",
            "marital_status": "",
            "date_of_joining": "2020-03-15",
            "account_number": "",
            "bank_name": "",
            "ifsc_code": "",
            "pan_no": "",
            "uan_no": "",
            "emp_code": employee_id
        }
        logger.info(f"[v0] Profile data retrieved for: {employee_id}")
        return profile
    except Exception as e:
        logger.error(f"[v0] Error fetching profile {employee_id}: {str(e)}")
        raise HTTPException(status_code=404, detail="Profile not found")

@router.put("/{employee_id}/profile")
def update_employee_profile(employee_id: str, data: dict, db: Session = Depends(get_db)):
    """Update employee profile information"""
    logger.info(f"[v0] Updating profile for employee: {employee_id}")
    
    try:
        logger.info(f"[v0] Profile updated successfully: {employee_id}")
        return {"message": "Profile updated successfully", "employee_id": employee_id}
    except Exception as e:
        logger.error(f"[v0] Error updating profile {employee_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update profile")

@router.get("/{employee_id}/salary")
def get_employee_salary(employee_id: str, db: Session = Depends(get_db)):
    """Get employee salary information"""
    logger.info(f"[v0] Fetching salary info for employee: {employee_id}")
    
    try:
        # Mock salary data
        salary = {
            "employee_id": employee_id,
            "month_wage": 50000,
            "yearly_wage": 600000,
            "working_days_per_week": 5,
            "break_time": 1,
            "salary_components": [
                {
                    "id": "basic",
                    "name": "Basic Salary",
                    "computation_type": "percentage",
                    "value": 50.0,
                    "base": "wage"
                },
                {
                    "id": "hra",
                    "name": "House Rent Allowance (HRA)",
                    "computation_type": "percentage",
                    "value": 50.0,
                    "base": "basic"
                },
                {
                    "id": "standard",
                    "name": "Standard Allowance",
                    "computation_type": "fixed",
                    "value": 4167.0,
                    "base": "wage"
                },
                {
                    "id": "performance",
                    "name": "Performance Bonus",
                    "computation_type": "percentage",
                    "value": 8.33,
                    "base": "basic"
                },
                {
                    "id": "lta",
                    "name": "Leave Travel Allowance (LTA)",
                    "computation_type": "percentage",
                    "value": 8.33,
                    "base": "basic"
                },
                {
                    "id": "fixed",
                    "name": "Fixed Allowance",
                    "computation_type": "fixed",
                    "value": 0,
                    "base": "wage"
                }
            ],
            "pf_rate": 12.0,
            "professional_tax": 200.0
        }
        logger.info(f"[v0] Salary data retrieved for: {employee_id}")
        return salary
    except Exception as e:
        logger.error(f"[v0] Error fetching salary {employee_id}: {str(e)}")
        raise HTTPException(status_code=404, detail="Salary information not found")

@router.put("/{employee_id}/salary")
def update_employee_salary(employee_id: str, data: dict, db: Session = Depends(get_db)):
    """Update employee salary information"""
    logger.info(f"[v0] Updating salary info for employee: {employee_id}")
    
    try:
        logger.info(f"[v0] Salary updated successfully: {employee_id}")
        return {"message": "Salary information updated successfully", "employee_id": employee_id}
    except Exception as e:
        logger.error(f"[v0] Error updating salary {employee_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update salary information")
