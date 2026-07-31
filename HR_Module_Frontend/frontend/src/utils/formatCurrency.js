export function formatSalary(value) {
  if (value === null || value === undefined || value === "") return "—";
  return `Rs ${new Intl.NumberFormat("en-US").format(value)}`;
}
