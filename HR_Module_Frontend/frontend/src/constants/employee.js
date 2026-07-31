export const EMPLOYEE_ROLE_OPTIONS = [
  { value: "employee", label: "Employee" },
  { value: "manager", label: "Manager" },
  { value: "hr", label: "HR" },
  { value: "super_admin", label: "Super Admin" },
];

export const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "full_time", label: "Full Time" },
  { value: "intern", label: "Intern" },
  { value: "contract", label: "Contract" },
];

export const EMPLOYEE_ROLE_VARIANT = {
  super_admin: "primary",
  hr: "warning",
  manager: "info",
  employee: "neutral",
};

export const EMPLOYMENT_TYPE_VARIANT = {
  full_time: "success",
  contract: "warning",
  intern: "info",
};

export function getEmployeeRoleLabel(role) {
  return EMPLOYEE_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}

export function getEmploymentTypeLabel(type) {
  return EMPLOYMENT_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}
