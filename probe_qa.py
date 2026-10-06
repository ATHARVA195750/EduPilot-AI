import os
import json
import urllib.request

qa_dir = os.path.join(os.environ['TEMP'], 'edupilot_e2e', 'qa')
with open(os.path.join(qa_dir, 'service.txt')) as f:
    service_key = f.read().strip()
with open(os.path.join(qa_dir, 'url.txt')) as f:
    url = f.read().strip()
with open(os.path.join(qa_dir, 'anon.txt')) as f:
    anon_key = f.read().strip()

print("QA URL:", url)

# 1. Fetch Profiles
req = urllib.request.Request(f"{url}/rest/v1/profiles?select=*", headers={
    'apikey': service_key,
    'Authorization': f'Bearer {service_key}'
})
try:
    with urllib.request.urlopen(req) as resp:
        profiles = json.loads(resp.read().decode())
        print("\n--- QA PROFILES ---")
        for p in profiles:
            print(f"ID: {p.get('id')} | Email: {p.get('email')} | Role: {p.get('role')} | Status: {p.get('status')} | Inst: {p.get('institute_id')}")
except Exception as e:
    print("Error fetching profiles:", e)

# 2. Fetch Auth Users via Admin API
req_users = urllib.request.Request(f"{url}/auth/v1/admin/users", headers={
    'apikey': service_key,
    'Authorization': f'Bearer {service_key}'
})
try:
    with urllib.request.urlopen(req_users) as resp:
        users_data = json.loads(resp.read().decode())
        users = users_data.get('users', []) if isinstance(users_data, dict) else users_data
        print("\n--- QA AUTH USERS ---")
        for u in users:
            print(f"ID: {u.get('id')} | Email: {u.get('email')} | Confirmed: {u.get('email_confirmed_at')} | LastSignIn: {u.get('last_sign_in_at')}")
except Exception as e:
    print("Error fetching auth users:", e)

# 3. Test password login attempts for admin users
print("\n--- TESTING PASSWORD LOGINS ---")
test_emails = [
    "first.admin@qa-isolated.example",
    "rival.admin@rival-qa.example",
    "admin@institute.com",
    "admin@qainstitute.com"
]
passwords_to_try = [
    "QApassword123",
    "AdminPass@123",
    "Password@123"
]

for email in test_emails:
    for pwd in passwords_to_try:
        data = json.dumps({"email": email, "password": pwd}).encode('utf-8')
        req_auth = urllib.request.Request(f"{url}/auth/v1/token?grant_type=password", data=data, headers={
            'apikey': anon_key,
            'Content-Type': 'application/json'
        }, method='POST')
        try:
            with urllib.request.urlopen(req_auth) as resp:
                res_body = json.loads(resp.read().decode())
                print(f"SUCCESS login for {email} with password '{pwd[:3]}...' -> user_id={res_body.get('user', {}).get('id')}")
        except urllib.error.HTTPError as he:
            err_text = he.read().decode()
            # print status
        except Exception as ex:
            pass
