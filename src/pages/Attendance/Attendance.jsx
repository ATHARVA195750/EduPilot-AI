import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { useStudents } from '../../hooks/useStudents';
import { useAttendance, useSaveAttendance } from '../../hooks/useAttendance';
import { useInstitute } from '../../contexts/InstituteContext';
import { useToast } from '../../components/common/Toast';

const statuses = ['present', 'absent', 'late', 'leave'];

function getWhatsAppAbsentUrl(phone, studentName, dateStr) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 10) return null;
  const fullPhone = digits.length === 10 ? `91${digits}` : digits;
  const message = `Dear Parent, your ward ${studentName} has been marked ABSENT today (${dateStr}). Please contact the institute if you have any questions.`;
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
}

function Attendance() {
  const { institute } = useInstitute();
  const { data: students = [], isLoading: loadingStudents } = useStudents();
  const { data: records = [], isLoading, error } = useAttendance();
  const saveMutation = useSaveAttendance();
  const { toast } = useToast();

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [className, setClassName] = useState('');
  const [marksOverride, setMarksOverride] = useState({});

  const classes = useMemo(() => [...new Set(students.map((item) => item.standard).filter(Boolean))], [students]);
  const roster = useMemo(() => students.filter((item) => !className || item.standard === className), [students, className]);

  // Derived map of saved database attendance for the selected date
  const databaseRecordMap = useMemo(() => {
    const map = {};
    (records || []).forEach((item) => {
      const recordDate = String(item.attendance_date ?? item.date ?? '').slice(0, 10);
      if (recordDate === date) {
        map[item.student_id] = item.status;
      }
    });
    return map;
  }, [records, date]);

  const getStatus = (studentId) => {
    if (marksOverride[studentId] !== undefined) {
      return marksOverride[studentId];
    }
    return databaseRecordMap[studentId] || 'present';
  };

  const handleSetStatus = (studentId, status) => {
    setMarksOverride((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleMarkAllPresent = () => {
    const updated = {};
    roster.forEach((s) => {
      updated[s.id] = 'present';
    });
    setMarksOverride(updated);
  };

  const save = async () => {
    if (!roster.length) return;
    try {
      await saveMutation.mutateAsync({
        session_date: date,
        records: roster.map((student) => ({
          student_id: student.id,
          batch_id: student.batch_id || null,
          attendance_date: date,
          status: getStatus(student.id),
        })),
      });
      setMarksOverride({});
      toast('Attendance saved.');
    } catch (e) {
      toast(e.message || 'Unable to save attendance.', 'error');
    }
  };

  const selected = roster.filter((student) => ['present', 'late'].includes(getStatus(student.id))).length;

  if (isLoading || loadingStudents) return <Card className="p-6 text-slate-400">Loading attendance…</Card>;
  if (error) return <Card className="p-6 text-rose-300">{error.message}</Card>;

  const exportExcel = async () => {
    const XLSX = await import('xlsx');
    const dataRows = records.map((r) => {
      const s = students.find((x) => x.id === r.student_id);
      const rawDate = r.attendance_date ?? r.date ?? date;
      const cleanDate = String(rawDate).slice(0, 10);
      const parts = cleanDate.split('-');
      let formattedDate = cleanDate;
      if (parts.length === 3) {
        const [year, month, day] = parts;
        formattedDate = `${day}-${month}-${year}`; // dd-mm-yyyy format
      }

      return [
        s?.full_name || r.student_id || 'Unknown',
        s?.standard || s?.class_name || '—',
        formattedDate,
        r.status || 'present',
      ];
    });

    const aoa = [
      ['Student', 'Class', 'Date', 'Status'],
      ...dataRows,
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Set explicit column widths to prevent ######## truncations
    ws['!cols'] = [
      { wch: 24 }, // Student: 24
      { wch: 16 }, // Class: 16
      { wch: 14 }, // Date: 14
      { wch: 12 }, // Status: 12
    ];

    // Add Excel Autofilter to header row
    if (aoa.length > 1) {
      ws['!autofilter'] = { ref: `A1:D${aoa.length}` };
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

    const fileName = `attendance-report-${date || new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const exportCSV = () => {
    const lines = [
      'Student,Class,Date,Status',
      ...records.map((r) => {
        const s = students.find((x) => x.id === r.student_id);
        const rawDate = r.attendance_date ?? r.date ?? date;
        const cleanDate = String(rawDate).slice(0, 10);
        const studentName = String(s?.full_name || r.student_id || '').replace(/"/g, '""');
        const classNameStr = String(s?.standard || s?.class_name || '').replace(/"/g, '""');
        const statusStr = String(r.status || 'present').replace(/"/g, '""');
        return `"${studentName}","${classNameStr}","${cleanDate}","${statusStr}"`;
      }),
    ];
    const csvContent = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-report-${date || new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white">Attendance</h1>
          <p className="mt-1 text-sm text-slate-400">Mark and save daily attendance.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={exportExcel}>
            Export Excel
          </Button>
          <Button variant="secondary" onClick={exportCSV}>
            Export CSV
          </Button>
        </div>
      </div>
      <Card className="p-6">
        <div className="flex flex-wrap gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setMarksOverride({});
            }}
            className="rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
          />
          <select
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
          >
            <option value="">All classes</option>
            {classes.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          <Button onClick={handleMarkAllPresent} variant="secondary">
            Mark all present
          </Button>
          <Button onClick={save} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving…' : 'Save attendance'}
          </Button>
        </div>
        <p className="mt-4 text-sm text-slate-400">
          {selected} of {roster.length} currently present or late.
        </p>
        <div className="mt-5 divide-y divide-slate-800">
          {roster.length ? (
            roster.map((student) => {
              const currentStatus = getStatus(student.id);
              const isAbsent = currentStatus === 'absent';
              const waUrl = isAbsent ? getWhatsAppAbsentUrl(student.parent_phone, student.full_name, date) : null;
              return (
                <div key={student.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-white">{student.full_name}</p>
                    <p className="text-sm text-slate-500">{student.standard || 'No class'}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {statuses.map((status) => (
                      <button
                        key={status}
                        onClick={() => handleSetStatus(student.id, status)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                          currentStatus === status ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/20 px-2.5 py-1.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 transition"
                      >
                        <span>💬 WA Absent Alert</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="py-10 text-center text-slate-500">No students in this class.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

export default Attendance;