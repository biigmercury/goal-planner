import { prisma } from '@/lib/prisma';
import { toDateOnly } from '@/lib/dates';
import { TaskStatus } from '@prisma/client';
import { setTaskStatus, skipTask } from '@/app/actions';

export default async function TodayPage() {
  const activeGoal = await prisma.goal.findFirst({ orderBy: { createdAt: 'desc' } });
  if (!activeGoal) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center">
        <h1 className="text-lg font-semibold">Today</h1>
        <p className="mt-1 text-sm text-neutral-600">Create a goal first.</p>
        <a href="/goals/new" className="mt-4 inline-flex rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          Create a goal
        </a>
      </div>
    );
  }

  const today = toDateOnly(new Date());
  const tasks = await prisma.task.findMany({
    where: {
      goalId: activeGoal.id,
      scheduledDate: today,
    },
    orderBy: [{ status: 'asc' }, { order: 'asc' }],
  });

  const todo = tasks.filter(t => t.status === TaskStatus.TODO);
  const done = tasks.filter(t => t.status === TaskStatus.DONE);
  const skipped = tasks.filter(t => t.status === TaskStatus.SKIPPED);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {today.toISOString().slice(0, 10)} · {activeGoal.title}
        </p>
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold">To do ({todo.length})</h2>
        <div className="mt-3 space-y-2">
          {todo.length ? (
            todo.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 p-3">
                <div className="flex items-start gap-3">
                  <form
                    action={async () => {
                      'use server';
                      await setTaskStatus(t.id, 'DONE');
                    }}
                  >
                    <button
                      aria-label="Mark done"
                      className="mt-1 h-5 w-5 rounded border border-neutral-300 hover:bg-neutral-50"
                    />
                  </form>
                  <div>
                    <div className="font-medium">{t.title}</div>
                    <div className="text-xs text-neutral-500">~{t.estimatedMinutes} min</div>
                  </div>
                </div>
                <form
                  action={async () => {
                    'use server';
                    await skipTask(t.id);
                  }}
                >
                  <button className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50">
                    Skip → reschedule
                  </button>
                </form>
              </div>
            ))
          ) : (
            <div className="text-sm text-neutral-600">No tasks scheduled for today.</div>
          )}
        </div>
      </section>

      {done.length ? (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Done ({done.length})</h2>
          <div className="mt-3 space-y-2">
            {done.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-3">
                <div>
                  <div className="font-medium line-through opacity-70">{t.title}</div>
                  <div className="text-xs text-neutral-500">~{t.estimatedMinutes} min</div>
                </div>
                <form
                  action={async () => {
                    'use server';
                    await setTaskStatus(t.id, 'TODO');
                  }}
                >
                  <button className="rounded-md px-3 py-2 text-sm text-neutral-700 hover:bg-white">
                    Undo
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {skipped.length ? (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Skipped ({skipped.length})</h2>
          <div className="mt-3 space-y-2">
            {skipped.map((t) => (
              <div key={t.id} className="rounded-xl border border-neutral-100 bg-white p-3">
                <div className="font-medium opacity-70">{t.title}</div>
                <div className="text-xs text-neutral-500">This instance was skipped (a new copy was scheduled later).</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
