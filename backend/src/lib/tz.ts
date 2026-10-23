function offsetMs(at: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - (at.getTime() - at.getMilliseconds());
}

/** The UTC instant at which the given calendar date starts in `tz`. */
export function zonedMidnight(year: number, month1: number, day: number, tz: string): Date {
  const guess = Date.UTC(year, month1 - 1, day);
  let t = guess - offsetMs(new Date(guess), tz);
  t = guess - offsetMs(new Date(t), tz);
  return new Date(t);
}

export function zonedYMD(at: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

export function startOfDay(at: Date, tz: string): Date {
  const { year, month, day } = zonedYMD(at, tz);
  return zonedMidnight(year, month, day, tz);
}
