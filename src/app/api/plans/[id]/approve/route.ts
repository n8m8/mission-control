import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Task, SSEEvent } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { broadcastEvent } from '@/lib/events';
import { wsServer } from '@/lib/websocket';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/plans/[id]/approve - Approve a task plan
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { approved_by } = body;

    const db = getDb();
    const now = new Date().toISOString();

    // Get the parent task
    const parentTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined;

    if (!parentTask) {
      return NextResponse.json(
        { error: 'Task plan not found' },
        { status: 404 }
      );
    }

    if (parentTask.approval_status !== 'pending') {
      return NextResponse.json(
        { error: 'Task plan is not pending approval' },
        { status: 400 }
      );
    }

    // Update parent task
    db.prepare(`
      UPDATE tasks 
      SET approval_status = 'approved',
          approved_at = ?,
          approved_by = ?,
          status = 'inbox',
          updated_at = ?
      WHERE id = ?
    `).run(now, approved_by || 'human', now, id);

    // Update all subtasks
    db.prepare(`
      UPDATE tasks 
      SET approval_status = 'approved',
          approved_at = ?,
          approved_by = ?,
          status = 'inbox',
          updated_at = ?
      WHERE parent_task_id = ?
    `).run(now, approved_by || 'human', now, id);

    // Log activity
    const activityId = uuidv4();
    db.prepare(`
      INSERT INTO task_activities (id, task_id, activity_type, message, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      activityId,
      id,
      'status_changed',
      `Plan approved by ${approved_by || 'human'}`,
      now
    );

    // Get updated task with subtasks
    const updatedParent = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task;
    const subtasks = db.prepare('SELECT * FROM tasks WHERE parent_task_id = ? ORDER BY sort_order').all(id) as Task[];

    const result = {
      ...updatedParent,
      tags: JSON.parse(updatedParent.tags as unknown as string || '[]'),
      subtasks: subtasks.map(st => ({
        ...st,
        tags: JSON.parse(st.tags as unknown as string || '[]'),
      })),
    };

    // Broadcast event (SSE)
    const event: SSEEvent = {
      type: 'plan_approved',
      payload: result,
    };
    broadcastEvent(event);

    // Broadcast via WebSocket
    wsServer.broadcastPlanUpdate({
      parent_task_id: id,
      subtasks: subtasks,
      status: 'approved',
    });

    return NextResponse.json({
      success: true,
      task: result,
    });
  } catch (error) {
    console.error('Failed to approve plan:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
