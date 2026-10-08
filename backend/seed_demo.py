"""Seed the EduPilot DEMO tenant (backend-only, explicitly invoked).

Usage (from the backend/ directory or repo root):
    $env:DEMO_ADMIN_PASSWORD="..."; $env:DEMO_TEACHER_PASSWORD="..."; `
      $env:DEMO_STUDENT_PASSWORD="..."; python backend/seed_demo.py --confirm

Without --confirm the script performs a dry run and writes nothing.
The script is IDEMPOTENT: if the demo institute (code DEMO-INST-01) already
exists, it prints a notice and exits 0 without creating duplicates.

It is NEVER imported at application startup (no reference from app/main.py).

Demo credentials come from environment variables ONLY and are never
committed to the repository:
    DEMO_ADMIN_PASSWORD     — demo admin login password (required)
    DEMO_TEACHER_PASSWORD   — demo teacher login password (required)
    DEMO_STUDENT_PASSWORD   — demo student login password (required)

Demo logins (passwords are the env values above, reported out-of-band):
    Admin:   admin@demo.edupilot.app
    Teacher: TCH-DEMO-01
    Student: STU-DEMO-01 (second student: STU-DEMO-02, same password)
"""
import os
import sys
from datetime import date, datetime, timedelta

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal, Base, engine  # noqa: E402
from app.core.security import get_password_hash  # noqa: E402
from app.models.all_models import (  # noqa: E402
    Institute, Branch, Profile, Course, Subject, Teacher, Batch, Student,
    Enrollment, Attendance, Fee, Payment, Test, Result, Homework,
    StudyMaterial, Announcement, Schedule,
)
import uuid  # noqa: E402

DEMO_INSTITUTE_CODE = "DEMO-INST-01"
DEMO_INSTITUTE_NAME = "EduPilot Demo Academy"
DEMO_ADMIN_EMAIL = "admin@demo.edupilot.app"
DEMO_TEACHER_CODE = "TCH-DEMO-01"
DEMO_STUDENT_CODES = ("STU-DEMO-01", "STU-DEMO-02")


def _required_env(name: str) -> str:
    value = os.getenv(name, "")
    if not value:
        raise SystemExit(
            f"Missing required environment variable {name}. "
            "Demo passwords are never stored in source code — export them "
            "in your shell and re-run with --confirm."
        )
    return value


def create_demo_account(confirmed: bool = False) -> str:
    """Create the demo tenant + sample data. Returns the demo institute id.

    Idempotent: if the demo institute already exists, does nothing and
    returns the existing id.
    """
    admin_password = _required_env("DEMO_ADMIN_PASSWORD")
    teacher_password = _required_env("DEMO_TEACHER_PASSWORD")
    student_password = _required_env("DEMO_STUDENT_PASSWORD")

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(Institute).filter(Institute.code == DEMO_INSTITUTE_CODE).first()
        if existing:
            print(f"Demo account already exists (institute {existing.id}). Nothing to do.")
            return existing.id

        if not confirmed:
            print("DRY RUN: demo institute does not exist yet. "
                  "Re-run with --confirm to create it. Nothing was written.")
            return ""

        now = datetime.utcnow()
        inst_id = str(uuid.uuid4())
        inst = Institute(
            id=inst_id,
            name=DEMO_INSTITUTE_NAME,
            code=DEMO_INSTITUTE_CODE,
            phone="+91 90000 00001",
            email=DEMO_ADMIN_EMAIL,
            address="Demo Campus, Education Hub, Bengaluru",
            website="https://demo.edupilot.app",
            subscription_plan="professional",
            subscription_status="trialing",
            trial_started_at=now,
            trial_ends_at=now + timedelta(days=7),
        )
        db.add(inst)
        db.flush()

        branch = Branch(
            id=str(uuid.uuid4()), institute_id=inst_id,
            name="Demo Main Campus", code="DEMO-BR-MAIN", is_main_branch=True,
        )
        db.add(branch)
        db.flush()

        admin_prof = Profile(
            id=str(uuid.uuid4()), institute_id=inst_id, branch_id=branch.id,
            email=DEMO_ADMIN_EMAIL, hashed_password=get_password_hash(admin_password),
            full_name="Demo Admin", role="admin",
            phone="+91 90000 00001", status="Active",
        )
        db.add(admin_prof)

        tch_prof_id = str(uuid.uuid4())
        db.add(Profile(
            id=tch_prof_id, institute_id=inst_id, branch_id=branch.id,
            email=f"{DEMO_TEACHER_CODE.lower()}@internal.edupilot.app",
            hashed_password=get_password_hash(teacher_password),
            full_name="Demo Teacher", role="teacher",
            phone="+91 90000 00002", status="Active",
        ))
        teacher = Teacher(
            id=str(uuid.uuid4()), institute_id=inst_id, user_id=tch_prof_id,
            teacher_id_code=DEMO_TEACHER_CODE, name="Demo Teacher",
            email="teacher@demo.edupilot.app", phone="+91 90000 00002",
            qualification="M.Sc. Mathematics", specialization="Algebra",
            joining_date=date.today() - timedelta(days=180),
            base_salary=50000.0, status="Active",
        )
        db.add(teacher)
        db.flush()

        course = Course(
            id=str(uuid.uuid4()), institute_id=inst_id,
            name="Demo Class 10 Science", code="DEMO-C10-SCI",
            standard="Class 10", board="CBSE", duration_months=12,
            base_fee=40000.0,
            description="Sample course provisioned with the demo account",
            status="Active",
        )
        db.add(course)
        subject = Subject(
            id=str(uuid.uuid4()), course_id=course.id,
            name="Demo Physics", code="DEMO-PHY-10",
            description="Sample subject for the demo account",
        )
        db.add(subject)
        db.flush()

        batch = Batch(
            id=str(uuid.uuid4()), institute_id=inst_id, course_id=course.id,
            teacher_id=teacher.id, name="Demo Batch A", room_number="Room D1",
            max_capacity=40, start_date=date.today() - timedelta(days=30),
            end_date=date.today() + timedelta(days=300),
            schedule_days="Mon, Wed, Fri", status="Active",
        )
        db.add(batch)
        db.flush()

        student_ids = []
        for idx, code in enumerate(DEMO_STUDENT_CODES, start=1):
            prof_id = str(uuid.uuid4())
            db.add(Profile(
                id=prof_id, institute_id=inst_id, branch_id=branch.id,
                email=f"{code.lower()}@internal.edupilot.app",
                hashed_password=get_password_hash(student_password),
                full_name=f"Demo Student {idx}", role="student",
                phone=f"+91 90000 0001{idx}", status="Active",
            ))
            student = Student(
                id=str(uuid.uuid4()), institute_id=inst_id, user_id=prof_id,
                student_id_code=code, full_name=f"Demo Student {idx}",
                email=f"demo.student{idx}@example.com", phone=f"+91 90000 0001{idx}",
                standard="Class 10", board="CBSE",
                course_id=course.id, batch_id=batch.id,
                parent_name="Demo Parent", parent_phone="+91 90000 00010",
                admission_date=date.today() - timedelta(days=28), status="Active",
            )
            db.add(student)
            db.flush()
            student_ids.append(student.id)
            db.add(Enrollment(
                id=str(uuid.uuid4()), student_id=student.id,
                course_id=course.id, batch_id=batch.id,
                enrolled_on=date.today() - timedelta(days=28), status="Active",
            ))

        fee = Fee(
            id=str(uuid.uuid4()), institute_id=inst_id, student_id=student_ids[0],
            total_amount=40000.0, paid_amount=20000.0, due_amount=20000.0,
            discount_amount=0.0, due_date=date.today() + timedelta(days=60),
            payment_status="partial",
        )
        db.add(fee)
        db.flush()
        db.add(Payment(
            id=str(uuid.uuid4()), institute_id=inst_id, fee_id=fee.id,
            student_id=student_ids[0], amount=20000.0,
            payment_method="UPI", reference_number="DEMO/UPI/0001",
            collected_by=DEMO_ADMIN_EMAIL, receipt_number="DEMO-REC-0001",
            status="SUCCESS",
        ))

        for day_offset, status in ((1, "present"), (2, "present"), (3, "late")):
            db.add(Attendance(
                id=str(uuid.uuid4()), institute_id=inst_id,
                student_id=student_ids[0], batch_id=batch.id, subject_id=subject.id,
                attendance_date=date.today() - timedelta(days=day_offset),
                status=status, remarks="Seeded demo attendance",
            ))

        for day, start, end in (("Monday", "09:00", "10:00"), ("Wednesday", "09:00", "10:00")):
            from datetime import time as dtime
            sh, sm = map(int, start.split(":"))
            eh, em = map(int, end.split(":"))
            db.add(Schedule(
                id=str(uuid.uuid4()), institute_id=inst_id, batch_id=batch.id,
                subject_id=subject.id, teacher_id=teacher.id,
                room_number="Room D1", day_of_week=day,
                start_time=dtime(sh, sm), end_time=dtime(eh, em),
            ))

        test = Test(
            id=str(uuid.uuid4()), institute_id=inst_id, batch_id=batch.id,
            subject="Physics", title="Demo Unit Test 1", test_type="Unit Test",
            test_date=datetime.utcnow() - timedelta(days=2),
            duration_minutes=60, total_marks=100, passing_marks=35,
            status="Completed",
        )
        db.add(test)
        db.flush()
        db.add(Result(
            id=str(uuid.uuid4()), test_id=test.id, student_id=student_ids[0],
            marks_obtained=82.0, total_marks=100.0, percentage=82.0,
            grade="A", remarks="Seeded demo result",
        ))

        db.add(Homework(
            id=str(uuid.uuid4()), institute_id=inst_id, batch_id=batch.id,
            title="Demo Homework: Motion", subject="Physics", standard="Class 10",
            description="Solve the sample worksheet on motion.",
            due_date=datetime.utcnow() + timedelta(days=5),
        ))
        db.add(StudyMaterial(
            id=str(uuid.uuid4()), institute_id=inst_id,
            course_id=course.id, batch_id=batch.id,
            title="Demo Notes: Motion", subject="Physics", chapter="Motion",
            material_type="notes", file_url="https://demo.edupilot.app/materials/motion.pdf",
            is_published=True, uploaded_by=DEMO_ADMIN_EMAIL,
        ))
        db.add(Announcement(
            id=str(uuid.uuid4()), institute_id=inst_id,
            title="Welcome to the EduPilot demo",
            message="This announcement was seeded with the demo account.",
            target_role="all", batch_id=batch.id, priority="Normal",
        ))

        db.commit()
        print(f"Demo account created (institute {inst_id}).")
        print(f"Admin login: {DEMO_ADMIN_EMAIL} / <DEMO_ADMIN_PASSWORD>")
        print(f"Teacher login: {DEMO_TEACHER_CODE} / <DEMO_TEACHER_PASSWORD>")
        print(f"Student login: {DEMO_STUDENT_CODES[0]} / <DEMO_STUDENT_PASSWORD>")
        return inst_id
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        print(f"Error seeding demo account: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    confirm = "--confirm" in sys.argv
    create_demo_account(confirmed=confirm)
