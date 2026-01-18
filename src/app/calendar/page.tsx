import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { addDays, formatDate, startOfWeek, toDateOnly } from '@/lib/dates';
import { moveTaskDate } from '@/app/actions';

export default async function CalendarPage({ searchParams }: { searchParams: { week?: string } }) {
  const params = searchParams;
  const activeGoal = await prisma.goal.findFirst({ orderBy: { createdAt: 'desc' } });
  if (!activeGoal) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center">
        <h1 className="text-lg font-semibold">Calendar</h1>
        <p className="mt-1 text-sm text-neutral-600">Create a goal first.</p>
        <a href="/goals/new" className="mt-4 inline-flex rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          Create a goal
        </a>
      </div>
    );
  }

  const week = typeof params.week === 'string' ? params.week : undefined;
  const base = week ? toDateOnly(new Date(week)) : toDateOnly(new Date());
  const weekStart = startOfWeek(base, true);
  const weekEnd = addDays(weekStart, 6);

  const tasks = await prisma.task.findMany({
    where: {
      goalId: activeGoal.id,
      scheduledDate: {
        gte: weekStart,
        lte: weekEnd,
      },
    },
    orderBy: [{ scheduledDate: 'asc' }, { status: 'asc' }, { order: 'asc' }],
  });

  const byDate = new Map<string, typeof tasks>();
  for (const t of tasks) {
    const key = formatDate(t.scheduledDate);
    const arr = byDate.get(key) ?? [];
    arr.push(t);
    byDate.set(key, arr);
  }

  const prevWeek = formatDate(addDays(weekStart, -7));
  const nextWeek = formatDate(addDays(weekStart, 7));

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Week of {formatDate(weekStart)} · {activeGoal.title}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link className="rounded-md border border-neutral-300 px-3 py-2 hover:bg-neutral-50" href={`/calendar?week=${prevWeek}`}>
            ← Prev
          </Link>
          <Link className="rounded-md border border-neutral-300 px-3 py-2 hover:bg-neutral-50" href={`/calendar?week=${nextWeek}`}>
            Next →
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {days.map((d) => {
          const key = formatDate(d);
          const list = byDate.get(key) ?? [];
          return (
            <section key={key} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{key}</div>
                <div className="text-xs text-neutral-500">{list.length} task(s)</div>
              </div>
              <div className="mt-3 space-y-2">
                {list.length ? (
                  list.map((t) => (
                    <div key={t.id} className="rounded-xl border border-neutral-200 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="font-medium">{t.title}</div>
                          <div className="mt-1 text-xs text-neutral-500">
                            {t.status} · ~{t.estimatedMinutes} min
                          </div>
                        </div>
                        <form
                          action={async (formData) => {
                            'use server';
                            const nd = String(formData.get('newDate'));
                            if (nd) await moveTaskDate(t.id, nd);
                          }}
                          className="flex items-center gap-2"
                        >
                          <input
                            name="newDate"
                            type="date"
                            defaultValue={key}
                            className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
                          />
                          <button className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50">
                            Move
                          </button>
                        </form>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-neutral-600">No tasks.</div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <div className="text-xs text-neutral-500">
        Moving a task is manual for MVP. Skipped tasks auto-create a new copy on the next available day.
      </div>
    </div>
  );
}
