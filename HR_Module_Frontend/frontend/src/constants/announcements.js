export const ALL_ROLES_VALUE = "all";

export const ANNOUNCEMENT_TARGET_ROLE_OPTIONS = [
  { value: "super_admin", label: "Super Admin" },
  { value: "hr", label: "HR" },
  { value: "manager", label: "Manager" },
  { value: "employee", label: "Employee" },
];

// Status is always server-derived from publish_at/expires_at — never set or cached client-side.
export const ANNOUNCEMENT_STATUS_LABEL = {
  scheduled: "Scheduled",
  active: "Active",
  expired: "Expired",
};

export const ANNOUNCEMENT_STATUS_VARIANT = {
  scheduled: "info",
  active: "success",
  expired: "neutral",
};

export const ANNOUNCEMENT_STATUS_OPTIONS = Object.keys(ANNOUNCEMENT_STATUS_LABEL).map((value) => ({
  value,
  label: ANNOUNCEMENT_STATUS_LABEL[value],
}));

export function getAnnouncementTargetRoleLabel(role) {
  return ANNOUNCEMENT_TARGET_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}
