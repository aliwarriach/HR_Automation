export function hasPermission(permissions, module, action) {
  return Boolean(permissions?.[module]?.includes(action));
}

// super_admin is hardcoded-blocked from employee-only self-service flows (own attendance,
// own announcement feed) regardless of its permissions object, which otherwise grants everything.
// The QA-only test_probe account bypasses this exclusion.
export function isBlockedForSuperAdmin(role, isTestProbe) {
  return role === "super_admin" && !isTestProbe;
}
