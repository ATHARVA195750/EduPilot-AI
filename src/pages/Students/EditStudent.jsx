import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
import { fetchStudent, updateStudent } from '../../services/studentService';
import { useCourses } from '../../hooks/useCourses';
import { useBatches } from '../../hooks/useBatches';
import { useInstitute } from '../../contexts/InstituteContext';
import { useToast } from '../../components/common/Toast';
import { ArrowLeft, User, BookOpen, Phone } from 'lucide-react';

export default function EditStudent() {
  const { id } = useParams();
  const { instituteId } = useInstitute();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [serverError, setServerError] = useState('');

  const { data: student, isLoading, error } = useQuery({
    queryKey: ['student', id, instituteId],
    queryFn: () => fetchStudent(id, instituteId),
    enabled: Boolean(id),
  });

  const { courses } = useCourses();
  const { batches } = useBatches();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm();

  useEffect(() => {
    if (student) {
      reset({
        full_name: student.full_name || '',
        student_id_code: student.student_id_code || '',
        gender: student.gender || 'Male',
        dob: student.dob || '',
        address: student.address || '',
        standard: student.standard || 'Class 10th',
        course_id: student.course_id || '',
        batch_id: student.batch_id || '',
        admission_date: student.admission_date || '',
        status: student.status || 'Active',
        parent_name: student.parent_name || '',
        parent_relation: student.parent_relation || 'Parent',
        parent_phone: student.parent_phone || '',
        parent_email: student.parent_email || '',
        emergency_contact: student.emergency_contact || '',
      });
    }
  }, [student, reset]);

  const selectedCourseId = watch('course_id');

  const availableBatches = useMemo(() => {
    if (!selectedCourseId) return batches;
    return batches.filter((b) => b.course_id === selectedCourseId || !b.course_id);
  }, [batches, selectedCourseId]);

  const onSubmit = async (values) => {
    setServerError('');
    try {
      await updateStudent(id, values, instituteId);
      await queryClient.invalidateQueries({ queryKey: ['students', instituteId] });
      await queryClient.invalidateQueries({ queryKey: ['student', id, instituteId] });
      toast('Student profile & enrollment details updated successfully.');
      navigate(`/students/${id}`);
    } catch (e) {
      setServerError(e.message || 'Unable to update student profile.');
    }
  };

  if (isLoading) return <Loader label="Loading student profile details..." />;
  if (error || !student) {
    return <Card className="text-rose-500 p-6">Failed to load student record for editing.</Card>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to={`/students/${id}`} className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
        <ArrowLeft size={14} className="mr-1" /> Back to Student Profile
      </Link>

      <Card className="p-8">
        <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Edit Student Profile — {student.full_name}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Update personal details, parent contacts, or transfer student to a new batch.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-8">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <User size={16} /> Personal Information
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Full Name" required {...register('full_name', { required: 'Name is required' })} />
              <Input label="Student ID Code" {...register('student_id_code')} />
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
                {...register('address')}
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Academic & Batch Allocation */}
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
              <Phone size={16} /> Guardian & Contact Information
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input label="Parent / Guardian Name" {...register('parent_name')} />
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
              <Input label="Parent Phone Contact" {...register('parent_phone')} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Parent Email" type="email" {...register('parent_email')} />
              <Input label="Emergency Alternate Contact" {...register('emergency_contact')} />
            </div>
          </div>

          {serverError && <p className="text-sm font-semibold text-rose-500">{serverError}</p>}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => navigate(`/students/${id}`)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving Changes...' : 'Save Student Changes'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
