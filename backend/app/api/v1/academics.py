from typing import Optional, List, Dict, Any
import datetime as dt
import os
import shutil
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from app.db.session import get_db
from app.core.deps import get_current_user, CurrentUserContext
from app.models.all_models import (
    Course, Subject, Batch, Schedule, Homework, Test, Result, Student, Enquiry
)
from app.schemas.erp import (
    CourseCreate, SubjectCreate, BatchCreate, HomeworkCreate, TestCreate, ResultSubmit
)

def parse_time_input(val) -> dt.time:
    if isinstance(val, dt.time):
        return val
    if not val or not isinstance(val, str):
        raise HTTPException(status_code=400, detail="Invalid time format.")
    val_str = val.strip()
    for fmt in ("%H:%M:%S", "%H:%M", "%I:%M %p", "%I:%M%p"):
        try:
            return dt.datetime.strptime(val_str, fmt).time()
        except ValueError:
            pass
    raise HTTPException(status_code=400, detail=f"Invalid time format: '{val_str}'. Expected HH:MM.")

router = APIRouter(prefix="/academics", tags=["Academic Management"])

# Courses
@router.get("/courses")
def list_courses(current_user: CurrentUserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    courses = db.query(Course).options(joinedload(Course.subjects)).filter(Course.institute_id == current_user.institute_id).all()

    result = []
    for c in courses:
        result.append({
            "id": c.id,
            "institute_id": c.institute_id,
            "name": c.name,
            "code": c.code,
            "standard": c.standard,
            "board": c.board,
            "duration_months": c.duration_months,
            "base_fee": float(c.base_fee) if c.base_fee is not None else 0.0,
            "description": c.description,
            "status": c.status,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "subjects": [
                {
                    "id": s.id,
                    "course_id": s.course_id,
                    "name": s.name,
                    "code": s.code,
                    "description": s.description,
                }
                for s in (c.subjects or [])
            ]
        })
    return result

@router.post("/courses")
def create_course(payload: CourseCreate, current_user: CurrentUserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Permission denied")
    course = Course(
        id=str(uuid.uuid4()),
        institute_id=current_user.institute_id,
        name=payload.name,
        code=payload.code,
        standard=payload.standard,
        board=payload.board,
        duration_months=payload.duration_months,
        base_fee=payload.base_fee,
        description=payload.description
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course

@router.put("/courses/{course_id}")
def update_course(
    course_id: str,
    payload: Dict[str, Any],
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Permission denied")
    course = db.query(Course).filter(
        Course.id == course_id,
        Course.institute_id == current_user.institute_id
    ).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    allowed = {"name", "code", "standard", "board", "duration_months", "base_fee", "description", "status"}
    for field, value in payload.items():
        if field in allowed and hasattr(course, field):
            setattr(course, field, value)
    db.commit()
    db.refresh(course)
    return course

@router.delete("/courses/{course_id}")
def delete_course(
    course_id: str,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Permission denied")
    course = db.query(Course).filter(
        Course.id == course_id,
        Course.institute_id == current_user.institute_id
    ).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    db.delete(course)
    db.commit()
    return {"message": "Course deleted successfully", "id": course_id}

# Subjects
@router.get("/subjects")
def list_subjects(course_id: str = None, current_user: CurrentUserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Subject).join(Course).filter(Course.institute_id == current_user.institute_id)
    if course_id:
        query = query.filter(Subject.course_id == course_id)
    return query.all()

@router.post("/subjects")
def create_subject(payload: SubjectCreate, current_user: CurrentUserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Permission denied")
    subject = Subject(
        id=str(uuid.uuid4()),
        course_id=payload.course_id,
        name=payload.name,
        code=payload.code,
        description=payload.description
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject

@router.delete("/subjects/{subject_id}")
def delete_subject(
    subject_id: str,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Permission denied")
    subj = db.query(Subject).join(Course).filter(
        Subject.id == subject_id,
        Course.institute_id == current_user.institute_id
    ).first()
    if not subj:
        raise HTTPException(status_code=404, detail="Subject not found")
    db.delete(subj)
    db.commit()
    return {"message": "Subject deleted successfully"}

# Batches
@router.get("/batches")
def list_batches(course_id: str = None, current_user: CurrentUserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Batch).filter(Batch.institute_id == current_user.institute_id)
    if course_id:
        query = query.filter(Batch.course_id == course_id)
    return query.all()

@router.post("/batches")
def create_batch(payload: BatchCreate, current_user: CurrentUserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Permission denied")
    batch = Batch(
        id=str(uuid.uuid4()),
        institute_id=current_user.institute_id,
        course_id=payload.course_id,
        teacher_id=payload.teacher_id,
        name=payload.name,
        room_number=payload.room_number,
        max_capacity=payload.max_capacity,
        start_date=payload.start_date,
        end_date=payload.end_date,
        schedule_days=payload.schedule_days
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch

@router.put("/batches/{batch_id}")
def update_batch(
    batch_id: str,
    payload: dict,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Permission denied")
    batch = db.query(Batch).filter(
        Batch.id == batch_id,
        Batch.institute_id == current_user.institute_id
    ).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    updatable_fields = [
        "name", "course_id", "teacher_id", "room_number", "max_capacity",
        "start_date", "end_date", "schedule_days", "status"
    ]
    for field in updatable_fields:
        if field in payload and payload[field] is not None:
            setattr(batch, field, payload[field])

    db.commit()
    db.refresh(batch)
    return batch

# Enquiries Management for Admin
@router.get("/enquiries")
def list_enquiries(
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    enquiries = db.query(Enquiry).filter(Enquiry.institute_id == current_user.institute_id).order_by(Enquiry.created_at.desc()).all()
    return enquiries

@router.post("/enquiries")
def create_enquiry(
    payload: dict,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    enquiry = Enquiry(
        id=str(uuid.uuid4()),
        institute_id=current_user.institute_id,
        student_name=payload.get("student_name", "").strip(),
        phone=payload.get("phone", "").strip(),
        parent_name=payload.get("parent_name"),
        email=payload.get("email"),
        course_interested=payload.get("course_interested"),
        counselling_notes=payload.get("counselling_notes"),
        source=payload.get("source", "Direct"),
        status=payload.get("status", "NEW")
    )
    db.add(enquiry)
    db.commit()
    db.refresh(enquiry)
    return enquiry

@router.put("/enquiries/{enquiry_id}")
def update_enquiry(
    enquiry_id: str,
    payload: dict,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Permission denied")
    enquiry = db.query(Enquiry).filter(
        Enquiry.id == enquiry_id,
        Enquiry.institute_id == current_user.institute_id
    ).first()
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")

    updatable_fields = [
        "student_name", "phone", "parent_name", "email",
        "course_interested", "counselling_notes", "source", "status"
    ]
    for field in updatable_fields:
        if field in payload and payload[field] is not None:
            setattr(enquiry, field, payload[field])

    db.commit()
    db.refresh(enquiry)
    return enquiry


# Homework
@router.get("/homework")
def list_homework(batch_id: str = None, current_user: CurrentUserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Homework).filter(Homework.institute_id == current_user.institute_id)
    if batch_id:
        query = query.filter(Homework.batch_id == batch_id)
    return query.all()

@router.post("/homework")
def create_homework(payload: HomeworkCreate, current_user: CurrentUserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["owner", "admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Permission denied")
    hw = Homework(
        id=str(uuid.uuid4()),
        institute_id=current_user.institute_id,
        batch_id=payload.batch_id,
        title=payload.title,
        subject=payload.subject,
        standard=payload.standard,
        description=payload.description,
        due_date=payload.due_date,
        file_url=payload.file_url,
        created_by=current_user.id
    )
    db.add(hw)
    db.commit()
    db.refresh(hw)
    return hw

@router.put("/homework/{homework_id}")
def update_homework(homework_id: str, payload: Dict[str, Any], current_user: CurrentUserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["owner", "admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Permission denied")
    hw = db.query(Homework).filter(
        Homework.id == homework_id,
        Homework.institute_id == current_user.institute_id,
    ).first()
    if not hw:
        raise HTTPException(status_code=404, detail="Homework not found")
    allowed = {"batch_id", "title", "subject", "standard", "description", "due_date", "file_url"}
    for field, value in payload.items():
        if field in allowed and hasattr(hw, field):
            setattr(hw, field, value)
    db.commit()
    db.refresh(hw)
    return hw

@router.delete("/homework/{homework_id}")
def delete_homework(homework_id: str, current_user: CurrentUserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["owner", "admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Permission denied")
    hw = db.query(Homework).filter(
        Homework.id == homework_id,
        Homework.institute_id == current_user.institute_id,
    ).first()
    if not hw:
        raise HTTPException(status_code=404, detail="Homework not found")
    db.delete(hw)
    db.commit()
    return {"message": "Homework deleted.", "id": homework_id}

# Tests & Results
@router.get("/tests")
def list_tests(batch_id: str = None, current_user: CurrentUserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Test).filter(Test.institute_id == current_user.institute_id)
    if batch_id:
        query = query.filter(Test.batch_id == batch_id)
    return query.all()

@router.post("/tests")
def create_test(payload: TestCreate, current_user: CurrentUserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["owner", "admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Permission denied")
    t = Test(
        id=str(uuid.uuid4()),
        institute_id=current_user.institute_id,
        batch_id=payload.batch_id,
        subject=payload.subject,
        title=payload.title,
        test_type=payload.test_type,
        test_date=payload.test_date,
        duration_minutes=payload.duration_minutes,
        total_marks=payload.total_marks,
        passing_marks=payload.passing_marks
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t

@router.get("/results")
def list_results(test_id: str = None, student_id: str = None, current_user: CurrentUserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Result).join(Test).filter(Test.institute_id == current_user.institute_id)
    if test_id:
        query = query.filter(Result.test_id == test_id)
    if student_id:
        query = query.filter(Result.student_id == student_id)
    if current_user.role == "student":
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if student:
            query = query.filter(Result.student_id == student.id)
    return query.all()

@router.post("/results")
def submit_result(payload: ResultSubmit, current_user: CurrentUserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["owner", "admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    pct = round((payload.marks_obtained / payload.total_marks) * 100.0, 2)
    grade = "A+" if pct >= 90 else "A" if pct >= 80 else "B" if pct >= 70 else "C" if pct >= 60 else "D" if pct >= 40 else "F"

    res = Result(
        id=str(uuid.uuid4()),
        test_id=payload.test_id,
        student_id=payload.student_id,
        marks_obtained=payload.marks_obtained,
        total_marks=payload.total_marks,
        percentage=pct,
        grade=grade,
        remarks=payload.remarks
    )
    db.add(res)
    db.commit()
    db.refresh(res)
    return res

from app.models.all_models import StudyMaterial
from app.schemas.erp import StudyMaterialCreate, StudyMaterialUpdate, ScheduleCreate

@router.get("/study-materials")
def list_study_materials(
    batch_id: str = None,
    subject_id: str = None,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(StudyMaterial).filter(StudyMaterial.institute_id == current_user.institute_id)
    # Students only ever receive published materials. Owners/admins/teachers
    # see drafts as well (Draft/Published is an intended admin workflow).
    if getattr(current_user, "role", None) == "student":
        query = query.filter(StudyMaterial.is_published.is_(True))
    if batch_id:
        from sqlalchemy import or_
        query = query.filter(or_(StudyMaterial.batch_id == batch_id, StudyMaterial.batch_id.is_(None)))
    if subject_id:
        query = query.filter(StudyMaterial.subject_id == subject_id)
    return query.all()

@router.post("/study-materials")
def create_study_material(
    payload: StudyMaterialCreate,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["owner", "admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Permission denied")

    clean_batch_id = payload.batch_id.strip() if payload.batch_id and isinstance(payload.batch_id, str) and payload.batch_id.strip() else None
    clean_subject_id = payload.subject_id.strip() if payload.subject_id and isinstance(payload.subject_id, str) and payload.subject_id.strip() else None

    sm = StudyMaterial(
        id=str(uuid.uuid4()),
        institute_id=current_user.institute_id,
        batch_id=clean_batch_id,
        title=payload.title,
        subject=payload.subject or "General",
        chapter=payload.description or "General",
        material_type=payload.material_type or "PDF",
        file_url=payload.file_url or payload.external_url or "https://example.com/material.pdf",
        is_published=True if payload.is_published is None else bool(payload.is_published),
    )
    db.add(sm)
    db.commit()
    db.refresh(sm)
    return sm


@router.put("/study-materials/{material_id}")
def update_study_material(
    material_id: str,
    payload: StudyMaterialUpdate,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ["owner", "admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Permission denied")
    sm = db.query(StudyMaterial).filter(
        StudyMaterial.id == material_id,
        StudyMaterial.institute_id == current_user.institute_id,
    ).first()
    if not sm:
        raise HTTPException(status_code=404, detail="Study material not found")

    data = payload.model_dump(exclude_unset=True)
    if "batch_id" in data:
        b = data["batch_id"]
        data["batch_id"] = b.strip() if isinstance(b, str) and b.strip() else None
    if "title" in data and not data["title"]:
        data.pop("title")
    if "file_url" in data and not data["file_url"]:
        data.pop("file_url")
    for field, value in data.items():
        setattr(sm, field, value)
    db.commit()
    db.refresh(sm)
    return sm


@router.delete("/study-materials/{material_id}")
def delete_study_material(
    material_id: str,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ["owner", "admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Permission denied")
    sm = db.query(StudyMaterial).filter(
        StudyMaterial.id == material_id,
        StudyMaterial.institute_id == current_user.institute_id,
    ).first()
    if not sm:
        raise HTTPException(status_code=404, detail="Study material not found")
    db.delete(sm)
    db.commit()
    return {"message": "Study material deleted.", "id": material_id}

import os
import shutil
from fastapi import UploadFile, File

@router.post("/study-materials/upload")
async def upload_study_material_file(
    file: UploadFile = File(...),
    current_user: CurrentUserContext = Depends(get_current_user)
):
    if current_user.role not in ["owner", "admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Permission denied")

    upload_dir = os.path.join(os.getcwd(), "uploads", "study_materials")
    os.makedirs(upload_dir, exist_ok=True)

    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".bin"
    unique_filename = f"{uuid.uuid4().hex}{file_ext}"
    target_path = os.path.join(upload_dir, unique_filename)

    with open(target_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "file_url": f"/uploads/study_materials/{unique_filename}",
        "filename": file.filename
    }

@router.post("/homework/upload")
async def upload_homework_file(
    file: UploadFile = File(...),
    current_user: CurrentUserContext = Depends(get_current_user)
):
    if current_user.role not in ["owner", "admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Permission denied")

    upload_dir = os.path.join(os.getcwd(), "uploads", "homework")
    os.makedirs(upload_dir, exist_ok=True)

    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".bin"
    unique_filename = f"{uuid.uuid4().hex}{file_ext}"
    target_path = os.path.join(upload_dir, unique_filename)

    with open(target_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "file_url": f"/uploads/homework/{unique_filename}",
        "filename": file.filename
    }

def check_schedule_overlaps(db: Session, institute_id: str, day_of_week: str, batch_id: str, room_number: Optional[str], teacher_id: Optional[str], start_t: dt.time, end_t: dt.time, exclude_id: Optional[str] = None):
    if start_t >= end_t:
        raise HTTPException(status_code=400, detail="Invalid schedule time range: End time must be after start time.")

    query = db.query(Schedule).filter(
        Schedule.institute_id == institute_id,
        Schedule.day_of_week == day_of_week
    )
    if exclude_id:
        query = query.filter(Schedule.id != exclude_id)

    existing_slots = query.all()
    for s in existing_slots:
        s_start = s.start_time if isinstance(s.start_time, dt.time) else parse_time_input(s.start_time)
        s_end = s.end_time if isinstance(s.end_time, dt.time) else parse_time_input(s.end_time)

        if start_t < s_end and end_t > s_start:
            if s.batch_id == batch_id:
                raise HTTPException(status_code=400, detail="Batch scheduling conflict: Batch already has a class scheduled during this time slot.")
            if room_number and s.room_number and s.room_number.strip().lower() == room_number.strip().lower():
                raise HTTPException(status_code=400, detail=f"Room scheduling conflict: Room {room_number} is already booked during this time slot.")
            if teacher_id and s.teacher_id and s.teacher_id == teacher_id:
                raise HTTPException(status_code=400, detail="Faculty scheduling conflict: Instructor is already assigned to another class during this time slot.")

@router.get("/schedules")
def list_schedules(
    batch_id: str = None,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Schedule).filter(Schedule.institute_id == current_user.institute_id)
    if batch_id:
        query = query.filter(Schedule.batch_id == batch_id)
    schedules = query.all()
    
    result = []
    for s in schedules:
        result.append({
            "id": s.id,
            "institute_id": s.institute_id,
            "batch_id": s.batch_id,
            "subject_id": s.subject_id,
            "teacher_id": s.teacher_id,
            "day_of_week": s.day_of_week,
            "start_time": s.start_time.isoformat() if isinstance(s.start_time, dt.time) else str(s.start_time or "18:00"),
            "end_time": s.end_time.isoformat() if isinstance(s.end_time, dt.time) else str(s.end_time or "19:30"),
            "room_number": s.room_number,
            "created_at": s.created_at.isoformat() if s.created_at else None
        })
    return result

@router.post("/schedules")
def create_schedule(
    payload: ScheduleCreate,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Permission denied")

    clean_subject_id = payload.subject_id.strip() if payload.subject_id and isinstance(payload.subject_id, str) and payload.subject_id.strip() else None
    clean_teacher_id = payload.teacher_id.strip() if payload.teacher_id and isinstance(payload.teacher_id, str) and payload.teacher_id.strip() else None
    start_t = parse_time_input(payload.start_time)
    end_t = parse_time_input(payload.end_time)

    check_schedule_overlaps(
        db=db,
        institute_id=current_user.institute_id,
        day_of_week=payload.day_of_week,
        batch_id=payload.batch_id,
        room_number=payload.room_number,
        teacher_id=clean_teacher_id,
        start_t=start_t,
        end_t=end_t
    )

    sch = Schedule(
        id=str(uuid.uuid4()),
        institute_id=current_user.institute_id,
        batch_id=payload.batch_id,
        subject_id=clean_subject_id,
        teacher_id=clean_teacher_id,
        day_of_week=payload.day_of_week,
        start_time=start_t,
        end_time=end_t,
        room_number=payload.room_number or "Room 101"
    )
    db.add(sch)
    db.commit()
    db.refresh(sch)
    return sch

@router.put("/schedules/{schedule_id}")
def update_schedule(
    schedule_id: str,
    payload: dict,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Permission denied")

    sch = db.query(Schedule).filter(
        Schedule.id == schedule_id,
        Schedule.institute_id == current_user.institute_id
    ).first()
    if not sch:
        raise HTTPException(status_code=404, detail="Schedule slot not found")

    target_batch_id = payload.get("batch_id") or sch.batch_id
    target_day = payload.get("day_of_week") or sch.day_of_week
    target_room = payload.get("room_number") if "room_number" in payload else sch.room_number
    target_teacher = payload.get("teacher_id") if "teacher_id" in payload else sch.teacher_id
    target_start = parse_time_input(payload["start_time"]) if "start_time" in payload and payload["start_time"] else (sch.start_time if isinstance(sch.start_time, dt.time) else parse_time_input(sch.start_time))
    target_end = parse_time_input(payload["end_time"]) if "end_time" in payload and payload["end_time"] else (sch.end_time if isinstance(sch.end_time, dt.time) else parse_time_input(sch.end_time))

    check_schedule_overlaps(
        db=db,
        institute_id=current_user.institute_id,
        day_of_week=target_day,
        batch_id=target_batch_id,
        room_number=target_room,
        teacher_id=target_teacher,
        start_t=target_start,
        end_t=target_end,
        exclude_id=sch.id
    )

    sch.batch_id = target_batch_id
    sch.day_of_week = target_day
    sch.room_number = target_room
    sch.teacher_id = target_teacher
    sch.start_time = target_start
    sch.end_time = target_end
    if "subject_id" in payload:
        sch.subject_id = payload["subject_id"].strip() if payload["subject_id"] and isinstance(payload["subject_id"], str) and payload["subject_id"].strip() else None

    db.commit()
    db.refresh(sch)
    return sch

@router.delete("/schedules/{schedule_id}")
def delete_schedule(
    schedule_id: str,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Permission denied")

    sch = db.query(Schedule).filter(
        Schedule.id == schedule_id,
        Schedule.institute_id == current_user.institute_id
    ).first()
    if not sch:
        raise HTTPException(status_code=404, detail="Schedule slot not found")

    db.delete(sch)
    db.commit()
    return {"message": "Schedule slot deleted successfully"}

