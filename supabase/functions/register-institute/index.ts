import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---------------------------------------------------------------------------
// register-institute — PUBLIC onboarding endpoint.
//
// A person who has never used EduPilot registers their institute and becomes
// its first Admin. This is NOT the existing admin-provision-user function,
// which requires a signed-in owner/admin and injects a user into an ALREADY
// EXISTING institute. This function never accepts a client-chosen institute_id
// or role: it always mints a brand new institute and always assigns 'admin'.
//
// The service-role key lives only in the Edge runtime (Deno.env) and is never
// shipped to the browser.
// ---------------------------------------------------------------------------

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Digits, spaces and the common phone punctuation only — never letters.
const PHONE_RE = /^[0-9+\-()\s]{7,50}$/;

/** Trim, collapse internal whitespace, strip control characters. */
function cleanText(value: unknown): string {
  if (typeof value !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
}

/** Address keeps newlines, but control chars are still stripped. */
function cleanMultiline(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '')
    .replace(/\r\n/g, '\n')
    .trim();
}

type RegisterPayload = {
  instituteName?: unknown;
  instituteEmail?: unknown;
  contactNumber?: unknown;
  instituteAddress?: unknown;
  fullName?: unknown;
  adminEmail?: unknown;
  password?: unknown;
  confirmPassword?: unknown;
};

type NormalizedPayload = {
  instituteName: string;
  instituteEmail: string;
  contactNumber: string;
  instituteAddress: string;
  fullName: string;
  adminEmail: string;
  password: string;
};

/**
 * Server-side validation. Every field is re-checked here regardless of what
 * the browser did — the client is never trusted.
 */
function validate(payload: RegisterPayload): { error: string } | { value: NormalizedPayload } {
  if (!payload || typeof payload !== 'object') {
    return { error: 'Invalid request body.' };
  }

  const instituteName = cleanText(payload.instituteName);
  const instituteEmail = cleanText(payload.instituteEmail).toLowerCase();
  const contactNumber = cleanText(payload.contactNumber);
  const instituteAddress = cleanMultiline(payload.instituteAddress);
  const fullName = cleanText(payload.fullName);
  const adminEmail = cleanText(payload.adminEmail).toLowerCase();
  const password = typeof payload.password === 'string' ? payload.password : '';
  const confirmPassword = typeof payload.confirmPassword === 'string' ? payload.confirmPassword : '';

  if (instituteName.length < 2 || instituteName.length > 255) {
    return { error: 'Enter an institute name between 2 and 255 characters.' };
  }
  if (!instituteEmail || instituteEmail.length > 254 || !EMAIL_RE.test(instituteEmail)) {
    return { error: 'Enter a valid institute email address.' };
  }
  if (!PHONE_RE.test(contactNumber)) {
    return { error: 'Enter a valid contact number (7-50 digits).' };
  }
  if (instituteAddress.length < 5 || instituteAddress.length > 1000) {
    return { error: 'Enter an institute address between 5 and 1000 characters.' };
  }
  if (fullName.length < 2 || fullName.length > 160) {
    return { error: 'Enter the administrator’s full name (2-160 characters).' };
  }
  if (!adminEmail || adminEmail.length > 254 || !EMAIL_RE.test(adminEmail)) {
    return { error: 'Enter a valid admin email address.' };
  }
  if (password.length < 8 || password.length > 128) {
    return { error: 'Password must be at least 8 characters.' };
  }
  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' };
  }

  return {
    value: { instituteName, instituteEmail, contactNumber, instituteAddress, fullName, adminEmail, password },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Server configuration error.' }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let payload: RegisterPayload;
  try {
    payload = await req.json();
  } catch (_) {
    return jsonResponse({ error: 'Invalid request body.' }, 400);
  }

  const validated = validate(payload);
  if ('error' in validated) {
    return jsonResponse({ error: validated.error }, 400);
  }
  const value = validated.value;

  // ---- Duplicate protection (checked before anything is created) ----------
  // profiles.email has NO unique constraint in the live schema, so duplicates
  // are rejected here explicitly; auth.users uniqueness is enforced by GoTrue
  // and surfaced as 422 below.
  const { data: duplicateProfile, error: dupProfileErr } = await adminClient
    .from('profiles')
    .select('id')
    .eq('email', value.adminEmail)
    .limit(1);
  if (dupProfileErr) {
    console.error('Duplicate check failed:', dupProfileErr.message);
    return jsonResponse({ error: 'Unable to verify registration details. Please try again.' }, 500);
  }
  if (duplicateProfile && duplicateProfile.length > 0) {
    return jsonResponse({ error: 'An account with this email already exists.' }, 409);
  }

  // ---- Provisioning with full rollback ------------------------------------
  let createdAuthUserId: string | null = null;
  let createdInstituteId: string | null = null;
  let createdProfileId: string | null = null;
  let rollbackFailed = false;

  try {
    // 1) First Admin auth account. email_confirm because the project runs with
    //    mailer_autoconfirm=false and onboarding requires immediate sign-in.
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: value.adminEmail,
      password: value.password,
      email_confirm: true,
      user_metadata: { full_name: value.fullName, role: 'admin' },
    });

    if (authError || !authData?.user) {
      const message = String(authError?.message || '').toLowerCase();
      if (
        authError?.status === 422 &&
        (message.includes('already') || message.includes('exists') || message.includes('registered'))
      ) {
        return jsonResponse({ error: 'An account with this email already exists.' }, 409);
      }
      console.warn('Auth user creation failed:', authError?.message || 'No user returned.');
      return jsonResponse(
        { error: 'The Admin account could not be created. Check the email and password requirements.' },
        400,
      );
    }
    createdAuthUserId = authData.user.id;

    // 2) Brand new institute. The id is generated here and NEVER taken from
    //    the request body, so a caller can never join an existing tenant.
    const instituteId = crypto.randomUUID();
    const { data: instituteRow, error: instituteError } = await adminClient
      .from('institutes')
      .insert({
        id: instituteId,
        name: value.instituteName,
        email: value.instituteEmail,
        phone: value.contactNumber,
        address: value.instituteAddress,
        owner_name: value.fullName,
        owner_user_id: createdAuthUserId,
      })
      .select('id')
      .single();

    if (instituteError || !instituteRow) {
      throw new Error(`Institute creation failed: ${instituteError?.message || 'no row returned'}`);
    }
    createdInstituteId = instituteRow.id;

    // 3) Matching profile: role, status and institute_id are set server-side.
    const { error: profileError } = await adminClient.from('profiles').insert({
      id: createdAuthUserId,
      institute_id: createdInstituteId,
      full_name: value.fullName,
      email: value.adminEmail,
      role: 'admin',
      status: 'Active',
    });
    if (profileError) {
      throw new Error(`Profile creation failed: ${profileError.message}`);
    }
    createdProfileId = createdAuthUserId;

    return jsonResponse(
      {
        success: true,
        instituteId: createdInstituteId,
        userId: createdAuthUserId,
        role: 'admin',
        email: value.adminEmail,
      },
      201,
    );
  } catch (error) {
    // Rollback order is dictated by foreign keys:
    //   profiles.id              -> auth.users ON DELETE CASCADE (child first)
    //   institutes.owner_user_id -> auth.users has NO ON DELETE, so the
    //   institute must go before the auth user or the FK blocks the delete.
    if (createdProfileId) {
      const { error: e } = await adminClient.from('profiles').delete().eq('id', createdProfileId);
      if (e) {
        rollbackFailed = true;
        console.error('Profile rollback failed:', e.message);
      }
    }
    if (createdInstituteId) {
      const { error: e } = await adminClient.from('institutes').delete().eq('id', createdInstituteId);
      if (e) {
        rollbackFailed = true;
        console.error('Institute rollback failed:', e.message);
      }
    }
    if (createdAuthUserId) {
      const { error: e } = await adminClient.auth.admin.deleteUser(createdAuthUserId);
      if (e) {
        rollbackFailed = true;
        console.error('Auth user rollback failed:', e.message);
      }
    }

    // Full detail (including the underlying database message) goes to the
    // server log only; the caller never receives raw DB errors.
    console.error('Registration failed and was rolled back:', error);
    return jsonResponse(
      {
        error: rollbackFailed
          ? 'Registration failed and automatic cleanup could not be completed. Please contact support.'
          : 'Registration failed. No partial institute, Admin account, or profile was left behind.',
      },
      500,
    );
  }
});
