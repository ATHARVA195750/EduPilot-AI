from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import date, datetime, time

# Institutes & Branches
class InstituteCreate(BaseModel):
    name: str
    code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None

class BranchCreate(BaseModel):
    name: str
    code: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    is_main_branch: Optional[bool] = False

# Course & Subject
class CourseCreate(BaseModel):
    name: str
    code: Optional[str] = None
    standard: Optional[str] = None
    board: Optional[str] = None
    duration_months: Optional[int] = 12
    base_fee: Optional[float] = 0.0
    description: Optional[str] = None

class SubjectCreate(BaseModel):
    course_id: str
    name: str
    code: Optional[str] = None
    description: Optional[str] = None

# Batch
class BatchCreate(BaseModel):
    course_id: str
    name: str
    teacher_id: Optional[str] = None
    room_number: Optional[str] = None
    max_capacity: Optional[int] = 40
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    schedule_days: Optional[str] = None

# Student & Teacher
class StudentCreate(BaseModel):
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[date] = None
    school_name: Optional[str] = None
    standard: Optional[str] = None
    board: Optional[str] = None
    course_id: Optional[str] = None
    batch_id: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    parent_email: Optional[str] = None

class TeacherCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    qualification: Optional[str] = None
    specialization: Optional[str] = None
    joining_date: Optional[date] = None
    base_salary: Optional[float] = 0.0

# Attendance
class AttendanceRecord(BaseModel):
    student_id: str
    batch_id: Optional[str] = None
    attendance_date: Optional[date] = None
    status: str  # present, absent, late, excused
    subject_id: Optional[str] = None
    remarks: Optional[str] = None

class BulkAttendanceCreate(BaseModel):
    batch_id: Optional[str] = None
    attendance_date: Optional[date] = None
    records: List[AttendanceRecord]

# Fee & Payment
class FeeCreate(BaseModel):
    student_id: str
    total_amount: float
    discount_amount: Optional[float] = 0.0
    due_date: Optional[date] = None

class PaymentCreate(BaseModel):
    fee_id: Optional[str] = None
    student_id: str
    amount: float
    payment_method: str
    reference_number: Optional[str] = None
    collected_by: Optional[str] = None

class ExpenseCreate(BaseModel):
    title: Optional[str] = None
    category: str
    amount: float
    expense_date: Optional[date] = None
    payment_method: Optional[str] = "cash"
    description: Optional[str] = None

class PayrollCreate(BaseModel):
    teacher_id: str
    month: int
    year: int
    base_salary: float
    allowances: Optional[float] = 0.0
    deductions: Optional[float] = 0.0
    payment_status: Optional[str] = "paid"
    payment_method: Optional[str] = "bank_transfer"
    payment_date: Optional[date] = None


# Homework & Test
class HomeworkCreate(BaseModel):
    batch_id: Optional[str] = None
    title: str
    subject: str
    standard: Optional[str] = None
    description: Optional[str] = None
    due_date: datetime
    file_url: Optional[str] = None

class TestCreate(BaseModel):
    batch_id: Optional[str] = None
    subject: str
    title: str
    test_type: Optional[str] = "Weekly Test"
    test_date: Optional[datetime] = None
    duration_minutes: Optional[int] = 60
    total_marks: int = 100
    passing_marks: Optional[int] = 35

class ResultSubmit(BaseModel):
    test_id: str
    student_id: str
    marks_obtained: float
    total_marks: float = 100.0
    remarks: Optional[str] = None

# Announcement & Notification
class AnnouncementCreate(BaseModel):
    title: str
    message: str
    target_role: Optional[str] = "all"
    batch_id: Optional[str] = None
    priority: Optional[str] = "Normal"

# Public Enquiry
class PublicEnquiryCreate(BaseModel):
    student_name: str
    phone: str
    parent_name: Optional[str] = None
    email: Optional[str] = None
    course_interested: Optional[str] = None
    counselling_notes: Optional[str] = None

class StudyMaterialCreate(BaseModel):
    title: str
    subject: Optional[str] = "General"
    description: Optional[str] = None
    batch_id: Optional[str] = None
    subject_id: Optional[str] = None
    material_type: Optional[str] = "document"
    file_url: Optional[str] = None
    external_url: Optional[str] = None
    is_published: Optional[bool] = True


class StudyMaterialUpdate(BaseModel):
    """Partial update payload for PUT /academics/study-materials/{id}.

    Only the fields the model can persist are accepted; unknown keys sent by
    the legacy form (chapter, course_name, batch_name, ...) are ignored.
    """
    title: Optional[str] = None
    subject: Optional[str] = None
    batch_id: Optional[str] = None
    material_type: Optional[str] = None
    file_url: Optional[str] = None
    is_published: Optional[bool] = None


from typing import Union

class ScheduleCreate(BaseModel):
    batch_id: str
    subject_id: Optional[str] = None
    teacher_id: Optional[str] = None
    day_of_week: str
    start_time: Union[time, str]
    end_time: Union[time, str]
    room_number: Optional[str] = None

