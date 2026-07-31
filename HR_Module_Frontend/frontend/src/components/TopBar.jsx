import { useNavigate } from "react-router-dom";
import Icon from "./Icon";
import { useAuthStore } from "../store/authStore";
import { useTheme } from "../hooks/useTheme";
import { ROUTES } from "../constants/routes";

export default function TopBar({ title }) {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  return (
    <header className="bg-surface/90 text-primary border-b border-outline-variant flex items-center justify-between h-16 px-xl sticky top-0 z-40 backdrop-blur-md">
      <h2 className="font-h1 text-h1 text-primary">{title}</h2>

      <div className="flex items-center gap-md">
        <button
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="text-on-secondary-container hover:text-primary transition-all"
        >
          <Icon name={theme === "dark" ? "light_mode" : "dark_mode"} />
        </button>
        <button aria-label="Notifications" className="text-on-secondary-container hover:text-primary transition-all">
          <Icon name="notifications" />
        </button>
        <button aria-label="Settings" className="text-on-secondary-container hover:text-primary transition-all">
          <Icon name="settings" />
        </button>
        <button
          onClick={handleLogout}
          className="font-body-sm text-body-sm font-semibold text-primary hover:underline flex items-center gap-xs"
        >
          <Icon name="logout" className="text-[18px]" />
          Log out
        </button>
      </div>
    </header>
  );
}
