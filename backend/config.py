"""
Configuration management with environment variables and fallbacks
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
from pydantic import Field

class Settings(BaseSettings):
    """Application settings with fallback values for local development"""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",  # Ignore extra fields from environment
        case_sensitive=False  # Allow case-insensitive env vars
    )
    
    # Database
    database_url: str = Field(
        default="sqlite:///./workzen_hrms.db",
        description="Database connection URL"
    )
    echo_sql: bool = Field(default=False, description="Echo SQL queries to console")
    
    # Security
    secret_key: str = Field(
        default="dev-secret-key-change-in-production",
        description="Secret key for JWT tokens"
    )
    algorithm: str = Field(default="HS256", description="JWT algorithm")
    access_token_expire_minutes: int = Field(default=30, description="JWT token expiration in minutes")
    
    # CORS
    cors_origins: List[str] = Field(
        default=[
            "http://localhost:3000",
            "http://localhost:8000",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:8000"
        ],
        description="Allowed CORS origins"
    )
    
    # Environment
    environment: str = Field(default="development", description="Application environment")
    
    # Email (optional for local development)
    smtp_server: str = Field(default="", description="SMTP server address")
    smtp_port: int = Field(default=587, description="SMTP server port")
    smtp_user: str = Field(default="", description="SMTP username")
    smtp_password: str = Field(default="", description="SMTP password")

settings = Settings()

# Validation and logging
import logging
logger = logging.getLogger(__name__)

if settings.database_url.startswith("sqlite://"):
    logger.warning("[v0] SQLite database in use - for development/testing only")
    logger.info("[v0] For production, configure PostgreSQL via DATABASE_URL environment variable")
else:
    logger.info(f"[v0] Using PostgreSQL database: {settings.database_url.split('@')[1] if '@' in settings.database_url else 'custom'}")

if settings.secret_key == "dev-secret-key-change-in-production":
    logger.warning("[v0] Using default secret key - change SECRET_KEY in production")
