from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user, CurrentUserContext
from app.models.all_models import Attendance, Student, Batch
from app.schemas.erp import BulkAttendanceCreate
import uuid
from datetime import date

router = APIRouter(prefix="/attendance", tags=["Attendance"])

@router.get("")
def list_attendance(
    batch_id: str = None,
    attendance_date: date = None,
    student_id: str = None,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Attendance).filter(Attendance.institute_id == current_user.institute_id)
    if current_user.role == "student":
        student = db.query(Student).filter(
            Student.institute_id == current_user.institute_id,
            Student.user_id == current_user.id
        ).first()
        if not student:
            user_email = current_user.email or (current_user.profile.email if current_user.profile else "")
            if user_email and "_stu-" in user_email.lower():
                code_part = user_email.lower().split("_stu-")[-1].split("@")[0]
                student = db.query(Student).filter(
                    Student.institute_id == current_user.institute_id,
                    Student.student_id_code.ilike(f"%{code_part}%")
                ).first()
        if student:
            query = query.filter(Attendance.student_id == student.id)
        else:
            query = query.filter(Attendance.id == "none")
    elif student_id:
        query = query.filter(Attendance.student_id == student_id)

    if batch_id:
        query = query.filter(Attendance.batch_id == batch_id)
    if attendance_date:
        query = query.filter(Attendance.attendance_date == attendance_date)
    return query.all()

@router.post("/bulk")
def record_bulk_attendance(
    payload: BulkAttendanceCreate,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role not in ["owner", "admin", "teacher"]:
            raise HTTPException(status_code=403, detail="Permission denied")

        saved_records = []
        for rec in payload.records:
            target_batch_id = rec.batch_id or payload.batch_id
            if not target_batch_id:
                student = db.query(Student).filter(Student.id == rec.student_id).first()
                if student and student.batch_id:
                    target_batch_id = student.batch_id

            if not target_batch_id:
                # Fallback to any existing batch for this institute
                any_batch = db.query(Batch).filter(Batch.institute_id == current_user.institute_id).first()
                if any_batch:
                    target_batch_id = any_batch.id
                else:
                    # Auto-create default batch if none exists
                    default_batch = Batch(
                        id=str(uuid.uuid4()),
                        institute_id=current_user.institute_id,
                        name="General Batch",
                        status="Active"
                    )
                    db.add(default_batch)
                    db.flush()
                    target_batch_id = default_batch.id


            target_date = rec.attendance_date or payload.attendance_date or date.today()

            # Check if record exists for student, batch and date -> update or insert
            existing = db.query(Attendance).filter(
                Attendance.institute_id == current_user.institute_id,
                Attendance.student_id == rec.student_id,
                Attendance.batch_id == target_batch_id,
                Attendance.attendance_date == target_date
            ).first()

            if existing:
                existing.status = rec.status
                existing.remarks = rec.remarks
                saved_records.append(existing)
            else:
                new_att = Attendance(
                    id=str(uuid.uuid4()),
                    institute_id=current_user.institute_id,
                    student_id=rec.student_id,
                    batch_id=target_batch_id,
                    subject_id=rec.subject_id,
                    attendance_date=target_date,
                    status=rec.status,
                    remarks=rec.remarks
                )
                db.add(new_att)
                saved_records.append(new_att)

        db.commit()
        return {"message": f"Successfully recorded attendance for {len(saved_records)} students."}
    except HTTPException:
        raise
    except Exception as err:
        import traceback
        tb = traceback.format_exc()
        print("RECORD_ATTENDANCE ERROR TRACE:\n", tb)
        raise HTTPException(status_code=500, detail=f"ERR: {str(err)} | TRACE: {tb[:300]}")
