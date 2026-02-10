import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Task, CreateTaskPlanRequest, SSEEvent } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { broadcastEvent } from '@/lib/events';

// POST /api/plans - Create a task plan with subtasks
export async function POST(request: NextRequest) {
  try {
    const body: CreateTaskPlanRequest = await request.json();
    const { parent_task, subtasks, agent_id, session_key } = body;

    if (!parent_task?.title) {
      return NextResponse.json(
        { error: 'Parent task title is required' },
        { status: 400 }
      );
    }

    if (!subtasks || subtasks.length === 0) {
      return NextResponse.json(
        { error: 'At least one subtask is required' },
        { status: 400 }
      );
    }

    const db = getDb();
    const now = new Date().toISOString();
    const workspaceId = parent_task.workspace_id || 'default';

    // Create parent task
    const parentId = uuidv4();
    const parentTags = JSON.stringify(['agentic', ...(parent_task.tags || [])]);
    
    db.prepare(`
      INSERT INTO tasks (
        id, title, description, status, priority,
        workspace_id, business_id, source, tags,
        approval_status, color, agent_id,
        openclaw_session_key, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      parentId,
      parent_task.title,
      parent_task.description || null,
      'pending_approval', // Agentic tasks start pending approval
      parent_task.priority || 'normal',
      workspaceId,
      parent_task.business_id || 'default',
      'agent',
      parentTags,
      'pending',
      parent_task.color || '#a855f7', // Purple for agentic tasks
      agent_id,
      session_key || null,
      now,
      now
    );

    // Create subtasks
    const createdSubtasks: Task[] = [];
    for (let i = 0; i < subtasks.length; i++) {
      const subtask = subtasks[i];
      const subtaskId = uuidv4();
      const subtaskTags = JSON.stringify(['agentic', ...(subtask.tags || [])]);

      db.prepare(`
        INSERT INTO tasks (
          id, title, description, status, priority,
          parent_task_id, workspace_id, business_id,
          source, tags, approval_status, color,
          sort_order, agent_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        subtaskId,
        subtask.title,
        subtask.description || null,
        'pending_approval',
        subtask.priority || 'normal',
        parentId,
        workspaceId,
        subtask.business_id || 'default',
        'agent',
        subtaskTags,
        'pending',
        subtask.color || '#a855f7',
        i,
        agent_id,
        now,
        now
      );

      createdSubtasks.push({
        id: subtaskId,
        title: subtask.title,
        description: subtask.description,
        status: 'pending_approval',
        priority: subtask.priority || 'normal',
        parent_task_id: parentId,
        workspace_id: workspaceId,
        business_id: subtask.business_id || 'default',
        source: 'agent',
        tags: ['agentic', ...(subtask.tags || [])],
        approval_status: 'pending',
        color: subtask.color || '#a855f7',
        sort_order: i,
        agent_id,
        created_at: now,
        updated_at: now,
      });
    }

    // Create the parent task object
    const createdParent: Task = {
      id: parentId,
      title: parent_task.title,
      description: parent_task.description,
      status: 'pending_approval',
      priority: parent_task.priority || 'normal',
      workspace_id: workspaceId,
      business_id: parent_task.business_id || 'default',
      source: 'agent',
      tags: ['agentic', ...(parent_task.tags || [])],
      approval_status: 'pending',
      color: parent_task.color || '#a855f7',
      sort_order: 0,
      agent_id,
      openclaw_session_key: session_key,
      created_at: now,
      updated_at: now,
      subtasks: createdSubtasks,
    };

    // Log activity
    const activityId = uuidv4();
    db.prepare(`
      INSERT INTO task_activities (id, task_id, agent_id, activity_type, message, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      activityId,
      parentId,
      agent_id,
      'spawned',
      `Agent created task plan with ${subtasks.length} subtasks`,
      now
    );

    // Broadcast event
    const event: SSEEvent = {
      type: 'plan_created',
      payload: createdParent,
    };
    broadcastEvent(event);

    return NextResponse.json({
      success: true,
      task: createdParent,
    });
  } catch (error) {
    console.error('Failed to create task plan:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET /api/plans - Get all pending plans awaiting approval
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace') || 'default';
    const status = searchParams.get('status') || 'pending';

    const db = getDb();

    // Get parent tasks that are agentic and pending approval
    const parentTasks = db.prepare(`
      SELECT * FROM tasks 
      WHERE workspace_id = ? 
        AND source = 'agent' 
        AND parent_task_id IS NULL
        AND approval_status = ?
      ORDER BY created_at DESC
    `).all(workspaceId, status) as Task[];

    // Get subtasks for each parent
    const plansWithSubtasks = parentTasks.map((parent) => {
      const subtasks = db.prepare(`
        SELECT * FROM tasks 
        WHERE parent_task_id = ?
        ORDER BY sort_order ASC
      `).all(parent.id) as Task[];

      return {
        ...parent,
        tags: JSON.parse(parent.tags as unknown as string || '[]'),
        subtasks: subtasks.map(st => ({
          ...st,
          tags: JSON.parse(st.tags as unknown as string || '[]'),
        })),
      };
    });

    return NextResponse.json({ plans: plansWithSubtasks });
  } catch (error) {
    console.error('Failed to fetch plans:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
