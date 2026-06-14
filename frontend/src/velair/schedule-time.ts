const TIME_PATTERN = /^\d{2}:\d{2}$/;

export function minutesFromTime(value: string): number | undefined {
  if (!TIME_PATTERN.test(value)) {
    return undefined;
  }

  const [hour, minute] = value.split(":").map((part) => Number(part));
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return undefined;
  }

  return hour * 60 + minute;
}

export function timeFromMinutes(value: number): string {
  const minutes = Math.min(Math.max(value, 0), 1439);
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function nextStartTime(value?: string): string {
  const minutes = value ? minutesFromTime(value) : undefined;
  if (minutes === undefined) {
    return "08:00";
  }

  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const nextHour = Math.min(hour + 1, 23);
  return `${String(nextHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function clampMinute(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
