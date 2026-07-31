// Backend returns naive UTC timestamps with no "Z"/offset suffix. Treat them as UTC
// explicitly before converting to the viewer's local time — same convention as attendanceTime.js.
function parseUtcTimestamp(isoString) {
  if (!isoString) return null;
  const hasTz = /[zZ]|[+-]\d\d:\d\d$/.test(isoString);
  return new Date(hasTz ? isoString : `${isoString}Z`);
}

export function formatAnnouncementDateTime(isoString) {
  const date = parseUtcTimestamp(isoString);
  if (!date) return "—";
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatAnnouncementDate(isoString) {
  const date = parseUtcTimestamp(isoString);
  if (!date) return "—";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
}

// <input type="datetime-local"> displays/edits local wall-clock time — convert the
// naive-UTC backend value into that local "YYYY-MM-DDTHH:mm" shape.
export function toDatetimeLocalValue(isoString) {
  const date = parseUtcTimestamp(isoString);
  if (!date) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

// A bare datetime-local value has no timezone — the browser's `new Date(...)` correctly
// reads it as local time, so converting to ISO here yields a proper UTC-offset string.
export function fromDatetimeLocalValue(localValue) {
  if (!localValue) return null;
  return new Date(localValue).toISOString();
}
