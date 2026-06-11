import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { TaskRepository, resetRepository } from '../src/repository.js';
import type { Task, ValidationResult, ImageResult } from '../src/repository.js';

/**
 * 创建临时数据库路径
 */
function getTempDbPath(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wentong-db-test-'));
  return path.join(dir, 'test.db');
}

/**
 * 清理临时目录
 */
function cleanupTempDir(dbPath: string): void {
  const dir = path.dirname(dbPath);
  try {
    // 同时删除 WAL 和 SHM 文件
    for (const suffix of ['', '-wal', '-shm']) {
      const file = dbPath + suffix;
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    }
    if (fs.existsSync(dir)) {
      fs.rmdirSync(dir);
    }
  } catch {
    // 忽略清理错误
  }
}

describe('TaskRepository', () => {
  let repo: TaskRepository;
  let dbPath: string;

  beforeEach(() => {
    // 确保之前的单例已重置
    resetRepository();
    dbPath = getTempDbPath();
    repo = new TaskRepository(dbPath);
  });

  afterEach(() => {
    repo.close();
    cleanupTempDir(dbPath);
  });

  // -----------------------------------------------------------------------
  // 任务创建和检索
  // -----------------------------------------------------------------------

  describe('createTask / getTask', () => {
    it('应该成功创建并检索任务', () => {
      const task = repo.createTask({
        module: 'validator',
        task_name: '测试校验任务',
        input_path: '/data/input.csv',
      });

      expect(task).toBeDefined();
      expect(task.task_id).toBeTruthy();
      expect(task.task_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(task.module).toBe('validator');
      expect(task.task_name).toBe('测试校验任务');
      expect(task.status).toBe('pending');
      expect(task.input_path).toBe('/data/input.csv');
      expect(task.output_path).toBeNull();
      expect(task.config_json).toBeNull();
      expect(task.result_json).toBeNull();
      expect(task.created_at).toBeTruthy();
      expect(task.started_at).toBeNull();
      expect(task.completed_at).toBeNull();
      expect(task.duration_ms).toBeNull();
      expect(task.error_message).toBeNull();
    });

    it('应该通过 task_id 检索已创建的任务', () => {
      const created = repo.createTask({ module: 'image' });
      const retrieved = repo.getTask(created.task_id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.task_id).toBe(created.task_id);
      expect(retrieved!.module).toBe('image');
    });

    it('对不存在的 task_id 应返回 null', () => {
      const result = repo.getTask('00000000-0000-0000-0000-000000000000');
      expect(result).toBeNull();
    });

    it('每个任务的 task_id 应该唯一', () => {
      const t1 = repo.createTask({ module: 'validator' });
      const t2 = repo.createTask({ module: 'validator' });

      expect(t1.task_id).not.toBe(t2.task_id);
    });
  });

  // -----------------------------------------------------------------------
  // 任务状态更新
  // -----------------------------------------------------------------------

  describe('updateTaskStatus', () => {
    it('应该从 pending 更新为 running，记录 started_at', () => {
      const task = repo.createTask({ module: 'pdf' });

      const updated = repo.updateTaskStatus(task.task_id, 'running');

      expect(updated).toBeDefined();
      expect(updated!.status).toBe('running');
      expect(updated!.started_at).toBeTruthy();
      expect(updated!.completed_at).toBeNull();
      expect(updated!.duration_ms).toBeNull();
    });

    it('应该从 running 更新为 completed，记录 completed_at 和 duration_ms', () => {
      const task = repo.createTask({ module: 'pdf' });

      // 先设为 running
      const running = repo.updateTaskStatus(task.task_id, 'running')!;
      expect(running.started_at).toBeTruthy();

      // 再设为 completed
      const completed = repo.updateTaskStatus(task.task_id, 'completed')!;

      expect(completed.status).toBe('completed');
      expect(completed.completed_at).toBeTruthy();
      expect(completed.duration_ms).toBeDefined();
      expect(completed.duration_ms!).toBeGreaterThanOrEqual(0);
    });

    it('应该在 failed 状态时记录错误信息', () => {
      const task = repo.createTask({ module: 'image' });

      const failed = repo.updateTaskStatus(
        task.task_id,
        'failed',
        '文件格式不支持',
      );

      expect(failed).toBeDefined();
      expect(failed!.status).toBe('failed');
      expect(failed!.error_message).toBe('文件格式不支持');
      expect(failed!.completed_at).toBeTruthy();
    });

    it('cancelled 状态应记录完成时间', () => {
      const task = repo.createTask({ module: 'md5' });
      repo.updateTaskStatus(task.task_id, 'running');

      const cancelled = repo.updateTaskStatus(task.task_id, 'cancelled')!;

      expect(cancelled.status).toBe('cancelled');
      expect(cancelled.completed_at).toBeTruthy();
      expect(cancelled.duration_ms).toBeDefined();
    });

    it('对不存在的任务应返回 null', () => {
      const result = repo.updateTaskStatus(
        'nonexistent-id',
        'completed',
      );
      expect(result).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // 任务列表
  // -----------------------------------------------------------------------

  describe('listTasks', () => {
    it('应该列出所有任务（按创建时间倒序）', () => {
      repo.createTask({ module: 'validator', task_name: '任务1' });
      repo.createTask({ module: 'image', task_name: '任务2' });
      repo.createTask({ module: 'pdf', task_name: '任务3' });

      const tasks = repo.listTasks();

      expect(tasks).toHaveLength(3);
      // 按创建时间倒序，最后创建的在最前面
      expect(tasks[0].task_name).toBe('任务3');
      expect(tasks[1].task_name).toBe('任务2');
      expect(tasks[2].task_name).toBe('任务1');
    });

    it('应按模块过滤', () => {
      repo.createTask({ module: 'validator', task_name: 'V1' });
      repo.createTask({ module: 'validator', task_name: 'V2' });
      repo.createTask({ module: 'image', task_name: 'I1' });

      const validatorTasks = repo.listTasks('validator');
      expect(validatorTasks).toHaveLength(2);
      expect(validatorTasks.every((t) => t.module === 'validator')).toBe(true);

      const imageTasks = repo.listTasks('image');
      expect(imageTasks).toHaveLength(1);
      expect(imageTasks[0].module).toBe('image');
    });

    it('应遵守 limit 参数', () => {
      // 创建 10 个任务
      for (let i = 0; i < 10; i++) {
        repo.createTask({ module: 'validator' });
      }

      const tasks = repo.listTasks(undefined, 5);
      expect(tasks).toHaveLength(5);
    });

    it('默认 limit 应为 50', () => {
      // 创建 3 个任务，默认 limit 50
      for (let i = 0; i < 3; i++) {
        repo.createTask({ module: 'validator' });
      }

      const tasks = repo.listTasks();
      expect(tasks).toHaveLength(3);
    });
  });

  // -----------------------------------------------------------------------
  // 校验结果
  // -----------------------------------------------------------------------

  describe('addValidationResult / getValidationResults', () => {
    it('应成功添加并检索校验结果', () => {
      const task = repo.createTask({ module: 'validator' });

      const vr = repo.addValidationResult({
        task_id: task.task_id,
        row_number: 5,
        error_type: 'missing_field',
        field_name: 'name',
        description: '姓名字段缺失',
        suggestion: '请补充姓名',
        severity: 'error',
      });

      expect(vr.id).toBeGreaterThan(0);
      expect(vr.task_id).toBe(task.task_id);
      expect(vr.row_number).toBe(5);
      expect(vr.error_type).toBe('missing_field');
      expect(vr.field_name).toBe('name');
      expect(vr.description).toBe('姓名字段缺失');
      expect(vr.suggestion).toBe('请补充姓名');
      expect(vr.severity).toBe('error');
    });

    it('应通过 task_id 获取全部校验结果', () => {
      const task = repo.createTask({ module: 'validator' });

      repo.addValidationResult({
        task_id: task.task_id,
        error_type: 'type1',
        description: '错误1',
        severity: 'error',
      });
      repo.addValidationResult({
        task_id: task.task_id,
        error_type: 'type2',
        description: '警告1',
        severity: 'warning',
      });

      const results = repo.getValidationResults(task.task_id);
      expect(results).toHaveLength(2);
      expect(results[0].severity).toBe('error');
      expect(results[1].severity).toBe('warning');
    });

    it('无结果时应返回空数组', () => {
      const results = repo.getValidationResults(
        '00000000-0000-0000-0000-000000000000',
      );
      expect(results).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // 图像结果
  // -----------------------------------------------------------------------

  describe('addImageResult / getImageResults', () => {
    it('应正确转换 boolean 为 0/1 存储', () => {
      const task = repo.createTask({ module: 'image' });

      const qualified = repo.addImageResult({
        task_id: task.task_id,
        file_path: '/images/ok.png',
        file_name: 'ok.png',
        is_qualified: true,
        score: 0.95,
        model_used: 'resnet50',
      });

      expect(qualified.is_qualified).toBe(true);
      expect(qualified.score).toBe(0.95);
      expect(qualified.model_used).toBe('resnet50');
    });

    it('应正确转换 0/1 为 boolean 读取', () => {
      const task = repo.createTask({ module: 'image' });

      repo.addImageResult({
        task_id: task.task_id,
        file_path: '/images/good.jpg',
        file_name: 'good.jpg',
        is_qualified: true,
      });
      repo.addImageResult({
        task_id: task.task_id,
        file_path: '/images/bad.jpg',
        file_name: 'bad.jpg',
        is_qualified: false,
        score: 0.2,
      });

      const results = repo.getImageResults(task.task_id);
      expect(results).toHaveLength(2);
      expect(results[0].is_qualified).toBe(true);
      expect(results[1].is_qualified).toBe(false);
    });

    it('无结果时应返回空数组', () => {
      const results = repo.getImageResults(
        '00000000-0000-0000-0000-000000000000',
      );
      expect(results).toEqual([]);
    });

    it('可选字段为空时应为 null', () => {
      const task = repo.createTask({ module: 'image' });

      const result = repo.addImageResult({
        task_id: task.task_id,
        file_path: '/test.png',
        file_name: 'test.png',
        is_qualified: true,
      });

      expect(result.score).toBeNull();
      expect(result.model_used).toBeNull();
      expect(result.details_json).toBeNull();
    });
  });
});
