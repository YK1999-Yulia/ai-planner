const WEEKDAYS_UA = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

export interface DeadlineInfo {
  label: string;
  overdue: boolean;
}

export function formatDeadline(deadline: string, now: Date = new Date()): DeadlineInfo {
  const [y, m, d] = deadline.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

  const shortDate = `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}${
    target.getFullYear() !== today.getFullYear() ? `.${target.getFullYear()}` : ""
  }`;

  if (diffDays === 0) return { label: "сьогодні", overdue: false };
  if (diffDays === 1) return { label: "завтра", overdue: false };
  if (diffDays === -1) return { label: "вчора", overdue: true };
  if (diffDays < 0) return { label: shortDate, overdue: true };
  if (diffDays <= 6) return { label: `до ${WEEKDAYS_UA[target.getDay()]}`, overdue: false };
  return { label: shortDate, overdue: false };
}

/** For a scheduledDate strictly before today: "вчора", "2 дні тому", "5 днів тому". */
export function formatOverdueLabel(scheduledDate: string, now: Date = new Date()): string {
  const [y, m, d] = scheduledDate.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysAgo = Math.round((today.getTime() - target.getTime()) / 86400000);

  if (daysAgo <= 1) return "вчора";

  const mod10 = daysAgo % 10;
  const mod100 = daysAgo % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? "день"
      : [2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)
        ? "дні"
        : "днів";

  return `${daysAgo} ${word} тому`;
}
