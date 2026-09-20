import { useQuery } from '@tanstack/react-query';
import { fetchStudents } from '../services/studentService';
import { fetchTeachers } from '../services/teacherService';
import { fetchAttendance } from '../services/attendanceService';
import { fetchFees } from '../services/feeService';
import { fetchHomework } from '../services/homeworkService';
import { fetchTests } from '../services/testService';
import { fetchAnnouncements } from '../services/announcementService';
import { DEMO_DASHBOARD } from '../utils/demoData';

export function useDashboard(instituteId) {
  return useQuery({
    queryKey: ['dashboard', instituteId],
    queryFn: async () => {
      try {
        const [students, teachers, attendance, fees, homework, tests, announcements] =
          await Promise.all([
            fetchStudents(instituteId),
            fetchTeachers(instituteId),
            fetchAttendance(instituteId),
            fetchFees(instituteId).catch(() => DEMO_DASHBOARD.fees),
            fetchHomework(instituteId).catch(() => DEMO_DASHBOARD.homework),
            fetchTests(instituteId).catch(() => DEMO_DASHBOARD.tests),
            fetchAnnouncements(instituteId).catch(() => DEMO_DASHBOARD.announcements),
          ]);

        return {
          students: students?.length ? students : DEMO_DASHBOARD.students,
          teachers: teachers?.length ? teachers : DEMO_DASHBOARD.teachers,
          attendance: attendance?.length ? attendance : DEMO_DASHBOARD.attendance,
          fees: fees?.length ? fees : DEMO_DASHBOARD.fees,
          homework: homework?.length ? homework : DEMO_DASHBOARD.homework,
          tests: tests?.length ? tests : DEMO_DASHBOARD.tests,
          announcements: announcements?.length ? announcements : DEMO_DASHBOARD.announcements,
        };
      } catch (err) {
        console.warn('Dashboard fetch fallback to DEMO_DASHBOARD:', err);
        return DEMO_DASHBOARD;
      }
    },
    enabled: true,
    placeholderData: DEMO_DASHBOARD,
  });
}