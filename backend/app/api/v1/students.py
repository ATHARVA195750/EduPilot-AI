from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_password_hash
from app.core.deps import get_current_user, CurrentUserContext
from app.models.all_models import Student, Profile, Enrollment, Course, Batch
from app.schemas.erp import StudentCreate
import uuid
import datetime

router = APIRouter(prefix="/students", tags=["Students"])

def generate_student_code(db: Session, institute_id: str) -> str:
    count = db.query(Student).filter(Student.institute_id == institute_id).count() + 1
    year = datetime.datetime.now().strftime("%y")
    inst_prefix = institute_id[:4].upper() if institute_id else "GEN"
    return f"STU-{inst_prefix}-{year}-{count:04d}"

@router.get("")
def list_students(
    batch_id: str = None,
    course_id: str = None,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Student).filter(Student.institute_id == current_user.institute_id)
    if current_user.role == "student":
        query = query.filter(Student.user_id == current_user.id)
    if batch_id:
        query = query.filter(Student.batch_id == batch_id)
    if course_id:
        query = query.filter(Student.course_id == course_id)
    return query.all()

@router.get("/me")
def get_my_student_record(
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(
        Student.institute_id == current_user.institute_id,
        Student.user_id == current_user.id
    ).first()

    if not student:
        user_email = current_user.email or (current_user.profile.email if current_user.profile else "")
        if user_email:
            student = db.query(Student).filter(
                Student.institute_id == current_user.institute_id,
                Student.email == user_email
            ).first()

        if not student and user_email and "_stu-" in user_email.lower():
            code_part = user_email.lower().split("_stu-")[-1].split("@")[0]
            student = db.query(Student).filter(
                Student.institute_id == current_user.institute_id,
                Student.student_id_code.ilike(f"%{code_part}%")
            ).first()

        if student and not student.user_id:
            student.user_id = current_user.id
            db.commit()
            db.refresh(student)

    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return student


@router.post("")
def create_student(
    payload: StudentCreate,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role not in ["owner", "admin"]:
            raise HTTPException(status_code=403, detail="Permission denied")

        code = generate_student_code(db, current_user.institute_id)
        auth_email = f"{current_user.institute_id[:8]}_{code.lower()}@internal.edupilot.app"

        # Create associated Profile for Student Portal access
        temp_password = "Password@123"
        profile = Profile(
            id=str(uuid.uuid4()),
            institute_id=current_user.institute_id,
            email=auth_email,
            hashed_password=get_password_hash(temp_password),
            full_name=payload.full_name,
            role="student",
            phone=payload.phone,
            status="Active"
        )
        db.add(profile)

        clean_course_id = payload.course_id.strip() if payload.course_id and isinstance(payload.course_id, str) and payload.course_id.strip() else None
        clean_batch_id = payload.batch_id.strip() if payload.batch_id and isinstance(payload.batch_id, str) and payload.batch_id.strip() else None

        valid_course = None
        valid_batch_id = None
        if clean_course_id:
            valid_course = db.query(Course).filter(Course.id == clean_course_id).first()
            if valid_course and clean_batch_id:
                valid_batch = db.query(Batch).filter(Batch.id == clean_batch_id).first()
                if valid_batch:
                    valid_batch_id = valid_batch.id

        student = Student(
            id=str(uuid.uuid4()),
            institute_id=current_user.institute_id,
            user_id=profile.id,
            student_id_code=code,
            full_name=payload.full_name,
            email=payload.email or auth_email,
            phone=payload.phone,
            gender=payload.gender,
            dob=payload.dob,
            school_name=payload.school_name,
            standard=payload.standard,
            board=payload.board,
            course_id=valid_course.id if valid_course else None,
            batch_id=valid_batch_id,
            parent_name=payload.parent_name,
            parent_phone=payload.parent_phone,
            parent_email=payload.parent_email,
            status="Active"
        )
        db.add(student)
        db.flush()

        if valid_course:
            enrollment = Enrollment(
                id=str(uuid.uuid4()),
                student_id=student.id,
                course_id=valid_course.id,
                batch_id=valid_batch_id,
                status="Active"
            )
            db.add(enrollment)
            db.flush()
        db.commit()
        db.refresh(student)

        return {
            "id": student.id,
            "institute_id": student.institute_id,
            "user_id": student.user_id,
            "student_id_code": student.student_id_code,
            "full_name": student.full_name,
            "email": student.email,
            "phone": student.phone,
            "gender": student.gender,
            "dob": student.dob.isoformat() if student.dob else None,
            "school_name": student.school_name,
            "standard": student.standard,
            "board": student.board,
            "course_id": student.course_id,
            "batch_id": student.batch_id,
            "parent_name": student.parent_name,
            "parent_phone": student.parent_phone,
            "parent_email": student.parent_email,
            "status": student.status,
            "created_at": student.created_at.isoformat() if student.created_at else None,
            "temp_password": temp_password,
        }
    except HTTPException:
        raise
    except Exception as err:
        import traceback
        tb = traceback.format_exc()
        print("CREATE_STUDENT ERROR TRACE:\n", tb)
        raise HTTPException(status_code=500, detail=f"ERR: {str(err)} | TRACE: {tb[:300]}")

@router.get("/{student_id}")
def get_student(
    student_id: str,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.institute_id == current_user.institute_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if current_user.role == "student" and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied")
    return student

@router.put("/{student_id}")
def update_student(
    student_id: str,
    payload: dict,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Permission denied")
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.institute_id == current_user.institute_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    updatable_fields = [
        "full_name", "phone", "email", "gender", "dob", "school_name",
        "standard", "board", "course_id", "batch_id", "parent_name",
        "parent_phone", "parent_email", "status"
    ]
    for field in updatable_fields:
        if field in payload and payload[field] is not None:
            setattr(student, field, payload[field])

    db.commit()
    db.refresh(student)
    return student

