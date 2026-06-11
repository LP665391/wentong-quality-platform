/**
 * 数据访问层 - TaskRepository
 *
 * 封装所有 SQLite 数据库操作，提供类型安全的 CRUD 接口。
 * 使用 better-sqlite3 同步 API，采用单例模式管理连接。
 */

import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { getPlatformInfo } from '@wentong/utils';
import { runMigrations } from './migration.js';

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

/** 任务状态 */
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/** 任务模块 */
export type TaskModule = 'validator' | 'image' | 'pdf' | 'md5' | 'metadata' | 'doc';

/** 校验严重程度 */
export type ValidationSeverity = 'error' | 'warning';

/** 任务记录 */
export interface Task {
  id: number;
  task_id: string;
  module: TaskModule;
  task_name: string | null;
  status: TaskStatus;
  input_path: string | null;
  output_path: string | null;
  config_json: string | null;
  result_json: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
}

/** 创建任务的输入参数 */
export interface CreateTaskInput {
  module: TaskModule;
  task_name?: string;
  input_path?: string;
  output_path?: string;
  config_json?: string;
}

/** 校验结果记录 */
export interface ValidationResult {
  id: number;
  task_id: string;
  row_number: number | null;
  error_type: string;
  field_name: string | null;
  description: string;
  suggestion: string | null;
  severity: ValidationSeverity;
}

/** 创建校验结果的输入参数 */
export interface CreateValidationResultInput {
  task_id: string;
  row_number?: number;
  error_type: string;
  field_name?: string;
  description: string;
  suggestion?: string;
  severity: ValidationSeverity;
}

/** 图像处理结果记录（业务对象，is_qualified 为 boolean） */
export interface ImageResult {
  id: number;
  task_id: string;
  file_path: string;
  file_name: string;
  is_qualified: boolean;
  score: number | null;
  model_used: string | null;
  details_json: string | null;
}

/** 创建图像结果的输入参数 */
export interface CreateImageResultInput {
  task_id: string;
  file_path: string;
  file_name: string;
  is_qualified: boolean;
  score?: number;
  model_used?: string;
  details_json?: string;
}

// ---------------------------------------------------------------------------
// 增加/更新任务的输入类型（内部使用）
// ---------------------------------------------------------------------------

interface TaskRow {
  id: number;
  task_id: string;
  module: string;
  task_name: string | null;
  status: string;
  input_path: string | null;
  output_path: string | null;
  config_json: string | null;
  result_json: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
}

interface ValidationResultRow {
  id: number;
  task_id: string;
  row_number: number | null;
  error_type: string;
  field_name: string | null;
  description: string;
  suggestion: string | null;
  severity: string;
}

interface ImageResultRow {
  id: number;
  task_id: string;
  file_path: string;
  file_name: string;
  is_qualified: number;
  score: number | null;
  model_used: string | null;
  details_json: string | null;
}

// ---------------------------------------------------------------------------
// TaskRepository
// ---------------------------------------------------------------------------

/** 默认数据库目录 */
function getDefaultDbPath(): string {
  const { dataDir } = getPlatformInfo();
  const dir = path.join(dataDir, 'database');
  return path.join(dir, 'main.db');
}

/** 确保目录存在 */
function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export class TaskRepository {
  private db: Database.Database;

  /**
   * 创建 TaskRepository 实例
   *
   * @param dbPath - 数据库文件路径，默认 ~/.wentong-quality/database/main.db
   */
  constructor(dbPath?: string) {
    const resolvedPath = dbPath ?? getDefaultDbPath();

    // 确保数据库目录存在（特别是 home 目录下的默认路径）
    ensureDir(path.dirname(resolvedPath));

    this.db = new Database(resolvedPath);

    // 启用 WAL 模式以获得更好的并发读性能
    this.db.pragma('journal_mode = WAL');

    // 启用外键约束
    this.db.pragma('foreign_keys = ON');

    // 运行迁移
    runMigrations(this.db);
  }

  // -----------------------------------------------------------------------
  // 任务操作
  // -----------------------------------------------------------------------

  /**
   * 创建新任务
   *
   * @param input - 任务输入参数
   * @returns 创建的任务记录
   */
  createTask(input: CreateTaskInput): Task {
    const taskId = crypto.randomUUID();

    const stmt = this.db.prepare(`
      INSERT INTO tasks (task_id, module, task_name, input_path, output_path, config_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      taskId,
      input.module,
      input.task_name ?? null,
      input.input_path ?? null,
      input.output_path ?? null,
      input.config_json ?? null,
    );

    return this.getTask(taskId)!;
  }

  /**
   * 根据 task_id 获取任务
   *
   * @param taskId - 任务 UUID
   * @returns 任务记录，未找到返回 null
   */
  getTask(taskId: string): Task | null {
    const row = this.db
      .prepare('SELECT * FROM tasks WHERE task_id = ?')
      .get(taskId) as TaskRow | undefined;

    if (!row) return null;

    return rowToTask(row);
  }

  /**
   * 更新任务状态
   *
   * 自动记录时间戳：
   * - 切换为 running → 设置 started_at
   * - 切换为 completed / failed → 设置 completed_at，计算 duration_ms
   * - 切换为 cancelled → 设置 completed_at，计算 duration_ms
   *
   * @param taskId  - 任务 UUID
   * @param status  - 新状态
   * @param errorMessage - 错误信息（failed 时使用）
   * @returns 更新后的任务记录
   */
  updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    errorMessage?: string,
  ): Task | null {
    const now = new Date().toISOString();

    const updateTask = this.db.transaction(() => {
      const task = this.getTask(taskId);
      if (!task) return null;

      // 根据目标状态设置时间戳
      const updates: string[] = ['status = ?'];
      const params: unknown[] = [status];

      if (status === 'running' && !task.started_at) {
        updates.push('started_at = ?');
        params.push(now);
      }

      if (
        (status === 'completed' || status === 'failed' || status === 'cancelled') &&
        !task.completed_at
      ) {
        updates.push('completed_at = ?');
        params.push(now);

        // 如果已记录开始时间，计算耗时
        if (task.started_at) {
          const startedMs = new Date(task.started_at).getTime();
          const completedMs = new Date(now).getTime();
          const duration = completedMs - startedMs;
          updates.push('duration_ms = ?');
          params.push(duration);
        } else {
          // 没有开始时间，设为 0
          updates.push('duration_ms = ?');
          params.push(0);
        }
      }

      if (status === 'failed' && errorMessage) {
        updates.push('error_message = ?');
        params.push(errorMessage);
      }

      // 追加 task_id 条件参数
      params.push(taskId);

      this.db
        .prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE task_id = ?`)
        .run(...params);

      return this.getTask(taskId);
    });

    return updateTask();
  }

  /**
   * 列出任务
   *
   * @param module - 按模块过滤（可选）
   * @param limit  - 最大返回数量，默认 50
   * @returns 任务列表（按创建时间倒序）
   */
  listTasks(module?: TaskModule, limit = 50): Task[] {
    let sql = 'SELECT * FROM tasks';
    const params: unknown[] = [];

    if (module) {
      sql += ' WHERE module = ?';
      params.push(module);
    }

    sql += ' ORDER BY created_at DESC, id DESC LIMIT ?';
    params.push(limit);

    const rows = this.db.prepare(sql).all(...params) as TaskRow[];
    return rows.map(rowToTask);
  }

  // -----------------------------------------------------------------------
  // 校验结果操作
  // -----------------------------------------------------------------------

  /**
   * 添加校验结果
   *
   * @param result - 校验结果输入
   * @returns 创建的校验结果记录
   */
  addValidationResult(result: CreateValidationResultInput): ValidationResult {
    const stmt = this.db.prepare(`
      INSERT INTO validation_results (task_id, row_number, error_type, field_name, description, suggestion, severity)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      result.task_id,
      result.row_number ?? null,
      result.error_type,
      result.field_name ?? null,
      result.description,
      result.suggestion ?? null,
      result.severity,
    );

    const row = this.db
      .prepare('SELECT * FROM validation_results WHERE id = ?')
      .get(info.lastInsertRowid) as ValidationResultRow;

    return rowToValidationResult(row);
  }

  /**
   * 获取指定任务的全部校验结果
   *
   * @param taskId - 任务 UUID
   * @returns 校验结果列表
   */
  getValidationResults(taskId: string): ValidationResult[] {
    const rows = this.db
      .prepare('SELECT * FROM validation_results WHERE task_id = ? ORDER BY id')
      .all(taskId) as ValidationResultRow[];

    return rows.map(rowToValidationResult);
  }

  // -----------------------------------------------------------------------
  // 图像结果操作
  // -----------------------------------------------------------------------

  /**
   * 添加图像处理结果
   *
   * @param result - 图像结果输入（is_qualified 为 boolean）
   * @returns 创建的图像结果记录
   */
  addImageResult(result: CreateImageResultInput): ImageResult {
    const stmt = this.db.prepare(`
      INSERT INTO image_results (task_id, file_path, file_name, is_qualified, score, model_used, details_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      result.task_id,
      result.file_path,
      result.file_name,
      result.is_qualified ? 1 : 0, // boolean → 0/1
      result.score ?? null,
      result.model_used ?? null,
      result.details_json ?? null,
    );

    const row = this.db
      .prepare('SELECT * FROM image_results WHERE id = ?')
      .get(info.lastInsertRowid) as ImageResultRow;

    return rowToImageResult(row);
  }

  /**
   * 获取指定任务的全部图像结果
   *
   * @param taskId - 任务 UUID
   * @returns 图像结果列表（is_qualified 已转为 boolean）
   */
  getImageResults(taskId: string): ImageResult[] {
    const rows = this.db
      .prepare('SELECT * FROM image_results WHERE task_id = ? ORDER BY id')
      .all(taskId) as ImageResultRow[];

    return rows.map(rowToImageResult);
  }

  // -----------------------------------------------------------------------
  // 生命周期
  // -----------------------------------------------------------------------

  /**
   * 关闭数据库连接
   */
  close(): void {
    this.db.close();
  }
}

// ---------------------------------------------------------------------------
// 单例模式
// ---------------------------------------------------------------------------

let _repository: TaskRepository | null = null;

/**
 * 获取 TaskRepository 单例（延迟初始化）
 *
 * @param dbPath - 可选的数据库路径（仅在首次调用时生效）
 * @returns TaskRepository 实例
 */
export function getRepository(dbPath?: string): TaskRepository {
  if (!_repository) {
    _repository = new TaskRepository(dbPath);
  }
  return _repository;
}

/**
 * 重置单例（主要用于测试）
 */
export function resetRepository(): void {
  if (_repository) {
    _repository.close();
    _repository = null;
  }
}

// ---------------------------------------------------------------------------
// 内部转换函数（行 → 业务对象）
// ---------------------------------------------------------------------------

function rowToTask(row: TaskRow): Task {
  // 确保 status 是合法的 TaskStatus 值
  const status = row.status as TaskStatus;

  return {
    id: row.id,
    task_id: row.task_id,
    module: row.module as TaskModule,
    task_name: row.task_name,
    status,
    input_path: row.input_path,
    output_path: row.output_path,
    config_json: row.config_json,
    result_json: row.result_json,
    created_at: row.created_at,
    started_at: row.started_at,
    completed_at: row.completed_at,
    duration_ms: row.duration_ms,
    error_message: row.error_message,
  };
}

function rowToValidationResult(row: ValidationResultRow): ValidationResult {
  return {
    id: row.id,
    task_id: row.task_id,
    row_number: row.row_number,
    error_type: row.error_type,
    field_name: row.field_name,
    description: row.description,
    suggestion: row.suggestion,
    severity: row.severity as ValidationSeverity,
  };
}

function rowToImageResult(row: ImageResultRow): ImageResult {
  return {
    id: row.id,
    task_id: row.task_id,
    file_path: row.file_path,
    file_name: row.file_name,
    is_qualified: row.is_qualified === 1, // 0/1 → boolean
    score: row.score,
    model_used: row.model_used,
    details_json: row.details_json,
  };
}
