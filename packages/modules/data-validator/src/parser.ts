import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import csvParser from 'csv-parser';

// ── Types ──────────────────────────────────────────────

export interface ParseResult {
  /** 列名（第一行表头） */
  headers: string[];
  /** 数据行（跳过空行后的有效行） */
  rows: Record<string, unknown>[];
  /** 有效数据行数量 */
  totalRows: number;
  /** 文件类型 */
  fileType: 'excel' | 'csv';
}

// ── CSV 解析 ───────────────────────────────────────────

/**
 * 解析 CSV 文件
 *
 * 第一行作为表头，自动跳过所有列为空的行。
 * 所有字段值读取为字符串（csv-parser 默认行为）。
 */
export function parseCSV(filePath: string): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const rows: Record<string, unknown>[] = [];
    const headers: string[] = [];

    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('headers', (h: string[]) => {
        headers.push(...h);
      })
      .on('data', (row: Record<string, unknown>) => {
        // 跳过所有值均为空的行
        const values = Object.values(row);
        const isEmpty = values.every(
          (v) => v === '' || v === null || v === undefined,
        );
        if (isEmpty) return;

        rows.push(row);
      })
      .on('end', () => {
        resolve({
          headers,
          rows,
          totalRows: rows.length,
          fileType: 'csv',
        });
      })
      .on('error', reject);
  });
}

// ── Excel 解析 ─────────────────────────────────────────

/**
 * 解析 Excel 文件（.xlsx / .xls）
 *
 * 读取第一个工作表，第一行作为表头，自动跳过所有列为空的行。
 * 空列或缺失列自动填充空字符串。
 */
export async function parseExcel(filePath: string): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return {
      headers: [],
      rows: [],
      totalRows: 0,
      fileType: 'excel',
    };
  }

  const headers: string[] = [];
  const rawRows: unknown[][] = [];

  // 逐行读取原始数据
  worksheet.eachRow((row) => {
    // exceljs 的 row.values 是 1-based 数组（索引 0 始终为 undefined）
    const vals: unknown[] = Array.isArray(row.values)
      ? row.values.slice(1)
      : [];
    rawRows.push(vals);
  });

  if (rawRows.length === 0) {
    return {
      headers: [],
      rows: [],
      totalRows: 0,
      fileType: 'excel',
    };
  }

  // 第一行 → 表头，空表头自动补齐列名
  const headerRow = rawRows[0];
  const maxCols = Math.max(
    headerRow.length,
    ...rawRows.slice(1).map((r) => r.length),
  );

  for (let i = 0; i < maxCols; i++) {
    const h = headerRow[i];
    headers.push(h != null && String(h).trim() !== '' ? String(h).trim() : `column_${i + 1}`);
  }

  // 解析数据行
  const rows: Record<string, unknown>[] = [];

  for (let r = 1; r < rawRows.length; r++) {
    const rowVals = rawRows[r];

    // 检查是否为空行
    const hasContent = rowVals.some(
      (v) => v !== null && v !== undefined && String(v).trim() !== '',
    );
    if (!hasContent) continue;

    const rowData: Record<string, unknown> = {};
    for (let c = 0; c < maxCols; c++) {
      rowData[headers[c]] = rowVals[c] ?? '';
    }
    rows.push(rowData);
  }

  return {
    headers,
    rows,
    totalRows: rows.length,
    fileType: 'excel',
  };
}

// ── 自动分发 ───────────────────────────────────────────

/** 支持的文件扩展名 */
const SUPPORTED_EXTENSIONS: Record<string, 'csv' | 'excel'> = {
  '.csv': 'csv',
  '.xlsx': 'excel',
  '.xls': 'excel',
};

/**
 * 根据文件扩展名自动分发到对应的解析器
 *
 * @throws {Error} 不支持的扩展名时抛出异常
 */
export async function parseFile(filePath: string): Promise<ParseResult> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.csv') {
    return parseCSV(filePath);
  }

  if (ext === '.xlsx' || ext === '.xls') {
    return parseExcel(filePath);
  }

  const supported = Object.keys(SUPPORTED_EXTENSIONS).join(', ');
  throw new Error(
    `Unsupported file type: "${ext}". Supported: ${supported}`,
  );
}
