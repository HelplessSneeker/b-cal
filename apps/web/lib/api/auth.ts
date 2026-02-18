import { api, ApiError } from './api';

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
}

export interface AuthResponse {
  success: boolean;
  error?: string;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  try {
    await api('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    return { success: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function signup(
  email: string,
  password: string,
): Promise<AuthResponse> {
  try {
    await api('/auth/signup', {
      method: 'POST',
      body: { email, password },
    });
    return { success: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function logout(): Promise<void> {
  try {
    await api('/auth/logout', {
      method: 'POST',
    });
  } catch {
    // Ignore errors on logout
  }
}

export async function forgotPassword(email: string): Promise<AuthResponse> {
  try {
    await api('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    });
    return { success: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<AuthResponse> {
  try {
    await api('/auth/reset-password', {
      method: 'POST',
      body: { password, token },
    });
    return { success: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function verifyEmail(token: string): Promise<AuthResponse> {
  try {
    await api(`/auth/verify-email?token=${encodeURIComponent(token)}`, {
      method: 'GET',
    });
    return { success: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function resendVerification(): Promise<AuthResponse> {
  try {
    await api('/auth/resend-verification', {
      method: 'POST',
    });
    return { success: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function refreshToken(): Promise<AuthResponse> {
  try {
    await api('/auth/refresh', {
      method: 'POST',
      showSuccessToast: false,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function deleteUser(): Promise<AuthResponse> {
  try {
    await api('/user', {
      method: 'DELETE',
    });
    return { success: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function getMe(): Promise<User | null> {
  try {
    const user = await api<User>('/auth/me', {
      method: 'GET',
      showSuccessToast: false,
    });
    return user;
  } catch {
    return null;
  }
}
