from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user, CurrentUserContext
from app.models.all_models import Fee, Payment, Expense, Payroll, Invoice, Student, Institute
from app.schemas.erp import FeeCreate, PaymentCreate
import uuid
import datetime

router = APIRouter(prefix="/finance", tags=["Finance & Billing"])

@router.get("/fees")
def list_fees(
    student_id: str = None,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Fee).filter(Fee.institute_id == current_user.institute_id)
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
            query = query.filter(Fee.student_id == student.id)
        else:
            query = query.filter(Fee.id == "none")
    elif student_id:
        query = query.filter(Fee.student_id == student_id)
    return query.all()

@router.post("/fees")
def create_fee(
    payload: FeeCreate,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Permission denied")

    total = payload.total_amount
    disc = payload.discount_amount or 0.0
    due = max(0.0, total - disc)

    fee = Fee(
        id=str(uuid.uuid4()),
        institute_id=current_user.institute_id,
        student_id=payload.student_id,
        total_amount=total,
        discount_amount=disc,
        paid_amount=0.0,
        due_amount=due,
        due_date=payload.due_date,
        payment_status="pending" if due > 0 else "paid"
    )
    db.add(fee)
    db.commit()
    db.refresh(fee)
    return fee

@router.put("/fees/{fee_id}")
def update_fee(
    fee_id: str,
    payload: Dict[str, Any],
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Permission denied")
    fee = db.query(Fee).filter(
        Fee.id == fee_id,
        Fee.institute_id == current_user.institute_id
    ).first()
    if not fee:
        raise HTTPException(status_code=404, detail="Fee record not found")
    allowed = {"total_amount", "discount_amount", "due_amount", "due_date", "payment_status"}
    for field, value in payload.items():
        if field in allowed and hasattr(fee, field):
            setattr(fee, field, value)
    db.commit()
    db.refresh(fee)
    return fee

@router.get("/payments")
def list_payments(
    student_id: str = None,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Payment).filter(Payment.institute_id == current_user.institute_id)
    if current_user.role == "student":
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if student:
            query = query.filter(Payment.student_id == student.id)
    elif student_id:
        query = query.filter(Payment.student_id == student_id)
    return query.all()

@router.post("/payments")
def record_payment(
    payload: PaymentCreate,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role not in ["owner", "admin"]:
            raise HTTPException(status_code=403, detail="Permission denied")

        # Generate receipt number
        receipt_no = f"REC-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"

        payment = Payment(
            id=str(uuid.uuid4()),
            institute_id=current_user.institute_id,
            fee_id=payload.fee_id,
            student_id=payload.student_id,
            amount=payload.amount,
            payment_method=payload.payment_method,
            reference_number=payload.reference_number,
            collected_by=payload.collected_by or current_user.email,
            receipt_number=receipt_no,
            status="SUCCESS"
        )
        db.add(payment)
        db.flush()

        # Update fee ledger safely
        if payload.fee_id:
            fee = db.query(Fee).filter(Fee.id == payload.fee_id, Fee.institute_id == current_user.institute_id).first()
            if fee:
                paid_curr = float(fee.paid_amount or 0.0)
                total_curr = float(fee.total_amount or 0.0)
                disc_curr = float(fee.discount_amount or 0.0)
                pay_amt = float(payload.amount or 0.0)

                fee.paid_amount = paid_curr + pay_amt
                net_total = max(0.0, total_curr - disc_curr)
                fee.due_amount = max(0.0, net_total - fee.paid_amount)
                if fee.due_amount <= 0:
                    fee.payment_status = "paid"
                else:
                    fee.payment_status = "partial"

        # Auto generate Invoice snapshot
        student = db.query(Student).filter(Student.id == payload.student_id).first()
        inst = db.query(Institute).filter(Institute.id == current_user.institute_id).first()
        inv_no = f"INV-{datetime.datetime.now().year}-{uuid.uuid4().hex[:6].upper()}"

        invoice = Invoice(
            id=str(uuid.uuid4()),
            institute_id=current_user.institute_id,
            payment_id=payment.id,
            invoice_number=inv_no,
            status="paid",
            payment_date=datetime.date.today(),
            payment_method=payload.payment_method,
            reference_number=payload.reference_number,
            receipt_number=receipt_no,
            amount_paid=payload.amount,
            student_id=student.id if student else None,
            student_name=student.full_name if student else None,
            student_code=student.student_id_code if student else None,
            institute_name=inst.name if inst else None,
            institute_address=inst.address if inst else None,
            institute_phone=inst.phone if inst else None,
            institute_email=inst.email if inst else None
        )
        db.add(invoice)

        db.commit()
        db.refresh(payment)
        return payment
    except HTTPException:
        raise
    except Exception as err:
        import traceback
        tb = traceback.format_exc()
        print("RECORD_PAYMENT ERROR TRACE:\n", tb)
        raise HTTPException(status_code=500, detail=f"ERR: {str(err)} | TRACE: {tb[:300]}")

from app.schemas.erp import FeeCreate, PaymentCreate, ExpenseCreate, PayrollCreate

# ... (keep existing imports above)

@router.post("/expenses")
def create_expense(
    payload: ExpenseCreate,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role not in ["owner", "admin"]:
            raise HTTPException(status_code=403, detail="Permission denied")

        expense = Expense(
            id=str(uuid.uuid4()),
            institute_id=current_user.institute_id,
            title=payload.title or payload.category or "Expense",
            category=payload.category,
            amount=payload.amount,
            expense_date=payload.expense_date or datetime.date.today(),
            payment_method=payload.payment_method or "cash",
            description=payload.description
        )
        db.add(expense)
        db.commit()
        db.refresh(expense)
        return expense
    except HTTPException:
        raise
    except Exception as err:
        import traceback
        tb = traceback.format_exc()
        print("CREATE_EXPENSE ERROR TRACE:\n", tb)
        raise HTTPException(status_code=500, detail=f"ERR: {str(err)} | TRACE: {tb[:300]}")

@router.get("/expenses")
def list_expenses(current_user: CurrentUserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Permission denied")
    return db.query(Expense).filter(Expense.institute_id == current_user.institute_id).all()

@router.post("/payroll")
def create_payroll(
    payload: PayrollCreate,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role not in ["owner", "admin"]:
            raise HTTPException(status_code=403, detail="Permission denied")

        m_yr = f"{payload.year}-{payload.month:02d}"

        # Duplicate check for teacher_id + month_year
        existing = db.query(Payroll).filter(
            Payroll.institute_id == current_user.institute_id,
            Payroll.teacher_id == payload.teacher_id,
            Payroll.month_year == m_yr
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Payroll record already exists for this teacher and period")

        net_sal = max(0.0, payload.base_salary + (payload.allowances or 0.0) - (payload.deductions or 0.0))

        payroll = Payroll(
            id=str(uuid.uuid4()),
            institute_id=current_user.institute_id,
            teacher_id=payload.teacher_id,
            month_year=m_yr,
            base_salary=payload.base_salary,
            bonus=payload.allowances or 0.0,
            deductions=payload.deductions or 0.0,
            net_salary=net_sal,
            payment_status=payload.payment_status or "PAID",
            payment_date=payload.payment_date or datetime.date.today()
        )
        db.add(payroll)
        db.commit()
        db.refresh(payroll)
        return {
            "id": payroll.id,
            "institute_id": payroll.institute_id,
            "teacher_id": payroll.teacher_id,
            "month_year": payroll.month_year,
            "month": payload.month,
            "year": payload.year,
            "base_salary": float(payroll.base_salary),
            "allowances": float(payroll.bonus or 0.0),
            "deductions": float(payroll.deductions or 0.0),
            "net_salary": float(payroll.net_salary),
            "payment_status": payroll.payment_status,
            "payment_date": payroll.payment_date.isoformat() if payroll.payment_date else None,
            "created_at": payroll.created_at.isoformat() if payroll.created_at else None
        }
    except HTTPException:
        raise
    except Exception as err:
        import traceback
        tb = traceback.format_exc()
        print("CREATE_PAYROLL ERROR TRACE:\n", tb)
        raise HTTPException(status_code=500, detail=f"ERR: {str(err)} | TRACE: {tb[:300]}")

@router.get("/payroll")
def list_payroll(current_user: CurrentUserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Permission denied")
    return db.query(Payroll).filter(Payroll.institute_id == current_user.institute_id).all()

@router.get("/invoices")
def list_invoices(current_user: CurrentUserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["owner", "admin", "student"]:
        raise HTTPException(status_code=403, detail="Permission denied")
    query = db.query(Invoice).filter(Invoice.institute_id == current_user.institute_id)
    if current_user.role == "student":
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if student:
            query = query.filter(Invoice.student_id == student.id)
    return query.all()

@router.get("/summary")
def get_financial_summary(current_user: CurrentUserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Permission denied")

    payments = db.query(Payment).filter(Payment.institute_id == current_user.institute_id, Payment.status == "SUCCESS").all()
    expenses = db.query(Expense).filter(Expense.institute_id == current_user.institute_id).all()
    payrolls = db.query(Payroll).filter(Payroll.institute_id == current_user.institute_id).all()

    total_revenue = sum(float(p.amount or 0.0) for p in payments)
    direct_expenses = sum(float(e.amount or 0.0) for e in expenses)
    payroll_expenses = sum(float(p.net_salary or 0.0) for p in payrolls)
    total_expenses = direct_expenses + payroll_expenses
    net_income = total_revenue - total_expenses
    margin = (net_income / total_revenue * 100.0) if total_revenue > 0 else 0.0

    return {
        "totalRevenue": total_revenue,
        "totalExpenses": total_expenses,
        "directExpenses": direct_expenses,
        "payrollExpenses": payroll_expenses,
        "netIncome": net_income,
        "marginPercentage": f"{margin:.1f}"
    }

