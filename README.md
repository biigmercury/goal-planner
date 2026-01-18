# Goal Planner MVP

A minimal “Goal Planner” web app built with **Next.js (App Router)** + **TypeScript** + **Tailwind CSS** + **SQLite (Prisma)**.

## Features
- Create a goal: title, optional description, start date, deadline, minutes/day, available days, reminder time
- Generate a plan:
  - 3–7 milestones (based on timeframe)
  - Specific tasks per milestone with estimated minutes
- Auto-schedule tasks across dates respecting available days and minutes/day
- Pages:
  - **Today**: today’s tasks with checkboxes + “Skip → reschedule”
  - **Calendar**: simple weekly view + move task to another date
  - **Plan**: milestone date ranges + scheduled tasks
- Persistence: SQLite via Prisma
- Reminders:
  - Best-effort browser notifications (when the app is open)
  - In-app reminder banner if notifications aren’t enabled

## Local setup

### 1) Install
```bash
npm install
```

### 2) Setup database
```bash
npm run prisma:migrate
```
This creates `dev.db` in the project root.

### 3) Seed an example goal
```bash
npm run db:seed
```

### 4) Run
```bash
npm run dev
```
Open http://localhost:3000

## Notes / MVP constraints
- Single-user local MVP (no auth)
- Notifications are “best effort”: browsers generally require the page to be open (or a Service Worker/PWA) for reliable background notifications.

