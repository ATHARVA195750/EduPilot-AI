from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user, CurrentUserContext
from app.models.all_models import Announcement, Notification
from app.schemas.erp import AnnouncementCreate
import uuid

router = APIRouter(prefix="/communication", tags=["Communication"])

@router.get("/announcements")
def list_announcements(current_user: CurrentUserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Announcement).filter(Announcement.institute_id == current_user.institute_id)
    if current_user.role in ["student", "teacher"]:
        query = query.filter(Announcement.target_role.in_(["all", current_user.role]))
    return query.all()

@router.post("/announcements")
def create_announcement(
    payload: AnnouncementCreate,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Permission denied")

    ann = Announcement(
        id=str(uuid.uuid4()),
        institute_id=current_user.institute_id,
        title=payload.title,
        message=payload.message,
        target_role=payload.target_role or "all",
        batch_id=payload.batch_id,
        priority=payload.priority or "Normal"
    )
    db.add(ann)
    db.commit()
    db.refresh(ann)
    return ann

@router.get("/notifications")
def list_notifications(current_user: CurrentUserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Notification).filter(
        Notification.institute_id == current_user.institute_id,
        Notification.user_id == current_user.id
    ).all()
