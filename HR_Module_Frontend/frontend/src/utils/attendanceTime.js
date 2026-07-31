import { STANDARD_WORKING_HOURS } from "../constants/attendance";

// Backend returns naive UTC timestamps with no "Z"/offset suffix. Treat them as UTC
// explicitly before converting to the viewer's local time — parsing as-is would have
// JS read them as local time and shift every displayed time by the UTC offset.
function parseUtcTimestamp(isoString) {
  if (!isoString) return null;
  const hasTz = /[zZ]|[+-]\d\d:\d\d$/.test(isoString);
  return new Date(hasTz ? isoString : `${isoString}Z`);
}

export function formatClockTime(isoString) {
  const date = parseUtcTimestamp(isoString);
  if (!date) return "—";
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function formatElapsed(fromIso, nowMs = Date.now()) {
  const from = parseUtcTimestamp(fromIso);
  if (!from) return "00:00:00";
  const totalSeconds = Math.max(0, Math.floor((nowMs - from.getTime()) / 1000));
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function formatHoursShort(hours) {
  if (hours === null || hours === undefined) return "—";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

// pending_hours is always a positive magnitude; direction must be derived from
// total_working_hours relative to the standard shift length.
export function getPendingLabel(totalWorkingHours, pendingHours, standardHours = STANDARD_WORKING_HOURS) {
  if (totalWorkingHours === null || totalWorkingHours === undefined) return null;
  if (pendingHours === null || pendingHours === undefined) return null;
  if (totalWorkingHours > standardHours) return `${formatHoursShort(pendingHours)} overtime`;
  if (totalWorkingHours < standardHours) return `${formatHoursShort(pendingHours)} pending`;
  return "On target";
}

// Unlike pending_hours above, pending_or_extra_hours (admin employee-detail summary) is
// SIGNED: positive = extra/overtime, negative = pending/short, 0 = on target.
export function formatSignedHours(hours) {
  if (hours === null || hours === undefined) return "—";
  const sign = hours > 0 ? "+" : hours < 0 ? "-" : "";
  return `${sign}${formatHoursShort(Math.abs(hours))}`;
}

export function todayDateString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function computeHoursPerDay(startHHMM, endHHMM) {
  if (!startHHMM || !endHHMM) return null;
  const [startH, startM] = startHHMM.split(":").map(Number);
  const [endH, endM] = endHHMM.split(":").map(Number);
  const diffMinutes = endH * 60 + endM - (startH * 60 + startM);
  if (diffMinutes <= 0) return null;
  return diffMinutes / 60;
}
