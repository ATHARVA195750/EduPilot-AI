import sys
import os
import pytest
from fastapi.testclient import TestClient

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

client = TestClient(app)

def test_health():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_db_health():
    response = client.get("/api/v1/health/db")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "connected"
    assert data["transaction_test"] == "passed"

def test_public_institute():
    response = client.get("/api/v1/institutes/public")
    assert response.status_code == 200
    data = response.json()
    assert "name" in data
    assert data["name"] == "EduPilot QA Academy"

def test_public_enquiry():
    response = client.post("/api/v1/institutes/public/enquiry", json={
        "student_name": "Test Prospect",
        "phone": "+91 9999999999",
        "parent_name": "Parent Prospect",
        "course_interested": "Class 10 CBSE Science Complete"
    })
    assert response.status_code == 200
    assert "id" in response.json()

def test_admin_login_success():
    response = client.post("/api/v1/auth/login", json={
        "identifier": "admin@qainstitute.com",
        "password": "AdminPass@123",
        "roleType": "admin"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "owner"

def test_teacher_login_success():
    response = client.post("/api/v1/auth/login", json={
        "identifier": "TCH-26-0001",
        "password": "TeacherPass@123",
        "roleType": "teacher"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "teacher"

def test_student_login_success():
    response = client.post("/api/v1/auth/login", json={
        "identifier": "STU-26-0001",
        "password": "StudentPass@123",
        "roleType": "student"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "student"

def test_login_invalid_password():
    response = client.post("/api/v1/auth/login", json={
        "identifier": "admin@qainstitute.com",
        "password": "WrongPassword",
        "roleType": "admin"
    })
    assert response.status_code == 400
    assert "Invalid email or password." in response.json()["detail"]

def test_me_profile_and_authorization():
    # Login as admin
    login_res = client.post("/api/v1/auth/login", json={
        "identifier": "admin@qainstitute.com",
        "password": "AdminPass@123",
        "roleType": "admin"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "admin@qainstitute.com"

def test_student_financial_ai_restriction():
    # Login as student
    login_res = client.post("/api/v1/auth/login", json={
        "identifier": "STU-26-0001",
        "password": "StudentPass@123",
        "roleType": "student"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Student trying to query AI about financial topics should be rejected
    ai_res = client.post("/api/v1/ai/tutor", json={
        "prompt": "Show me total institute fee revenue and teacher salaries"
    }, headers=headers)

    assert ai_res.status_code == 403
    assert "Access denied" in ai_res.json()["detail"]

def test_dashboard_kpis():
    login_res = client.post("/api/v1/auth/login", json={
        "identifier": "admin@qainstitute.com",
        "password": "AdminPass@123",
        "roleType": "admin"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    kpi_res = client.get("/api/v1/reports/dashboard-kpi", headers=headers)
    assert kpi_res.status_code == 200
    data = kpi_res.json()
    assert data["activeStudents"] >= 1
    assert data["totalTeachers"] >= 1
    assert data["monthlyRevenue"] >= 20000.0

def test_create_student_serialization_and_persistence():
    # 1. Login as admin
    login_res = client.post("/api/v1/auth/login", json={
        "identifier": "admin@qainstitute.com",
        "password": "AdminPass@123",
        "roleType": "admin"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Post new student
    payload = {
        "full_name": "QA Temp Verification Student",
        "email": "qa.verification.temp@example.com",
        "phone": "+91 9876543210",
        "gender": "Male",
        "standard": "Class 10th",
        "board": "CBSE",
        "parent_name": "QA Parent",
        "parent_phone": "+91 9876543211"
    }
    create_res = client.post("/api/v1/students", json=payload, headers=headers)
    assert create_res.status_code == 200, f"Student creation failed: {create_res.text}"
    
    created_data = create_res.json()
    assert "_sa_instance_state" not in created_data
    assert created_data["full_name"] == "QA Temp Verification Student"
    assert created_data["temp_password"] == "Password@123"
    assert "student_id_code" in created_data
    assert created_data["student_id_code"].startswith("STU-")
    created_id = created_data["id"]

    # 3. Verify student appears in roster alongside existing seeded student
    list_res = client.get("/api/v1/students", headers=headers)
    assert list_res.status_code == 200
    all_students = list_res.json()
    student_ids = [s["id"] for s in all_students]
    student_codes = [s.get("student_id_code") for s in all_students]

    assert created_id in student_ids, "Newly created student not found in directory"
    assert "STU-26-0001" in student_codes, "Seeded student STU-26-0001 was missing or modified"

    # 4. Clean up disposable test record from DB
    from app.db.session import SessionLocal
    from app.models.all_models import Student, Profile
    db = SessionLocal()
    try:
        st = db.query(Student).filter(Student.id == created_id).first()
        if st:
            user_id = st.user_id
            db.delete(st)
            if user_id:
                prof = db.query(Profile).filter(Profile.id == user_id).first()
                if prof:
                    db.delete(prof)
            db.commit()
    finally:
        db.close()

def test_branch_crud():
    login_res = client.post("/api/v1/auth/login", json={
        "identifier": "admin@qainstitute.com",
        "password": "AdminPass@123",
        "roleType": "admin"
    })
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # 1. List branches
    res = client.get("/api/v1/institutes/branches", headers=headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)

    # 2. Create branch
    create_res = client.post("/api/v1/institutes/branches", json={
        "name": "QA Test Branch",
        "code": "QA-BR-01",
        "address": "123 Test Street",
        "phone": "+91 9999900000"
    }, headers=headers)
    assert create_res.status_code == 200
    branch_data = create_res.json()
    assert branch_data["name"] == "QA Test Branch"
    branch_id = branch_data["id"]

    # 3. Clean up branch
    from app.db.session import SessionLocal
    from app.models.all_models import Branch
    db = SessionLocal()
    try:
        b = db.query(Branch).filter(Branch.id == branch_id).first()
        if b:
            db.delete(b)
            db.commit()
    finally:
        db.close()

def test_teacher_crud():
    login_res = client.post("/api/v1/auth/login", json={
        "identifier": "admin@qainstitute.com",
        "password": "AdminPass@123",
        "roleType": "admin"
    })
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # 1. Create teacher (verify JSON serialization)
    create_res = client.post("/api/v1/teachers", json={
        "name": "QA Test Teacher",
        "email": "qa.teacher.test@example.com",
        "phone": "+91 9876543212",
        "qualification": "M.Sc Physics",
        "specialization": "Physics"
    }, headers=headers)
    assert create_res.status_code == 200
    tch = create_res.json()
    assert "_sa_instance_state" not in tch
    assert tch["name"] == "QA Test Teacher"
    assert tch["temp_password"] == "Password@123"
    tch_id = tch["id"]

    # 2. Update teacher
    update_res = client.put(f"/api/v1/teachers/{tch_id}", json={
        "qualification": "Ph.D Physics"
    }, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json()["qualification"] == "Ph.D Physics"

    # 3. Clean up teacher
    from app.db.session import SessionLocal
    from app.models.all_models import Teacher, Profile
    db = SessionLocal()
    try:
        t = db.query(Teacher).filter(Teacher.id == tch_id).first()
        if t:
            u_id = t.user_id
            db.delete(t)
            if u_id:
                p = db.query(Profile).filter(Profile.id == u_id).first()
                if p:
                    db.delete(p)
            db.commit()
    finally:
        db.close()

def test_enquiry_crud():
    login_res = client.post("/api/v1/auth/login", json={
        "identifier": "admin@qainstitute.com",
        "password": "AdminPass@123",
        "roleType": "admin"
    })
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # 1. Create enquiry
    create_res = client.post("/api/v1/academics/enquiries", json={
        "student_name": "QA Prospect Student",
        "phone": "+91 9123456789",
        "course_interested": "Class 10 CBSE",
        "source": "Website"
    }, headers=headers)
    assert create_res.status_code == 200
    enq = create_res.json()
    assert enq["student_name"] == "QA Prospect Student"
    enq_id = enq["id"]

    # 2. List enquiries
    list_res = client.get("/api/v1/academics/enquiries", headers=headers)
    assert list_res.status_code == 200
    enq_ids = [e["id"] for e in list_res.json()]
    assert enq_id in enq_ids

    # 3. Update enquiry
    update_res = client.put(f"/api/v1/academics/enquiries/{enq_id}", json={
        "status": "contacted"
    }, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "contacted"

    # 4. Clean up enquiry
    from app.db.session import SessionLocal
    from app.models.all_models import Enquiry
    db = SessionLocal()
    try:
        e = db.query(Enquiry).filter(Enquiry.id == enq_id).first()
        if e:
            db.delete(e)
            db.commit()
    finally:
        db.close()


