from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user, CurrentUserContext
from app.models.all_models import Institute, Branch, Enquiry
from app.schemas.erp import InstituteCreate, BranchCreate, PublicEnquiryCreate
import uuid

router = APIRouter(prefix="/institutes", tags=["Institutes"])

@router.get("/public")
def get_public_institute(db: Session = Depends(get_db)):
    inst = db.query(Institute).order_by(Institute.created_at.asc()).first()
    if not inst:
        return {"configured": False, "message": "No institute is configured yet."}
    return {
        "id": inst.id,
        "name": inst.name,
        "phone": inst.phone,
        "email": inst.email,
        "address": inst.address,
        "website": inst.website,
        "logo_url": inst.logo_url or inst.logo
    }

@router.post("/public/enquiry")
def submit_public_enquiry(payload: PublicEnquiryCreate, db: Session = Depends(get_db)):
    inst = db.query(Institute).order_by(Institute.created_at.asc()).first()
    if not inst:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No institute is configured to receive enquiries."
        )
    
    enquiry = Enquiry(
        id=str(uuid.uuid4()),
        institute_id=inst.id,
        student_name=payload.student_name.strip(),
        phone=payload.phone.strip(),
        parent_name=payload.parent_name,
        email=payload.email,
        course_interested=payload.course_interested,
        counselling_notes=payload.counselling_notes,
        source="Website",
        status="NEW"
    )
    db.add(enquiry)
    db.commit()
    db.refresh(enquiry)
    return {"id": enquiry.id, "message": "Enquiry submitted successfully."}

@router.get("/current")
def get_current_institute(
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.institute_id:
        return None
    inst = db.query(Institute).filter(Institute.id == current_user.institute_id).first()
    return inst

@router.put("/current")
def update_current_institute(
    payload: Dict[str, Any],
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Permission denied")
    if not current_user.institute_id:
        raise HTTPException(status_code=404, detail="Institute not found")
    inst = db.query(Institute).filter(Institute.id == current_user.institute_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institute not found")
    allowed = {"name", "phone", "email", "address"}
    for field, value in payload.items():
        if field in allowed and hasattr(inst, field):
            setattr(inst, field, value)
    db.commit()
    db.refresh(inst)
    return inst

@router.get("/branches")
def get_branches(
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    branches = db.query(Branch).filter(Branch.institute_id == current_user.institute_id).all()
    return branches

@router.post("/branches")
def create_branch(
    payload: BranchCreate,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    branch = Branch(
        id=str(uuid.uuid4()),
        institute_id=current_user.institute_id,
        name=payload.name,
        code=payload.code,
        address=payload.address,
        phone=payload.phone,
        is_main_branch=payload.is_main_branch
    )
    db.add(branch)
    db.commit()
    db.refresh(branch)
    return branch

@router.put("/branches/{branch_id}")
def update_branch(
    branch_id: str,
    payload: Dict[str, Any],
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Permission denied")
    branch = db.query(Branch).filter(
        Branch.id == branch_id,
        Branch.institute_id == current_user.institute_id
    ).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    allowed = {"name", "code", "address", "phone", "is_main_branch"}
    for field, value in payload.items():
        if field in allowed and hasattr(branch, field):
            setattr(branch, field, value)
    db.commit()
    db.refresh(branch)
    return branch

@router.get("/{institute_id}")
def get_institute_by_id(
    institute_id: str,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return institute details. Users may only view their own institute."""
    if current_user.institute_id != institute_id:
        raise HTTPException(status_code=403, detail="Permission denied")
    inst = db.query(Institute).filter(Institute.id == institute_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institute not found")
    return inst

