export const INITIAL_SCHEMA_VERSION = 1;

export const INITIAL_SCHEMA_SQL = `
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  default_currency TEXT NOT NULL CHECK (length(default_currency) = 3),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE clients (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  legal_name TEXT,
  notes TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY NOT NULL,
  client_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED')),
  planned_start_date TEXT,
  planned_end_date TEXT,
  actual_start_date TEXT,
  actual_end_date TEXT,
  project_currency TEXT NOT NULL CHECK (length(project_currency) = 3),
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  priority TEXT,
  estimated_minutes INTEGER CHECK (estimated_minutes IS NULL OR estimated_minutes >= 0),
  planned_start_date TEXT,
  planned_end_date TEXT,
  actual_start_date TEXT,
  actual_end_date TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (id, project_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT
);

CREATE TABLE activities (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT
);

CREATE TABLE time_entries (
  id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL,
  task_id TEXT,
  activity_id TEXT,
  description TEXT,
  billable INTEGER NOT NULL CHECK (billable IN (0, 1)),
  source TEXT NOT NULL CHECK (source IN ('TIMER', 'MANUAL')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
  FOREIGN KEY (task_id, project_id) REFERENCES tasks(id, project_id) ON DELETE RESTRICT,
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE RESTRICT
);

CREATE TABLE work_intervals (
  id TEXT PRIMARY KEY NOT NULL,
  time_entry_id TEXT NOT NULL,
  started_at_utc TEXT NOT NULL,
  ended_at_utc TEXT,
  timezone_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  CHECK (ended_at_utc IS NULL OR ended_at_utc >= started_at_utc),
  FOREIGN KEY (time_entry_id) REFERENCES time_entries(id) ON DELETE CASCADE
);

CREATE TABLE expenses (
  id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL,
  expense_date TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  original_amount_minor INTEGER NOT NULL CHECK (original_amount_minor >= 0),
  original_currency TEXT NOT NULL CHECK (length(original_currency) = 3),
  exchange_rate_decimal TEXT NOT NULL,
  project_amount_minor INTEGER NOT NULL CHECK (project_amount_minor >= 0),
  project_currency TEXT NOT NULL CHECK (length(project_currency) = 3),
  reimbursable INTEGER NOT NULL CHECK (reimbursable IN (0, 1)),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'INCLUDED_IN_CLOSURE', 'REIMBURSED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT
);

CREATE TABLE expense_attachments (
  id TEXT PRIMARY KEY NOT NULL,
  expense_id TEXT NOT NULL,
  local_uri TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes INTEGER CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
  checksum TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE
);

CREATE INDEX idx_clients_workspace_id ON clients(workspace_id);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_activities_workspace_id ON activities(workspace_id);
CREATE INDEX idx_time_entries_project_id ON time_entries(project_id);
CREATE INDEX idx_time_entries_task_id ON time_entries(task_id);
CREATE INDEX idx_work_intervals_time_entry_id ON work_intervals(time_entry_id);
CREATE INDEX idx_expenses_project_id ON expenses(project_id);
CREATE INDEX idx_expense_attachments_expense_id ON expense_attachments(expense_id);
CREATE UNIQUE INDEX idx_work_intervals_single_open
  ON work_intervals ((1))
  WHERE ended_at_utc IS NULL;
`;
