/**
 * 校验报告导出器
 *
 * 支持将 ValidationReport 导出为 Excel、JSON、CSV 三种格式。
 * Excel 使用 exceljs 生成，包含「校验摘要」和「错误明细」两个 Sheet。
 */

import { Workbook } from 'exceljs';
import { writeFileSync } from 'node:fs';
import type { ValidationReport } from './engine.js';

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

/**
 * 格式化耗时（毫秒 → 可读字符串）
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

// ---------------------------------------------------------------------------
// Reporter
// ---------------------------------------------------------------------------

export class Reporter {
  /**
   * 导出 Excel 报告
   *
   * 生成两个 Sheet：
   * - 校验摘要：文件名、行数、错误数、警告数、耗时等
   * - 错误明细：行号、字段、错误类型、当前值、描述、建议、严重程度
   *
   * @param report     - 校验报告
   * @param outputPath - 输出文件路径（.xlsx）
   */
  static async exportExcel(
    report: ValidationReport,
    outputPath: string,
  ): Promise<void> {
    const workbook = new Workbook();
    workbook.creator = '文通Ai质检平台';

    // ── Sheet 1: 校验摘要 ──────────────────────────────
    const summarySheet = workbook.addWorksheet('校验摘要');

    // 列定义
    summarySheet.columns = [
      { header: '项目', key: 'key', width: 20 },
      { header: '值', key: 'value', width: 40 },
    ];

    // 表头加粗
    const headerRow = summarySheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // 摘要数据
    const summaryData = [
      { key: '文件名', value: report.fileName },
      { key: '文件类型', value: report.fileType },
      { key: '数据行数', value: report.totalRows.toString() },
      { key: '错误数', value: report.totalErrors.toString() },
      { key: '警告数', value: report.totalWarnings.toString() },
      { key: '校验耗时', value: formatDuration(report.duration) },
      { key: '完成时间', value: report.completedAt },
      { key: '任务 ID', value: report.taskId },
    ];

    summaryData.forEach((row) => summarySheet.addRow(row));

    // ── Sheet 2: 错误明细 ──────────────────────────────
    const detailSheet = workbook.addWorksheet('错误明细');

    detailSheet.columns = [
      { header: '行号', key: 'rowNumber', width: 8 },
      { header: '字段', key: 'fieldName', width: 16 },
      { header: '错误类型', key: 'errorType', width: 14 },
      { header: '当前值', key: 'value', width: 30 },
      { header: '描述', key: 'description', width: 40 },
      { header: '建议', key: 'suggestion', width: 30 },
      { header: '严重程度', key: 'severity', width: 10 },
    ];

    // 表头加粗
    const detailHeaderRow = detailSheet.getRow(1);
    detailHeaderRow.font = { bold: true };
    detailHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // 错误数据行
    for (const err of report.errors) {
      detailSheet.addRow({
        rowNumber: err.rowNumber,
        fieldName: err.fieldName,
        errorType: err.errorType,
        value: err.value !== undefined ? String(err.value) : '',
        description: err.description,
        suggestion: err.suggestion ?? '',
        severity: err.severity === 'error' ? '错误' : '警告',
      });
    }

    // 设置筛选器
    detailSheet.autoFilter = {
      from: 'A1',
      to: `G${detailSheet.rowCount}`,
    };

    // 写入文件
    await workbook.xlsx.writeFile(outputPath);
  }

  /**
   * 导出 JSON 报告
   *
   * @param report     - 校验报告
   * @param outputPath - 输出文件路径（.json）
   */
  static exportJson(report: ValidationReport, outputPath: string): void {
    const json = JSON.stringify(report, null, 2);
    writeFileSync(outputPath, json, 'utf-8');
  }

  /**
   * 导出 CSV 报告
   *
   * 仅导出错误明细部分，UTF-8 BOM 确保 Excel 正确识别中文。
   *
   * @param report     - 校验报告
   * @param outputPath - 输出文件路径（.csv）
   */
  static exportCsv(report: ValidationReport, outputPath: string): void {
    const BOM = '\ufeff';

    // CSV 表头
    const headers = ['行号', '字段', '错误类型', '当前值', '描述', '建议', '严重程度'];

    // CSV 行数据
    const rows = report.errors.map((err) => {
      const value =
        err.value !== undefined
          ? `"${String(err.value).replace(/"/g, '""')}"`
          : '""';
      return [
        err.rowNumber,
        `"${err.fieldName.replace(/"/g, '""')}"`,
        `"${err.errorType.replace(/"/g, '""')}"`,
        value,
        `"${err.description.replace(/"/g, '""')}"`,
        `"${(err.suggestion ?? '').replace(/"/g, '""')}"`,
        err.severity === 'error' ? '错误' : '警告',
      ].join(',');
    });

    const csv = BOM + [headers.join(','), ...rows].join('\n');
    writeFileSync(outputPath, csv, 'utf-8');
  }

  /**
   * 统一导出入口：根据 format 选择对应导出方法
   *
   * @param report     - 校验报告
   * @param format     - 导出格式：'excel' | 'json' | 'csv'
   * @param outputPath - 输出文件路径
   */
  static async exportFile(
    report: ValidationReport,
    format: 'excel' | 'json' | 'csv',
    outputPath: string,
  ): Promise<void> {
    switch (format) {
      case 'excel':
        await Reporter.exportExcel(report, outputPath);
        break;
      case 'json':
        Reporter.exportJson(report, outputPath);
        break;
      case 'csv':
        Reporter.exportCsv(report, outputPath);
        break;
      default:
        throw new Error(`不支持的导出格式: ${format}`);
    }
  }
}
