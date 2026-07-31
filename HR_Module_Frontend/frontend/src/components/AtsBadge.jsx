import Badge from "./Badge";
import { getAtsBadge } from "../utils/formatAts";

export default function AtsBadge({ atsStatus, atsScore, className = "" }) {
  const { label, variant } = getAtsBadge(atsStatus, atsScore);
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
