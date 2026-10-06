import sys
sys.path.insert(0, 'backend')
from app.db.session import SessionLocal
from app.models.all_models import Payroll, StudyMaterial, Schedule, Profile, Batch

db = SessionLocal()
print('PAYROLL', db.query(Payroll).count())
print('MATERIALS', db.query(StudyMaterial).count())
print('SCHEDULES', db.query(Schedule).count())
st = db.query(Profile).filter(Profile.identifier == 'STU-26-0002').first()
print('STU-26-0002', (st.id[:8], st.batch_id, st.institute_id[:8]) if st else None)
for m in db.query(StudyMaterial).limit(4).all():
    print('MAT', m.title[:28], '| batch=', m.batch_id, '| pub=', m.is_published)
for s in db.query(Schedule).all():
    print('SCH', s.day_of_week, '| batch=', (s.batch_id[:8] if s.batch_id else None), '| start=', s.start_time)
for b in db.query(Batch).limit(5).all():
    print('BATCH', b.id[:8], '|', b.name, '| inst=', b.institute_id[:8])
for p in db.query(Profile).filter(Profile.role == 'student').limit(6).all():
    print('STU', p.identifier, '| batch=', (p.batch_id[:8] if p.batch_id else None))
db.close()
