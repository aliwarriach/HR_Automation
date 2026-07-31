export default function Input({ label, id, error, as = "input", className = "", children, ...props }) {
  const Field = as;
  return (
    <div className="flex flex-col gap-sm w-full">
      {label && (
        <label className="font-body-sm text-body-sm text-on-surface-variant font-medium" htmlFor={id}>
          {label}
        </label>
      )}
      <Field
        id={id}
        className={`w-full border rounded focus:ring-1 focus:ring-primary focus:border-primary px-sm py-sm outline-none transition-colors font-body-md text-body-md bg-surface-container-low dark:bg-transparent placeholder-on-surface-variant/50 ${
          error ? "border-error" : "border-surface-variant"
        } ${className}`}
        {...props}
      >
        {children}
      </Field>
      {error && <span className="font-body-sm text-body-sm text-error">{error}</span>}
    </div>
  );
}
