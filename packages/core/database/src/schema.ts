/**
 * 数据库结构定义
 *
 * 定义所有表结构、索引和当前数据库版本号。
 * 使用语义化的 DDL 语句，方便在 migration 中引用。
 */

/** 当前数据库 Schema 版本 */
export const SCHEMA_VERSION = 1;

/** 表定义 */
export const TABLES = {
  tasks: `
    CREATE TABLE IF NOT EXISTS tasks (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id         TEXT UNIQUE NOT NULL,
      module          TEXT NOT NULL,
      task_name       TEXT,
      status          TEXT DEFAULT 'pending'
                      CHECK (status IN ('pending','running','completed','failed','cancelled')),
      input_path      TEXT,
      output_path     TEXT,
      config_json     TEXT,
      result_json     TEXT,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      started_at      DATETIME,
      completed_at    DATETIME,
      duration_ms     INTEGER,
      error_message   TEXT
    );
  `,

  validation_results: `
    CREATE TABLE IF NOT EXISTS validation_results (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id         TEXT NOT NULL,
      row_number      INTEGER,
      error_type      TEXT NOT NULL,
      field_name      TEXT,
      description     TEXT NOT NULL,
      suggestion      TEXT,
      severity        TEXT NOT NULL
                      CHECK (severity IN ('error','warning')),
      FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE
    );
  `,

  image_results: `
    CREATE TABLE IF NOT EXISTS image_results (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id         TEXT NOT NULL,
      file_path       TEXT NOT NULL,
      file_name       TEXT NOT NULL,
      is_qualified    INTEGER NOT NULL CHECK (is_qualified IN (0,1)),
      score           REAL,
      model_used      TEXT,
      details_json    TEXT,
      FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE
    );
  `,

  settings: `
    CREATE TABLE IF NOT EXISTS settings (
      key             TEXT PRIMARY KEY,
      value           TEXT,
      updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `,
} as const;

/** 索引定义 */
export const INDEXES = [
  {
    name: 'idx_tasks_module',
    sql: 'CREATE INDEX IF NOT EXISTS idx_tasks_module ON tasks(module);',
  },
  {
    name: 'idx_tasks_status',
    sql: 'CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);',
  },
  {
    name: 'idx_tasks_created_at',
    sql: 'CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);',
  },
  {
    name: 'idx_validation_results_task_id',
    sql: 'CREATE INDEX IF NOT EXISTS idx_validation_results_task_id ON validation_results(task_id);',
  },
  {
    name: 'idx_image_results_task_id',
    sql: 'CREATE INDEX IF NOT EXISTS idx_image_results_task_id ON image_results(task_id);',
  },
] as const;
