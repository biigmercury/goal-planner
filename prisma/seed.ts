import { PrismaClient, TaskStatus } from '@prisma/client';
import { generateMilestones, scheduleTasks } from '../src/lib/planner';
import { toDateOnly } from '../src/lib/dates';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data (single-user MVP)
  await prisma.task.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.goal.deleteMany();

  const start = toDateOnly(new Date());
  const deadline = toDateOnly(new Date());
  deadline.setDate(deadline.getDate() + 21);

  const goal = await prisma.goal.create({
    data: {
      title: 'Build a Goal Planner MVP',
      description: 'Ship a simple Next.js app with milestones, tasks, auto-scheduling, and reminders.',
      startDate: start,
      deadline,
      minutesPerDay: 60,
      availableDays: '1,2,3,4,5',
      reminderTime: '09:00',
    },
  });

  const drafts = generateMilestones({
    title: goal.title,
    description: goal.description,
    startDate: goal.startDate,
    deadline: goal.deadline,
    minutesPerDay: goal.minutesPerDay,
    availableDays: goal.availableDays,
    reminderTime: goal.reminderTime,
  });

  const scheduled = scheduleTasks(
    {
      title: goal.title,
      description: goal.description,
      startDate: goal.startDate,
      deadline: goal.deadline,
      minutesPerDay: goal.minutesPerDay,
      availableDays: goal.availableDays,
      reminderTime: goal.reminderTime,
    },
    drafts
  );

  const createdMilestones = await prisma.$transaction(
    drafts.map((ms) =>
      prisma.milestone.create({
        data: {
          goalId: goal.id,
          title: ms.title,
          order: ms.order,
          startDate: ms.startDate,
          endDate: ms.endDate,
        },
      })
    )
  );

  const msIdByOrder = new Map<number, string>();
  for (const ms of createdMilestones) msIdByOrder.set(ms.order, ms.id);

  const tasksToCreate = scheduled.map((t, idx) => {
    let running = 0;
    let milestoneOrder = 0;
    for (const ms of drafts) {
      const len = ms.tasks.length;
      if (idx >= running && idx < running + len) {
        milestoneOrder = ms.order;
        break;
      }
      running += len;
    }

    return prisma.task.create({
      data: {
        goalId: goal.id,
        milestoneId: msIdByOrder.get(milestoneOrder) ?? null,
        title: t.title,
        details: t.details ?? null,
        estimatedMinutes: t.estimatedMinutes,
        scheduledDate: t.scheduledDate,
        status: TaskStatus.TODO,
        order: t.order,
      },
    });
  });

  await prisma.$transaction(tasksToCreate);

  console.log('Seeded example goal:', goal.title);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
