/**
 * 文档解析器
 *
 * 使用 exceljs 读取 Excel 文件，提取表头并进行字段匹配。
 */

import * as ExcelJS from 'exceljs';
import { matchHeaders, PREDEFINED_FIELDS } from './field-mapper.js';
import type { MatchResult } from './field-mapper.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** 文档字段 */
export interface DocField {
  /** 预定义字段 ID */
  id: number;
  /** 字段名称 */
  name: string;
  /** 提取值（第一行数据） */
  value: string;
  /** 是否匹配成功 */
  matched: boolean;
}

/** 文档解析结果 */
export interface DocResult {
  /** 文件名 */
  fileName: string;
  /** 所有字段匹配结果 */
  fields: DocField[];
  /** 预定义字段总数（用户选择的） */
  totalFields: number;
  /** 匹配成功的字段数 */
  matchedFields: number;
}

// ---------------------------------------------------------------------------
// parseDocument
// ---------------------------------------------------------------------------

/**
 * 解析 Excel 文档，提取表头并进行字段匹配
 *
 * @param filePath       - Excel 文件路径
 * @param selectedFields - 用户选择的字段 ID 列表（空表示全部 24 个）
 * @returns 解析结果
 */
export async function parseDocument(
  filePath: string,
  selectedFields: number[] = [],
): Promise<DocResult> {
  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.readFile(filePath);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`无法读取 Excel 文件: ${message}`);
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('Excel 文件中没有找到工作表');
  }

  // 读取第一行作为表头
  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];

  // 收集所有非空表头
  headerRow.eachCell({ includeEmpty: false }, (cell) => {
    const val = cell.value;
    if (val !== null && val !== undefined) {
      headers.push(String(val).trim());
    }
  });

  if (headers.length === 0) {
    throw new Error('Excel 文件第一行没有找到表头');
  }

  // 读取第二行作为第一行数据
  const dataRow = worksheet.getRow(2);
  const dataValues: string[] = [];
  dataRow.eachCell({ includeEmpty: false }, (cell) => {
    const val = cell.value;
    dataValues.push(val !== null && val !== undefined ? String(val) : '');
  });

  // 执行表头匹配
  const matchResults: MatchResult[] = matchHeaders(headers, selectedFields);

  // 确定用户实际选择的字段列表
  const targetFields =
    selectedFields.length === 0
      ? PREDEFINED_FIELDS
      : PREDEFINED_FIELDS.filter((f) => selectedFields.includes(f.id));

  // 构建字段结果
  const fields: DocField[] = targetFields.map((field) => {
    // 查找匹配结果
    const match = matchResults.find((m) => m.fieldId === field.id);

    if (match) {
      // 找到匹配列在表头中的索引
      const colIndex = headers.indexOf(match.headerName);
      const value = colIndex >= 0 && colIndex < dataValues.length
        ? dataValues[colIndex]
        : '';

      return {
        id: field.id,
        name: field.name,
        value,
        matched: true,
      };
    }

    return {
      id: field.id,
      name: field.name,
      value: '',
      matched: false,
    };
  });

  const matchedFields = fields.filter((f) => f.matched).length;

  return {
    fileName: filePath.split(/[/\\]/).pop() ?? 'unknown',
    fields,
    totalFields: targetFields.length,
    matchedFields,
  };
}
