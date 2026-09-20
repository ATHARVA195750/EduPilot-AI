import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { fetchStudent } from '../../services/studentService';
import { useInstitute } from '../../contexts/InstituteContext';
import { generateStudentReportCard } from '../../utils/generateReportCard';
import {
  User,
  Phone,
  Mail,
  BookOpen,
  Calendar,
  DollarSign,
  CheckCircle2,
  FileText,
  ArrowLeft,
  Shield,
  Layers,
  MapPin,
  Clock,
  History,
} from 'lucide-react';

const TABS = ['Overview', 'Guardian Info', 'Enrollment History', 'Attendance', 'Fees & Payments', 'Tests & Results', 'Homework', 'Timetable'];

export default function StudentProfile() {
  const { id } = useParams();
  const { instituteId } = useInstitute();
  const [activeTab, setActiveTab] = useState('Overview');

  const { data: student, isLoading, error } = useQuery({
    queryKey: ['student', id, instituteId],
    queryFn: () => fetchStudent(id, instituteId),
    enabled: Boolean(id),
  });

  if (isLoading) return <Loader label="Loading student profile details..." />;
  if (error || !student) {
    return (
      <Card className="p-6 text-rose-500">
        Failed to load student profile record.
      </Card>
    );
  }

  const handleDownloadReport = () => {
    generateStudentReportCard({
      student,
      attendance: [],
      results: [],
    });
  };

  const enrollmentsList = Array.isArray(student.enrollments) ? student.enrollments : [];

  return (
    <div className="space-y-6">
      <Link to="/students" className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
        <ArrowLeft size={14} className="mr-1" /> Back to Students Roster
      </Link>

      {/* Header Card */}
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-2xl font-bold text-white shadow-md">
              {student.full_name?.charAt(0) || 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{student.full_name}</h1>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    student.status === 'Inactive'
                      ? 'bg-rose-500/10 text-rose-500'
                      : 'bg-emerald-500/10 text-emerald-500'
                  }`}
                >
                  {student.status || 'Active'}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {student.standard || 'Class 10th'} • {student.course_name} • ID Code:{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {student.student_id_code || student.id?.slice(0, 8)}
                </strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleDownloadReport}>
              <FileText size={16} className="mr-2" /> Report Card
            </Button>
            <Link to={`/students/edit/${id}`}>
              <Button>Edit Profile</Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 pb-2 dark:border-slate-800">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeTab === tab
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Contents */}

      {/* Overview Tab */}
      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="p-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Academic & Course Summary
            </h2>
            <dl className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <dt className="text-slate-500">Standard / Grade:</dt>
                <dd className="font-semibold text-slate-900 dark:text-white">{student.standard || 'Class 10th'}</dd>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <dt className="text-slate-500">Enrolled Course:</dt>
                <dd className="font-semibold text-indigo-600 dark:text-indigo-400">{student.course_name}</dd>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <dt className="text-slate-500">Active Batch:</dt>
                <dd className="font-semibold text-slate-900 dark:text-white">{student.batch_name}</dd>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <dt className="text-slate-500">Admission Date:</dt>
                <dd className="font-semibold text-slate-900 dark:text-white">{student.admission_date || 'N/A'}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Personal Bio & Details
            </h2>
            <dl className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <dt className="text-slate-500">Gender:</dt>
                <dd className="font-semibold text-slate-900 dark:text-white">{student.gender || 'Not specified'}</dd>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <dt className="text-slate-500">Date of Birth:</dt>
                <dd className="font-semibold text-slate-900 dark:text-white">{student.dob || 'Not recorded'}</dd>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <dt className="text-slate-500">Residential Address:</dt>
                <dd className="font-semibold text-slate-900 dark:text-white text-right max-w-[200px]">
                  {student.address || 'Address not recorded.'}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      )}

      {/* Guardian Info Tab */}
      {activeTab === 'Guardian Info' && (
        <Card className="p-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
            Parent / Guardian Contacts
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="text-slate-400 font-medium">Guardian Name</div>
              <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                {student.parent_name || 'Parent not recorded'}
              </div>
              <div className="mt-1 text-slate-500 text-[11px]">
                Relation: {student.parent_relation || 'Parent'}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="text-slate-400 font-medium">Primary Contact Phone</div>
              <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                {student.parent_phone || 'Phone not recorded'}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="text-slate-400 font-medium">Parent Email</div>
              <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                {student.parent_email || 'Email not recorded'}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900 sm:col-span-2">
              <div className="text-slate-400 font-medium">Emergency Alternate Contact</div>
              <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                {student.emergency_contact || 'No emergency contact specified'}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Enrollment History Tab */}
      {activeTab === 'Enrollment History' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History size={18} className="text-indigo-600" /> Historical & Active Enrollments
            </h2>
            <span className="text-xs text-slate-500">
              {enrollmentsList.length} enrollment record(s) logged
            </span>
          </div>

          {enrollmentsList.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              No historical enrollment records logged in database yet.
            </div>
          ) : (
            <div className="space-y-3">
              {enrollmentsList.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-xs dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {e.batches?.name || 'Class Batch'}
                      </span>
                      {e.batches?.room_number && (
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {e.batches.room_number}
                        </span>
                      )}
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      Enrolled On: {e.created_at ? new Date(e.created_at).toLocaleDateString() : 'N/A'}{' '}
                      {e.end_date && `• Completed/Ended: ${e.end_date}`}
                    </div>
                  </div>

                  <div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        e.status === 'Active'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-slate-500/10 text-slate-400'
                      }`}
                    >
                      {e.status || 'Active'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Module Placeholders */}
      {['Attendance', 'Fees & Payments', 'Tests & Results', 'Homework', 'Timetable'].includes(activeTab) && (
        <Card className="p-8 text-center">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {activeTab} Module Records
          </h3>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Live {activeTab.toLowerCase()} data for {student.full_name} is managed directly through the dedicated {activeTab} ERP module.
          </p>
          <div className="mt-6">
            <Link to={`/${activeTab.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}>
              <Button variant="outline">
                Open {activeTab} Module
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
