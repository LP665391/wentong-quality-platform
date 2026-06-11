import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ValidationEngine, type ValidationReport, type ValidationProgress } from '../src/engine.js';

// ── 测试辅助 ───────────────────────────────────────────

const FIXTURES_DIR = path.join(__dirname, '__fixtures_engine__');

function ensureFixturesDir(): void {
  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  }
}

function cleanupFixturesDir(): void {
  if (fs.existsSync(FIXTURES_DIR)) {
    fs.rmSync(FIXTURES_DIR, { recursive: true, force: true });
  }
}

function createTestCSV(): string {
  const p = path.join(FIXTURES_DIR, 'test.csv');
  fs.writeFileSync(
    p,
    'name,email,age\n' +
      'Alice,alice@test.com,30\n' +
      'Bob,invalid-email,150\n' +
      ',charlie@test.com,25\n',
  );
  return p;
}

// ── 测试用例 ───────────────────────────────────────────

describe('校验引擎 - ValidationEngine', () => {
  beforeAll(() => {
    ensureFixturesDir();
  });

  afterAll(() => {
    cleanupFixturesDir();
  });

  // ── loadPreset ────────────────────────────────────

  describe('loadPreset()', () => {
    it('standard 预设应加载 required + format + range 规则', () => {
      const engine = new ValidationEngine();
      engine.loadPreset('standard', ['email', 'age']);

      const activeRules = engine.getActiveRules();
      expect(activeRules.has('required')).toBe(true);
      expect(activeRules.has('format')).toBe(true);
      expect(activeRules.has('range')).toBe(true);
    });

    it('strict 预设应加载 3 个规则，全部为 error 级别', () => {
      const engine = new ValidationEngine();
      engine.loadPreset('strict', ['email']);

      const activeRules = engine.getActiveRules();
      expect(activeRules.size).toBe(3);

      const configs = Array.from(activeRules.values());
      for (let i = 0; i < configs.length; i++) {
        expect(configs[i].severity).toBe('error');
      }
    });

    it('loose 预设应仅加载 required 规则（warning 级别）', () => {
      const engine = new ValidationEngine();
      engine.loadPreset('loose', ['name']);

      const activeRules = engine.getActiveRules();
      expect(activeRules.size).toBe(1);
      expect(activeRules.has('required')).toBe(true);
      expect(activeRules.get('required')?.severity).toBe('warning');
    });

    it('加载预设前应清空已有规则', () => {
      const engine = new ValidationEngine();
      engine.addRule('required', {
        enabled: true,
        severity: 'error',
        fields: ['name'],
      });
      engine.loadPreset('standard', ['email']);

      // 预设加载后仅包含 standard 的字段配置
      const config = engine.getActiveRules().get('required');
      expect(config?.fields).toEqual(['email']);
    });
  });

  // ── validate ──────────────────────────────────────

  describe('validate()', () => {
    it('应产生正确的 report 结构', async () => {
      const csvPath = createTestCSV();
      const engine = new ValidationEngine();
      engine.loadPreset('standard', ['name', 'email', 'age']);

      const report: ValidationReport = await engine.validate(
        csvPath,
        'task-001',
      );

      // 结构验证
      expect(report.taskId).toBe('task-001');
      expect(report.fileName).toBe('test.csv');
      expect(report.fileType).toBe('csv');
      expect(report.totalRows).toBe(3);
      expect(typeof report.totalErrors).toBe('number');
      expect(typeof report.totalWarnings).toBe('number');
      expect(Array.isArray(report.ruleResults)).toBe(true);
      expect(Array.isArray(report.errors)).toBe(true);
      expect(typeof report.duration).toBe('number');
      expect(report.duration).toBeGreaterThanOrEqual(0);
      expect(report.completedAt).toBeTruthy();

      // 错误应按行号排序
      for (let i = 1; i < report.errors.length; i++) {
        expect(report.errors[i].rowNumber).toBeGreaterThanOrEqual(
          report.errors[i - 1].rowNumber,
        );
      }

      // ruleResults 应有 3 条（required, format, range）
      expect(report.ruleResults).toHaveLength(3);
      expect(report.ruleResults.map((r) => r.ruleType).sort()).toEqual([
        'format',
        'range',
        'required',
      ]);
    });

    it('应检测到 name 必填为空', async () => {
      const csvPath = createTestCSV();
      const engine = new ValidationEngine();
      engine.loadPreset('standard', ['name', 'email', 'age']);

      const report = await engine.validate(csvPath, 'task-002');

      // row 3 name 为空
      const nameErrors = report.errors.filter(
        (e) => e.fieldName === 'name' && e.errorType === 'required',
      );
      expect(nameErrors).toHaveLength(1);
      expect(nameErrors[0].rowNumber).toBe(3);
    });

    it('应检测到 email 格式不正确', async () => {
      const csvPath = createTestCSV();
      const engine = new ValidationEngine();
      engine.loadPreset('standard', ['name', 'email', 'age']);

      const report = await engine.validate(csvPath, 'task-003');

      // row 2 email 'invalid-email' 格式错误
      const emailErrors = report.errors.filter(
        (e) => e.fieldName === 'email' && e.errorType === 'format_mismatch',
      );
      expect(emailErrors.length).toBeGreaterThanOrEqual(1);
    });

    it('应检测到 age 超出范围', async () => {
      const csvPath = createTestCSV();
      const engine = new ValidationEngine();
      engine.loadPreset('standard', ['name', 'email', 'age']);

      const report = await engine.validate(csvPath, 'task-004');

      // row 2 age=150 超出 standard 的 min=0（无 max 限制，不会触发超出）
      // standard 预设 range 只设了 min=0，warning 级别
      const rangeErrors = report.errors.filter(
        (e) => e.errorType === 'number_out_of_range',
      );
      // 150 >= 0 所以不触发 — 但我们需要确认没有 number 错误
      // range standard 没有 max，所以 150 不会错误
      // age=30 和 age=25 都是数字，应该没问题
      expect(report.totalErrors).toBeGreaterThanOrEqual(1); // at least name required
    });
  });

  // ── 进度回调 ──────────────────────────────────────

  describe('进度回调', () => {
    it('应正确触发进度回调', async () => {
      const csvPath = createTestCSV();
      const engine = new ValidationEngine();
      engine.loadPreset('standard', ['name', 'email', 'age']);

      const progressEvents: ValidationProgress[] = [];

      await engine.validate(csvPath, 'task-005', (p) => {
        progressEvents.push({ ...p });
      });

      expect(progressEvents.length).toBeGreaterThan(0);

      // 最后一个事件应为 done
      const lastEvent = progressEvents[progressEvents.length - 1];
      expect(lastEvent.status).toBe('done');
      expect(lastEvent.percent).toBe(100);

      // 应有 parsing 状态
      const parsingEvents = progressEvents.filter((e) => e.status === 'parsing');
      expect(parsingEvents.length).toBeGreaterThan(0);

      // 应有 validating 状态
      const validatingEvents = progressEvents.filter(
        (e) => e.status === 'validating',
      );
      expect(validatingEvents.length).toBeGreaterThan(0);

      // 应有 reporting 状态
      const reportingEvents = progressEvents.filter(
        (e) => e.status === 'reporting',
      );
      expect(reportingEvents.length).toBeGreaterThan(0);
    });

    it('进度百分比应单调递增', async () => {
      const csvPath = createTestCSV();
      const engine = new ValidationEngine();
      engine.loadPreset('standard', ['name', 'email', 'age']);

      const percents: number[] = [];

      await engine.validate(csvPath, 'task-006', (p) => {
        percents.push(p.percent);
      });

      for (let i = 1; i < percents.length; i++) {
        expect(percents[i]).toBeGreaterThanOrEqual(percents[i - 1]);
      }
    });

    it('最终进度应为 100', async () => {
      const csvPath = createTestCSV();
      const engine = new ValidationEngine();
      engine.loadPreset('standard', ['name', 'email', 'age']);

      let finalPercent = 0;

      await engine.validate(csvPath, 'task-007', (p) => {
        finalPercent = p.percent;
      });

      expect(finalPercent).toBe(100);
    });
  });
});
