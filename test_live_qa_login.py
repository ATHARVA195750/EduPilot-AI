import os
import json
import urllib.request

qa_dir = os.path.join(os.environ['TEMP'], 'edupilot_e2e', 'qa')
with open(os.path.join(qa_dir, 'url.txt')) as f:
    supabase_url = f.read().strip()
with open(os.path.join(qa_dir, 'anon.txt')) as f:
    anon_key = f.read().strip()

print("==================================================")
print("1. CHECKING VITE DEV SERVER AT http://localhost:5173")
print("==================================================")
try:
    req_vite = urllib.request.Request("http://localhost:5173")
    with urllib.request.urlopen(req_vite) as resp:
        print(f"Vite Server Status: {resp.status} OK")
except Exception as e:
    print(f"Vite Server Error: {e}")

print("\n==================================================")
print("2. TESTING ADMIN LOGIN AGAINST QA SUPABASE AUTH")
print("==================================================")
email = "first.admin@qa-isolated.example"
password = "QApassword123"

auth_payload = json.dumps({"email": email, "password": password}).encode('utf-8')
req_auth = urllib.request.Request(
    f"{supabase_url}/auth/v1/token?grant_type=password",
    data=auth_payload,
    headers={
        "apikey": anon_key,
        "Content-Type": "application/json"
    },
    method="POST"
)

access_token = None
user_id = None
try:
    with urllib.request.urlopen(req_auth) as resp:
        body = json.loads(resp.read().decode())
        access_token = body.get("access_token")
        user_id = body.get("user", {}).get("id")
        print(f"SUCCESS: Supabase Auth HTTP 200 OK")
        print(f"User ID: {user_id}")
        print(f"Expires In: {body.get('expires_in')}s")
except Exception as e:
    print(f"FAIL: Supabase Auth Login Error: {e}")

if not access_token:
    print("Cannot proceed with page data verification without access token.")
    exit(1)

print("\n==================================================")
print("3. VERIFYING DEMO ERP DATA ACCESSIBLE WITH ADMIN JWT")
print("==================================================")

auth_headers = {
    "apikey": anon_key,
    "Authorization": f"Bearer {access_token}"
}

endpoints_to_verify = [
    ("Profile (/me)", f"{supabase_url}/rest/v1/profiles?id=eq.{user_id}&select=*"),
    ("Institutes (/dashboard)", f"{supabase_url}/rest/v1/institutes?select=*"),
    ("Students (/students)", f"{supabase_url}/rest/v1/students?select=*"),
    ("Teachers (/teachers)", f"{supabase_url}/rest/v1/teachers?select=*"),
    ("Batches (/batches)", f"{supabase_url}/rest/v1/batches?select=*"),
    ("Courses (/courses)", f"{supabase_url}/rest/v1/courses?select=*"),
    ("Attendance (/attendance)", f"{supabase_url}/rest/v1/attendance?select=*"),
    ("Fees (/fees)", f"{supabase_url}/rest/v1/fees?select=*"),
    ("Payments (/payments)", f"{supabase_url}/rest/v1/payments?select=*"),
    ("Homework (/homework)", f"{supabase_url}/rest/v1/homework?select=*"),
    ("Tests (/tests)", f"{supabase_url}/rest/v1/tests?select=*"),
    ("Announcements (/communication)", f"{supabase_url}/rest/v1/announcements?select=*"),
]

all_passed = True
for label, url in endpoints_to_verify:
    try:
        req = urllib.request.Request(url, headers=auth_headers)
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            count = len(data) if isinstance(data, list) else 1
            print(f"[OK] {label}: HTTP 200 OK ({count} records fetched)")
    except Exception as e:
        print(f"[FAIL] {label}: ERROR {e}")
        all_passed = False

print("\n==================================================")
if all_passed:
    print("ALL DEMO PAGES & ERP ENDPOINTS VERIFIED OPERATIONAL!")
else:
    print("SOME ENDPOINTS HAD ISSUES.")
print("==================================================")
