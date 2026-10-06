from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from app.core.config import settings

router = APIRouter(prefix="/health", tags=["System Health"])

@router.get("")
def health():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT
    }

@router.get("/db")
def db_health(db: Session = Depends(get_db)):
    try:
        # 1. Test basic connectivity & dialect
        result = db.execute(text("SELECT 1")).scalar()
        dialect_name = db.bind.dialect.name
        
        # 2. Test Transaction & Rollback safety
        db.begin_nested()
        db.execute(text("SELECT 1"))
        db.rollback()

        return {
            "status": "connected",
            "database_dialect": dialect_name,
            "transaction_test": "passed",
            "environment": settings.ENVIRONMENT,
            "is_postgresql": dialect_name == "postgresql"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection or transaction test failed: {str(e)[:100]}"
        )
