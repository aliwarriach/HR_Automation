import Badge from "../../components/Badge";

export default function PermissionsSummary({ permissions }) {
  const modules = Object.keys(permissions ?? {});

  if (modules.length === 0) {
    return <p className="font-body-sm text-body-sm text-on-surface-variant">No permissions defined.</p>;
  }

  return (
    <div className="flex flex-col gap-lg">
      {modules.map((module) => (
        <div key={module}>
          <p className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider mb-sm">
            {module}
          </p>
          <div className="flex flex-wrap gap-sm">
            {permissions[module].map((action) => (
              <Badge key={action} variant="neutral">
                {action}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
