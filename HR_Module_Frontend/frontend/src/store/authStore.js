import { create } from "zustand";
import { persist } from "zustand/middleware";
import { decodeJwt } from "../utils/jwt";

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      userId: null,
      email: null,
      role: null,
      roleId: null,
      roleName: null,
      isTestProbe: false,
      permissions: {},
      isAuthenticated: false,
      hydrated: false,

      setToken: (token) => {
        const payload = decodeJwt(token);
        set({
          token,
          role: payload?.role ?? null,
          userId: payload?.sub ?? null,
          isAuthenticated: true,
          hydrated: false,
        });
      },

      // Populates the fully-resolved effective permissions from GET /auth/me.
      setProfile: (profile) =>
        set({
          userId: profile.id ?? null,
          email: profile.email ?? null,
          role: profile.role ?? null,
          roleId: profile.role_id ?? null,
          roleName: profile.role_name ?? null,
          isTestProbe: Boolean(profile.is_test_probe),
          permissions: profile.permissions ?? {},
          hydrated: true,
        }),

      markHydrated: () => set({ hydrated: true }),

      logout: () =>
        set({
          token: null,
          userId: null,
          email: null,
          role: null,
          roleId: null,
          roleName: null,
          isTestProbe: false,
          permissions: {},
          isAuthenticated: false,
          hydrated: false,
        }),
    }),
    { name: "hr-auth" }
  )
);
