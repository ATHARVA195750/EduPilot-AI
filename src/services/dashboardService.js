import { supabase } from '../lib/supabase';

const requiredInstitute = (instituteId) => {
  if (!instituteId) throw new Error('Your account is not linked to an institute. Ask an administrator to add institute_id to your user profile.');
  if (!supabase) throw new Error('Supabase is not configured.');
};

const selectRows = async (table, instituteId, order = 'created_at') => {
  let query = supabase.from(table).select('*').eq('institute_id', instituteId);
  if (order) query = query.order(order, { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
};

export async function fetchDashboard(instituteId) {
  requiredInstitute(instituteId);
  const [students, teachers, attendance, fees, homework, tests, announcements] = await Promise.all([
    selectRows('students', instituteId),
    selectRows('teachers', instituteId),
    selectRows('attendance', instituteId, 'date'),
    selectRows('fees', instituteId),
    selectRows('homework', instituteId, 'due_date'),
    selectRows('tests', instituteId, 'date'),
    selectRows('announcements', instituteId).catch(() => []),
  ]);
  return { students, teachers, attendance, fees, homework, tests, announcements };
}
