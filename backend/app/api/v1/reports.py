from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.core.deps import get_current_user, CurrentUserContext
from app.models.all_models import Student, Teacher, Course, Batch, Fee, Payment, Expense, Attendance

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])

from app.models.all_models import Student, Teacher, Course, Batch, Fee, Payment, Expense, Payroll, Attendance, Homework, Test, Announcement, Enquiry

@router.get("/dashboard")
def get_dashboard_data(
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    inst_id = current_user.institute_id
    if not inst_id:
        return {
            "students": [], "teachers": [], "attendance": [], "fees": [],
            "payments": [], "homework": [], "tests": [], "announcements": [],
            "batches": [], "expenses": [], "payroll": [], "enquiries": []
        }

    students = db.query(Student).filter(Student.institute_id == inst_id).all()
    teachers = db.query(Teacher).filter(Teacher.institute_id == inst_id).all()
    attendance = db.query(Attendance).filter(Attendance.institute_id == inst_id).all()
    fees = db.query(Fee).filter(Fee.institute_id == inst_id).all()
    payments = db.query(Payment).filter(Payment.institute_id == inst_id).all()
    homework = db.query(Homework).filter(Homework.institute_id == inst_id).all()
    tests = db.query(Test).filter(Test.institute_id == inst_id).all()
    announcements = db.query(Announcement).filter(Announcement.institute_id == inst_id).all()
    batches = db.query(Batch).filter(Batch.institute_id == inst_id).all()
    expenses = db.query(Expense).filter(Expense.institute_id == inst_id).all()
    payroll = db.query(Payroll).filter(Payroll.institute_id == inst_id).all()
    enquiries = db.query(Enquiry).filter(Enquiry.institute_id == inst_id).all()

    return {
        "students": students,
        "teachers": teachers,
        "attendance": attendance,
        "fees": fees,
        "payments": payments,
        "homework": homework,
        "tests": tests,
        "announcements": announcements,
        "batches": batches,
        "expenses": expenses,
        "payroll": payroll,
        "enquiries": enquiries
    }

@router.get("/dashboard-kpi")
def get_dashboard_kpis(
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    inst_id = current_user.institute_id
    if not inst_id:
        return {"activeStudents": 0, "totalTeachers": 0, "activeBatches": 0, "monthlyRevenue": 0.0}

    active_students = db.query(Student).filter(Student.institute_id == inst_id, Student.status == "Active").count()
    total_teachers = db.query(Teacher).filter(Teacher.institute_id == inst_id, Teacher.status == "Active").count()
    active_batches = db.query(Batch).filter(Batch.institute_id == inst_id, Batch.status == "Active").count()

    total_revenue = db.query(func.sum(Payment.amount)).filter(
        Payment.institute_id == inst_id,
        Payment.status == "SUCCESS"
    ).scalar() or 0.0

    total_expenses = db.query(func.sum(Expense.amount)).filter(
        Expense.institute_id == inst_id
    ).scalar() or 0.0

    rev = float(total_revenue)
    exp = float(total_expenses)

    return {
        "activeStudents": active_students,
        "totalTeachers": total_teachers,
        "activeBatches": active_batches,
        "monthlyRevenue": rev,
        "totalExpenses": exp,
        "netProfit": rev - exp
    }

