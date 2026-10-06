import urllib.request
import json
import pytest
import uuid
from datetime import date

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

def uuid_suffix():
    return uuid.uuid4().hex[:6]

def test_attendance_upsert_no_duplicates():
    # 1. Register Admin
    suffix = uuid_suffix()
    reg_payload = {
        "institute_name": f"Attendance Test Inst {suffix}",
        "admin_name": "Admin Att",
        "email": f"att_admin_{suffix}@test.com",
        "password": "Password@123",
        "phone": "9820001111"
    }
    status_reg, data_reg = http_req("POST", "/auth/register-admin", reg_payload)
    assert status_reg == 200
    token = data_reg["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Course & Batch
    status_c, course = http_req("POST", "/academics/courses", {"name": "Class 10 Science"}, headers=headers)
    assert status_c == 200
    status_b, batch = http_req("POST", "/academics/batches", {"course_id": course["id"], "name": "Morning Batch A"}, headers=headers)
    assert status_b == 200
    batch_id = batch["id"]

    # 3. Create 2 Students in Batch
    status_s1, s1 = http_req("POST", "/students", {"full_name": "Student One", "batch_id": batch_id}, headers=headers)
    assert status_s1 == 200
    status_s2, s2 = http_req("POST", "/students", {"full_name": "Student Two", "batch_id": batch_id}, headers=headers)
    assert status_s2 == 200

    today_str = str(date.today())

    # 4. Mark Initial Attendance: Both Present
    bulk_1 = {
        "batch_id": batch_id,
        "attendance_date": today_str,
        "records": [
            {"student_id": s1["id"], "status": "present"},
            {"student_id": s2["id"], "status": "present"}
        ]
    }
    status_att1, res_att1 = http_req("POST", "/attendance/bulk", bulk_1, headers=headers)
    assert status_att1 == 200

    # Verify 2 records returned via GET
    status_get1, att_list1 = http_req("GET", f"/attendance?batch_id={batch_id}&attendance_date={today_str}", headers=headers)
    assert status_get1 == 200
    assert len(att_list1) == 2
    for item in att_list1:
        assert item["status"] == "present"

    # 5. Re-submit Attendance for same date: Student 1 -> absent, Student 2 -> late
    bulk_2 = {
        "batch_id": batch_id,
        "attendance_date": today_str,
        "records": [
            {"student_id": s1["id"], "status": "absent"},
            {"student_id": s2["id"], "status": "late"}
        ]
    }
    status_att2, res_att2 = http_req("POST", "/attendance/bulk", bulk_2, headers=headers)
    assert status_att2 == 200

    # Verify EXACTLY 2 records exist (0 duplicates) and statuses updated
    status_get2, att_list2 = http_req("GET", f"/attendance?batch_id={batch_id}&attendance_date={today_str}", headers=headers)
    assert status_get2 == 200
    assert len(att_list2) == 2, f"Expected 2 attendance records after upsert, got {len(att_list2)}"
    
    statuses_by_student = {r["student_id"]: r["status"] for r in att_list2}
    assert statuses_by_student[s1["id"]] == "absent"
    assert statuses_by_student[s2["id"]] == "late"
    print("[PASS] Attendance upsert verified: zero duplicate rows created!")
