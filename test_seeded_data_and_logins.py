import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from app.core.config import settings
from sqlalchemy import create_engine, text
from fastapi.testclient import TestClient
from app.main import app

def verify_seeding():
    print("--- 1. DATABASE RECORD COUNT VERIFICATION ---")
    engine = create_engine(settings.active_database_url)
    
    tables_to_check = [
        "institutes", "branches", "profiles", "teachers", "students",
        "courses", "subjects", "batches", "enrollments", "fees",
        "payments", "attendance", "tests", "results", "announcements"
    ]
    
    counts = {}
    with engine.connect() as conn:
        for tbl in tables_to_check:
            cnt = conn.execute(text(f"SELECT COUNT(*) FROM {tbl}")).scalar()
            counts[tbl] = cnt
            print(f"  {tbl:15s}: {cnt} record(s)")
            
        # Verify QA Institute details
        inst = conn.execute(text("SELECT id, name, code FROM institutes WHERE code = 'QA-INST-01'")).mappings().first()
        print(f"\nQA Institute Record: ID={inst['id']}, Code={inst['code']}, Name='{inst['name']}'")
        
        # Verify password hashes exist without exposing them
        hash_check = conn.execute(text("SELECT count(*) FROM profiles WHERE hashed_password IS NOT NULL AND length(hashed_password) > 20")).scalar()
        print(f"Profiles with Valid Password Hashes: {hash_check} / {counts['profiles']}")
        assert hash_check == counts['profiles'], "Some profiles are missing hashed passwords!"

    print("\n--- 2. REAL HTTP AUTHENTICATION TESTS (/api/v1/auth/login) ---")
    client = TestClient(app)
    
    test_logins = [
        {"role_name": "Admin / Owner", "identifier": "admin@qainstitute.com", "password": "AdminPass@123", "role_type": "admin", "expected_role": "owner"},
        {"role_name": "Teacher", "identifier": "TCH-26-0001", "password": "TeacherPass@123", "role_type": "teacher", "expected_role": "teacher"},
        {"role_name": "Student", "identifier": "STU-26-0001", "password": "StudentPass@123", "role_type": "student", "expected_role": "student"},
    ]
    
    for login in test_logins:
        payload = {
            "identifier": login["identifier"],
            "password": login["password"],
            "roleType": login["role_type"]
        }
        resp = client.post("/api/v1/auth/login", json=payload)
        assert resp.status_code == 200, f"Login failed for {login['role_name']}: {resp.status_code} {resp.text}"
        data = resp.json()
        assert "access_token" in data, f"No access_token returned for {login['role_name']}"
        assert data["token_type"] == "bearer"
        
        user = data["user"]
        print(f"\n[HTTP 200 OK] {login['role_name']} Login Successful!")
        print(f"  User ID: {user['id']}")
        print(f"  Email: {user['email']}")
        print(f"  Role Returned: '{user['role']}' (Expected: '{login['expected_role']}')")
        print(f"  Institute ID Scope: {user['institute_id']} (Matches QA Institute: {user['institute_id'] == inst['id']})")
        assert user["role"] == login["expected_role"], f"Role mismatch: {user['role']} != {login['expected_role']}"
        assert user["institute_id"] == inst["id"], "Institute scope mismatch!"

    print("\n--- ALL SEED & AUTHENTICATION VERIFICATIONS PASSED SUCCESSFULLY ---")

if __name__ == "__main__":
    verify_seeding()
