import { addDays, diffInDays, parseAvailableDays, toDateOnly } from './dates';

export type GoalInput = {
  title: string;
  description?: string | null;
  startDate: Date;
  deadline: Date;
  minutesPerDay: number;
  availableDays: string; // csv of 0..6
  reminderTime: string; // HH:MM
};

export type MilestoneDraft = {
  title: string;
  order: number;
  startDate: Date;
  endDate: Date;
  tasks: TaskDraft[];
};

export type TaskDraft = {
  title: string;
  details?: string;
  estimatedMinutes: number;
  order: number;
  // filled during scheduling
  scheduledDate?: Date;
};

function milestoneCount(totalDays: number): number {
  if (totalDays <= 14) return 3;
  if (totalDays <= 30) return 4;
  if (totalDays <= 60) return 5;
  if (totalDays <= 120) return 6;
  return 7;
}

function niceMilestoneTitles(goalTitle: string, count: number): string[] {
  const base = goalTitle.trim() || 'Your goal';
  const presets = [
    `Clarify the finish line for “${base}”`,
    `Build the core pieces`,
    `Practice + tighten quality`,
    `Ship a first complete version`,
    `Improve + polish`,
    `Final review + buffer`,
    `Wrap-up + deliver`,
  ];
  return presets.slice(0, count);
}

function taskTemplates(goalTitle: string): Array<(i: number) => string> {
  const t = goalTitle.trim() || 'the goal';
  return [
    (i) => `Write the 1-paragraph definition of success for ${t}`,
    (i) => `List the top 10 things you must learn/do for ${t}`,
    (i) => `Pick the top 3 priorities for this milestone`,
    (i) => `Do a 25-minute focused work block`,
    (i) => `Do a second focused work block and take notes`,
    (i) => `Review what you did and write the next tiny step`,
    (i) => `Create a quick checklist for quality`,
    (i) => `Do a small “ship” action (publish, submit, send, commit)`,
  ];
}

function minutesBuckets(totalMinutes: number): number[] {
  // Spread tasks around reasonable sizes.
  const options = [15, 20, 25, 30, 35, 45, 60];
  const out: number[] = [];
  let remaining = totalMinutes;
  let guard = 0;
  while (remaining > 0 && guard++ < 200) {
    const pick = options[Math.min(options.length - 1, Math.floor(Math.random() * options.length))];
    const m = Math.min(pick, remaining);
    out.push(m);
    remaining -= m;
  }
  return out.length ? out : [25];
}

export function generateMilestones(goal: GoalInput): MilestoneDraft[] {
  const start = toDateOnly(goal.startDate);
  const end = toDateOnly(goal.deadline);
  const totalDays = Math.max(1, diffInDays(start, end) + 1);
  const count = milestoneCount(totalDays);

  const titles = niceMilestoneTitles(goal.title, count);
  const chunk = Math.max(1, Math.floor(totalDays / count));

  const templates = taskTemplates(goal.title);

  const milestones: MilestoneDraft[] = [];
  for (let i = 0; i < count; i++) {
    const msStart = addDays(start, i * chunk);
    const msEnd = i === count - 1 ? end : addDays(start, Math.min(totalDays - 1, (i + 1) * chunk - 1));

    // Approximate effort for this milestone.
    const daysInMs = diffInDays(msStart, msEnd) + 1;
    const budget = Math.max(60, Math.min(600, Math.round((goal.minutesPerDay * daysInMs) / 2)));

    const mins = minutesBuckets(budget);
    const taskCount = Math.min(6, Math.max(3, Math.round(mins.length / 2)));

    const tasks: TaskDraft[] = [];
    for (let t = 0; t < taskCount; t++) {
      const title = templates[(i + t) % templates.length](t);
      const estimated = mins[(t * 2) % mins.length] ?? 25;
      tasks.push({
        title,
        estimatedMinutes: estimated,
        order: t,
      });
    }

    milestones.push({
      title: titles[i] ?? `Milestone ${i + 1}`,
      order: i,
      startDate: msStart,
      endDate: msEnd,
      tasks,
    });
  }
  return milestones;
}

export type ScheduledTask = TaskDraft & { scheduledDate: Date };

export function scheduleTasks(goal: GoalInput, milestones: MilestoneDraft[]): ScheduledTask[] {
  const start = toDateOnly(goal.startDate);
  const deadline = toDateOnly(goal.deadline);
  const available = parseAvailableDays(goal.availableDays);

  const maxPerDay = Math.max(1, goal.minutesPerDay);

  const allTasks: Array<{ milestoneOrder: number; task: TaskDraft }> = [];
  for (const ms of milestones) {
    for (const task of ms.tasks) {
      allTasks.push({ milestoneOrder: ms.order, task });
    }
  }

  // Stable ordering
  allTasks.sort((a, b) => (a.milestoneOrder - b.milestoneOrder) || (a.task.order - b.task.order));

  const usedByDate = new Map<string, number>();

  function canUse(d: Date): boolean {
    const day = d.getDay();
    return available.has(day);
  }

  function used(d: Date): number {
    return usedByDate.get(d.toISOString().slice(0, 10)) ?? 0;
  }

  function addUsed(d: Date, minutes: number) {
    const key = d.toISOString().slice(0, 10);
    usedByDate.set(key, used(d) + minutes);
  }

  function nextSchedulableDate(from: Date): Date {
    let d = toDateOnly(from);
    let guard = 0;
    while (guard++ < 5000) {
      if (d.getTime() > deadline.getTime()) return deadline;
      if (canUse(d) && used(d) < maxPerDay) return d;
      d = addDays(d, 1);
    }
    return deadline;
  }

  let cursor = nextSchedulableDate(start);
  const scheduled: ScheduledTask[] = [];

  for (const { task } of allTasks) {
    const minutes = Math.max(1, task.estimatedMinutes);

    // Find a day with enough remaining time; if not, move forward.
    let day = cursor;
    let guard = 0;
    while (guard++ < 5000) {
      day = nextSchedulableDate(day);
      const remaining = maxPerDay - used(day);
      if (remaining >= minutes) break;
      day = addDays(day, 1);
    }

    addUsed(day, minutes);
    scheduled.push({ ...task, scheduledDate: day });
    cursor = day;
  }

  // Hydrate milestone tasks in place (optional)
  let idx = 0;
  for (const ms of milestones) {
    for (let i = 0; i < ms.tasks.length; i++) {
      ms.tasks[i].scheduledDate = scheduled[idx]?.scheduledDate;
      idx++;
    }
  }

  return scheduled;
}

export function findNextAvailableDate(params: {
  fromDate: Date;
  deadline: Date;
  availableDaysCsv: string;
  minutesPerDay: number;
  existingMinutesByDate: Map<string, number>;
  neededMinutes: number;
}): Date {
  const available = parseAvailableDays(params.availableDaysCsv);
  const deadline = toDateOnly(params.deadline);
  const max = Math.max(1, params.minutesPerDay);

  let d = addDays(toDateOnly(params.fromDate), 1);
  let guard = 0;
  while (guard++ < 5000) {
    if (d.getTime() > deadline.getTime()) return deadline;
    if (!available.has(d.getDay())) {
      d = addDays(d, 1);
      continue;
    }
    const key = d.toISOString().slice(0, 10);
    const used = params.existingMinutesByDate.get(key) ?? 0;
    if (used + params.neededMinutes <= max) return d;
    d = addDays(d, 1);
  }
  return deadline;
}
