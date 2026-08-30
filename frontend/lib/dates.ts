export function daysUntilDue(dateStr: string, today: string) {
  const due = new Date(`${dateStr}T00:00:00`);
  const todayDate = new Date(`${today}T00:00:00`);
  return Math.round((due.getTime() - todayDate.getTime()) / 86_400_000);
}

export function dueLabel(daysLeft: number) {
  if (daysLeft < 0) return `${Math.abs(daysLeft)}d overdue`;
  if (daysLeft === 0) return "Due today";
  return `${daysLeft}d left`;
}

export function dueBadgeClass(daysLeft: number) {
  if (daysLeft < 0) return "bg-danger-tint text-danger";
  if (daysLeft <= 2) return "bg-warning-tint text-warning-text";
  return "bg-surface-2 text-muted";
}
