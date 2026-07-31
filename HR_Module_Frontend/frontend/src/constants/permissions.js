export const MODULES = {
  ATTENDANCE: "attendance",
  ANNOUNCEMENTS: "announcements",
  EMPLOYEES: "employees",
  RESUMES: "resumes",
  CANDIDATES: "candidates",
  JOB_POSTINGS: "job_postings",
  ROLES: "roles",
  WORKING_HOURS: "working_hours",
  PAYROLL: "payroll",
};

export const ACTIONS = {
  CREATE: "create",
  READ: "read",
  UPDATE: "update",
  DELETE: "delete",
  VIEW_OWN: "view_own",
  VIEW_ALL: "view_all",
  EDIT_ALL: "edit_all",
  CHECK_IN_ONSITE: "check_in_onsite",
  CHECK_IN_WFH: "check_in_wfh",
  CHECK_OUT: "check_out",
  START_BREAK: "start_break",
  END_BREAK: "end_break",
  MARK_LEAVE: "mark_leave",
  EXPORT: "export",
};

// Protected by the backend regardless of permissions — cannot be edited/deleted via the Roles UI.
export const PROTECTED_ROLE_NAMES = ["super_admin", "test_probe"];
