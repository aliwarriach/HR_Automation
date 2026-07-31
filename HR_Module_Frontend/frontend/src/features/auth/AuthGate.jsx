import { useEffect } from "react";
import { useAuthStore } from "../../store/authStore";
import { getMe } from "../../services/authService";

// Resolves the effective permissions for the current session (fresh login or a
// page reload restoring a persisted token) before any protected route renders,
// so nav items and route guards never flash with stale/absent permissions.
export default function AuthGate({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrated = useAuthStore((s) => s.hydrated);
  const setProfile = useAuthStore((s) => s.setProfile);
  const markHydrated = useAuthStore((s) => s.markHydrated);

  useEffect(() => {
    if (!isAuthenticated || hydrated) return;

    let cancelled = false;

    async function hydrate() {
      const response = await getMe();
      if (cancelled) return;

      if (response.ok) {
        setProfile(response.data);
      } else if (response.status !== 401) {
        markHydrated();
      }
    }

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, hydrated, setProfile, markHydrated]);

  if (isAuthenticated && !hydrated) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <p className="font-body-sm text-body-sm text-on-surface-variant">Loading your session…</p>
      </div>
    );
  }

  return children;
}
