import { ALL_ROLES_VALUE, ANNOUNCEMENT_TARGET_ROLE_OPTIONS } from "../../constants/announcements";

export default function AudiencePicker({ value = [], onChange, error }) {
  const isAll = value.includes(ALL_ROLES_VALUE);

  const selectAll = () => onChange([ALL_ROLES_VALUE]);

  const toggleRole = (role) => {
    if (isAll) {
      onChange([role]);
      return;
    }
    onChange(value.includes(role) ? value.filter((r) => r !== role) : [...value, role]);
  };

  return (
    <div className="flex flex-col gap-sm w-full">
      <label className="font-body-sm text-body-sm text-on-surface-variant font-medium">Audience</label>
      <div className="flex flex-wrap gap-sm">
        <button
          type="button"
          onClick={selectAll}
          className={`px-md py-sm rounded font-label-mono text-label-mono uppercase font-bold transition-colors ${
            isAll ? "bg-primary text-on-primary" : "border border-outline-variant text-on-surface-variant hover:border-primary"
          }`}
        >
          All Employees
        </button>
        <div className="w-px bg-outline-variant self-stretch" />
        {ANNOUNCEMENT_TARGET_ROLE_OPTIONS.map((option) => {
          const selected = !isAll && value.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleRole(option.value)}
              className={`px-md py-sm rounded font-label-mono text-label-mono uppercase font-bold transition-colors ${
                selected
                  ? "bg-primary/15 text-primary border border-primary"
                  : "border border-outline-variant text-on-surface-variant hover:border-primary"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {error && <span className="font-body-sm text-body-sm text-error">{error}</span>}
    </div>
  );
}
