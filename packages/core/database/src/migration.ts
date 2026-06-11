/**
 * 数据库迁移管理
 *
 * 根据 SCHEMA_VERSION 自动执行建表和索引创建。
 * 使用事务确保迁移操作的原子性。
 */

import type Database from 'better-sqlite3';
import { SCHEMA_VERSION, TABLES, INDEXES } from './schema.js';

/**
 * 获取当前数据库的 schema 版本
 */
function getCurrentVersion(db: Database.Database): number {
  // 确保 settings 表存在（首次迁移时可能不存在）
  db.exec(TABLES.settings);

  const row = db
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get('schema_version') as { value: string } | undefined;

  return row ? parseInt(row.value, 10) : 0;
}

/**
 * 设置数据库 schema 版本
 */
function setVersion(db: Database.Database, version: number): void {
  db.prepare(
    `INSERT INTO settings (key, value, updated_at)
     VALUES ('schema_version', ?, CURRENT_TIMESTAMP)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
  ).run(String(version));
}

/**
 * 运行数据库迁移
 *
 * 在事务中执行所有待执行的迁移操作（建表 + 创建索引），
 * 完成后更新 schema_version。
 *
 * @param db - better-sqlite3 数据库实例
 */
export function runMigrations(db: Database.Database): void {
  const currentVersion = getCurrentVersion(db);

  if (currentVersion >= SCHEMA_VERSION) {
    return;
  }

  // 在事务中执行迁移，确保原子性
  const migrate = db.transaction(() => {
    // 创建所有表
    for (const ddl of Object.values(TABLES)) {
      db.exec(ddl);
    }

    // 创建所有索引
    for (const index of INDEXES) {
      db.exec(index.sql);
    }

    // 更新版本号
    setVersion(db, SCHEMA_VERSION);
  });

  migrate();
}
