from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.api.v1.auth import router as auth_router
from app.api.v1.institutes import router as institutes_router
from app.api.v1.students import router as students_router
from app.api.v1.teachers import router as teachers_router
from app.api.v1.academics import router as academics_router
from app.api.v1.attendance import router as attendance_router
from app.api.v1.finance import router as finance_router
from app.api.v1.communication import router as communication_router
from app.api.v1.ai import router as ai_router
from app.api.v1.reports import router as reports_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(institutes_router)
api_router.include_router(students_router)
api_router.include_router(teachers_router)
api_router.include_router(academics_router)
api_router.include_router(attendance_router)
api_router.include_router(finance_router)
api_router.include_router(communication_router)
api_router.include_router(ai_router)
api_router.include_router(reports_router)
