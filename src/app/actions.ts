'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { generateMilestones, scheduleTasks, findNextAvailableDate } from '@/lib/planner';
import { toDateOnly } from '@/lib/dates';
import { TaskStatus } from '@prisma/client';

function parseCsvDays(input: string[]): string {
  // input like ['1','2',...]
  const nums = input.map((x) => Number(x)).filter((n) => Number.isFinite(n));
  const uniq = Array.from(new Set(nums)).sort((a, b) => a - b);
  return uniq.join(',');
}

export async function createGoal(formData: FormData) {
  const title = String(formData.get('title') || '').trim();
  const description = String(formData.get('description') || '').trim() || null;
  const startDate = new Date(String(formData.get('startDate')));
  const deadline = new Date(String(formData.get('deadline')));
  const minutesPerDay = Number(formData.get('minutesPerDay'));
  const reminderTime = String(formData.get('reminderTime') || '09:00');
  const availableDays = parseCsvDays(formData.getAll('availableDays').map(String));

  if (!title) throw new Error('Title is required');
  if (Number.isNaN(minutesPerDay) || minutesPerDay <= 0) throw new Error('Minutes/day must be > 0');
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(deadline.getTime())) throw new Error('Dates are required');

  const goal = await prisma.goal.create({
    data: {
      title,
      description,
      startDate: toDateOnly(startDate),
      deadline: toDateOnly(deadline),
      minutesPerDay,
      availableDays,
      reminderTime,
    },
  });

  revalidatePath('/');
  return goal.id;
}

export async function generatePlanForGoal(goalId: string) {
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal) throw new Error('Goal not found');

  // Reset existing plan
  await prisma.task.deleteMany({ where: { goalId } });
  await prisma.milestone.deleteMany({ where: { goalId } });

  const milestonesDraft = generateMilestones({
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
    milestonesDraft
  );

  // Persist milestones
  const createdMilestones = await prisma.$transaction(
    milestonesDraft.map((ms) =>
      prisma.milestone.create({
        data: {
          goalId,
          title: ms.title,
          order: ms.order,
          startDate: ms.startDate,
          endDate: ms.endDate,
        },
      })
    )
  );

  // Map milestone order -> id
  const msIdByOrder = new Map<number, string>();
  for (const ms of createdMilestones) msIdByOrder.set(ms.order, ms.id);

  // Persist tasks
  const tasksToCreate = scheduled.map((t, idx) => {
    // Find which milestone this task belongs to by scanning drafts
    // (Order is stable: milestones in order, tasks in order)
    let running = 0;
    let milestoneOrder = 0;
    for (const ms of milestonesDraft) {
      const len = ms.tasks.length;
      if (idx >= running && idx < running + len) {
        milestoneOrder = ms.order;
        break;
      }
      running += len;
    }

    return prisma.task.create({
      data: {
        goalId,
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

  revalidatePath('/');
  revalidatePath('/today');
  revalidatePath('/calendar');
  revalidatePath('/plan');
}

export async function setTaskStatus(taskId: string, status: 'TODO' | 'DONE') {
  await prisma.task.update({
    where: { id: taskId },
    data: { status: status === 'DONE' ? TaskStatus.DONE : TaskStatus.TODO },
  });
  revalidatePath('/today');
  revalidatePath('/calendar');
  revalidatePath('/plan');
}

export async function moveTaskDate(taskId: string, newDate: string) {
  const d = toDateOnly(new Date(newDate));
  await prisma.task.update({
    where: { id: taskId },
    data: { scheduledDate: d },
  });
  revalidatePath('/today');
  revalidatePath('/calendar');
  revalidatePath('/plan');
}

export async function skipTask(taskId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId },
    include: { goal: true },
  });
  if (!task) throw new Error('Task not found');

  // Mark this instance skipped
  await prisma.task.update({
    where: { id: taskId },
    data: { status: TaskStatus.SKIPPED },
  });

  // Build per-day used minutes for TODO tasks on/after today
  const existing = await prisma.task.findMany({
    where: {
      goalId: task.goalId,
      status: TaskStatus.TODO,
    },
    select: { scheduledDate: true, estimatedMinutes: true },
  });

  const used = new Map<string, number>();
  for (const t of existing) {
    const key = t.scheduledDate.toISOString().slice(0, 10);
    used.set(key, (used.get(key) ?? 0) + t.estimatedMinutes);
  }

  const nextDate = findNextAvailableDate({
    fromDate: task.scheduledDate,
    deadline: task.goal.deadline,
    availableDaysCsv: task.goal.availableDays,
    minutesPerDay: task.goal.minutesPerDay,
    existingMinutesByDate: used,
    neededMinutes: task.estimatedMinutes,
  });

  // Create new TODO copy on next available day
  await prisma.task.create({
    data: {
      goalId: task.goalId,
      milestoneId: task.milestoneId,
      title: task.title,
      details: task.details,
      estimatedMinutes: task.estimatedMinutes,
      scheduledDate: nextDate,
      status: TaskStatus.TODO,
      order: task.order,
    },
  });

  revalidatePath('/today');
  revalidatePath('/calendar');
  revalidatePath('/plan');
}
