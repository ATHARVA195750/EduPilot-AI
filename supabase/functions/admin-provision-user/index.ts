import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function generateSecurePassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  let pwd = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    pwd += chars[array[i] % chars.length];
  }
  return pwd;
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Server configuration error.' }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  let createdAuthUserId: string | null = null;
  let createdProfileId: string | null = null;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Authentication required.' }, 401);
    }
    const token = authHeader.replace('Bearer ', '').trim();

    const { data: { user: callerUser }, error: callerError } = await adminClient.auth.getUser(token);
    if (callerError || !callerUser) {
      return jsonResponse({ error: 'Invalid or expired caller session.' }, 401);
    }

    const { data: callerProfile, error: profErr } = await adminClient
      .from('profiles')
      .select('id, institute_id, role, status')
      .eq('id', callerUser.id)
      .maybeSingle();

    if (profErr || !callerProfile) {
      return jsonResponse({ error: 'Caller profile could not be loaded.' }, 403);
    }

    if (callerProfile.status !== 'Active') {
      return jsonResponse({ error: 'Caller account is not active.' }, 403);
    }

    if (!['owner', 'admin'].includes(callerProfile.role)) {
      return jsonResponse({ error: 'Unauthorized: Only Owner or Admin can provision accounts.' }, 403);
    }

    const instituteId = callerProfile.institute_id;
    if (!instituteId) {
      return jsonResponse({ error: 'Caller is not linked to an institute.' }, 403);
    }

    const payload = await req.json();
    const { targetType, existingRecordId, fullName, phone, email: contactEmail } = payload;

    if (targetType === 'admin') {
      if (callerProfile.role !== 'owner') {
        return jsonResponse({ error: 'Only the institute owner can create Admin accounts.' }, 403);
      }
      return await createAdminAccount(adminClient, {
        instituteId,
        fullName,
        email: contactEmail,
        password: payload.password,
      });
    }

    if (!['student', 'teacher'].includes(targetType)) {
      return jsonResponse({ error: 'targetType must be "student", "teacher", or "admin".' }, 400);
    }


async function createAdminAccount(adminClient: any, { instituteId, fullName, email, password }: any) {
  const normalizedName = typeof fullName === 'string' ? fullName.trim() : '';
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!normalizedName || normalizedName.length > 160) {
    return jsonResponse({ error: 'Enter a full name no longer than 160 characters.' }, 400);
  }
  if (!normalizedEmail || normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return jsonResponse({ error: 'Enter a valid email address.' }, 400);
  }
  if (typeof password !== 'string' || password.length < 8) {
    return jsonResponse({ error: 'Password must be at least 8 characters.' }, 400);
  }

  let createdAuthUserId: string | null = null;
  try {
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: normalizedName,
        role: 'admin',
        institute_id: instituteId,
      },
    });

    if (authError || !authData?.user) {
      const errorMessage = String(authError?.message || '').toLowerCase();
      if (authError?.status === 422 && (errorMessage.includes('already') || errorMessage.includes('exists'))) {
        return jsonResponse({ error: 'An account with this email already exists.' }, 409);
      }
      console.warn('Admin Auth user creation failed:', authError?.message || 'No user returned.');
      return jsonResponse({ error: 'The Admin account could not be created. Check the email and password requirements.' }, 400);
    }

    createdAuthUserId = authData.user.id;
    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: createdAuthUserId,
      institute_id: instituteId,
      full_name: normalizedName,
      email: normalizedEmail,
      role: 'admin',
      status: 'Active',
    }, { onConflict: 'id' });

    if (profileError) throw profileError;

    return jsonResponse({ success: true, userId: createdAuthUserId, role: 'admin' }, 201);
  } catch (error: any) {
    const duplicateProfileEmail = error?.code === '23505' && String(error?.message || '').toLowerCase().includes('email');
    let rollbackFailed = false;
    if (createdAuthUserId) {
      const { error: profileDeleteError } = await adminClient
        .from('profiles')
        .delete()
        .eq('id', createdAuthUserId)
        .eq('institute_id', instituteId);
      if (profileDeleteError) {
        rollbackFailed = true;
        console.error('Admin profile rollback failed:', profileDeleteError.message);
      }

      const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(createdAuthUserId);
      if (authDeleteError) {
        rollbackFailed = true;
        console.error('Admin Auth rollback failed:', authDeleteError.message);
      }
    }

    console.error('Admin provisioning failed:', error?.message || error);
    if (duplicateProfileEmail && !rollbackFailed) {
      return jsonResponse({ error: 'An account with this email already exists.' }, 409);
    }
    return jsonResponse({
      error: rollbackFailed
        ? 'Admin provisioning failed and requires support before retrying.'
        : 'Admin provisioning failed. No account was retained.',
    }, 500);
  }
}
    const yearSuffix = new Date().getFullYear().toString().slice(-2);
    const prefix = targetType === 'student' ? 'STU' : 'TCH';
    let assignedIdCode = '';
    let targetRecord: any = null;

    if (existingRecordId) {
      const table = targetType === 'student' ? 'students' : 'teachers';
      const { data: existing, error: existErr } = await adminClient
        .from(table)
        .select('*')
        .eq('id', existingRecordId)
        .eq('institute_id', instituteId)
        .maybeSingle();

      if (existErr || !existing) {
        return jsonResponse({ error: `Target ${targetType} record not found.` }, 404);
      }
      if (existing.user_id) {
        return jsonResponse({ error: `This ${targetType} already has a linked Auth account.` }, 400);
      }
      targetRecord = existing;
      if (targetType === 'student' && existing.student_id_code) {
        assignedIdCode = existing.student_id_code;
      } else if (targetType === 'teacher' && existing.teacher_id_code) {
        assignedIdCode = existing.teacher_id_code;
      }
    }

    // Delegate all account/record creation (with rollback) to the helper below.
    return await handleProvisioning(adminClient, {
      instituteId,
      targetType,
      prefix,
      yearSuffix,
      assignedIdCode,
      targetRecord,
      fullName,
      phone,
      contactEmail,
      existingRecordId,
      payload,
    });
  } catch (error: any) {
    return jsonResponse({ error: error.message || 'Provisioning error.' }, 500);
  }
});

async function handleProvisioning(adminClient: any, opts: any) {
  const {
    instituteId,
    targetType,
    prefix,
    yearSuffix,
    targetRecord,
    fullName,
    phone,
    contactEmail,
    existingRecordId,
    payload
  } = opts;
  let { assignedIdCode } = opts;

  let createdAuthUserId: string | null = null;
  let createdProfileId: string | null = null;

  try {
    if (!assignedIdCode) {
      const table = targetType === 'student' ? 'students' : 'teachers';
      const colName = targetType === 'student' ? 'student_id_code' : 'teacher_id_code';
      let attempts = 0;
      while (attempts < 5) {
        attempts++;
        const { count } = await adminClient
          .from(table)
          .select('id', { count: 'exact', head: true })
          .eq('institute_id', instituteId);
        const seq = String((count || 0) + attempts).padStart(4, '0');
        const generated = `${prefix}-${yearSuffix}-${seq}`;
        const { data: existingWithCode } = await adminClient
          .from(table)
          .select('id')
          .eq(colName, generated)
          .maybeSingle();
        if (!existingWithCode) {
          assignedIdCode = generated;
          break;
        }
      }
      if (!assignedIdCode) {
        const rand = Math.floor(1000 + Math.random() * 9000);
        assignedIdCode = `${prefix}-${yearSuffix}-${rand}`;
      }
    }

    const rolePrefix = prefix.toLowerCase();
    const sanitizedId = assignedIdCode.toLowerCase().replace(/[^a-z0-9]/g, '_');
    // Must mirror src/utils/idGenerator.js idCodeToInternalEmail(): strip any
    // leading role prefix from the sanitized ID so the final format is exactly
    // stu_<id>@edupilot.internal / tch_<id>@edupilot.internal (no duplicate prefix).
    const localPart = sanitizedId.startsWith(`${rolePrefix}_`)
      ? sanitizedId.slice(rolePrefix.length + 1)
      : sanitizedId;
    const authEmail = `${rolePrefix}_${localPart}@edupilot.internal`;
    const tempPassword = generateSecurePassword(10);

    const { data: newAuthData, error: createAuthError } = await adminClient.auth.admin.createUser({
      email: authEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || targetRecord?.full_name || `${targetType} User`,
        role: targetType,
        institute_id: instituteId,
        id_code: assignedIdCode,
      },
    });

    if (createAuthError || !newAuthData.user) {
      // Detail is logged server-side only: PostgREST messages expose table,
      // column and constraint names to the caller.
      console.error('Auth user creation failed:', createAuthError?.message);
      return jsonResponse({ error: 'Could not create the login account. Nothing was saved.' }, 500);
    }
    createdAuthUserId = newAuthData.user.id;

    const { error: profCreateErr } = await adminClient.from('profiles').upsert({
      id: createdAuthUserId,
      institute_id: instituteId,
      role: targetType,
      full_name: fullName || targetRecord?.full_name || 'EduPilot User',
      email: contactEmail || targetRecord?.email || targetRecord?.parent_email || null,
      phone: phone || targetRecord?.phone || targetRecord?.parent_phone || null,
      status: 'Active',
    });
    if (profCreateErr) {
      console.error('Profile creation failed:', profCreateErr.message);
      throw new Error('Profile creation failed.');
    }
    createdProfileId = createdAuthUserId;

    if (targetType === 'student') {
      if (existingRecordId) {
        const { error: updErr } = await adminClient
          .from('students')
          .update({ user_id: createdAuthUserId, student_id_code: assignedIdCode, status: 'Active' })
          .eq('id', existingRecordId);
        if (updErr) {
          console.error('Student linking failed:', updErr.message);
          throw new Error('Student linking failed.');
        }
      } else {
        const { error: insErr } = await adminClient.from('students').insert({
          institute_id: instituteId,
          user_id: createdAuthUserId,
          student_id_code: assignedIdCode,
          full_name: fullName,
          parent_phone: phone || null,
          status: 'Active',
          admission_date: new Date().toISOString().slice(0, 10),
          ...payload.studentData,
        });
        if (insErr) {
          console.error('Student creation failed:', insErr.message);
          throw new Error('Student creation failed.');
        }
      }
    } else if (targetType === 'teacher') {
      if (existingRecordId) {
        const upd: any = { user_id: createdAuthUserId, status: 'Active', teacher_id_code: assignedIdCode };
        const { error: updErr } = await adminClient.from('teachers').update(upd).eq('id', existingRecordId);
        if (updErr) {
          console.error('Teacher linking failed:', updErr.message);
          throw new Error('Teacher linking failed.');
        }
      } else {
        const { error: insErr } = await adminClient.from('teachers').insert({
          institute_id: instituteId,
          user_id: createdAuthUserId,
          full_name: fullName,
          phone: phone || null,
          email: contactEmail || null,
          status: 'Active',
          teacher_id_code: assignedIdCode,
          joining_date: new Date().toISOString().slice(0, 10),
          ...payload.teacherData,
        });
        if (insErr) {
          console.error('Teacher creation failed:', insErr.message);
          throw new Error('Teacher creation failed.');
        }
      }
    }

    return jsonResponse({
      success: true,
      identifier: assignedIdCode,
      tempPassword,
      role: targetType,
      userId: createdAuthUserId,
    });
  } catch (error: any) {
    if (createdProfileId) {
      try { await adminClient.from('profiles').delete().eq('id', createdProfileId); } catch (_) {}
    }
    if (createdAuthUserId) {
      try { await adminClient.auth.admin.deleteUser(createdAuthUserId); } catch (_) {}
    }
    // Full detail (including the underlying database message) goes to the server
    // log; the caller only learns that provisioning failed and was rolled back.
    console.error('Provisioning failed and was rolled back:', error);
    return jsonResponse({ error: 'Provisioning failed. Every partial record created for this request was removed.' }, 500);
  }
}

