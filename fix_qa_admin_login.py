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

# Target emails to ensure for QA Admin demo:
# 1. admin@institute.com (Common default demo email)
# 2. first.admin@qa-isolated.example (Existing QA test fixture email)

tenant_a = "b9a88af8-7739-4e84-9eb4-d426e6da769b"

def ensure_qa_admin(email, password):
    print(f"\n--- Ensuring QA Admin Account: {email} ---")
    
    # 1. Check if auth user exists
    req_users = urllib.request.Request(f"{url}/auth/v1/admin/users", headers={
        'apikey': service_key,
        'Authorization': f'Bearer {service_key}'
    })
    user_id = None
    with urllib.request.urlopen(req_users) as resp:
        users_data = json.loads(resp.read().decode())
        users = users_data.get('users', []) if isinstance(users_data, dict) else users_data
        for u in users:
            if u.get('email') == email:
                user_id = u.get('id')
                break

    if not user_id:
        print(f"Creating new auth user for {email}...")
        create_payload = json.dumps({
            "email": email,
            "password": password,
            "email_confirm": True
        }).encode('utf-8')
        req_create = urllib.request.Request(f"{url}/auth/v1/admin/users", data=create_payload, headers={
            'apikey': service_key,
            'Authorization': f'Bearer {service_key}',
            'Content-Type': 'application/json'
        }, method='POST')
        with urllib.request.urlopen(req_create) as resp:
            created = json.loads(resp.read().decode())
            user_id = created.get('id')
            print(f"Auth user created with ID: {user_id}")
    else:
        print(f"Auth user already exists with ID: {user_id}. Updating password...")
        update_payload = json.dumps({
            "password": password,
            "email_confirm": True
        }).encode('utf-8')
        req_update = urllib.request.Request(f"{url}/auth/v1/admin/users/{user_id}", data=update_payload, headers={
            'apikey': service_key,
            'Authorization': f'Bearer {service_key}',
            'Content-Type': 'application/json'
        }, method='PUT')
        with urllib.request.urlopen(req_update) as resp:
            print("Password updated successfully.")

    # 2. Ensure profile exists and is active owner/admin
    req_prof = urllib.request.Request(f"{url}/rest/v1/profiles?id=eq.{user_id}", headers={
        'apikey': service_key,
        'Authorization': f'Bearer {service_key}'
    })
    with urllib.request.urlopen(req_prof) as resp:
        profs = json.loads(resp.read().decode())
        if not profs:
            print(f"Creating profile for {user_id}...")
            prof_payload = json.dumps({
                "id": user_id,
                "institute_id": tenant_a,
                "email": email,
                "full_name": "EduPilot Institute Admin",
                "role": "owner",
                "status": "Active"
            }).encode('utf-8')
            req_inst_prof = urllib.request.Request(f"{url}/rest/v1/profiles", data=prof_payload, headers={
                'apikey': service_key,
                'Authorization': f'Bearer {service_key}',
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }, method='POST')
            with urllib.request.urlopen(req_inst_prof) as resp2:
                print("Profile created:", resp2.read().decode())
        else:
            print(f"Updating profile status to Active and role to owner...")
            upd_payload = json.dumps({
                "status": "Active",
                "role": "owner",
                "institute_id": tenant_a
            }).encode('utf-8')
            req_upd_prof = urllib.request.Request(f"{url}/rest/v1/profiles?id=eq.{user_id}", data=upd_payload, headers={
                'apikey': service_key,
                'Authorization': f'Bearer {service_key}',
                'Content-Type': 'application/json'
            }, method='PATCH')
            with urllib.request.urlopen(req_upd_prof) as resp3:
                print("Profile updated.")

    # 3. Test authenticating via token API
    data_login = json.dumps({"email": email, "password": password}).encode('utf-8')
    req_auth = urllib.request.Request(f"{url}/auth/v1/token?grant_type=password", data=data_login, headers={
        'apikey': anon_key,
        'Content-Type': 'application/json'
    }, method='POST')
    try:
        with urllib.request.urlopen(req_auth) as resp:
            login_res = json.loads(resp.read().decode())
            print(f"VERIFIED LOGIN SUCCESSFUL for {email}! Token received.")
    except Exception as ex:
        print(f"Login failed for {email}: {ex}")

ensure_qa_admin("admin@institute.com", "AdminPass@123")
ensure_qa_admin("first.admin@qa-isolated.example", "QApassword123")
