export function toDateOnly(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function diffInDays(start: Date, end: Date): number {
  const a = toDateOnly(start).getTime();
  const b = toDateOnly(end).getTime();
  const ms = b - a;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseAvailableDays(csv: string): Set<number> {
  const set = new Set<number>();
  for (const part of csv.split(',').map(s => s.trim()).filter(Boolean)) {
    const n = Number(part);
    if (!Number.isNaN(n)) set.add(n);
  }
  return set;
}

export function dayLabel(day: number): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day] ?? String(day);
}

export function startOfWeek(d: Date, weekStartsOnMonday = true): Date {
  const x = toDateOnly(d);
  const day = x.getDay();
  const offset = weekStartsOnMonday ? ((day + 6) % 7) : day;
  x.setDate(x.getDate() - offset);
  return x;
}
