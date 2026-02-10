/**
 * Database Migrations System
 * 
 * Handles schema changes in a production-safe way:
 * 1. Tracks which migrations have been applied
 * 2. Runs new migrations automatically on startup
 * 3. Never runs the same migration twice
 */

import Database from 'better-sqlite3';

interface Migration {
  id: string;
  name: string;
  up: (db: Database.Database) => void;
}

// All migrations in order - NEVER remove or reorder existing migrations
const migrations: Migration[] = [
  {
    id: '001',
    name: 'initial_schema',
    up: (db) => {
      // Core tables - these are created in schema.ts on fresh databases
      // This migration exists to mark the baseline for existing databases
      console.log('[Migration 001] Baseline schema marker');
    }
  },
  {
    id: '002',
    name: 'add_workspaces',
    up: (db) => {
      console.log('[Migration 002] Adding workspaces table and columns...');
      
      // Create workspaces table if not exists
      db.exec(`
        CREATE TABLE IF NOT EXISTS workspaces (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          slug TEXT NOT NULL UNIQUE,
          description TEXT,
          icon TEXT DEFAULT '📁',
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );
      `);
      
      // Insert default workspace if not exists
      db.exec(`
        INSERT OR IGNORE INTO workspaces (id, name, slug, description, icon) 
        VALUES ('default', 'Default Workspace', 'default', 'Default workspace', '🏠');
      `);
      
      // Add workspace_id to tasks if not exists
      const tasksInfo = db.prepare("PRAGMA table_info(tasks)").all() as { name: string }[];
      if (!tasksInfo.some(col => col.name === 'workspace_id')) {
        db.exec(`ALTER TABLE tasks ADD COLUMN workspace_id TEXT DEFAULT 'default' REFERENCES workspaces(id)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks(workspace_id)`);
        console.log('[Migration 002] Added workspace_id to tasks');
      }
      
      // Add workspace_id to agents if not exists
      const agentsInfo = db.prepare("PRAGMA table_info(agents)").all() as { name: string }[];
      if (!agentsInfo.some(col => col.name === 'workspace_id')) {
        db.exec(`ALTER TABLE agents ADD COLUMN workspace_id TEXT DEFAULT 'default' REFERENCES workspaces(id)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_agents_workspace ON agents(workspace_id)`);
        console.log('[Migration 002] Added workspace_id to agents');
      }
    }
  },
  {
    id: '003',
    name: 'add_planning_tables',
    up: (db) => {
      console.log('[Migration 003] Adding planning tables...');
      
      // Create planning_questions table if not exists
      db.exec(`
        CREATE TABLE IF NOT EXISTS planning_questions (
          id TEXT PRIMARY KEY,
          task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          category TEXT NOT NULL,
          question TEXT NOT NULL,
          question_type TEXT DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'text', 'yes_no')),
          options TEXT,
          answer TEXT,
          answered_at TEXT,
          sort_order INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now'))
        );
      `);
      
      // Create planning_specs table if not exists
      db.exec(`
        CREATE TABLE IF NOT EXISTS planning_specs (
          id TEXT PRIMARY KEY,
          task_id TEXT NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE CASCADE,
          spec_markdown TEXT NOT NULL,
          locked_at TEXT NOT NULL,
          locked_by TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        );
      `);
      
      // Create index
      db.exec(`CREATE INDEX IF NOT EXISTS idx_planning_questions_task ON planning_questions(task_id, sort_order)`);
      
      // Update tasks status check constraint to include 'planning'
      // SQLite doesn't support ALTER CONSTRAINT, so we check if it's needed
      const taskSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='tasks'").get() as { sql: string } | undefined;
      if (taskSchema && !taskSchema.sql.includes("'planning'")) {
        console.log('[Migration 003] Note: tasks table needs planning status - will be handled by schema recreation on fresh dbs');
      }
    }
  },
  {
    id: '004',
    name: 'add_planning_session_columns',
    up: (db) => {
      console.log('[Migration 004] Adding planning session columns to tasks...');
      
      const tasksInfo = db.prepare("PRAGMA table_info(tasks)").all() as { name: string }[];
      
      // Add planning_session_key column
      if (!tasksInfo.some(col => col.name === 'planning_session_key')) {
        db.exec(`ALTER TABLE tasks ADD COLUMN planning_session_key TEXT`);
        console.log('[Migration 004] Added planning_session_key');
      }
      
      // Add planning_messages column (stores JSON array of messages)
      if (!tasksInfo.some(col => col.name === 'planning_messages')) {
        db.exec(`ALTER TABLE tasks ADD COLUMN planning_messages TEXT`);
        console.log('[Migration 004] Added planning_messages');
      }
      
      // Add planning_complete column
      if (!tasksInfo.some(col => col.name === 'planning_complete')) {
        db.exec(`ALTER TABLE tasks ADD COLUMN planning_complete INTEGER DEFAULT 0`);
        console.log('[Migration 004] Added planning_complete');
      }
      
      // Add planning_spec column (stores final spec JSON)
      if (!tasksInfo.some(col => col.name === 'planning_spec')) {
        db.exec(`ALTER TABLE tasks ADD COLUMN planning_spec TEXT`);
        console.log('[Migration 004] Added planning_spec');
      }
      
      // Add planning_agents column (stores generated agents JSON)
      if (!tasksInfo.some(col => col.name === 'planning_agents')) {
        db.exec(`ALTER TABLE tasks ADD COLUMN planning_agents TEXT`);
        console.log('[Migration 004] Added planning_agents');
      }
    }
  },
  {
    id: '005',
    name: 'add_agentic_task_fields',
    up: (db) => {
      console.log('[Migration 005] Adding agentic task fields...');
      
      const tasksInfo = db.prepare("PRAGMA table_info(tasks)").all() as { name: string }[];
      
      // Add parent_task_id for subtask hierarchy
      if (!tasksInfo.some(col => col.name === 'parent_task_id')) {
        db.exec(`ALTER TABLE tasks ADD COLUMN parent_task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id)`);
        console.log('[Migration 005] Added parent_task_id');
      }
      
      // Add source to track human vs agent created tasks
      if (!tasksInfo.some(col => col.name === 'source')) {
        db.exec(`ALTER TABLE tasks ADD COLUMN source TEXT DEFAULT 'human' CHECK (source IN ('human', 'agent'))`);
        console.log('[Migration 005] Added source');
      }
      
      // Add tags as JSON array (includes "agentic" for agent tasks)
      if (!tasksInfo.some(col => col.name === 'tags')) {
        db.exec(`ALTER TABLE tasks ADD COLUMN tags TEXT DEFAULT '[]'`);
        console.log('[Migration 005] Added tags');
      }
      
      // Add approval workflow fields
      if (!tasksInfo.some(col => col.name === 'approval_status')) {
        db.exec(`ALTER TABLE tasks ADD COLUMN approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected', NULL))`);
        console.log('[Migration 005] Added approval_status');
      }
      
      if (!tasksInfo.some(col => col.name === 'approved_at')) {
        db.exec(`ALTER TABLE tasks ADD COLUMN approved_at TEXT`);
        console.log('[Migration 005] Added approved_at');
      }
      
      if (!tasksInfo.some(col => col.name === 'approved_by')) {
        db.exec(`ALTER TABLE tasks ADD COLUMN approved_by TEXT`);
        console.log('[Migration 005] Added approved_by');
      }
      
      // Add color for visual customization (purple for agentic tasks)
      if (!tasksInfo.some(col => col.name === 'color')) {
        db.exec(`ALTER TABLE tasks ADD COLUMN color TEXT`);
        console.log('[Migration 005] Added color');
      }
      
      // Add sort_order for ordering subtasks
      if (!tasksInfo.some(col => col.name === 'sort_order')) {
        db.exec(`ALTER TABLE tasks ADD COLUMN sort_order INTEGER DEFAULT 0`);
        console.log('[Migration 005] Added sort_order');
      }
      
      // Add agent_id for which agent created/owns this task
      if (!tasksInfo.some(col => col.name === 'agent_id')) {
        db.exec(`ALTER TABLE tasks ADD COLUMN agent_id TEXT`);
        console.log('[Migration 005] Added agent_id');
      }
    }
  },
  {
    id: '006',
    name: 'update_tasks_status_constraint',
    up: (db) => {
      console.log('[Migration 006] Updating tasks table to support new statuses...');
      
      // SQLite doesn't support ALTER CONSTRAINT, so we need to recreate the table
      // First, check if we need to migrate (if pending_approval/blocked exist in schema)
      const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='tasks'").get() as { sql: string } | undefined;
      
      if (schema && schema.sql.includes('pending_approval')) {
        console.log('[Migration 006] Tasks table already has new statuses, skipping');
        return;
      }
      
      console.log('[Migration 006] Recreating tasks table with updated status constraint...');
      
      // Create new table with all columns and updated constraint
      db.exec(`
        CREATE TABLE tasks_new (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          status TEXT DEFAULT 'inbox' CHECK (status IN ('planning', 'pending_approval', 'inbox', 'assigned', 'in_progress', 'testing', 'review', 'done', 'blocked')),
          priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
          assigned_agent_id TEXT,
          created_by_agent_id TEXT,
          workspace_id TEXT DEFAULT 'default',
          business_id TEXT DEFAULT 'default',
          due_date TEXT,
          openclaw_session_key TEXT,
          planning_session_key TEXT,
          planning_messages TEXT,
          planning_complete INTEGER DEFAULT 0,
          planning_spec TEXT,
          planning_agents TEXT,
          parent_task_id TEXT,
          source TEXT DEFAULT 'human' CHECK (source IN ('human', 'agent')),
          tags TEXT DEFAULT '[]',
          approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected', NULL)),
          approved_at TEXT,
          approved_by TEXT,
          color TEXT,
          sort_order INTEGER DEFAULT 0,
          agent_id TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `);
      
      // Copy data from old table
      db.exec(`
        INSERT INTO tasks_new SELECT 
          id, title, description, status, priority,
          assigned_agent_id, created_by_agent_id, workspace_id, business_id, due_date,
          openclaw_session_key, planning_session_key, planning_messages, planning_complete, planning_spec, planning_agents,
          parent_task_id, source, tags, approval_status, approved_at, approved_by, color, sort_order, agent_id,
          created_at, updated_at
        FROM tasks
      `);
      
      // Drop old table and rename new
      db.exec(`DROP TABLE tasks`);
      db.exec(`ALTER TABLE tasks_new RENAME TO tasks`);
      
      // Recreate indexes
      db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_agent_id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks(workspace_id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_source ON tasks(source)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_approval ON tasks(approval_status)`);
      
      console.log('[Migration 006] Tasks table recreated with new status constraint');
    }
  }
];

/**
 * Run all pending migrations
 */
export function runMigrations(db: Database.Database): void {
  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `);
  
  // Get already applied migrations
  const applied = new Set(
    (db.prepare('SELECT id FROM _migrations').all() as { id: string }[]).map(m => m.id)
  );
  
  // Run pending migrations in order
  for (const migration of migrations) {
    if (applied.has(migration.id)) {
      continue;
    }
    
    console.log(`[DB] Running migration ${migration.id}: ${migration.name}`);
    
    try {
      // Run migration in a transaction
      db.transaction(() => {
        migration.up(db);
        db.prepare('INSERT INTO _migrations (id, name) VALUES (?, ?)').run(migration.id, migration.name);
      })();
      
      console.log(`[DB] Migration ${migration.id} completed`);
    } catch (error) {
      console.error(`[DB] Migration ${migration.id} failed:`, error);
      throw error;
    }
  }
}

/**
 * Get migration status
 */
export function getMigrationStatus(db: Database.Database): { applied: string[]; pending: string[] } {
  const applied = (db.prepare('SELECT id FROM _migrations ORDER BY id').all() as { id: string }[]).map(m => m.id);
  const pending = migrations.filter(m => !applied.includes(m.id)).map(m => m.id);
  return { applied, pending };
}
