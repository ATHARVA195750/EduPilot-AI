import sys
import os
from datetime import date, datetime, timedelta

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models.all_models import (
    Institute, Branch, Profile, Course, Subject, Teacher, Batch, Student,
    Enrollment, Enquiry, Schedule, Attendance, Fee, Payment, Expense, Payroll,
    Test, Result, Homework, StudyMaterial, Announcement, Notification
)
from app.core.config import settings
from urllib.parse import urlparse
import uuid

def seed():
    # Pre-flight Safety Checks
    assert settings.ENVIRONMENT == "qa", f"SAFETY ERROR: Expected ENVIRONMENT=qa, got {settings.ENVIRONMENT}"
    url_parts = urlparse(settings.active_database_url)
    assert "neon.tech" in (url_parts.hostname or ""), f"SAFETY ERROR: Host is not Neon QA ({url_parts.hostname})"
    assert url_parts.path.lstrip('/') == "neondb", f"SAFETY ERROR: Target database is not neondb ({url_parts.path})"
    print(f"Safety Pre-Checks Passed: ENVIRONMENT={settings.ENVIRONMENT}, HOST={url_parts.hostname}, DB={url_parts.path.lstrip('/')}")

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Check if already seeded
        existing_inst = db.query(Institute).filter(Institute.code == "QA-INST-01").first()
        if existing_inst:
            print("Database already seeded with QA Institute:", existing_inst.id)
            return

        # 1. Create QA Institute
        inst_id = str(uuid.uuid4())
        inst = Institute(
            id=inst_id,
            name="EduPilot QA Academy",
            code="QA-INST-01",
            phone="+91 9876543210",
            email="admin@qainstitute.com",
            address="123 Education Hub, Tech Park, Bangalore",
            website="https://qainstitute.edupilot.app"
        )
        db.add(inst)
        db.flush()

        # 2. Main Branch
        branch = Branch(
            id=str(uuid.uuid4()),
            institute_id=inst_id,
            name="Main Campus",
            code="BR-MAIN",
            is_main_branch=True
        )
        db.add(branch)
        db.flush()

        # 3. Owner/Admin Profile
        admin_prof_id = str(uuid.uuid4())
        admin_prof = Profile(
            id=admin_prof_id,
            institute_id=inst_id,
            branch_id=branch.id,
            email="admin@qainstitute.com",
            hashed_password=get_password_hash("AdminPass@123"),
            full_name="Dr. Archana Sharma (Owner)",
            role="owner",
            phone="+91 9876543210",
            status="Active"
        )
        db.add(admin_prof)
        db.flush()

        # 4. Teacher Profile & Record
        tch_prof_id = str(uuid.uuid4())
        tch_prof = Profile(
            id=tch_prof_id,
            institute_id=inst_id,
            branch_id=branch.id,
            email="tch-26-0001@internal.edupilot.app",
            hashed_password=get_password_hash("TeacherPass@123"),
            full_name="Prof. Rajesh Kumar",
            role="teacher",
            phone="+91 9876543211",
            status="Active"
        )
        db.add(tch_prof)

        teacher = Teacher(
            id=str(uuid.uuid4()),
            institute_id=inst_id,
            user_id=tch_prof_id,
            teacher_id_code="TCH-26-0001",
            name="Prof. Rajesh Kumar",
            email="rajesh.kumar@qainstitute.com",
            phone="+91 9876543211",
            qualification="M.Sc. Physics",
            specialization="Quantum Mechanics",
            joining_date=date(2025, 1, 15),
            base_salary=60000.0,
            status="Active"
        )
        db.add(teacher)
        db.flush()

        # 5. Course & Subject
        course = Course(
            id=str(uuid.uuid4()),
            institute_id=inst_id,
            name="Class 10 CBSE Science Complete",
            code="C10-SCI",
            standard="Class 10",
            board="CBSE",
            duration_months=12,
            base_fee=45000.0,
            description="Comprehensive Class 10 Science course covering Physics, Chemistry, Biology",
            status="Active"
        )
        db.add(course)

        subject = Subject(
            id=str(uuid.uuid4()),
            course_id=course.id,
            name="Physics - Electricity & Magnetism",
            code="PHY-10",
            description="Fundamentals of electric current and magnetic fields"
        )
        db.add(subject)
        db.flush()

        # 6. Batch
        batch = Batch(
            id=str(uuid.uuid4()),
            institute_id=inst_id,
            course_id=course.id,
            teacher_id=teacher.id,
            name="Batch 10A Morning",
            room_number="Room 101",
            max_capacity=30,
            start_date=date(2026, 1, 10),
            end_date=date(2026, 12, 20),
            schedule_days="Mon, Wed, Fri",
            status="Active"
        )
        db.add(batch)
        db.flush()

        # 7. Student Profile & Record
        stu_prof_id = str(uuid.uuid4())
        stu_prof = Profile(
            id=stu_prof_id,
            institute_id=inst_id,
            branch_id=branch.id,
            email="stu-26-0001@internal.edupilot.app",
            hashed_password=get_password_hash("StudentPass@123"),
            full_name="Aarav Gupta",
            role="student",
            phone="+91 9876543212",
            status="Active"
        )
        db.add(stu_prof)

        student = Student(
            id=str(uuid.uuid4()),
            institute_id=inst_id,
            user_id=stu_prof_id,
            student_id_code="STU-26-0001",
            full_name="Aarav Gupta",
            email="aarav.gupta@example.com",
            phone="+91 9876543212",
            gender="Male",
            dob=date(2010, 5, 14),
            school_name="National Public School",
            standard="Class 10",
            board="CBSE",
            course_id=course.id,
            batch_id=batch.id,
            parent_name="Sanjay Gupta",
            parent_phone="+91 9876543213",
            admission_date=date(2026, 1, 12),
            status="Active"
        )
        db.add(student)
        db.flush()

        # 8. Enrollment
        enrollment = Enrollment(
            id=str(uuid.uuid4()),
            student_id=student.id,
            course_id=course.id,
            batch_id=batch.id,
            enrolled_on=date(2026, 1, 12),
            status="Active"
        )
        db.add(enrollment)

        # 9. Fee & Payment
        fee = Fee(
            id=str(uuid.uuid4()),
            institute_id=inst_id,
            student_id=student.id,
            total_amount=45000.0,
            discount_amount=5000.0,
            paid_amount=20000.0,
            due_amount=20000.0,
            due_date=date(2026, 11, 1),
            payment_status="partial"
        )
        db.add(fee)
        db.flush()

        payment = Payment(
            id=str(uuid.uuid4()),
            institute_id=inst_id,
            fee_id=fee.id,
            student_id=student.id,
            amount=20000.0,
            payment_method="UPI",
            reference_number="UPI/2026/987123",
            collected_by="admin@qainstitute.com",
            receipt_number="REC-2026011501",
            status="SUCCESS"
        )
        db.add(payment)

        # 10. Attendance
        attendance = Attendance(
            id=str(uuid.uuid4()),
            institute_id=inst_id,
            student_id=student.id,
            batch_id=batch.id,
            subject_id=subject.id,
            attendance_date=date.today(),
            status="present",
            remarks="Attended physics practical"
        )
        db.add(attendance)

        # 11. Test & Result
        test = Test(
            id=str(uuid.uuid4()),
            institute_id=inst_id,
            batch_id=batch.id,
            subject="Physics",
            title="Electric Current & Circuits Unit Test",
            test_type="Unit Test",
            test_date=datetime.now(),
            total_marks=100,
            passing_marks=35,
            status="Completed"
        )
        db.add(test)
        db.flush()

        result = Result(
            id=str(uuid.uuid4()),
            test_id=test.id,
            student_id=student.id,
            marks_obtained=88.5,
            total_marks=100.0,
            percentage=88.5,
            grade="A",
            remarks="Excellent analytical problem solving"
        )
        db.add(result)

        # 12. Announcement
        announcement = Announcement(
            id=str(uuid.uuid4()),
            institute_id=inst_id,
            title="Mid-Term Physics Exam Schedule Announced",
            message="All Class 10 students please note that physics mid-term exams begin on 15th next month.",
            target_role="all",
            batch_id=batch.id,
            priority="High"
        )
        db.add(announcement)
        db.flush()

        db.commit()
        print("Successfully seeded EduPilot QA Database!")
        print("Admin Login: admin@qainstitute.com / AdminPass@123")
        print("Teacher Login: TCH-26-0001 / TeacherPass@123")
        print("Student Login: STU-26-0001 / StudentPass@123")

    except Exception as e:
        db.rollback()
        print("Error seeding database:", e)
    finally:
        db.close()

if __name__ == "__main__":
    seed()
