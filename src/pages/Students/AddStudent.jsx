import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import { createStudent } from '../../services/studentService';
import { useCourses } from '../../hooks/useCourses';
import { useBatches } from '../../hooks/useBatches';
import { useInstitute } from '../../contexts/InstituteContext';
import { useToast } from '../../components/common/Toast';
import { ArrowLeft, User, BookOpen, Users, Phone, Copy, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function AddStudent() {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      standard: 'Class 10th',
      gender: 'Male',
      admission_date: new Date().toISOString().slice(0, 10),
      status: 'Active',
      parent_relation: 'Father',
    },
  });

  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const navigate = useNavigate();
  const { instituteId } = useInstitute();
  const { toast } = useToast();

  const { courses } = useCourses();
  const { batches } = useBatches();

  const selectedCourseId = watch('course_id');

  const availableBatches = useMemo(() => {
    if (!selectedCourseId) return batches;
    return batches.filter((b) => b.course_id === selectedCourseId || !b.course_id);
  }, [batches, selectedCourseId]);

  const onSubmit = async (data) => {
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const created = await createStudent(
        {
          full_name: data.full_name,
          student_id_code: data.student_id_code,
          gender: data.gender,
          dob: data.dob,
          address: data.address,
          standard: data.standard,
          course_id: data.course_id || null,
          batch_id: data.batch_id || null,
          admission_date: data.admission_date,
          status: data.status,
          parent_name: data.parent_name,
          parent_relation: data.parent_relation,
          parent_phone: data.parent_phone,
          parent_email: data.parent_email,
          emergency_contact: data.emergency_contact,
        },
        instituteId
      );

      toast(`Student "${data.full_name}" registered successfully.`);

      if (created?._credentials?.tempPassword) {
        setCreatedCredentials({
          identifier: created._credentials.identifier,
          password: created._credentials.tempPassword,
          fullName: data.full_name,
        });
      } else {
        navigate('/students');
      }
    } catch (error) {
      setErrorMessage(error.message || 'Unable to register student.');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/students" className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
        <ArrowLeft size={14} className="mr-1" /> Back to Student Roster
      </Link>

      <Card className="p-8">
        <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Register New Student
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Create student profile record and allocate active course & class batch enrollment.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-8">
          {/* Personal Details */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <User size={16} /> Personal Information
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Full Name"
                required
                placeholder="e.g. Aarav Sharma"
                {...register('full_name', { required: 'Full name is required' })}
              />
              <Input
                label="Student ID Code"
                required
                placeholder="e.g. STU-84920"
                {...register('student_id_code', { required: 'Student ID Code is required' })}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Gender</label>
                <select
                  {...register('gender')}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <Input label="Date of Birth" type="date" {...register('dob')} />

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
                <select
                  {...register('status')}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Residential Address</label>
              <textarea
                rows={2}
                placeholder="Residential street address..."
                {...register('address')}
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Academic Enrollment */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <BookOpen size={16} /> Academic & Batch Allocation
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Standard / Grade</label>
                <select
                  {...register('standard')}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="Class 8th">Class 8th</option>
                  <option value="Class 9th">Class 9th</option>
                  <option value="Class 10th">Class 10th</option>
                  <option value="Class 11th">Class 11th</option>
                  <option value="Class 12th">Class 12th</option>
                  <option value="JEE Prep">JEE Prep</option>
                  <option value="NEET Prep">NEET Prep</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Enrolled Course</label>
                <select
                  {...register('course_id')}
                  onChange={(e) => {
                    setValue('course_id', e.target.value);
                    setValue('batch_id', '');
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">-- Select Course --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.standard || 'General'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Assigned Batch</label>
                <select
                  {...register('batch_id')}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">-- Select Batch --</option>
                  {availableBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.room_number || 'Room'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Input label="Admission Date" type="date" {...register('admission_date')} />
          </div>

          {/* Guardian & Contact */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <Phone size={16} /> Guardian & Emergency Contact
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input label="Parent / Guardian Name" placeholder="e.g. Ramesh Sharma" {...register('parent_name')} />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Relation</label>
                <select
                  {...register('parent_relation')}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                </select>
              </div>
              <Input label="Parent Phone Contact" placeholder="e.g. +91 98765 43210" {...register('parent_phone')} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Parent Email" type="email" placeholder="e.g. parent@gmail.com" {...register('parent_email')} />
              <Input label="Emergency Alternate Contact" placeholder="e.g. +91 91234 56789" {...register('emergency_contact')} />
            </div>
          </div>

          {errorMessage && <p className="text-sm font-semibold text-rose-500">{errorMessage}</p>}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => navigate('/students')}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Registering Student...' : 'Register & Enroll Student'}
            </Button>
          </div>
        </form>
      </Card>

      {/* One-Time Student Credentials Modal */}
      <Modal
        isOpen={Boolean(createdCredentials)}
        onClose={() => {
          setCreatedCredentials(null);
          navigate('/students');
        }}
        title="Student Account Provisioned"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <ShieldCheck size={20} className="shrink-0" />
            <p className="text-xs">
              Account created successfully for <strong>{createdCredentials?.fullName}</strong>.
            </p>
          </div>

          <div className="space-y-3 rounded-2xl bg-slate-950/60 p-4 border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Student ID
              </label>
              <div className="flex items-center justify-between rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-sm font-mono text-white">
                <span>{createdCredentials?.identifier}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(createdCredentials?.identifier || '');
                    setCopiedId(true);
                    setTimeout(() => setCopiedId(false), 2000);
                  }}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                >
                  {copiedId ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiedId ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Temporary Password
              </label>
              <div className="flex items-center justify-between rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-sm font-mono text-amber-400 font-bold">
                <span>{createdCredentials?.password}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(createdCredentials?.password || '');
                    setCopiedPassword(true);
                    setTimeout(() => setCopiedPassword(false), 2000);
                  }}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                >
                  {copiedPassword ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiedPassword ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 italic">
            Save these credentials securely. The temporary password will not be shown again.
          </p>

          <Button
            type="button"
            className="w-full py-2.5"
            onClick={() => {
              setCreatedCredentials(null);
              navigate('/students');
            }}
          >
            Done & Return to Roster
          </Button>
        </div>
      </Modal>
    </div>
  );
}
