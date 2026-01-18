'use client';

import { useEffect, useMemo, useState } from 'react';

function isPastReminder(reminderTime: string): boolean {
  const now = new Date();
  const [h, m] = reminderTime.split(':').map((x) => Number(x));
  const t = new Date(now);
  t.setHours(Number.isFinite(h) ? h : 9, Number.isFinite(m) ? m : 0, 0, 0);
  return now.getTime() >= t.getTime();
}

export default function ReminderBanner({ reminderTime, todayTodoCount }: { reminderTime: string; todayTodoCount: number }) {
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const storageKey = useMemo(() => {
    const d = new Date().toISOString().slice(0, 10);
    return `goalplanner:banner:dismissed:${d}`;
  }, []);

  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;
    setDismissed(localStorage.getItem(storageKey) === '1');
  }, [storageKey]);

  if (!mounted) return null;

  const shouldShow =
    todayTodoCount > 0 &&
    !dismissed &&
    ('Notification' in window ? Notification.permission !== 'granted' : true) &&
    isPastReminder(reminderTime);

  if (!shouldShow) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-medium text-amber-900">Reminder</div>
          <div className="mt-1 text-amber-900/80">
            It’s past your reminder time (<span className="font-medium">{reminderTime}</span>) and you still have{' '}
            <span className="font-medium">{todayTodoCount}</span> task(s) for today.
          </div>
          <div className="mt-2 text-amber-900/70">
            Tip: enable browser notifications on the home page for a daily nudge.
          </div>
        </div>
        <button
          onClick={() => {
            localStorage.setItem(storageKey, '1');
            setDismissed(true);
          }}
          className="rounded-md px-2 py-1 text-amber-900/70 hover:bg-amber-100"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
