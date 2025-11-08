"""
Database configuration and session management
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import settings
import logging

logger = logging.getLogger(__name__)

# Determine if using PostgreSQL
is_postgresql = "postgresql" in settings.database_url.lower()

# Create engine with appropriate configuration
if is_postgresql:
    # PostgreSQL configuration
    logger.info(f"[v0] Creating PostgreSQL engine: {settings.database_url.split('@')[1] if '@' in settings.database_url else 'configured'}")
    engine = create_engine(
        settings.database_url,
        echo=settings.echo_sql,
        pool_pre_ping=True,  # Test connection before using
        pool_size=5,  # Number of connections to maintain
        max_overflow=10,  # Maximum number of connections beyond pool_size
        pool_recycle=3600,  # Recycle connections after 1 hour
    )
else:
    # SQLite configuration (fallback)
    logger.info(f"[v0] Creating SQLite engine: {settings.database_url[:30]}...")
    engine = create_engine(
        settings.database_url,
        echo=settings.echo_sql,
        pool_pre_ping=True,
        connect_args={"check_same_thread": False}
    )

# Create session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base model
Base = declarative_base()

def get_db():
    """Dependency for database session injection"""
    db = SessionLocal()
    try:
        logger.debug("[v0] Database session created")
        yield db
    except Exception as e:
        logger.error(f"[v0] Database session error: {str(e)}")
        db.rollback()
        raise
    finally:
        logger.debug("[v0] Database session closed")
        db.close()
