'use client';

import { useEffect, useMemo, useState } from 'react';

function parseTimeHM(hm: string): { h: number; m: number } {
  const [h, m] = hm.split(':').map((x) => Number(x));
  return { h: Number.isFinite(h) ? h : 9, m: Number.isFinite(m) ? m : 0 };
}

function msUntilNext(timeHM: string): number {
  const now = new Date();
  const { h, m } = parseTimeHM(timeHM);
  const next = new Date(now);
  next.setHours(h, m, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}

export default function NotificationSettings({ reminderTime }: { reminderTime: string }) {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window === 'undefined' ? 'default' : Notification.permission
  );
  const [enabled, setEnabled] = useState(false);

  const key = useMemo(() => `goalplanner:notify:enabled`, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setEnabled(localStorage.getItem(key) === '1');
  }, [key]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!enabled) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const schedule = () => {
      const timeout = window.setTimeout(() => {
        new Notification('Goal Planner', {
          body: "Time to work on today's tasks.",
        });
        // Re-schedule for next day
        schedule();
      }, msUntilNext(reminderTime));
      return timeout;
    };

    const handle = schedule();
    return () => window.clearTimeout(handle);
  }, [enabled, reminderTime]);

  async function enable() {
    if (!('Notification' in window)) {
      alert('Your browser does not support notifications.');
      return;
    }
    const p = await Notification.requestPermission();
    setPermission(p);
    if (p === 'granted') {
      localStorage.setItem(key, '1');
      setEnabled(true);
    }
  }

  function disable() {
    localStorage.setItem(key, '0');
    setEnabled(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="text-sm text-neutral-600">
        Daily reminder: <span className="font-medium text-neutral-900">{reminderTime}</span>
      </div>
      {permission !== 'granted' || !enabled ? (
        <button
          onClick={enable}
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Enable notifications
        </button>
      ) : (
        <button
          onClick={disable}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-50"
        >
          Disable
        </button>
      )}
      <div className="text-xs text-neutral-500">
        Best-effort: notifications only fire reliably while the app is open.
      </div>
    </div>
  );
}
