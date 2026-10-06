import urllib.request
import urllib.parse
import json

BASE_URL = 'http://127.0.0.1:8000/api/v1'

def request_json(url, data=None, headers=None, method='GET'):
    if headers is None:
        headers = {}
    body = json.dumps(data).encode('utf-8') if data is not None else None
    if data is not None:
        headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        print(f"HTTPError {e.code} for {url}: {err_body}")
        raise e

def main():
    # 1. Login
    login_payload = {
        'identifier': 'admin@qainstitute.com',
        'password': 'AdminPass@123',
        'roleType': 'admin'
    }
    status, token_data = request_json(f'{BASE_URL}/auth/login', data=login_payload, method='POST')
    token = token_data['access_token']
    headers = {'Authorization': f'Bearer {token}'}
    print('1. Admin Token obtained successfully.')

    # Get valid Course and Batch IDs from QA Database
    status, courses = request_json(f'{BASE_URL}/academics/courses', headers=headers)
    valid_course_id = courses[0]['id']
    status, batches = request_json(f'{BASE_URL}/academics/batches', headers=headers)
    valid_batch_id = batches[0]['id']

    print(f"Using Course ID: {valid_course_id} and Batch ID: {valid_batch_id}")

    # 2. Student Registration + Enrollment Verification (P0 Defect)
    student_payload = {
        'full_name': 'Live Verification Student',
        'email': 'live_verify_student_2@example.com',
        'phone': '9876543299',
        'course_id': valid_course_id,
        'batch_id': valid_batch_id,
        'parent_name': 'Live Verification Father',
        'parent_phone': '9876543298',
        'gender': 'Male'
    }
    status, body = request_json(f'{BASE_URL}/students', data=student_payload, headers=headers, method='POST')
    print(f"2. Student Registration: Status {status}, ID: {body.get('id')}, Name: {body.get('full_name') or body.get('name')}")

    st_id = body.get('id')
    status, st_detail = request_json(f'{BASE_URL}/students/{st_id}', headers=headers)
    print(f"   Student DB Detail: Status {status}, Name: {st_detail.get('name') or st_detail.get('full_name')}, Enrollments count: {len(st_detail.get('enrollments', []))}")

    # 3. Admissions Enquiry Conversion Verification (P1 Defect)
    status, enq = request_json(f'{BASE_URL}/academics/enquiries', data={
        'name': 'Live Enquiry Conversion',
        'phone': '9988776611',
        'email': 'enq_conv_live2@example.com',
        'course_id': valid_course_id,
        'status': 'new'
    }, headers=headers, method='POST')
    enq_id = enq.get('id')
    print(f"3. Enquiry Created: ID {enq_id}")

    status, conv_enq = request_json(f'{BASE_URL}/academics/enquiries/{enq_id}', data={'status': 'admitted'}, headers=headers, method='PUT')
    print(f"   Converted Enquiry Status: Status {status}, New Status: {conv_enq.get('status')}")

    # 4. Course Subject Relationship Verification (P1 Defect)
    status, courses_updated = request_json(f'{BASE_URL}/academics/courses', headers=headers)
    print("4. Courses linked subjects count:")
    for c in courses_updated:
        subj_names = [s.get('name') for s in c.get('subjects', [])]
        print(f"   Course '{c.get('name')}' ({c.get('id')}) -> {len(c.get('subjects', []))} subjects: {subj_names}")

    # 5. AI Copilot Verification (P1 Defect)
    status, ai_resp = request_json(f'{BASE_URL}/ai/tutor', data={'query': 'What is EduPilot?'}, headers=headers, method='POST')
    print(f"5. AI Copilot Response: Status {status}, Output: {ai_resp.get('response', ai_resp)}")

if __name__ == '__main__':
    main()
