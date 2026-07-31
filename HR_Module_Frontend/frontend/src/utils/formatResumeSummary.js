export function formatOrDash(value) {
  return value ? value : "—";
}

export function formatExperience(years) {
  if (!years || years <= 0) return "No professional experience";
  if (years < 1) {
    const months = Math.round(years * 12);
    return `${months} mo${months === 1 ? "" : "s"}`;
  }
  const rounded = Number.isInteger(years) ? years : years.toFixed(1);
  return `${rounded} yr${years === 1 ? "" : "s"}`;
}

export function formatHeadline(role, company) {
  if (role && company) return `${role} @ ${company}`;
  return role || company || "—";
}
