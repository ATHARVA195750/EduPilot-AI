import urllib.request
import json
import sys
import uuid

BASE_URL = "http://127.0.0.1:8000/api/v1"

def http_req(method, endpoint, payload=None, headers=None):
    url = f"{BASE_URL}{endpoint}"
    data = json.dumps(payload).encode("utf-8") if payload else None
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    
    req = urllib.request.Request(url, data=data, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            resp_data = resp.read().decode("utf-8")
            return resp.status, json.loads(resp_data) if resp_data else {}
    except urllib.error.HTTPError as e:
        resp_data = e.read().decode("utf-8")
        try:
            body = json.loads(resp_data)
        except Exception:
            body = {"detail": resp_data}
        return e.code, body

def print_result(test_name, success, details=""):
    status = "PASSED" if success else "FAILED"
    print(f"[{status}] {test_name} {f'- {details}' if details else ''}")
    if not success:
        print(f"FAILED DETAILS: {details}")
        sys.exit(1)

def uuid_suffix():
    return uuid.uuid4().hex[:6]

def run_tests():
    print("=== EDUPILOT PRE-PILOT SECURITY & FINANCIAL INTEGRITY SUITE ===")
    
    # -------------------------------------------------------------
    # PHASE 4: REGISTRATION & AUTH WORKFLOW
    # -------------------------------------------------------------
    print("\n--- Phase 4: Registration & Public Auth Workflow ---")
    reg_a_payload = {
        "institute_name": "Alpha Security Academy",
        "admin_name": "Admin Alpha",
        "email": f"admin_alpha_{uuid_suffix()}@test.com",
        "password": "Password@123",
        "phone": "9998887771"
    }
    status, data_a = http_req("POST", "/auth/register-admin", reg_a_payload)
    print_result("Register Institute A", status == 200, f"Status: {status}, Data: {data_a}")
    token_a = data_a["access_token"]
    inst_a_id = data_a["user"]["institute_id"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Verify /auth/me for Institute A Admin
    status_me, data_me = http_req("GET", "/auth/me", headers=headers_a)
    print_result("Get /auth/me Admin A", status_me == 200 and data_me["institute_id"] == inst_a_id, f"Role: {data_me.get('role')}")

    # Register Institute B
    reg_b_payload = {
        "institute_name": "Beta Security Institute",
        "admin_name": "Admin Beta",
        "email": f"admin_beta_{uuid_suffix()}@test.com",
        "password": "Password@123",
        "phone": "9998887772"
    }
    status_b, data_b = http_req("POST", "/auth/register-admin", reg_b_payload)
    print_result("Register Institute B", status_b == 200, f"Status: {status_b}, Data: {data_b}")
    token_b = data_b["access_token"]
    inst_b_id = data_b["user"]["institute_id"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Test Duplicate Registration
    status_dup, data_dup = http_req("POST", "/auth/register-admin", reg_a_payload)
    print_result("Duplicate Registration Rejection", status_dup == 400, f"Detail: {data_dup.get('detail')}")

    # -------------------------------------------------------------
    # PHASE 2: MULTI-TENANT ISOLATION & AUTHORIZATION
    # -------------------------------------------------------------
    print("\n--- Phase 2: Multi-Tenant Isolation & Security ---")
    
    # Create Student in Institute B
    stu_b_payload = {
        "full_name": "Student Beta",
        "phone": "9876543210",
        "email": f"student_beta_{uuid_suffix()}@test.com",
        "gender": "Male",
        "standard": "10th",
        "board": "CBSE"
    }
    status_stu_b, student_b = http_req("POST", "/students", stu_b_payload, headers=headers_b)
    print_result("Create Student in Institute B", status_stu_b == 200, f"Status: {status_stu_b}, Res: {student_b}")
    student_b_id = student_b["id"]
    student_b_token_temp = student_b.get("temp_password")
    student_b_code = student_b.get("student_id_code")

    # Create Teacher in Institute B
    tch_b_payload = {
        "name": "Teacher Beta",
        "phone": "9876543211",
        "email": f"teacher_beta_{uuid_suffix()}@test.com",
        "qualification": "M.Sc Physics",
        "specialization": "Physics",
        "base_salary": 45000.0
    }
    status_tch_b, teacher_b = http_req("POST", "/teachers", tch_b_payload, headers=headers_b)
    print_result("Create Teacher in Institute B", status_tch_b == 200, f"Status: {status_tch_b}, Res: {teacher_b}")
    teacher_b_id = teacher_b["id"]

    # Create Course in Institute B
    course_b_payload = {
        "name": "Physics 101",
        "code": f"PHY-{uuid_suffix()[:4].upper()}",
        "standard": "10th",
        "board": "CBSE"
    }
    status_crs_b, course_b = http_req("POST", "/academics/courses", course_b_payload, headers=headers_b)
    print_result("Create Course in Institute B", status_crs_b == 200, f"Status: {status_crs_b}, Res: {course_b}")
    course_b_id = course_b["id"]

    # Create Batch in Institute B
    batch_b_payload = {
        "course_id": course_b_id,
        "name": "Batch Beta Physics",
        "max_capacity": 30
    }
    status_batch_b, batch_b = http_req("POST", "/academics/batches", batch_b_payload, headers=headers_b)
    print_result("Create Batch in Institute B", status_batch_b == 200, f"Status: {status_batch_b}, Res: {batch_b}")
    batch_b_id = batch_b["id"]

    # CROSS-TENANT TEST 1: Admin A accessing Student B by ID
    status_cross_stu, res_cross_stu = http_req("GET", f"/students/{student_b_id}", headers=headers_a)
    print_result("Cross-Tenant Student Access Blocked", status_cross_stu == 404, f"Status: {status_cross_stu}, Res: {res_cross_stu}")

    # CROSS-TENANT TEST 2: Admin A attempting to edit Student B
    status_cross_upd, res_cross_upd = http_req("PUT", f"/students/{student_b_id}", {"full_name": "Hacked Name"}, headers=headers_a)
    print_result("Cross-Tenant Student Update Blocked", status_cross_upd == 404, f"Status: {status_cross_upd}, Res: {res_cross_upd}")

    # CROSS-TENANT TEST 3: Admin A accessing Teacher B by ID
    status_cross_tch, res_cross_tch = http_req("GET", f"/teachers/{teacher_b_id}", headers=headers_a)
    print_result("Cross-Tenant Teacher Access Blocked", status_cross_tch == 404, f"Status: {status_cross_tch}, Res: {res_cross_tch}")

    # CROSS-TENANT TEST 4: Admin A listing batches (Must NOT include Batch B)
    status_batches_a, batches_a = http_req("GET", "/academics/batches", headers=headers_a)
    batch_ids_a = [b["id"] for b in batches_a]
    print_result("Cross-Tenant Batch Listing Isolated", batch_b_id not in batch_ids_a)

    # CROSS-TENANT TEST 5: Student B authentication & unauthorized access to Admin endpoints
    status_login_stu, login_stu = http_req("POST", "/auth/login", {"identifier": student_b_code, "password": student_b_token_temp, "roleType": "student"})
    print_result("Student B Login", status_login_stu == 200, f"Status: {status_login_stu}, Res: {login_stu}")
    stu_b_auth_token = login_stu["access_token"]
    headers_stu_b = {"Authorization": f"Bearer {stu_b_auth_token}"}

    # Student B attempting to create student (unauthorized role)
    status_stu_create, res_stu_create = http_req("POST", "/students", stu_b_payload, headers=headers_stu_b)
    print_result("Role Security: Student Cannot Create Student", status_stu_create == 403, f"Status: {status_stu_create}, Detail: {res_stu_create.get('detail')}")

    # Student B attempting to access financial summary (unauthorized role)
    status_fin_sum, res_fin_sum = http_req("GET", "/finance/summary", headers=headers_stu_b)
    print_result("Role Security: Student Cannot Access Finance Summary", status_fin_sum == 403, f"Status: {status_fin_sum}, Detail: {res_fin_sum.get('detail')}")

    # -------------------------------------------------------------
    # PHASE 3: FINANCIAL INTEGRITY & CALCULATION VERIFICATION
    # -------------------------------------------------------------
    print("\n--- Phase 3: Financial Integrity & Calculation Verification ---")

    # Create Student in Institute A
    stu_a_payload = {
        "full_name": "Student Alpha Finance",
        "phone": "9123456789",
        "gender": "Female",
        "standard": "12th",
        "board": "State"
    }
    status_stu_a, student_a = http_req("POST", "/students", stu_a_payload, headers=headers_a)
    print_result("Create Student in Institute A", status_stu_a == 200, f"Status: {status_stu_a}, Res: {student_a}")
    student_a_id = student_a["id"]

    # 1. Create Fee Structure: Total = 10,000, Discount = 1,000, Expected Due = 9,000
    fee_payload = {
        "student_id": student_a_id,
        "total_amount": 10000.0,
        "discount_amount": 1000.0
    }
    status_fee, fee = http_req("POST", "/finance/fees", fee_payload, headers=headers_a)
    print_result("Create Fee Structure", status_fee == 200, f"Res: {fee}")
    fee_id = fee["id"]
    print_result("Initial Fee Net Due Calculation (9000.0)", fee["due_amount"] == 9000.0 and fee["paid_amount"] == 0.0 and fee["payment_status"] == "pending")

    # 2. Record Partial Payment 1: Amount = 3,000
    pay1_payload = {
        "fee_id": fee_id,
        "student_id": student_a_id,
        "amount": 3000.0,
        "payment_method": "upi",
        "reference_number": "UPI-111111"
    }
    status_pay1, pay1 = http_req("POST", "/finance/payments", pay1_payload, headers=headers_a)
    print_result("Record Partial Payment 1 (3000.0)", status_pay1 == 200, f"Status: {status_pay1}, Res: {pay1}")

    # Re-fetch Fee to check ledger state
    _, fees_a = http_req("GET", f"/finance/fees?student_id={student_a_id}", headers=headers_a)
    updated_fee_1 = [f for f in fees_a if f["id"] == fee_id][0]
    print_result("Partial Fee Ledger Update (Paid: 3000, Due: 6000, Status: partial)", 
                 updated_fee_1["paid_amount"] == 3000.0 and updated_fee_1["due_amount"] == 6000.0 and updated_fee_1["payment_status"] == "partial")

    # 3. Record Payment 2 (Final Clear): Amount = 6,000
    pay2_payload = {
        "fee_id": fee_id,
        "student_id": student_a_id,
        "amount": 6000.0,
        "payment_method": "card",
        "reference_number": "CARD-222222"
    }
    status_pay2, pay2 = http_req("POST", "/finance/payments", pay2_payload, headers=headers_a)
    print_result("Record Final Payment 2 (6000.0)", status_pay2 == 200)

    # Re-fetch Fee
    _, fees_a2 = http_req("GET", f"/finance/fees?student_id={student_a_id}", headers=headers_a)
    updated_fee_2 = [f for f in fees_a2 if f["id"] == fee_id][0]
    print_result("Fully Paid Fee Ledger Update (Paid: 9000, Due: 0, Status: paid)", 
                 updated_fee_2["paid_amount"] == 9000.0 and updated_fee_2["due_amount"] == 0.0 and updated_fee_2["payment_status"] == "paid")

    # 4. Create Expense: Amount = 1,500
    exp_payload = {
        "category": "Electricity Bill",
        "amount": 1500.0,
        "payment_method": "bank_transfer",
        "description": "Monthly utility bill"
    }
    status_exp, res_exp = http_req("POST", "/finance/expenses", exp_payload, headers=headers_a)
    print_result("Create Expense (1500.0)", status_exp == 200, f"Status: {status_exp}, Res: {res_exp}")

    # Create Teacher in Institute A for Payroll
    status_tch_a, teacher_a = http_req("POST", "/teachers", {"name": "Teacher Alpha Payroll", "base_salary": 50000.0}, headers=headers_a)
    print_result("Create Teacher for Payroll", status_tch_a == 200, f"Status: {status_tch_a}, Res: {teacher_a}")
    teacher_a_id = teacher_a["id"]

    # 5. Create Payroll: Base = 50,000, Allowances = 5,000, Deductions = 2,000 => Net = 53,000
    pay_payload = {
        "teacher_id": teacher_a_id,
        "month": 10,
        "year": 2026,
        "base_salary": 50000.0,
        "allowances": 5000.0,
        "deductions": 2000.0,
        "payment_status": "paid"
    }
    status_payroll, payroll = http_req("POST", "/finance/payroll", pay_payload, headers=headers_a)
    print_result("Create Payroll (Net: 53000.0)", status_payroll == 200 and payroll.get("net_salary") == 53000.0, f"Status: {status_payroll}, Res: {payroll}")

    # Test Duplicate Payroll Prevention
    status_dup_pay, data_dup_pay = http_req("POST", "/finance/payroll", pay_payload, headers=headers_a)
    print_result("Duplicate Payroll Prevention Rejection", status_dup_pay == 400, f"Detail: {data_dup_pay.get('detail')}")

    # 6. Verify Financial Summary Totals
    status_sum, summary = http_req("GET", "/finance/summary", headers=headers_a)
    print_result("Fetch Financial Summary", status_sum == 200, f"Status: {status_sum}, Res: {summary}")
    
    expected_rev = 9000.0
    expected_exp = 54500.0
    expected_net = -45500.0
    
    math_valid = (
        summary["totalRevenue"] == expected_rev and
        summary["totalExpenses"] == expected_exp and
        summary["directExpenses"] == 1500.0 and
        summary["payrollExpenses"] == 53000.0 and
        summary["netIncome"] == expected_net
    )
    print_result("Financial Calculation P&L Consistency", math_valid, f"Rev: {summary['totalRevenue']}, Exp: {summary['totalExpenses']}, Net: {summary['netIncome']}")

    print("\nALL PRE-PILOT SECURITY AND FINANCIAL INTEGRITY AUDITS PASSED PERFECTLY!")

if __name__ == "__main__":
    run_tests()
