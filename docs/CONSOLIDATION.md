# Mission Control + OpenClaw Consolidation

## Current State

### What OpenClaw Gateway Exposes (via WebSocket)

| Category | Methods | Description |
|----------|---------|-------------|
| **Agents** | `agents.list` | List all configured agents |
| **Sessions** | `sessions.list`, `sessions.preview`, `sessions.patch`, `sessions.delete`, `sessions.compact`, `sessions.reset` | Full session management |
| **Chat** | `chat.history`, `chat.send`, `chat.abort` | Message history & interaction |
| **Channels** | `channels.status`, `channels.logout` | Telegram, Discord, etc. |
| **Skills** | `skills.status`, `skills.bins`, `skills.install`, `skills.update` | Skill management |
| **Config** | `config.get`, `config.set`, `config.apply`, `config.patch`, `config.schema` | Full config CRUD |
| **Cron** | `cron.list`, `cron.status`, `cron.add`, `cron.update`, `cron.remove`, `cron.run`, `cron.runs` | Scheduled tasks |
| **Usage** | `usage.status`, `usage.cost` | Token usage & cost tracking |
| **Models** | `models.list` | Available AI models |
| **Nodes** | `node.list`, `node.describe`, `node.invoke`, etc. | Device/node management |
| **Health** | `health`, `status` | System health |

### What Mission Control Duplicates ❌

| MC Feature | OpenClaw Equivalent | Action |
|------------|---------------------|--------|
| `agents` table | `agents.list` | **Remove** - query OC directly |
| `openclaw_sessions` table | `sessions.list` | **Remove** - query OC directly |
| Agent status tracking | Live from `agents.list` | **Remove** - use real-time data |

### What Mission Control Adds ✅ (Keep)

| Feature | Value |
|---------|-------|
| **Tasks/Missions** | Kanban workflow for tracking work |
| **Workspaces** | Project organization |
| **Planning Workflow** | Questions → Specs → Approval before execution |
| **Deliverables** | Track outputs/artifacts per task |
| **Activity Feed** | Unified event log |

---

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Mission Control UI                          │
├─────────────┬─────────────┬─────────────┬─────────────┬────────┤
│   Tasks     │   Agents    │   Chats     │  Settings   │ Usage  │
│  (SQLite)   │   (OC)      │   (OC)      │   (OC)      │ (OC)   │
└──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┴───┬────┘
       │             │             │             │          │
       ▼             ▼             ▼             ▼          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    OpenClaw Gateway (WebSocket)                  │
│  agents.list │ sessions.* │ chat.* │ config.* │ usage.* │ ...  │
└─────────────────────────────────────────────────────────────────┘
```

**Principle**: MC is a **UI layer** on top of OpenClaw, not a parallel system.
- Tasks/Workspaces = MC's value-add (SQLite)
- Everything else = Query OpenClaw in real-time

---

## Implementation Plan

### Phase 1: Remove Duplicates

1. **Delete `agents` table** - Replace with `agents.list` API calls
2. **Delete `openclaw_sessions` table** - Replace with `sessions.list` 
3. **Update AgentsSidebar** - Fetch from OpenClaw, not SQLite
4. **Keep MC agent→task assignments** - Store only `agent_id` reference

### Phase 2: Add Chat History View

When a task spawns a sub-agent session:
1. Store `session_key` in task record
2. Add "View Chat" button on task card
3. Call `chat.history` to show conversation
4. Real-time updates via SSE/WebSocket

```typescript
// Task with linked session
interface Task {
  id: string;
  title: string;
  // ... existing fields
  openclaw_session_key?: string;  // Link to OC session
}

// Fetch chat when viewing task
const history = await openclawClient.call('chat.history', {
  sessionKey: task.openclaw_session_key,
  limit: 100
});
```

### Phase 3: Channels Panel

New sidebar section showing:
- Connected channels (Telegram, Discord, etc.)
- Status (online/offline/error)
- Quick actions (logout, reconnect)

```typescript
const channels = await openclawClient.call('channels.status');
// { telegram: { connected: true, bot: "YvetteHomeBot" }, ... }
```

### Phase 4: Skills Browser

- List installed skills from `skills.status`
- Search ClawHub for new skills
- Install/update from UI

### Phase 5: Config Editor

- Load schema from `config.schema`
- Edit with form UI
- Apply with `config.patch`

### Phase 6: Usage Dashboard

- Token usage from `usage.status`
- Cost tracking from `usage.cost`
- Per-agent/session breakdowns

---

## Database Schema Changes

### Remove
```sql
DROP TABLE agents;
DROP TABLE openclaw_sessions;
```

### Keep
```sql
-- Tasks with OC session link
ALTER TABLE tasks ADD COLUMN openclaw_session_key TEXT;

-- Minimal agent reference (just ID, fetch details from OC)
-- Keep assigned_agent_id but treat it as OC agent reference
```

### New
```sql
-- Cache for offline access (optional)
CREATE TABLE openclaw_cache (
  key TEXT PRIMARY KEY,
  data TEXT,  -- JSON
  fetched_at TEXT DEFAULT (datetime('now')),
  ttl_seconds INTEGER DEFAULT 60
);
```

---

## API Changes

### Remove
- `GET/POST/PATCH/DELETE /api/agents` → Use OpenClaw
- Agent CRUD in SQLite

### Modify
- `GET /api/agents` → Proxy to `agents.list`
- `GET /api/sessions` → Proxy to `sessions.list`

### Add
- `GET /api/tasks/:id/chat` → Fetch linked session history
- `GET /api/channels` → Proxy to `channels.status`
- `GET /api/skills` → Proxy to `skills.status`
- `GET /api/config` → Proxy to `config.get`
- `PATCH /api/config` → Proxy to `config.patch`
- `GET /api/usage` → Proxy to `usage.status`

---

## UI Changes

### Agents Sidebar
- Fetch from OpenClaw `agents.list` instead of SQLite
- Show real-time status
- Show session count per agent
- Click agent → Show their sessions

### New: Chat Panel
- When task has `openclaw_session_key`:
  - Show "View Chat" button
  - Open chat history in side panel
  - Real-time message updates

### New: Channels Tab
- Grid of connected channels
- Status indicators
- Logout/reconnect buttons

### New: Settings Tab
- Config editor (from `config.schema`)
- Skills browser
- Model selection

### New: Usage Tab
- Token usage charts
- Cost breakdown
- Per-session stats

---

## Benefits

1. **Single Source of Truth** - Agents/sessions live in OpenClaw only
2. **Real-time Data** - No stale caches or sync issues
3. **Full Visibility** - See chat history of what agents did
4. **Channel Control** - Manage Telegram/Discord from UI
5. **Skill Management** - Install/update skills visually
6. **Config UI** - No more editing JSON files
7. **Usage Tracking** - Know your costs

---

## Migration Steps

1. Export current MC agents to backup
2. Delete `agents` table
3. Update code to fetch from OpenClaw
4. Test agent list loads correctly
5. Add session_key to tasks table
6. Implement chat history view
7. Add new panels incrementally
