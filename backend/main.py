"""
WorkZen HRMS Backend
FastAPI application with role-based access control and comprehensive error handling
"""

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from datetime import datetime, timedelta

from config import settings
from database import engine, Base, get_db
from routers import auth, employees, attendance, leave, payroll, admin

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown events"""
    # Startup
    logger.info("[v0] WorkZen HRMS Backend Starting")
    logger.info(f"[v0] Environment: {settings.environment}")
    logger.info(f"[v0] Database: {settings.database_url}")
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    logger.info("[v0] Database tables verified/created")
    
    yield
    
    # Shutdown
    logger.info("[v0] WorkZen HRMS Backend Shutting Down")

# Create FastAPI app
app = FastAPI(
    title="WorkZen HRMS API",
    description="Enterprise Human Resource Management System",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(employees.router, prefix="/api/employees", tags=["Employees"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["Attendance"])
app.include_router(leave.router, prefix="/api/leave", tags=["Leave Management"])
app.include_router(payroll.router, prefix="/api/payroll", tags=["Payroll"])
app.include_router(admin.router, prefix="/api/admin", tags=["Administration"])

@app.get("/", tags=["Health Check"])
def root():
    """Root endpoint - API status check"""
    logger.info("[v0] Health check request received")
    return {
        "status": "operational",
        "service": "WorkZen HRMS",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@app.get("/api/health", tags=["Health Check"])
def health_check(db = Depends(get_db)):
    """Detailed health check including database connectivity"""
    try:
        # Test database connection
        db.execute("SELECT 1")
        logger.info("[v0] Health check passed - database connected")
        return {
            "status": "operational",
            "database": "connected",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"[v0] Health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection failed"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
