export const STANDARD_WORKING_HOURS = 8;

export const WORK_MODE_OPTIONS = [
  { value: "wfh", label: "Work From Home", icon: "home" },
  { value: "onsite", label: "Onsite", icon: "business" },
];

export const BREAK_TYPE_OPTIONS = [
  { value: "tea", label: "Tea", icon: "local_cafe" },
  { value: "prayer", label: "Prayer", icon: "mosque" },
  { value: "meeting", label: "Meeting", icon: "groups" },
];

// "absent" is a 6th, admin-only virtual status — it only ever appears in the
// admin employee-list endpoint (no attendance row exists for that employee/date).
export const ATTENDANCE_STATUS_LABEL = {
  not_checked_in: "Not Checked In",
  checked_in: "Checked In",
  on_break: "On Break",
  checked_out: "Checked Out",
  on_leave: "On Leave",
  absent: "Absent",
};

export const ATTENDANCE_STATUS_VARIANT = {
  not_checked_in: "neutral",
  checked_in: "success",
  on_break: "warning",
  checked_out: "info",
  on_leave: "primary",
  absent: "danger",
};

export const ATTENDANCE_STATUS_OPTIONS = Object.keys(ATTENDANCE_STATUS_LABEL).map((value) => ({
  value,
  label: ATTENDANCE_STATUS_LABEL[value],
}));

export function getWorkModeLabel(value) {
  return WORK_MODE_OPTIONS.find((option) => option.value === value)?.label ?? "—";
}

export function getBreakTypeLabel(value) {
  return BREAK_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function getBreakTypeIcon(value) {
  return BREAK_TYPE_OPTIONS.find((option) => option.value === value)?.icon ?? "coffee";
}
