export function getAtsBadge(atsStatus, atsScore) {
  if (atsStatus === "scored") {
    const variant = atsScore < 50 ? "danger" : atsScore <= 75 ? "warning" : "success";
    return { label: `${atsScore}%`, variant };
  }

  if (atsStatus === "failed") {
    return { label: "Failed", variant: "danger" };
  }

  return { label: "Pending", variant: "neutral" };
}
