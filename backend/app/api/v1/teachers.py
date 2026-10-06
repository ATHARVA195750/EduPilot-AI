from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_password_hash
from app.core.deps import get_current_user, CurrentUserContext
from app.models.all_models import Teacher, Profile, TeacherAssignment, Batch
from app.schemas.erp import TeacherCreate
import uuid
import datetime

router = APIRouter(prefix="/teachers", tags=["Teachers"])

def generate_teacher_code(db: Session, institute_id: str) -> str:
    count = db.query(Teacher).filter(Teacher.institute_id == institute_id).count() + 1
    year = datetime.datetime.now().strftime("%y")
    inst_prefix = institute_id[:4].upper() if institute_id else "GEN"
    return f"TCH-{inst_prefix}-{year}-{count:04d}"

def serialize_teacher(teacher: Teacher) -> dict:
    """Canonical teacher shape. The column is `name`; the frontend contract
    is `full_name` — always emit both so no consumer renders blanks."""
    return {
        "id": teacher.id,
        "institute_id": teacher.institute_id,
        "user_id": teacher.user_id,
        "teacher_id_code": teacher.teacher_id_code,
        "name": teacher.name,
        "full_name": teacher.name,
        "email": teacher.email,
        "phone": teacher.phone,
        "qualification": teacher.qualification,
        "specialization": teacher.specialization,
        "joining_date": teacher.joining_date.isoformat() if teacher.joining_date else None,
        "base_salary": float(teacher.base_salary) if teacher.base_salary is not None else 0.0,
        "status": teacher.status,
        "created_at": teacher.created_at.isoformat() if teacher.created_at else None,
    }

@router.get("")
def list_teachers(
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teachers = db.query(Teacher).filter(Teacher.institute_id == current_user.institute_id).all()
    return [serialize_teacher(t) for t in teachers]

@router.post("")
def create_teacher(
    payload: TeacherCreate,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Permission denied")

    code = generate_teacher_code(db, current_user.institute_id)
    auth_email = f"{current_user.institute_id[:8]}_{code.lower()}@internal.edupilot.app"

    temp_password = "Password@123"
    profile = Profile(
        id=str(uuid.uuid4()),
        institute_id=current_user.institute_id,
        email=auth_email,
        hashed_password=get_password_hash(temp_password),
        full_name=payload.name,
        role="teacher",
        phone=payload.phone,
        status="Active"
    )
    db.add(profile)

    teacher = Teacher(
        id=str(uuid.uuid4()),
        institute_id=current_user.institute_id,
        user_id=profile.id,
        teacher_id_code=code,
        name=payload.name,
        email=payload.email or auth_email,
        phone=payload.phone,
        qualification=payload.qualification,
        specialization=payload.specialization,
        joining_date=payload.joining_date or datetime.date.today(),
        base_salary=payload.base_salary or 0.0,
        status="Active"
    )
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    return {
        "id": teacher.id,
        "institute_id": teacher.institute_id,
        "user_id": teacher.user_id,
        "teacher_id_code": teacher.teacher_id_code,
        "name": teacher.name,
        "full_name": teacher.name,
        "email": teacher.email,
        "phone": teacher.phone,
        "qualification": teacher.qualification,
        "specialization": teacher.specialization,
        "joining_date": teacher.joining_date.isoformat() if teacher.joining_date else None,
        "base_salary": float(teacher.base_salary) if teacher.base_salary is not None else 0.0,
        "status": teacher.status,
        "created_at": teacher.created_at.isoformat() if teacher.created_at else None,
        "temp_password": temp_password,
    }

@router.get("/me")
def get_my_teacher_profile(
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher = db.query(Teacher).filter(
        Teacher.user_id == current_user.id,
        Teacher.institute_id == current_user.institute_id
    ).first()

    if not teacher:
        user_email = current_user.email or (current_user.profile.email if current_user.profile else "")

        if user_email:
            teacher = db.query(Teacher).filter(
                Teacher.institute_id == current_user.institute_id,
                Teacher.email == user_email
            ).first()

        if not teacher and user_email and "_tch-" in user_email.lower():
            code_part = user_email.lower().split("_tch-")[-1].split("@")[0]
            teacher = db.query(Teacher).filter(
                Teacher.institute_id == current_user.institute_id,
                Teacher.teacher_id_code.ilike(f"%{code_part}%")
            ).first()

        if not teacher and current_user.profile and current_user.profile.full_name:
            teacher = db.query(Teacher).filter(
                Teacher.institute_id == current_user.institute_id,
                Teacher.name.ilike(current_user.profile.full_name.strip())
            ).first()

        if teacher:
            teacher.user_id = current_user.id
            db.commit()
            db.refresh(teacher)

    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    return serialize_teacher(teacher)


@router.get("/{teacher_id}")
def get_teacher(
    teacher_id: str,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher = db.query(Teacher).filter(
        Teacher.id == teacher_id,
        Teacher.institute_id == current_user.institute_id
    ).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return serialize_teacher(teacher)

@router.put("/{teacher_id}")
def update_teacher(
    teacher_id: str,
    payload: dict,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Permission denied")
    teacher = db.query(Teacher).filter(
        Teacher.id == teacher_id,
        Teacher.institute_id == current_user.institute_id
    ).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    
    if "name" in payload and payload["name"]:
        teacher.name = payload["name"]
    if "email" in payload:
        teacher.email = payload["email"]
    if "phone" in payload:
        teacher.phone = payload["phone"]
    if "qualification" in payload:
        teacher.qualification = payload["qualification"]
    if "specialization" in payload:
        teacher.specialization = payload["specialization"]
    if "base_salary" in payload and payload["base_salary"] is not None:
        teacher.base_salary = payload["base_salary"]
    if "status" in payload and payload["status"]:
        teacher.status = payload["status"]

    db.commit()
    db.refresh(teacher)
    return serialize_teacher(teacher)


@router.get("/assignments")
def get_teacher_assignments(
    teacher_id: str = None,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(TeacherAssignment).filter(TeacherAssignment.institute_id == current_user.institute_id)
    if teacher_id:
        query = query.filter(TeacherAssignment.teacher_id == teacher_id)
    return query.all()

@router.post("/assignments")
def assign_teacher_batch(
    teacher_id: str,
    batch_id: str,
    subject_id: str = None,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Permission denied")

    assignment = TeacherAssignment(
        id=str(uuid.uuid4()),
        institute_id=current_user.institute_id,
        teacher_id=teacher_id,
        batch_id=batch_id,
        subject_id=subject_id
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment
