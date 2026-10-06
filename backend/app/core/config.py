import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "EduPilot API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "edupilot_super_secret_jwt_key_change_in_production_2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Environment Database URLs
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    POSTGRES_URL_DEV: str = os.getenv("POSTGRES_URL_DEV", "")
    POSTGRES_URL_QA: str = os.getenv("POSTGRES_URL_QA", "")
    POSTGRES_URL_PROD: str = os.getenv("POSTGRES_URL_PROD", "")
    
    # AI Key (loaded from backend/.env via model_config env_file; never hardcoded)
    GROQ_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", "")

    model_config = SettingsConfigDict(case_sensitive=True, env_file=("backend/.env", ".env"), extra="ignore")

    @property
    def active_database_url(self) -> str:
        env = self.ENVIRONMENT.lower()
        url = ""
        
        if self.DATABASE_URL:
            url = self.DATABASE_URL
        elif env == "qa":
            url = self.POSTGRES_URL_QA
        elif env == "production":
            url = self.POSTGRES_URL_PROD
            if not url or "localhost" in url or "sqlite" in url:
                raise ValueError("CRITICAL: Production environment specified but no valid production DATABASE_URL is set!")
        else:
            url = self.POSTGRES_URL_DEV or "sqlite:///./edupilot.db"

        if not url:
            url = "sqlite:///./edupilot.db"

        # Normalize driver prefix for SQLAlchemy
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg2://", 1)
        elif url.startswith("postgresql://") and "+psycopg" not in url:
            url = url.replace("postgresql://", "postgresql+psycopg2://", 1)

        return url

settings = Settings()
