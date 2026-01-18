import { redirect } from 'next/navigation';
import { createGoal } from '@/app/actions';

const DAYS = [
  { n: 1, label: 'Mon' },
  { n: 2, label: 'Tue' },
  { n: 3, label: 'Wed' },
  { n: 4, label: 'Thu' },
  { n: 5, label: 'Fri' },
  { n: 6, label: 'Sat' },
  { n: 0, label: 'Sun' },
];

export default async function NewGoalPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create a goal</h1>
        <p className="mt-1 text-sm text-neutral-600">Fill the basics, then generate a plan.</p>
      </div>

      <form
        className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
        action={async (formData) => {
          'use server';
          await createGoal(formData);
          redirect('/');
        }}
      >
        <div className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-medium">Title</span>
            <input
              name="title"
              required
              placeholder="e.g., Learn calculus basics"
              className="rounded-md border border-neutral-300 px-3 py-2"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium">Description (optional)</span>
            <textarea
              name="description"
              rows={3}
              placeholder="What does success look like? Any notes?"
              className="rounded-md border border-neutral-300 px-3 py-2"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium">Start date</span>
              <input name="startDate" type="date" required className="rounded-md border border-neutral-300 px-3 py-2" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium">Deadline</span>
              <input name="deadline" type="date" required className="rounded-md border border-neutral-300 px-3 py-2" />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium">Time available per day (minutes)</span>
              <input
                name="minutesPerDay"
                type="number"
                min={1}
                defaultValue={60}
                required
                className="rounded-md border border-neutral-300 px-3 py-2"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium">Reminder time</span>
              <input
                name="reminderTime"
                type="time"
                defaultValue="09:00"
                required
                className="rounded-md border border-neutral-300 px-3 py-2"
              />
            </label>
          </div>

          <div className="grid gap-2">
            <div className="text-sm font-medium">Available days</div>
            <div className="flex flex-wrap gap-3">
              {DAYS.map((d) => (
                <label key={d.n} className="flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm">
                  <input name="availableDays" type="checkbox" value={String(d.n)} defaultChecked={d.n >= 1 && d.n <= 5} />
                  {d.label}
                </label>
              ))}
            </div>
            <p className="text-xs text-neutral-500">Days control auto-scheduling and skip rescheduling.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
              Create goal
            </button>
            <a href="/" className="text-sm text-neutral-700 hover:underline">
              Cancel
            </a>
          </div>
        </div>
      </form>
    </div>
  );
}
