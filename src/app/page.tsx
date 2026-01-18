import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { toDateOnly } from '@/lib/dates';
import NotificationSettings from '@/components/NotificationSettings';
import ReminderBanner from '@/components/ReminderBanner';
import { TaskStatus } from '@prisma/client';
import { generatePlanForGoal } from '@/app/actions';

export default async function Home() {
  const goals = await prisma.goal.findMany({ orderBy: { createdAt: 'desc' } });
  const activeGoal = goals[0] ?? null;

  const today = toDateOnly(new Date());
  const todayTodoCount = activeGoal
    ? await prisma.task.count({
        where: {
          goalId: activeGoal.id,
          scheduledDate: today,
          status: TaskStatus.TODO,
        },
      })
    : 0;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-neutral-600">A simple planner that turns a goal into scheduled daily tasks.</p>
      </div>

      {activeGoal ? (
        <>
          <ReminderBanner reminderTime={activeGoal.reminderTime} todayTodoCount={todayTodoCount} />

          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs text-neutral-500">Active goal</div>
                <h2 className="mt-1 text-xl font-semibold">{activeGoal.title}</h2>
                {activeGoal.description ? (
                  <p className="mt-1 max-w-prose text-sm text-neutral-600">{activeGoal.description}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-neutral-600">
                  <span className="rounded-full bg-neutral-100 px-2 py-1">
                    Start: {activeGoal.startDate.toISOString().slice(0, 10)}
                  </span>
                  <span className="rounded-full bg-neutral-100 px-2 py-1">
                    Deadline: {activeGoal.deadline.toISOString().slice(0, 10)}
                  </span>
                  <span className="rounded-full bg-neutral-100 px-2 py-1">{activeGoal.minutesPerDay} min/day</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <form
                  action={async () => {
                    'use server';
                    await generatePlanForGoal(activeGoal.id);
                  }}
                >
                  <button className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
                    Generate plan
                  </button>
                </form>
                <div className="text-xs text-neutral-500">Re-generating replaces existing milestones & tasks.</div>
              </div>
            </div>

            <div className="mt-5">
              <NotificationSettings reminderTime={activeGoal.reminderTime} />
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center">
          <h2 className="text-lg font-semibold">No goals yet</h2>
          <p className="mt-1 text-sm text-neutral-600">Create a goal to get your first plan.</p>
          <Link
            href="/goals/new"
            className="mt-4 inline-flex rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Create a goal
          </Link>
        </section>
      )}

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">All goals</h3>
          <Link href="/goals/new" className="text-sm text-neutral-700 hover:underline">
            New
          </Link>
        </div>
        <div className="mt-3 divide-y divide-neutral-100">
          {goals.length ? (
            goals.map((g) => (
              <div key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <div className="font-medium">{g.title}</div>
                  <div className="text-xs text-neutral-500">
                    {g.startDate.toISOString().slice(0, 10)} → {g.deadline.toISOString().slice(0, 10)}
                  </div>
                </div>
                <div className="text-xs text-neutral-600">{g.minutesPerDay} min/day</div>
              </div>
            ))
          ) : (
            <div className="py-6 text-sm text-neutral-600">No goals created yet.</div>
          )}
        </div>
      </section>

      <section className="text-xs text-neutral-500">
        <p>
          Tip: run the seed script to load an example goal (and a plan) instantly.
        </p>
      </section>
    </div>
  );
}
