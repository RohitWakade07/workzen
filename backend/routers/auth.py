"""
Authentication endpoints with role-based access control
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from typing import Optional
import logging
import hashlib

from database import get_db
from config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

class LoginRequest(BaseModel):
    email: str
    password: str

class SignupRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str  # employee, hr_officer, payroll_officer, admin

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    role: str
    expires_in: int

# Mock implementation - Replace with real database queries
USERS_DB = {
    "john.doe@company.com": {"password": "password", "role": "employee", "id": "emp_001"},
    "jane.smith@company.com": {"password": "password", "role": "hr_officer", "id": "hr_001"},
    "bob.wilson@company.com": {"password": "password", "role": "payroll_officer", "id": "payroll_001"},
    "admin@company.com": {"password": "password", "role": "admin", "id": "admin_001"}
}

@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    User login endpoint
    
    Debug: Logs all login attempts with status
    """
    logger.info(f"[v0] Login attempt for {request.email}")
    
    try:
        # Validate credentials (mock)
        if request.email not in USERS_DB:
            logger.warning(f"[v0] Login failed - user not found: {request.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        user = USERS_DB[request.email]
        if user["password"] != request.password:
            logger.warning(f"[v0] Login failed - invalid password for: {request.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Generate token (mock)
        token = hashlib.sha256(f"{request.email}{datetime.now()}".encode()).hexdigest()
        
        logger.info(f"[v0] Login successful for {request.email} - role: {user['role']}")
        
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user_id=user["id"],
            role=user["role"],
            expires_in=settings.access_token_expire_minutes * 60
        )
    except Exception as e:
        logger.error(f"[v0] Login error: {str(e)}")
        raise

@router.post("/signup", response_model=TokenResponse)
def signup(request: SignupRequest, db: Session = Depends(get_db)):
    """
    User signup endpoint
    
    Debug: Logs all signup attempts with validation results
    """
    logger.info(f"[v0] Signup attempt for {request.email} with role {request.role}")
    
    try:
        # Validate input
        if not request.email or not request.password or not request.name:
            logger.warning("[v0] Signup failed - missing required fields")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required fields"
            )
        
        # Check if user exists (mock)
        if request.email in USERS_DB:
            logger.warning(f"[v0] Signup failed - user already exists: {request.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already exists"
            )
        
        # Validate role
        valid_roles = ["employee", "hr_officer", "payroll_officer", "admin"]
        if request.role not in valid_roles:
            logger.warning(f"[v0] Signup failed - invalid role: {request.role}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
            )
        
        # Create user (mock)
        user_id = f"user_{int(datetime.now().timestamp())}"
        USERS_DB[request.email] = {
            "password": request.password,
            "role": request.role,
            "id": user_id
        }
        
        # Generate token (mock)
        token = hashlib.sha256(f"{request.email}{datetime.now()}".encode()).hexdigest()
        
        logger.info(f"[v0] Signup successful - new user created: {request.email} with role {request.role}")
        
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user_id=user_id,
            role=request.role,
            expires_in=settings.access_token_expire_minutes * 60
        )
    except Exception as e:
        logger.error(f"[v0] Signup error: {str(e)}")
        raise

@router.post("/logout")
def logout():
    """User logout endpoint"""
    logger.info("[v0] User logout request received")
    return {"message": "Logged out successfully"}

@router.get("/validate-token")
def validate_token(token: str):
    """Validate authentication token"""
    logger.info("[v0] Token validation requested")
    # Mock validation
    return {"valid": True, "expires_in": settings.access_token_expire_minutes * 60}
