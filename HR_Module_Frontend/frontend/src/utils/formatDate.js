export function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function formatDateTime(isoString) {
  return new Date(isoString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Formats a literal "YYYY-MM-DD" + "HH:MM"(:SS) pair as-is, without going through
// Date string-parsing (which treats date-only strings as UTC and can shift the
// displayed day). Values are org-local, not the browser's timezone.
export function formatInterviewSlot(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);

  const displayDate = new Date(year, month - 1, day).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const displayTime = `${hour12}:${String(minute).padStart(2, "0")} ${period}`;

  return `${displayDate}, ${displayTime}`;
}
