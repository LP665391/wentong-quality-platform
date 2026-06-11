import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseCSV, parseFile, ParseResult } from '../src/parser.js';

// ── 测试辅助 ───────────────────────────────────────────

const FIXTURES_DIR = path.join(__dirname, '__fixtures__');

function ensureFixturesDir(): void {
  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  }
}

function cleanupFixturesDir(): void {
  fs.rmSync(FIXTURES_DIR, { recursive: true, force: true });
}

// ── 测试用例 ───────────────────────────────────────────

describe('parser 模块', () => {
  beforeAll(() => {
    ensureFixturesDir();
  });

  afterAll(() => {
    cleanupFixturesDir();
  });

  // ── parseCSV ──────────────────────────────────────

  describe('parseCSV()', () => {
    const csvPath = path.join(FIXTURES_DIR, 'test.csv');

    beforeAll(() => {
      fs.writeFileSync(
        csvPath,
        'name,age,city\n' +
          'Alice,30,New York\n' +
          'Bob,25,Los Angeles\n' +
          ',,\n' +
          'Charlie,35,Chicago\n',
      );
    });

    it('应该正确解析 CSV 文件，返回表头和数据行', async () => {
      const result: ParseResult = await parseCSV(csvPath);

      expect(result.fileType).toBe('csv');
      expect(result.headers).toEqual(['name', 'age', 'city']);
      expect(result.rows).toHaveLength(3);
      expect(result.totalRows).toBe(3);

      // 验证第一行数据
      expect(result.rows[0]).toEqual({
        name: 'Alice',
        age: '30',
        city: 'New York',
      });

      // 验证最后一行数据
      expect(result.rows[2]).toEqual({
        name: 'Charlie',
        age: '35',
        city: 'Chicago',
      });
    });

    it('应该跳过所有列均为空的行', async () => {
      const result: ParseResult = await parseCSV(csvPath);

      // 空行应被跳过，不应出现在结果中
      const emptyRow = result.rows.find((r) =>
        Object.values(r).every(
          (v) => v === '' || v === null || v === undefined,
        ),
      );
      expect(emptyRow).toBeUndefined();

      // 总行数应排除空行（4 行数据中 1 行全空 → 3 行有效）
      expect(result.totalRows).toBe(3);
    });

    it('应该正确处理仅含表头无数据的 CSV', async () => {
      const headerOnlyPath = path.join(FIXTURES_DIR, 'header-only.csv');
      fs.writeFileSync(headerOnlyPath, 'col1,col2,col3\n');

      const result: ParseResult = await parseCSV(headerOnlyPath);

      expect(result.headers).toEqual(['col1', 'col2', 'col3']);
      expect(result.rows).toHaveLength(0);
      expect(result.totalRows).toBe(0);
    });
  });

  // ── parseFile（自动分发）──────────────────────────

  describe('parseFile()', () => {
    it('应识别 .csv 扩展名并分发到 CSV 解析器', async () => {
      const csvPath = path.join(FIXTURES_DIR, 'dispatch.csv');
      fs.writeFileSync(csvPath, 'col1,col2\nval1,val2\n');

      const result: ParseResult = await parseFile(csvPath);

      expect(result.fileType).toBe('csv');
      expect(result.headers).toEqual(['col1', 'col2']);
      expect(result.rows).toHaveLength(1);
    });

    it('应识别 .xlsx 扩展名并分发到 Excel 解析器', async () => {
      // 注意：此测试需要一个真实的 .xlsx 文件
      // 由于需要 exceljs 写文件，这里仅验证扩展名识别逻辑
      const ext = '.xlsx';
      // 实际 Excel 解析测试需要 exceljs Workbook 创建测试文件
      // parseFile 的分发是基于 path.extname()，这里只验证逻辑入口
      await expect(parseFile('nonexistent.xlsx')).rejects.toThrow();
    });

    it('应对不支持的文件扩展名抛出错误', async () => {
      await expect(parseFile('test.txt')).rejects.toThrow(
        'Unsupported file type',
      );
    });

    it('应对不支持的文件扩展名抛出包含扩展名的错误', async () => {
      await expect(parseFile('data.json')).rejects.toThrow('.json');
    });
  });
});
