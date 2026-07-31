export const ROUTES = {
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  JOB_POSTINGS: "/job-postings",
  RESUMES: "/resumes",
  RESUME_DETAIL: "/resumes/:id",
  SHORTLIST: "/candidates",
  CANDIDATE_DETAIL: "/candidates/:id",
  EMPLOYEES: "/employees",
  EMPLOYEE_DETAIL: "/employees/:id",
  ATTENDANCE: "/attendance",
  ATTENDANCE_HISTORY: "/attendance/history",
  ATTENDANCE_ADMIN: "/attendance/admin",
  ATTENDANCE_ADMIN_LIST: "/attendance/admin/employees",
  ATTENDANCE_ADMIN_DETAIL: "/attendance/admin/employees/:employeeId",
  ANNOUNCEMENTS: "/announcements",
  ANNOUNCEMENT_NEW: "/announcements/new",
  ANNOUNCEMENT_DETAIL: "/announcements/:id",
  ANNOUNCEMENT_EDIT: "/announcements/:id/edit",
  MY_ANNOUNCEMENTS: "/my-announcements",
  MY_ANNOUNCEMENT_DETAIL: "/my-announcements/:id",
  ROLES_LIST: "/roles",
  ROLE_NEW: "/roles/new",
  ROLE_DETAIL: "/roles/:id",
  ROLE_EDIT: "/roles/:id/edit",
};

export const resumeDetailPath = (id) => `/resumes/${id}`;
export const candidateDetailPath = (id) => `/candidates/${id}`;
export const employeeDetailPath = (id) => `/employees/${id}`;
export const attendanceAdminDetailPath = (employeeId) => `/attendance/admin/employees/${employeeId}`;
export const announcementDetailPath = (id) => `/announcements/${id}`;
export const announcementEditPath = (id) => `/announcements/${id}/edit`;
export const myAnnouncementDetailPath = (id) => `/my-announcements/${id}`;
export const roleDetailPath = (id) => `/roles/${id}`;
export const roleEditPath = (id) => `/roles/${id}/edit`;
