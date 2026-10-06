import uuid
from datetime import datetime, date, time
from sqlalchemy import (
    Column, String, Text, Boolean, Integer, Numeric, Date, Time, DateTime,
    ForeignKey, UniqueConstraint, CheckConstraint, JSON
)
from sqlalchemy.orm import relationship
from app.db.session import Base

def generate_uuid():
    return str(uuid.uuid4())

class Institute(Base):
    __tablename__ = "institutes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=True)
    logo_url = Column(Text, nullable=True)
    logo = Column(Text, nullable=True)
    address = Column(Text, nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(100), nullable=True)
    website = Column(String(100), nullable=True)
    gstin = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    branches = relationship("Branch", back_populates="institute", cascade="all, delete-orphan")
    profiles = relationship("Profile", back_populates="institute")


class Branch(Base):
    __tablename__ = "branches"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institute_id = Column(String(36), ForeignKey("institutes.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    code = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    phone = Column(String(50), nullable=True)
    is_main_branch = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    institute = relationship("Institute", back_populates="branches")


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institute_id = Column(String(36), ForeignKey("institutes.id", ondelete="SET NULL"), nullable=True)
    branch_id = Column(String(36), ForeignKey("branches.id", ondelete="SET NULL"), nullable=True)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)
    full_name = Column(String(255), nullable=True)
    role = Column(String(50), nullable=False)  # owner, admin, teacher, student
    phone = Column(String(50), nullable=True)
    avatar_url = Column(Text, nullable=True)
    status = Column(String(50), default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    institute = relationship("Institute", back_populates="profiles")


class Course(Base):
    __tablename__ = "courses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institute_id = Column(String(36), ForeignKey("institutes.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    code = Column(String(50), nullable=True)
    standard = Column(String(100), nullable=True)
    board = Column(String(100), nullable=True)
    duration_months = Column(Integer, default=12)
    base_fee = Column(Numeric(12, 2), default=0.00)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)

    subjects = relationship("Subject", back_populates="course", cascade="all, delete-orphan")


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    course_id = Column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    code = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    course = relationship("Course", back_populates="subjects")


class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institute_id = Column(String(36), ForeignKey("institutes.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    teacher_id_code = Column(String(50), unique=True, nullable=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    qualification = Column(Text, nullable=True)
    specialization = Column(Text, nullable=True)
    joining_date = Column(Date, nullable=True)
    base_salary = Column(Numeric(12, 2), default=0.00)
    status = Column(String(50), default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)


class Batch(Base):
    __tablename__ = "batches"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institute_id = Column(String(36), ForeignKey("institutes.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    teacher_id = Column(String(36), ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(255), nullable=False)
    room_number = Column(String(50), nullable=True)
    max_capacity = Column(Integer, default=40)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    schedule_days = Column(String(100), nullable=True)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    status = Column(String(50), default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)


class TeacherAssignment(Base):
    __tablename__ = "teacher_assignments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institute_id = Column(String(36), ForeignKey("institutes.id", ondelete="CASCADE"), nullable=False)
    teacher_id = Column(String(36), ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    batch_id = Column(String(36), ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=True)
    assigned_at = Column(DateTime, default=datetime.utcnow)


class Student(Base):
    __tablename__ = "students"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institute_id = Column(String(36), ForeignKey("institutes.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    student_id_code = Column(String(50), unique=True, nullable=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    gender = Column(String(20), nullable=True)
    dob = Column(Date, nullable=True)
    address = Column(Text, nullable=True)
    school_name = Column(String(255), nullable=True)
    standard = Column(String(100), nullable=True)
    board = Column(String(100), nullable=True)
    course_id = Column(String(36), ForeignKey("courses.id", ondelete="SET NULL"), nullable=True)
    batch_id = Column(String(36), ForeignKey("batches.id", ondelete="SET NULL"), nullable=True)
    parent_name = Column(String(255), nullable=True)
    parent_relation = Column(String(50), default="Parent")
    parent_phone = Column(String(50), nullable=True)
    parent_email = Column(String(255), nullable=True)
    emergency_contact = Column(String(50), nullable=True)
    admission_date = Column(Date, default=date.today)
    status = Column(String(50), default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    enrollments = relationship("Enrollment", backref="student_rel", cascade="all, delete-orphan")


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    batch_id = Column(String(36), ForeignKey("batches.id", ondelete="CASCADE"), nullable=True)
    enrolled_on = Column(Date, default=date.today)
    status = Column(String(50), default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)

    course = relationship("Course")
    batch = relationship("Batch")


class Enquiry(Base):
    __tablename__ = "enquiries"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institute_id = Column(String(36), ForeignKey("institutes.id", ondelete="CASCADE"), nullable=False)
    student_name = Column(String(255), nullable=False)
    parent_name = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=False)
    email = Column(String(255), nullable=True)
    school_name = Column(String(255), nullable=True)
    standard = Column(String(100), nullable=True)
    course_interested = Column(String(255), nullable=True)
    source = Column(String(100), nullable=True)
    status = Column(String(50), default="NEW")
    follow_up_date = Column(Date, nullable=True)
    counselling_notes = Column(Text, nullable=True)
    assigned_staff = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institute_id = Column(String(36), ForeignKey("institutes.id", ondelete="CASCADE"), nullable=False)
    batch_id = Column(String(36), ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=True)
    teacher_id = Column(String(36), ForeignKey("teachers.id", ondelete="CASCADE"), nullable=True)
    room_number = Column(String(50), nullable=True)
    day_of_week = Column(String(20), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Attendance(Base):
    __tablename__ = "attendance"
    __table_args__ = (
        UniqueConstraint('institute_id', 'student_id', 'attendance_date', name='uq_attendance_student_date'),
    )

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institute_id = Column(String(36), ForeignKey("institutes.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    batch_id = Column(String(36), ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(String(36), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    attendance_date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False)  # present, absent, late, excused
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Fee(Base):
    __tablename__ = "fees"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institute_id = Column(String(36), ForeignKey("institutes.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    total_amount = Column(Numeric(12, 2), nullable=False, default=0.00)
    paid_amount = Column(Numeric(12, 2), nullable=False, default=0.00)
    due_amount = Column(Numeric(12, 2), nullable=False, default=0.00)
    discount_amount = Column(Numeric(12, 2), default=0.00)
    due_date = Column(Date, nullable=True)
    payment_status = Column(String(50), default="pending")  # paid, partial, pending, overdue
    created_at = Column(DateTime, default=datetime.utcnow)


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institute_id = Column(String(36), ForeignKey("institutes.id", ondelete="CASCADE"), nullable=False)
    fee_id = Column(String(36), ForeignKey("fees.id", ondelete="SET NULL"), nullable=True)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    payment_date = Column(DateTime, default=datetime.utcnow)
    payment_method = Column(String(50), nullable=False)
    reference_number = Column(String(100), nullable=True)
    collected_by = Column(String(255), nullable=True)
    receipt_number = Column(String(100), unique=True, nullable=True)
    status = Column(String(50), default="SUCCESS")
    created_at = Column(DateTime, default=datetime.utcnow)


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institute_id = Column(String(36), ForeignKey("institutes.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    expense_date = Column(Date, default=date.today)
    payment_method = Column(String(50), default="Cash")
    description = Column(Text, nullable=True)
    added_by = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Payroll(Base):
    __tablename__ = "payroll"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institute_id = Column(String(36), ForeignKey("institutes.id", ondelete="CASCADE"), nullable=False)
    teacher_id = Column(String(36), ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    month_year = Column(String(20), nullable=False)
    base_salary = Column(Numeric(12, 2), nullable=False)
    bonus = Column(Numeric(12, 2), default=0.00)
    deductions = Column(Numeric(12, 2), default=0.00)
    net_salary = Column(Numeric(12, 2), nullable=False)
    payment_status = Column(String(50), default="PENDING")
    payment_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Test(Base):
    __tablename__ = "tests"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institute_id = Column(String(36), ForeignKey("institutes.id", ondelete="CASCADE"), nullable=False)
    batch_id = Column(String(36), ForeignKey("batches.id", ondelete="SET NULL"), nullable=True)
    subject = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    test_type = Column(String(50), default="Weekly Test")
    test_date = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, default=60)
    total_marks = Column(Integer, nullable=False, default=100)
    passing_marks = Column(Integer, default=35)
    instructions = Column(Text, nullable=True)
    status = Column(String(50), default="Scheduled")
    created_at = Column(DateTime, default=datetime.utcnow)


class Result(Base):
    __tablename__ = "results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    test_id = Column(String(36), ForeignKey("tests.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    marks_obtained = Column(Numeric(6, 2), nullable=False)
    total_marks = Column(Numeric(6, 2), nullable=False, default=100.00)
    percentage = Column(Numeric(5, 2), nullable=True)
    grade = Column(String(10), nullable=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Homework(Base):
    __tablename__ = "homework"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institute_id = Column(String(36), ForeignKey("institutes.id", ondelete="CASCADE"), nullable=False)
    batch_id = Column(String(36), ForeignKey("batches.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    subject = Column(String(100), nullable=False)
    standard = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    due_date = Column(DateTime, nullable=False)
    file_url = Column(Text, nullable=True)
    created_by = Column(String(36), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class StudyMaterial(Base):
    __tablename__ = "study_materials"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institute_id = Column(String(36), ForeignKey("institutes.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(String(36), ForeignKey("courses.id", ondelete="SET NULL"), nullable=True)
    batch_id = Column(String(36), ForeignKey("batches.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    subject = Column(String(100), nullable=False)
    chapter = Column(String(255), nullable=True)
    material_type = Column(String(50), nullable=False)
    file_url = Column(Text, nullable=False)
    # Draft/Published workflow: students only ever receive published rows.
    is_published = Column(Boolean, nullable=False, default=True, server_default="true")
    uploaded_by = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institute_id = Column(String(36), ForeignKey("institutes.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    target_role = Column(String(50), default="all")
    batch_id = Column(String(36), ForeignKey("batches.id", ondelete="SET NULL"), nullable=True)
    test_id = Column(String(36), ForeignKey("tests.id", ondelete="CASCADE"), nullable=True)
    priority = Column(String(20), default="Normal")
    created_at = Column(DateTime, default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institute_id = Column(String(36), ForeignKey("institutes.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="info")
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institute_id = Column(String(36), ForeignKey("institutes.id", ondelete="CASCADE"), nullable=True)
    user_id = Column(String(36), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    user_email = Column(String(255), nullable=True)
    action = Column(String(100), nullable=False)
    entity = Column(String(100), nullable=False)
    entity_id = Column(String(100), nullable=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institute_id = Column(String(36), ForeignKey("institutes.id", ondelete="CASCADE"), nullable=False)
    payment_id = Column(String(36), ForeignKey("payments.id", ondelete="RESTRICT"), nullable=False, unique=True)
    invoice_number = Column(String(100), nullable=False)
    status = Column(String(50), default="paid")
    payment_date = Column(Date, nullable=True)
    payment_method = Column(String(50), nullable=True)
    reference_number = Column(String(100), nullable=True)
    receipt_number = Column(String(100), nullable=True)
    amount_paid = Column(Numeric(12, 2), nullable=False)
    fee_total = Column(Numeric(12, 2), nullable=True)
    previous_due = Column(Numeric(12, 2), nullable=True)
    remaining_due = Column(Numeric(12, 2), nullable=True)
    student_id = Column(String(36), nullable=True)
    student_name = Column(String(255), nullable=True)
    student_code = Column(String(50), nullable=True)
    batch_name = Column(String(255), nullable=True)
    course_name = Column(String(255), nullable=True)
    institute_name = Column(String(255), nullable=True)
    institute_address = Column(Text, nullable=True)
    institute_phone = Column(String(50), nullable=True)
    institute_email = Column(String(255), nullable=True)
    institute_gstin = Column(String(50), nullable=True)
    institute_logo = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
