from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.deps import get_current_user, CurrentUserContext
from app.models.all_models import Profile, Institute, Teacher, Student
from app.schemas.auth import LoginRequest, RegisterAdminRequest, Token, UserProfileResponse
import uuid

router = APIRouter(prefix="/auth", tags=["Authentication"])

def id_code_to_internal_email(id_code: str, role_type: str) -> str:
    cleaned = id_code.strip().upper()
    return f"{cleaned.lower()}@internal.edupilot.app"

@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    identifier = payload.identifier.strip()
    role_type = (payload.roleType or "admin").lower()

    if role_type in ["student", "teacher"]:
        auth_email = id_code_to_internal_email(identifier, role_type)
    else:
        auth_email = identifier.lower()

    profile = db.query(Profile).filter(Profile.email == auth_email).first()
    
    if not profile and role_type in ["student", "teacher"]:
        profile = db.query(Profile).filter(Profile.email.ilike(f"%{identifier.lower()}@internal.edupilot.app")).first()

    # Fallback search by ID code if email lookup misses
    if not profile and role_type == "student":
        student = db.query(Student).filter(Student.student_id_code == identifier.upper()).first()
        if student and student.user_id:
            profile = db.query(Profile).filter(Profile.id == student.user_id).first()
    elif not profile and role_type == "teacher":
        teacher = db.query(Teacher).filter(Teacher.teacher_id_code == identifier.upper()).first()
        if teacher and teacher.user_id:
            profile = db.query(Profile).filter(Profile.id == teacher.user_id).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ID or password." if role_type != "admin" else "Invalid email or password."
        )

    if profile.status and profile.status.lower() != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is inactive. Please contact your institute administrator."
        )

    if not verify_password(payload.password, profile.hashed_password or ""):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ID or password." if role_type != "admin" else "Invalid email or password."
        )

    access_token = create_access_token(
        subject=profile.id,
        extra_claims={
            "role": profile.role,
            "institute_id": profile.institute_id,
            "email": profile.email
        }
    )

    user_dict = {
        "id": profile.id,
        "email": profile.email,
        "full_name": profile.full_name,
        "role": profile.role,
        "institute_id": profile.institute_id,
        "branch_id": profile.branch_id,
        "status": profile.status,
    }

    return Token(access_token=access_token, token_type="bearer", user=user_dict)


@router.post("/register", response_model=Token)
@router.post("/register-admin", response_model=Token)
def register_admin(payload: RegisterAdminRequest, db: Session = Depends(get_db)):
    req_email = payload.get_email()
    req_inst_name = payload.get_institute_name()
    req_admin_name = payload.get_admin_name()
    req_phone = payload.get_phone()
    req_address = payload.get_address()

    existing = db.query(Profile).filter(Profile.email == req_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # 1. Create Institute
    inst_code = payload.code or f"{req_inst_name[:3].upper()}-{uuid.uuid4().hex[:6].upper()}"
    institute = Institute(
        id=str(uuid.uuid4()),
        name=req_inst_name,
        code=inst_code,
        phone=req_phone,
        email=req_email,
        address=req_address
    )
    db.add(institute)

    # 2. Create Admin Profile (role='admin' for institute administrators)
    hashed_pwd = get_password_hash(payload.password)
    profile = Profile(
        id=str(uuid.uuid4()),
        institute_id=institute.id,
        email=req_email,
        hashed_password=hashed_pwd,
        full_name=req_admin_name,
        role="admin",
        phone=req_phone,
        status="Active",
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)

    access_token = create_access_token(
        subject=profile.id,
        extra_claims={
            "role": profile.role,
            "institute_id": profile.institute_id,
            "email": profile.email
        }
    )

    user_dict = {
        "id": profile.id,
        "email": profile.email,
        "full_name": profile.full_name,
        "role": profile.role,
        "institute_id": profile.institute_id,
        "status": profile.status,
    }

    return Token(access_token=access_token, token_type="bearer", user=user_dict)


@router.get("/me", response_model=UserProfileResponse)
def get_me(current_user: CurrentUserContext = Depends(get_current_user)):
    p = current_user.profile
    return UserProfileResponse(
        id=p.id,
        email=p.email,
        full_name=p.full_name,
        role=p.role,
        phone=p.phone,
        avatar_url=p.avatar_url,
        status=p.status or "Active",
        institute_id=p.institute_id,
        branch_id=p.branch_id
    )


@router.post("/logout")
def logout(current_user: CurrentUserContext = Depends(get_current_user)):
    return {"message": "Successfully logged out."}


@router.put("/profile", response_model=UserProfileResponse)
def update_profile(
    payload: Dict[str, Any],
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the authenticated user's own editable profile fields.

    Role, institute_id, branch_id, email and status are never editable here —
    privilege changes go through admin management flows.
    """
    profile = db.query(Profile).filter(Profile.id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found."
        )
    allowed = {"full_name", "phone", "avatar_url"}
    for field, value in payload.items():
        if field in allowed and hasattr(profile, field):
            setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return UserProfileResponse(
        id=profile.id,
        email=profile.email,
        full_name=profile.full_name,
        role=profile.role,
        phone=profile.phone,
        avatar_url=profile.avatar_url,
        status=profile.status or "Active",
        institute_id=profile.institute_id,
        branch_id=profile.branch_id
    )
