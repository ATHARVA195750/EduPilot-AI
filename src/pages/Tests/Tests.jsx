import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { useTests } from '../../hooks/useTests';
import { createTest, publishTest } from '../../services/testService';
import { generateTopperAnnouncement } from '../../services/topperService';
import { fetchTeacherAssignments } from '../../services/teacherAssignmentService';
import { useBatches } from '../../hooks/useBatches';
import { useSubjects } from '../../hooks/useSubjects';
import { useMyTeacherRecord } from '../../hooks/useMyTeacherRecord';
import { useInstitute } from '../../contexts/InstituteContext';
import { useToast } from '../../components/common/Toast';
import {
  Plus,
  AlertCircle,
  Calendar,
  Trophy,
} from 'lucide-react';

export default function Tests() {
  const { institute, role } = useInstitute();
  const { data: teacherRecord } = useMyTeacherRecord();
  const { data: tests = [], isLoading, error } = useTests();
  const { batches = [] } = useBatches();
  const { subjects = [] } = useSubjects();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [publishingTestItem, setPublishingTestItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    batch_id: '',
    subject_id: '',
    test_date: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
    duration_minutes: 60,
    total_marks: 100,
    passing_marks: 35,
    test_type: 'Unit Test',
  });

  // Fetch teacher assignments if user is a teacher
  const isTeacher = role === 'teacher';
  // Option B: topper announcements are owner/admin-only. The Publish button is
  // hidden once a test is published, so a test published by a teacher would
  // otherwise have no way to ever get its achievement announcement.
  const canAnnounceTopper = role === 'owner' || role === 'admin';
  const [announcingTestId, setAnnouncingTestId] = useState(null);
  const { data: teacherAssignments = [] } = useQuery({
    queryKey: ['myTeacherAssignments', teacherRecord?.id],
    queryFn: () => fetchTeacherAssignments(teacherRecord?.id),
    enabled: Boolean(isTeacher && teacherRecord?.id),
  });

  const activeAssignments = useMemo(() => {
    return teacherAssignments.filter((a) => String(a.status).toLowerCase() === 'active');
  }, [teacherAssignments]);

  // Filter available batches for selection based on role
  const availableBatches = useMemo(() => {
    if (!isTeacher) return batches;
    const assignedBatchIds = new Set(activeAssignments.map((a) => a.batch_id).filter(Boolean));
    return batches.filter((b) => assignedBatchIds.has(b.id));
  }, [isTeacher, batches, activeAssignments]);

  // Filter available subjects based on selected batch and role
  const availableSubjects = useMemo(() => {
    if (!isTeacher) {
      return subjects;
    }
    const relevantAssignments = activeAssignments.filter(
      (a) => !formData.batch_id || a.batch_id === formData.batch_id
    );
    const assignedSubjectIds = new Set(relevantAssignments.map((a) => a.subject_id).filter(Boolean));
    return subjects.filter((s) => assignedSubjectIds.has(s.id));
  }, [isTeacher, subjects, activeAssignments, formData.batch_id]);

  const resetForm = () => {
    setFormData({
      title: '',
      batch_id: '',
      subject_id: '',
      test_date: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
      duration_minutes: 60,
      total_marks: 100,
      passing_marks: 35,
      test_type: 'Unit Test',
    });
  };

  const handleOpenSchedule = () => {
    resetForm();
    const firstBatchId = availableBatches[0]?.id || '';
    const firstSubjectId = availableSubjects[0]?.id || '';
    setFormData((prev) => ({
      ...prev,
      batch_id: firstBatchId,
      subject_id: firstSubjectId,
    }));
    setIsScheduleOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.batch_id || !formData.subject_id) {
      toast('Please select both a Target Batch and a Subject.', 'error');
      return;
    }

    setIsSubmitting(true);
    const selectedB = batches.find((b) => b.id === formData.batch_id);
    const selectedS = subjects.find((s) => s.id === formData.subject_id);

    const payload = {
      title: formData.title,
      test_name: formData.title,
      batch_id: formData.batch_id,
      subject_id: formData.subject_id,
      subject: selectedS?.name || null,
      standard: selectedB?.name || null,
      test_date: formData.test_date,
      total_marks: Number(formData.total_marks),
      passing_marks: Number(formData.passing_marks),
      duration_minutes: Number(formData.duration_minutes),
      test_type: formData.test_type,
    };

    try {
      await createTest(payload, institute?.id);
      await queryClient.invalidateQueries({ queryKey: ['tests', institute?.id] });
      toast('Test assessment scheduled successfully.');
      setIsScheduleOpen(false);
      resetForm();
    } catch (err) {
      const isRls = err.message?.includes('row-level security') || err.code === '42501' || err.status === 403;
      const errorMsg = isRls
        ? 'Authorization Error: You are not assigned to teach this batch or subject.'
        : (err.message || 'Unable to schedule test. Please check form parameters.');
      toast(errorMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async () => {
    if (!publishingTestItem) return;
    try {
      const published = await publishTest(publishingTestItem.id, institute?.id);
      await queryClient.invalidateQueries({ queryKey: ['tests', institute?.id] });
      setPublishingTestItem(null);

      // The topper announcement is generated as part of finalization. Report
      // exactly what happened - never claim an announcement that was not made.
      const topper = published?.topper;
      if (topper?.status === 'announced') {
        const who = (topper.toppers || []).join(' & ');
        toast(
          topper.tied
            ? `Test published. 🏆 Joint toppers: ${who} (${topper.score}/${topper.maxMarks}).`
            : `Test published. 🏆 Topper: ${who} (${topper.score}/${topper.maxMarks}, ${topper.percentage}%).`
        );
      } else if (topper?.status === 'requires_owner_publish') {
        // Option B: the test is published, but the achievement announcement is
        // owner/admin-only. Say so explicitly instead of implying success.
        toast(`Test published. ${topper.reason}`, 'error');
      } else if (topper?.status === 'error') {
        toast(`Test published, but the topper announcement failed: ${topper.reason}`, 'error');
      } else {
        toast(`Test published successfully. ${topper?.reason || ''}`.trim());
      }
    } catch (err) {
      toast(err.message || 'Failed to publish test assessment.', 'error');
    }
  };

  /**
   * Generate/refresh the topper announcement for an ALREADY-PUBLISHED test.
   *
   * This deliberately does NOT re-publish: `tests.test_date` and the results are
   * left untouched, so finalization is not repeated. The service upserts on the
   * unique (test_id, batch_id) key, so running this repeatedly - or after a
   * result correction that changes the topper - updates the single existing
   * announcement instead of creating duplicates.
   */
  const handleAnnounceTopper = async (testItem) => {
    if (!testItem) return;
    setAnnouncingTestId(testItem.id);
    try {
      const outcome = await generateTopperAnnouncement(testItem.id, institute?.id);
      if (outcome.status === 'announced') {
        const who = (outcome.toppers || []).join(' & ');
        toast(
          outcome.tied
            ? `🏆 Joint toppers announced: ${who} (${outcome.score}/${outcome.maxMarks}).`
            : `🏆 Topper announced: ${who} (${outcome.score}/${outcome.maxMarks}, ${outcome.percentage}%).`
        );
      } else if (outcome.status === 'requires_owner_publish') {
        toast(outcome.reason, 'error');
      } else {
        toast(outcome.reason || 'No topper announcement was generated.', 'error');
      }
      // Refresh so the Communication/announcement views pick up the new row.
      queryClient.invalidateQueries({ queryKey: ['tests', institute?.id] });
    } catch (err) {
      toast(err.message || 'Failed to generate the topper announcement.', 'error');
    } finally {
      setAnnouncingTestId(null);
    }
  };

  if (isLoading) return <Loader label="Loading academic assessment schedule..." />;
  if (error) return <Card className="p-6 text-rose-300">Error loading tests: {error.message}</Card>;

  const hasNoAssignments = isTeacher && availableBatches.length === 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Exams & Assessments Hub
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Schedule upcoming batch tests, publish exam dates, and evaluate student marks.
          </p>
        </div>
        <Button onClick={handleOpenSchedule}>
          <Plus size={16} className="mr-2" /> Schedule Test
        </Button>
      </div>

      {/* Tests Grid */}
      {tests.length === 0 ? (
        <EmptyState
          title="No Scheduled Assessments"
          description="Click 'Schedule Test' to set up a new test assessment for your assigned batches."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tests.map((t) => {
            const isPublished = Boolean(t.published || t.is_published);
            return (
              <Card key={t.id} className="flex flex-col justify-between p-6 hover:shadow-lg transition">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center rounded-full bg-indigo-100 dark:bg-indigo-950/60 px-2.5 py-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      {t.subjects?.name || t.subject || 'Subject'}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        isPublished
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>

                  <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
                    {t.title || t.test_name}
                  </h3>
                  <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                    Batch: <strong className="text-slate-700 dark:text-slate-300">{t.batches?.name || t.standard || 'All Batches'}</strong>
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3 text-xs text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Test Type</span>
                      <strong className="text-slate-800 dark:text-slate-200">{t.test_type || 'Unit Test'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Duration</span>
                      <strong className="text-slate-800 dark:text-slate-200">{t.duration_minutes || 60} mins</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Total Marks</span>
                      <strong className="text-slate-800 dark:text-slate-200">{t.total_marks || 100}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Passing Marks</span>
                      <strong className="text-slate-800 dark:text-slate-200">{t.passing_marks || 35}</strong>
                    </div>
                  </div>
                </div>

                <div className="mt-5 border-t border-slate-100 pt-4 flex items-center justify-between text-xs dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Calendar size={13} className="text-indigo-500" />
                    Date: <strong className="text-slate-700 dark:text-slate-200">{t.test_date ? String(t.test_date).slice(0, 10) : 'Not set'}</strong>
                  </span>
                  {!isPublished && (
                    <Button
                      variant="secondary"
                      className="py-1 px-3 text-xs"
                      onClick={() => setPublishingTestItem(t)}
                    >
                      Publish
                    </Button>
                  )}
                  {/* A test published by a teacher (Option B) is already final but
                      has no topper announcement. Owner/Admin can generate or
                      refresh it here without republishing. */}
                  {isPublished && canAnnounceTopper && (
                    <Button
                      variant="secondary"
                      className="py-1 px-3 text-xs"
                      disabled={announcingTestId === t.id}
                      title="Generate or refresh the topper achievement announcement for this published test"
                      onClick={() => handleAnnounceTopper(t)}
                    >
                      <Trophy size={13} className="mr-1" />
                      {announcingTestId === t.id ? 'Announcing...' : 'Announce Topper'}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Schedule Test Modal */}
      <Modal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        title="Schedule Test Assessment"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {hasNoAssignments && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200 flex items-start gap-2.5">
              <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-300">No Teaching Assignments Available</h4>
                <p className="mt-0.5 text-amber-200/80">
                  You are not assigned to teach any active batches or subjects. Test creation requires an active batch assignment. Please contact your Institute Administrator.
                </p>
              </div>
            </div>
          )}

          <Input
            label="Test Title / Name"
            required
            placeholder="e.g. Mid-Term Physics Assessment"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Target Batch *</label>
              <select
                required
                value={formData.batch_id}
                onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="">Select Target Batch</option>
                {availableBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Subject *</label>
              <select
                required
                value={formData.subject_id}
                onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="">Select Subject</option>
                {availableSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Test Date *</label>
              <input
                type="date"
                required
                value={formData.test_date}
                onChange={(e) => setFormData({ ...formData, test_date: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Test Type</label>
              <select
                value={formData.test_type}
                onChange={(e) => setFormData({ ...formData, test_type: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="Unit Test">Unit Test</option>
                <option value="Mid-Term">Mid-Term Exam</option>
                <option value="Final Exam">Final Exam</option>
                <option value="Quiz">Quick Quiz</option>
                <option value="Assignment">Assignment Assessment</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label="Duration (mins)"
              type="number"
              required
              min={15}
              max={300}
              value={formData.duration_minutes}
              onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
            />
            <Input
              label="Total Marks"
              type="number"
              required
              min={10}
              max={1000}
              value={formData.total_marks}
              onChange={(e) => setFormData({ ...formData, total_marks: Number(e.target.value) })}
            />
            <Input
              label="Passing Marks"
              type="number"
              required
              min={0}
              max={formData.total_marks}
              value={formData.passing_marks}
              onChange={(e) => setFormData({ ...formData, passing_marks: Number(e.target.value) })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsScheduleOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || hasNoAssignments || !formData.batch_id || !formData.subject_id}
            >
              {isSubmitting ? 'Scheduling…' : 'Schedule Test'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Publish Test Modal */}
      <Modal
        title="Publish Test Assessment?"
        isOpen={Boolean(publishingTestItem)}
        onClose={() => setPublishingTestItem(null)}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Publishing makes <strong>{publishingTestItem?.title || publishingTestItem?.test_name}</strong> visible to all enrolled students in the batch.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setPublishingTestItem(null)}>
              Cancel
            </Button>
            <Button onClick={handlePublish} className="bg-emerald-600 hover:bg-emerald-500 text-white">
              Confirm & Publish
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
