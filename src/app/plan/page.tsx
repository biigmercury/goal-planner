import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/dates';

export default async function PlanPage() {
  const activeGoal = await prisma.goal.findFirst({ orderBy: { createdAt: 'desc' } });
  if (!activeGoal) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center">
        <h1 className="text-lg font-semibold">Plan</h1>
        <p className="mt-1 text-sm text-neutral-600">Create a goal first.</p>
        <a href="/goals/new" className="mt-4 inline-flex rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          Create a goal
        </a>
      </div>
    );
  }

  const milestones = await prisma.milestone.findMany({
    where: { goalId: activeGoal.id },
    orderBy: { order: 'asc' },
    include: { tasks: { orderBy: [{ scheduledDate: 'asc' }, { order: 'asc' }] } },
  });

  const hasPlan = milestones.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plan</h1>
        <p className="mt-1 text-sm text-neutral-600">Milestones, date ranges, and scheduled tasks.</p>
      </div>

      {!hasPlan ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center">
          <h2 className="text-lg font-semibold">No plan yet</h2>
          <p className="mt-1 text-sm text-neutral-600">Go to the dashboard and click “Generate plan”.</p>
          <a href="/" className="mt-4 inline-flex rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
            Go to dashboard
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {milestones.map((m) => (
            <section key={m.id} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-neutral-500">Milestone {m.order + 1}</div>
                  <h2 className="mt-1 text-lg font-semibold">{m.title}</h2>
                </div>
                <div className="text-xs text-neutral-600">
                  {formatDate(m.startDate)} → {formatDate(m.endDate)}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {m.tasks.length ? (
                  m.tasks.map((t) => (
                    <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 p-3">
                      <div>
                        <div className="font-medium">{t.title}</div>
                        <div className="mt-1 text-xs text-neutral-500">
                          Scheduled: {formatDate(t.scheduledDate)} · {t.status} · ~{t.estimatedMinutes} min
                        </div>
                      </div>
                      <a href={`/calendar?week=${formatDate(t.scheduledDate)}`} className="text-sm text-neutral-700 hover:underline">
                        View week
                      </a>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-neutral-600">No tasks in this milestone.</div>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
