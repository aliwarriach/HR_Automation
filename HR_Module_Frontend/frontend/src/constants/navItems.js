import { ROUTES } from "./routes";
import { MODULES, ACTIONS } from "./permissions";

export const NAV_ITEMS = [
  { label: "Dashboard", icon: "dashboard", path: ROUTES.DASHBOARD },
  {
    label: "Job Postings",
    icon: "work",
    path: ROUTES.JOB_POSTINGS,
    permission: { module: MODULES.JOB_POSTINGS, action: ACTIONS.READ },
  },
  {
    label: "Resumes",
    icon: "description",
    path: ROUTES.RESUMES,
    permission: { module: MODULES.RESUMES, action: ACTIONS.READ },
  },
  {
    label: "Candidates",
    icon: "groups",
    path: ROUTES.SHORTLIST,
    permission: { module: MODULES.CANDIDATES, action: ACTIONS.READ },
  },
  {
    label: "Employees",
    icon: "group",
    path: ROUTES.EMPLOYEES,
    permission: { module: MODULES.EMPLOYEES, action: ACTIONS.READ },
  },
  {
    label: "Attendance",
    icon: "event_available",
    path: ROUTES.ATTENDANCE,
    permission: { module: MODULES.ATTENDANCE, action: ACTIONS.VIEW_OWN },
    blockSuperAdmin: true,
  },
  {
    label: "Attendance Admin",
    icon: "admin_panel_settings",
    path: ROUTES.ATTENDANCE_ADMIN,
    permission: { module: MODULES.ATTENDANCE, action: ACTIONS.VIEW_ALL },
  },
  {
    label: "My Announcements",
    icon: "notifications",
    path: ROUTES.MY_ANNOUNCEMENTS,
    permission: { module: MODULES.ANNOUNCEMENTS, action: ACTIONS.VIEW_OWN },
    blockSuperAdmin: true,
  },
  {
    label: "Announcements",
    icon: "campaign",
    path: ROUTES.ANNOUNCEMENTS,
    permission: { module: MODULES.ANNOUNCEMENTS, action: ACTIONS.READ },
  },
  {
    label: "Roles & Permissions",
    icon: "security",
    path: ROUTES.ROLES_LIST,
    permission: { module: MODULES.ROLES, action: ACTIONS.READ },
  },
  { label: "Payroll", icon: "payments" },
];
