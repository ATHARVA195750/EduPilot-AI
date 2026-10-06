/**
 * authService.js — FastAPI backend edition.
 *
 * loginWithIdentifier, signOut, getCurrentUser now delegate to AuthContext
 * (which handles token storage and state). This file retains its exported
 * function signatures so that all existing callers (Login.jsx etc.) continue
 * to work without modification.
 */

// Re-export from apiClient for convenience. The actual login flow is handled
// by AuthContext.login(), which Login.jsx calls directly. This module provides
// the named export loginWithIdentifier that Login.jsx already imports.

import { apiPost, apiGet, tokenStore } from '../lib/apiClient';

/**
 * Unified login.
 * Returns the raw FastAPI response: { access_token, token_type, user }.
 * Token storage is handled by the caller (AuthContext.login or direct call).
 */
export const loginWithIdentifier = async ({ identifier, password, roleType = 'admin' }) => {
  const data = await apiPost('/auth/login', { identifier, password, roleType }, false);
  // Store token immediately so the caller can use it for follow-up requests
  if (data?.access_token) {
    tokenStore.set(data.access_token);
  }
  return data;
};

export const signOut = async () => {
  tokenStore.clear();
  try {
    await apiPost('/auth/logout', {});
  } catch {
    // ignore — token already cleared
  }
  return { data: null, error: null };
};

export const getCurrentUser = async () => {
  try {
    const profile = await apiGet('/auth/me');
    return { data: { user: profile }, error: null };
  } catch (err) {
    return { data: { user: null }, error: err };
  }
};

// Legacy signUp/signIn shims — not used in FastAPI flow but preserved to
// prevent import errors in any remaining legacy files.
export const signUp = async () => {
  throw new Error('signUp is not supported in the FastAPI backend. Use register-admin endpoint.');
};

export const signIn = async () => {
  throw new Error('signIn is not supported. Use loginWithIdentifier instead.');
};

export const resetPassword = async () => {
  throw new Error('Password reset via email is not yet implemented in the FastAPI backend.');
};
