const TZ = "America/New_York";

function calendarParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(date);
  return {
    day: Number(parts.find((p) => p.type === "day")?.value),
    month: Number(parts.find((p) => p.type === "month")?.value),
    year: Number(parts.find((p) => p.type === "year")?.value),
  };
}

function lastDayOfCalendarMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isDue(
  buyDate: string,
  createdAt: Date,
  lastExecutedAt: Date | null | undefined,
  now: Date,
  timeZone = TZ,
) {
  const today = calendarParts(now, timeZone);
  const target = Math.min(
    Number(buyDate),
    lastDayOfCalendarMonth(today.year, today.month),
  );
  const sameMonth = (date: Date) => {
    const parts = calendarParts(date, timeZone);
    return parts.year === today.year && parts.month === today.month;
  };
  if (today.day < target) return false;
  if (lastExecutedAt && sameMonth(lastExecutedAt)) return false;
  return !(sameMonth(createdAt) && calendarParts(createdAt, timeZone).day > target);
}
