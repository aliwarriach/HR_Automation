import { ALL_ROLES_VALUE, getAnnouncementTargetRoleLabel } from "../../constants/announcements";

export default function AudienceChips({ roles = [], className = "" }) {
  if (roles.includes(ALL_ROLES_VALUE)) {
    return (
      <div className={`flex flex-wrap gap-xs ${className}`}>
        <span className="inline-flex items-center bg-primary/15 text-primary font-label-mono text-label-mono uppercase font-bold px-sm py-xs rounded">
          All Employees
        </span>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap gap-xs ${className}`}>
      {roles.map((role) => (
        <span
          key={role}
          className="inline-flex items-center border border-outline-variant text-on-surface-variant font-label-mono text-label-mono uppercase font-bold px-sm py-xs rounded"
        >
          {getAnnouncementTargetRoleLabel(role)}
        </span>
      ))}
    </div>
  );
}
