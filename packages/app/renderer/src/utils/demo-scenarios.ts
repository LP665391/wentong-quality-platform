/**
 * 演示场景数据
 *
 * 为 3 个典型客户场景预设完整的演示数据。
 * 配合全局 demoMode 状态，一键加载即可演示。
 */

import type { ValidationReport, RuleResult } from '@wentong/data-validator';
import type { MatchResult } from '@wentong/doc-manager';

// ---------------------------------------------------------------------------
// 场景定义
// ---------------------------------------------------------------------------

export interface DemoScreen {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  route: string;
  description: string;
}

/** 3 个典型场景 */
export const DEMO_SCENARIOS: DemoScreen[] = [
  {
    id: 'supplier-qc',
    title: '供应商来料质检',
    subtitle: '快速校验 Excel 报告',
    icon: '📋',
    route: '/validator',
    description:
      '供应商每次发货附带 Excel 质检报告，人工核对 50 行数据需要 20 分钟，漏检率 10%。用 Ai 质检系统 3 分钟完成，零遗漏。',
  },
  {
    id: 'image-screening',
    title: '产品图片批量筛查',
    subtitle: '自动识别不合格图片',
    icon: '🖼️',
    route: '/image-detector',
    description:
      '电商产品图片需要逐一检查清晰度和尺寸，100 张图片耗时 2 小时。用 Ai 质检系统 10 秒完成，不合格图片自动标红。',
  },
  {
    id: 'doc-archive',
    title: '质检文档加密归档',
    subtitle: '一键生成加密报告',
    icon: '🔐',
    route: '/pdf-processor',
    description:
      '质检完成后需要生成 PDF 报告、加水印、加密归档。传统方式需要切换多个工具。用 Ai 质检系统一键完成从校验到归档的全流程。',
  },
];

// ---------------------------------------------------------------------------
// 对比数据（人工 vs Ai 质检系统）
// ---------------------------------------------------------------------------

export interface ComparisonData {
  label: string;
  manual: string;
  ai: string;
  aiBetter: boolean;
}

export const COMPARISON_DATA: Record<string, ComparisonData[]> = {
  'supplier-qc': [
    { label: '耗时', manual: '~20 分钟', ai: '< 3 分钟', aiBetter: true },
    { label: '准确率', manual: '~90%（疲劳易漏）', ai: '100%（规则自动）', aiBetter: true },
    { label: '报告生成', manual: '手动汇总 Excel', ai: '一键导出', aiBetter: true },
    { label: '问题追溯', manual: '难以追溯', ai: '逐行定位，建议明确', aiBetter: true },
    { label: '数据复用', manual: '每次重新核对', ai: '规则模板可复用', aiBetter: true },
  ],
  'image-screening': [
    { label: '耗时', manual: '~2 小时/100张', ai: '< 10 秒', aiBetter: true },
    { label: '检出率', manual: '~70%（肉眼疲劳）', ai: '100%（算法自动）', aiBetter: true },
    { label: '判定标准', manual: '主观判断不一致', ai: '统一阈值，客观一致', aiBetter: true },
    { label: '报告输出', manual: '手动记录', ai: '自动汇总统计', aiBetter: true },
  ],
  'doc-archive': [
    { label: '工具切换', manual: 'Excel + PS + 压缩工具', ai: '一个工具完成', aiBetter: true },
    { label: '耗时', manual: '~15 分钟/份', ai: '< 1 分钟', aiBetter: true },
    { label: '安全性', manual: '无加密，易泄露', ai: 'AES-256 加密', aiBetter: true },
    { label: '合规性', manual: '无防篡改机制', ai: 'MD5 校验 + 元数据', aiBetter: true },
  ],
};

// ---------------------------------------------------------------------------
// 场景 1: 供应商来料质检 — 完整演示数据
// ---------------------------------------------------------------------------

/** 模拟 50 行供应商来料数据（表头） */
export const SUPPLIER_HEADERS = [
  '产品编号',
  '批次号',
  '产品名称',
  '规格型号',
  '数量',
  '单位',
  '生产日期',
  '有效期至',
  '供应商',
  '检验结果',
  '检验员',
  '备注',
];

/** 生成规则校验的模拟报告 */
export function generateSupplierQCReport(): ValidationReport {
  const ruleResults: RuleResult[] = [
    { ruleType: 'required', ruleName: '必填校验', errorCount: 3, warningCount: 0 },
    { ruleType: 'format', ruleName: '格式校验', errorCount: 2, warningCount: 0 },
    { ruleType: 'range', ruleName: '范围校验', errorCount: 1, warningCount: 2 },
  ];

  return {
    taskId: 'demo-supplier-qc-001',
    fileName: '2026年6月_供应商来料检验报告.xlsx',
    fileType: 'excel',
    totalRows: 50,
    totalErrors: 6,
    totalWarnings: 2,
    ruleResults,
    errors: [
      {
        rowNumber: 3,
        fieldName: '产品编号',
        errorType: 'required',
        description: '"产品编号" 为必填字段，不能为空',
        suggestion: '请为第 3 行的 "产品编号" 填入有效值',
        severity: 'error',
        value: '',
      },
      {
        rowNumber: 7,
        fieldName: '生产日期',
        errorType: 'format_mismatch',
        description: '"生产日期" 格式不正确，期望 YYYY-MM-DD',
        suggestion: '请确保 "生产日期" 符合 YYYY-MM-DD 格式',
        severity: 'error',
        value: '2026/06/15',
      },
      {
        rowNumber: 15,
        fieldName: '数量',
        errorType: 'number_out_of_range',
        description: '"数量" 的值 15000 大于最大值 9999',
        suggestion: '请确保 "数量" ≤ 9999',
        severity: 'error',
        value: 15000,
      },
      {
        rowNumber: 22,
        fieldName: '批次号',
        errorType: 'required',
        description: '"批次号" 为必填字段，不能为空',
        suggestion: '请为第 22 行的 "批次号" 填入有效值',
        severity: 'error',
        value: '',
      },
      {
        rowNumber: 31,
        fieldName: '有效期至',
        errorType: 'format_mismatch',
        description: '"有效期至" 格式不正确，期望 YYYY-MM-DD',
        suggestion: '请确保 "有效期至" 符合 YYYY-MM-DD 格式',
        severity: 'error',
        value: '2027.08',
      },
      {
        rowNumber: 45,
        fieldName: '检验员',
        errorType: 'required',
        description: '"检验员" 为必填字段，不能为空',
        suggestion: '请为第 45 行的 "检验员" 填入有效值',
        severity: 'error',
        value: '',
      },
      {
        rowNumber: 8,
        fieldName: '数量',
        errorType: 'number_out_of_range',
        description: '"数量" 的值 100 接近下限 0，请确认',
        suggestion: '请确认 "数量" 是否正确',
        severity: 'warning',
        value: 100,
      },
      {
        rowNumber: 38,
        fieldName: '数量',
        errorType: 'number_out_of_range',
        description: '"数量" 的值 2 接近下限 0，请确认',
        suggestion: '请确认 "数量" 是否正确',
        severity: 'warning',
        value: 2,
      },
    ],
    duration: 1823,
    completedAt: new Date().toISOString(),
    grade: 'fail',
    gradeLabel: '需返工',
  };
}

// ---------------------------------------------------------------------------
// 场景 2: 产品图片批量筛查 — 完整演示数据
// ---------------------------------------------------------------------------

export interface DemoImageResult {
  id: number;
  fileName: string;
  isQualified: boolean;
  score: number;
  modelUsed: string;
  details: Record<string, unknown>;
  /** Blob URL 或数据 URI，浏览器可显示 */
  thumbnailUrl?: string;
}

/** 生成 20 张产品图的检测结果 */
export function generateImageScreeningResults(): DemoImageResult[] {
  const results: DemoImageResult[] = [];
  const totalImages = 20;

  // 不同检测类型的问题描述
  const issues = [
    { type: 'clarity', desc: '分辨率过低 (320×240)，低于 480p 最低标准' },
    { type: 'clarity', desc: '文件过小 (3.2KB)，可能为占位图或损坏文件' },
    { type: 'size', desc: '宽度 150px 超出最小尺寸范围 [200, 4096]' },
    { type: 'size', desc: '高度 5000px 超出最大尺寸范围 [200, 4096]' },
    { type: 'brightness', desc: '平均亮度 18，图片过暗，可能拍摄环境光线不足' },
    { type: 'brightness', desc: '平均亮度 248，图片过曝，建议重新拍摄' },
  ];

  for (let i = 1; i <= totalImages; i++) {
    const isProblem = i <= 8; // 前 8 张有各种问题
    const issueIdx = (i - 1) % issues.length;
    const issue = issues[issueIdx];

    // 生成不同尺寸的模拟图数据
    const sizes = [
      { width: 1920, height: 1080 },
      { width: 1280, height: 720 },
      { width: 800, height: 600 },
      { width: 320, height: 240 }, // 不清
      { width: 4096, height: 2160 },
      { width: 150, height: 200 }, // 尺寸异常
      { width: 2560, height: 1440 },
      { width: 640, height: 480 },
    ];
    const size = sizes[(i - 1) % sizes.length];

    const score = isProblem ? Math.floor(Math.random() * 40) + 10 : Math.floor(Math.random() * 30) + 70;

    results.push({
      id: i,
      fileName: `产品图_${String(i).padStart(3, '0')}.jpg`,
      isQualified: !isProblem,
      score,
      modelUsed: isProblem ? issue.type : 'clarity',
      details: {
        width: size.width,
        height: size.height,
        totalPixels: size.width * size.height,
        avgBrightness: isProblem && issue.type === 'brightness'
          ? (issue.desc.includes('过暗') ? 18 : 248)
          : 128,
        fileSizeKB: isProblem && issue.type === 'clarity' && issue.desc.includes('过小')
          ? 3.2
          : Math.round((Math.random() * 500 + 50) * 100) / 100,
        issue: isProblem ? (issue.desc.includes('过暗') ? 'too_dark' : issue.desc.includes('过曝') ? 'too_bright' : issue.type) : 'normal',
      },
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// 场景 3: 文档解析 — 完整演示数据
// ---------------------------------------------------------------------------

/** 生成文档解析匹配结果 */
export function generateDocParseResults(): {
  totalFields: number;
  matchedFields: number;
  matches: MatchResult[];
  unmatchedFields: string[];
} {
  const matches: MatchResult[] = [
    { fieldId: 2, fieldName: '产品编号', headerName: '产品代码', score: 80 },
    { fieldId: 3, fieldName: '批次号', headerName: '批号', score: 100 },
    { fieldId: 4, fieldName: '生产日期', headerName: '生产日期', score: 100 },
    { fieldId: 5, fieldName: '有效期', headerName: '有效期至', score: 80 },
    { fieldId: 6, fieldName: '规格型号', headerName: '规格型号', score: 100 },
    { fieldId: 7, fieldName: '数量', headerName: '数量', score: 100 },
    { fieldId: 8, fieldName: '单位', headerName: '单位', score: 100 },
    { fieldId: 9, fieldName: '供应商', headerName: '供应商', score: 100 },
    { fieldId: 10, fieldName: '检验员', headerName: '检验人', score: 80 },
    { fieldId: 11, fieldName: '检验日期', headerName: '检验日期', score: 100 },
    { fieldId: 12, fieldName: '检验结果', headerName: '检验结果', score: 100 },
    { fieldId: 15, fieldName: '备注', headerName: '备注', score: 100 },
  ];

  const unmatchedFields = [
    '系统信息',
    '不合格项',
    '处置方式',
    '文件编号',
    '版本号',
    '密级',
    '归档日期',
    '保管期限',
    '存储位置',
    '关联文档',
    '审批人',
    '审批状态',
  ];

  return {
    totalFields: 24,
    matchedFields: matches.length,
    matches,
    unmatchedFields,
  };
}

// ---------------------------------------------------------------------------
// 首页统计数据
// ---------------------------------------------------------------------------

export interface HomeStats {
  totalRows: number;
  totalIssues: number;
  totalReports: number;
}

export const DEMO_HOME_STATS: HomeStats = {
  totalRows: 12586,
  totalIssues: 1203,
  totalReports: 89,
};
