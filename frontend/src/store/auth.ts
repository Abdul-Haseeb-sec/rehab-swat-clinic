import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'DOCTOR' | 'RECEPTIONIST' | 'BILLING' | 'INTERN';
  full_name: string;
  specialization?: string;
  is_active: boolean;
}

interface AuthState {
  // From auth.ts
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: User, token: string, refreshToken?: string) => void;
  clearAuth: () => void;

  // From authStore.ts
  token: string | null;
  role: string | null;
  name: string | null;
  isAuthenticated: boolean;
  login: (token: string, role: string, name: string, refreshToken?: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      token: null,
      role: null,
      name: null,
      isAuthenticated: false,

      setAuth: (user, token, refreshToken) => set({
        user,
        accessToken: token,
        token: token,
        role: user.role,
        name: user.full_name,
        isAuthenticated: true,
        ...(refreshToken ? { refreshToken } : {})
      }),

      clearAuth: () => set({
        user: null,
        accessToken: null,
        refreshToken: null,
        token: null,
        role: null,
        name: null,
        isAuthenticated: false,
      }),

      login: (token, role, name, refreshToken) => {
        const mockUser: User = {
          id: '',
          email: '',
          role: role as any,
          full_name: name,
          is_active: true
        };
        set({
          user: mockUser,
          accessToken: token,
          token: token,
          role: role,
          name: name,
          isAuthenticated: true,
          ...(refreshToken ? { refreshToken } : {})
        });
      },

      logout: () => set({
        user: null,
        accessToken: null,
        refreshToken: null,
        token: null,
        role: null,
        name: null,
        isAuthenticated: false,
      }),
    }),
    {
      name: 'rehab-swat-auth-combined',
    }
  )
);
