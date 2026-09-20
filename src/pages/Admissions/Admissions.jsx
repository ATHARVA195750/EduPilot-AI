import { useMemo, useState } from 'react';
import { useAdmissions } from '../../hooks/useAdmissions';
import { useCourses } from '../../hooks/useCourses';
import { useBatches } from '../../hooks/useBatches';
import { useBranches } from '../../hooks/useBranches';
import { useInstitute } from '../../contexts/InstituteContext';
import { useToast } from '../../components/common/Toast';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { Filter, Phone, Mail, RefreshCw, UserPlus, ArrowRight, CheckCircle } from 'lucide-react';

const STATUS_OPTIONS = ['new', 'contacted', 'counselling', 'trial', 'interested', 'admitted', 'lost'];
const emptyForm = { student_name: '', parent_name: '', phone: '', email: '', school_name: '', standard: '', course_interested: '', branch_id: '', source: 'Website', follow_up_date: '', counselling_notes: '', assigned_to: '' };
const label = (value) => String(value || '').replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function Admissions() {
  const { profile } = useInstitute();
  const { toast } = useToast();
  const { enquiries, staff, loading, error, refresh, addEnquiry, changeStatus, findDuplicates, convert } = useAdmissions();
  const { courses = [] } = useCourses();
  const { batches = [] } = useBatches();
  const { branches = [] } = useBranches();
  const [filters, setFilters] = useState({ search: '', status: 'all', standard: 'all', source: 'all', followUp: 'all' });
  const [form, setForm] = useState(emptyForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  const [conversion, setConversion] = useState({ course_id: '', batch_id: '', useExisting: false, feeConfirmed: false, total_amount: '', discount_amount: '', due_date: '' });
  const [isConverting, setIsConverting] = useState(false);

  const values = (key) => [...new Set(enquiries.map((item) => item[key]).filter(Boolean))];
  const filtered = enquiries.filter((item) => {
    const query = filters.search.trim().toLowerCase();
    const matchesQuery = !query || [item.student_name, item.phone, item.email, item.course_interested].some((value) => String(value || '').toLowerCase().includes(query));
    const followUpMatch = filters.followUp === 'all' || (filters.followUp === 'due' && item.follow_up_date && item.follow_up_date <= new Date().toISOString().slice(0, 10));
    return matchesQuery && (filters.status === 'all' || item.status === filters.status) && (filters.standard === 'all' || item.standard === filters.standard) && (filters.source === 'all' || item.source === filters.source) && followUpMatch;
  });
  const compatibleBatches = useMemo(() => batches.filter((batch) => !conversion.course_id || batch.course_id === conversion.course_id), [batches, conversion.course_id]);
  const dueToday = enquiries.filter((item) => item.follow_up_date && item.follow_up_date <= new Date().toISOString().slice(0, 10) && item.status !== 'admitted' && item.status !== 'lost').length;
  const admitted = enquiries.filter((item) => item.status === 'admitted').length;
  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleCreate = async (event) => {
    event.preventDefault();
    try { await addEnquiry(form); toast('Enquiry created.'); setForm(emptyForm); setIsFormOpen(false); }
    catch (err) { toast(err.message || 'Unable to create enquiry.', 'error'); }
  };

  const handleConvertOpen = async (enquiry) => {
    setSelected(enquiry);
    setConversion({ course_id: '', batch_id: '', useExisting: false, feeConfirmed: false, total_amount: '', discount_amount: '', due_date: '' });
    try { setDuplicates(await findDuplicates(enquiry)); }
    catch (err) { toast(err.message || 'Unable to check duplicate students.', 'error'); setDuplicates([]); }
  };

  const handleConvert = async () => {
    if (!selected || !conversion.batch_id || (!conversion.useExisting && !conversion.course_id)) { toast('Select a course, batch, and duplicate decision before converting.', 'error'); return; }
    setIsConverting(true);
    try {
      await convert({
        enquiry: selected,
        profileId: profile?.id,
        studentId: conversion.useExisting ? duplicates[0]?.id : undefined,
        studentData: { full_name: selected.student_name, standard: selected.standard, course_id: conversion.course_id, batch_id: conversion.batch_id, parent_name: selected.parent_name, parent_phone: selected.phone, parent_email: selected.email, school_name: selected.school_name, status: 'Active' },
        enrollmentData: { batch_id: conversion.batch_id },
        feeData: { confirmed: conversion.feeConfirmed, total_amount: conversion.total_amount, discount_amount: conversion.discount_amount, due_date: conversion.due_date },
      });
      toast('Enquiry converted successfully.'); setSelected(null); await refresh();
    } catch (err) { toast(err.message || 'Conversion failed. The enquiry was not marked admitted.', 'error'); }
    finally { setIsConverting(false); }
  };

  if (loading) return <Loader label="Loading admissions workflow..." />;
  if (error) return <div className="space-y-4"><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admissions & Enquiries</h1><Card className="p-6"><p className="text-sm text-rose-600">Unable to load enquiries: {error}</p><Button className="mt-4" onClick={refresh}><RefreshCw size={15} className="mr-2" /> Retry</Button></Card></div>;

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Admissions & Enquiries</h1><p className="text-sm text-slate-500 dark:text-slate-400">Manage prospective students through conversion.</p></div><Button onClick={() => setIsFormOpen(true)}><UserPlus size={16} className="mr-2" /> New Enquiry</Button></div>
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">{[['Total', enquiries.length], ['New', enquiries.filter((item) => item.status === 'new').length], ['Follow-ups due', dueToday], ['Counselling/Trial', enquiries.filter((item) => item.status === 'counselling' || item.status === 'trial').length], ['Interested', enquiries.filter((item) => item.status === 'interested').length], ['Admitted', admitted], ['Conversion', `${enquiries.length ? Math.round((admitted / enquiries.length) * 100) : 0}%`]].map(([name, value]) => <Card key={name} className="p-4"><div className="text-xs text-slate-500">{name}</div><div className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{value}</div></Card>)}</div>
    <Card className="p-5"><div className="mb-5 flex flex-wrap items-center gap-3"><Filter size={16} className="text-slate-400" /><Input placeholder="Search name, phone, email or course" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} className="min-w-[260px] flex-1" /><select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="all">All statuses</option>{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select><select value={filters.standard} onChange={(event) => setFilters({ ...filters, standard: event.target.value })} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="all">All standards</option>{values('standard').map((value) => <option key={value}>{value}</option>)}</select><select value={filters.source} onChange={(event) => setFilters({ ...filters, source: event.target.value })} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="all">All sources</option>{values('source').map((value) => <option key={value}>{value}</option>)}</select><select value={filters.followUp} onChange={(event) => setFilters({ ...filters, followUp: event.target.value })} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="all">All follow-ups</option><option value="due">Due follow-ups</option></select></div>{filtered.length === 0 ? <EmptyState title="No enquiries yet" description="Live enquiries matching this view will appear here." /> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">{['Student', 'Contact', 'Course / Standard', 'Source', 'Assigned', 'Status', 'Follow-up', 'Actions'].map((heading) => <th key={heading} className="px-3 py-3">{heading}</th>)}</tr></thead><tbody>{filtered.map((item) => <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800"><td className="px-3 py-3 font-semibold text-slate-900 dark:text-white">{item.student_name}<div className="text-xs font-normal text-slate-500">{item.parent_name || 'No parent recorded'}</div></td><td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-300"><div className="flex items-center gap-1"><Phone size={12} />{item.phone || '—'}</div>{item.email && <div className="mt-1 flex items-center gap-1"><Mail size={12} />{item.email}</div>}</td><td className="px-3 py-3 text-slate-700 dark:text-slate-300">{item.course_interested || '—'}<div className="text-xs text-slate-500">{item.standard || '—'}</div></td><td className="px-3 py-3 text-slate-600 dark:text-slate-300">{item.source || '—'}</td><td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-300">{staff.find((person) => person.id === item.assigned_to)?.full_name || 'Unassigned'}</td><td className="px-3 py-3"><select value={item.status} onChange={async (event) => { try { await changeStatus(item.id, event.target.value); toast('Status updated.'); } catch (err) { toast(err.message, 'error'); } }} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white">{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></td><td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-300">{item.follow_up_date || '—'}</td><td className="px-3 py-3">{item.status !== 'admitted' && <Button size="xs" variant="outline" onClick={() => handleConvertOpen(item)}><ArrowRight size={14} className="mr-1" /> Convert</Button>}</td></tr>)}</tbody></table></div>}</Card>
    <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="New Enquiry"><form onSubmit={handleCreate} className="space-y-4"><Input label="Student name" required value={form.student_name} onChange={(event) => updateForm('student_name', event.target.value)} /><div className="grid gap-4 sm:grid-cols-2"><Input label="Parent / guardian" value={form.parent_name} onChange={(event) => updateForm('parent_name', event.target.value)} /><Input label="Phone" value={form.phone} onChange={(event) => updateForm('phone', event.target.value)} /></div><div className="grid gap-4 sm:grid-cols-2"><Input label="Email" type="email" value={form.email} onChange={(event) => updateForm('email', event.target.value)} /><Input label="School" value={form.school_name} onChange={(event) => updateForm('school_name', event.target.value)} /></div><div className="grid gap-4 sm:grid-cols-2"><Input label="Standard" value={form.standard} onChange={(event) => updateForm('standard', event.target.value)} /><Input label="Course interested" value={form.course_interested} onChange={(event) => updateForm('course_interested', event.target.value)} /></div><div className="grid gap-4 sm:grid-cols-2"><select value={form.branch_id} onChange={(event) => updateForm('branch_id', event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="">No branch</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select><Input label="Source" value={form.source} onChange={(event) => updateForm('source', event.target.value)} /></div><div className="grid gap-4 sm:grid-cols-2"><Input label="Follow-up date" type="date" value={form.follow_up_date} onChange={(event) => updateForm('follow_up_date', event.target.value)} /><select value={form.assigned_to} onChange={(event) => updateForm('assigned_to', event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="">Unassigned</option>{staff.map((person) => <option key={person.id} value={person.id}>{person.full_name || person.role}</option>)}</select></div><textarea value={form.counselling_notes} onChange={(event) => updateForm('counselling_notes', event.target.value)} placeholder="Counselling notes" rows={3} className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white" /><div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button><Button type="submit">Save Enquiry</Button></div></form></Modal>
    <Modal isOpen={Boolean(selected)} onClose={() => !isConverting && setSelected(null)} title="Convert Enquiry"><div className="space-y-4"><p className="text-sm text-slate-600 dark:text-slate-300">Convert <strong>{selected?.student_name}</strong> only after duplicate and enrollment checks.</p>{duplicates.length > 0 && <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><p className="font-semibold">Possible existing student found</p>{duplicates.map((student) => <label key={student.id} className="mt-2 flex items-center gap-2"><input type="radio" checked={conversion.useExisting && duplicates[0]?.id === student.id} onChange={() => setConversion({ ...conversion, useExisting: true })} />Use {student.full_name} ({student.student_id_code || 'no code'})</label>)}<p className="mt-2 text-xs">Leave unchecked to create a new student after review.</p></div>}<div className="grid gap-4 sm:grid-cols-2"><select value={conversion.course_id} onChange={(event) => setConversion({ ...conversion, course_id: event.target.value, batch_id: '' })} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="">Select course</option>{courses.filter((course) => !selected?.standard || !course.standard || course.standard === selected.standard).map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select><select value={conversion.batch_id} onChange={(event) => setConversion({ ...conversion, batch_id: event.target.value })} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="">Select batch</option>{compatibleBatches.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}</select></div><label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"><input type="checkbox" checked={conversion.feeConfirmed} onChange={(event) => setConversion({ ...conversion, feeConfirmed: event.target.checked })} /> Set up fee after enrollment</label>{conversion.feeConfirmed && <div className="grid gap-4 sm:grid-cols-3"><Input label="Total fee" type="number" value={conversion.total_amount} onChange={(event) => setConversion({ ...conversion, total_amount: event.target.value })} /><Input label="Discount" type="number" value={conversion.discount_amount} onChange={(event) => setConversion({ ...conversion, discount_amount: event.target.value })} /><Input label="Due date" type="date" value={conversion.due_date} onChange={(event) => setConversion({ ...conversion, due_date: event.target.value })} /></div>}<div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setSelected(null)} disabled={isConverting}>Cancel</Button><Button onClick={handleConvert} disabled={isConverting}><CheckCircle size={15} className="mr-2" />{isConverting ? 'Converting...' : 'Confirm conversion'}</Button></div></div></Modal>
  </div>;
}
