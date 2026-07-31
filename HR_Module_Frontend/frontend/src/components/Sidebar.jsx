import { Link, useLocation } from "react-router-dom";
import Icon from "./Icon";
import { NAV_ITEMS } from "../constants/navItems";
import { useAuthStore } from "../store/authStore";
import { useUIStore } from "../store/uiStore";
import { hasPermission, isBlockedForSuperAdmin } from "../utils/permissions";

export default function Sidebar() {
  const location = useLocation();
  const role = useAuthStore((s) => s.role);
  const email = useAuthStore((s) => s.email);
  const isTestProbe = useAuthStore((s) => s.isTestProbe);
  const permissions = useAuthStore((s) => s.permissions);
  const expanded = useUIStore((s) => s.sidebarExpanded);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (item.blockSuperAdmin && isBlockedForSuperAdmin(role, isTestProbe)) return false;
    if (item.permission && !hasPermission(permissions, item.permission.module, item.permission.action)) return false;
    return true;
  });

  const rowBase = `flex items-center py-sm rounded-r transition-colors duration-200 ${
    expanded ? "gap-md px-md" : "justify-center px-0"
  }`;

  return (
    <aside
      className={`bg-primary-container text-on-primary font-body-md text-body-md fixed left-0 top-0 h-screen border-r border-outline-variant flex flex-col py-lg z-50 transition-[width] duration-300 ease-in-out ${
        expanded ? "w-sidebar-width" : "w-sidebar-collapsed"
      }`}
    >
      <div
        className={`flex items-center mb-xl ${expanded ? "justify-between px-lg" : "justify-center px-0"}`}
      >
        {expanded && (
          <div className="min-w-0">
            <h1 className="font-h1 text-h2 text-on-primary truncate">
              Quiet Powerhouse
            </h1>
            <p className="font-body-sm text-body-sm text-on-primary-container">
              Admin Panel
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={expanded}
          className="text-on-primary-container hover:text-on-primary transition-colors"
        >
          <Icon
            name={expanded ? "menu_open" : "menu"}
            className="text-[22px]"
          />
        </button>
      </div>

      <nav className="flex-1 px-sm space-y-xs">
        {visibleNavItems.map((item) => {
          const isActive = item.path && location.pathname === item.path;

          if (!item.path) {
            return (
              <span
                key={item.label}
                title={expanded ? "Coming soon" : `${item.label} — coming soon`}
                className={`${rowBase} text-on-primary-container opacity-40 cursor-not-allowed`}
              >
                <Icon name={item.icon} />
                {expanded && <span className="truncate">{item.label}</span>}
              </span>
            );
          }

          return (
            <Link
              key={item.label}
              to={item.path}
              title={expanded ? undefined : item.label}
              className={`${rowBase} ${
                isActive
                  ? "bg-white/5 border-l-2 border-primary-fixed-dim text-on-primary font-semibold"
                  : "text-on-primary-container hover:text-on-primary opacity-80 hover:bg-white/5"
              }`}
            >
              <Icon name={item.icon} filled={isActive} />
              {expanded && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div
        className={`mt-auto pt-lg border-t border-outline-variant/30 ${expanded ? "px-md" : "px-0"}`}
      >
        <div
          className={`flex items-center ${expanded ? "gap-sm" : "justify-center"}`}
        >
          <div
            title={expanded ? undefined : email || undefined}
            className="w-8 h-8 shrink-0 rounded-full bg-surface-variant flex items-center justify-center text-primary font-semibold text-body-sm"
          >
            {email ? email[0].toUpperCase() : "?"}
          </div>
          {expanded && (
            <div className="min-w-0">
              <p className="font-body-md text-body-md font-medium capitalize truncate">
                {role || "—"}
              </p>
              <p className="font-body-sm text-body-sm text-on-primary-container truncate">
                {email || "—"}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
