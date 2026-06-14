import path from 'node:path';
import { parseFile, type ParseResult } from './parser.js';
import {
  getRule,
  getAllRules,
  type RuleConfig,
  type ValidationError,
} from './rules/index.js';

// ── Types ──────────────────────────────────────────────

/** 校验进度状态 */
export type ProgressStatus =
  | 'idle'
  | 'parsing'
  | 'validating'
  | 'reporting'
  | 'done'
  | 'error';

/** 校验进度信息 */
export interface ValidationProgress {
  /** 当前进度数值 */
  current: number;
  /** 总数（100） */
  total: number;
  /** 百分比 */
  percent: number;
  /** 当前状态 */
  status: ProgressStatus;
  /** 状态描述 */
  message: string;
}

/** 单条规则的校验结果统计 */
export interface RuleResult {
  /** 规则类型 */
  ruleType: string;
  /** 规则名称 */
  ruleName: string;
  /** 错误数量 */
  errorCount: number;
  /** 警告数量 */
  warningCount: number;
}

/** 校验报告等级 */
export type ReportGrade = 'pass' | 'warning' | 'fail';

/** 校验报告 */
export interface ValidationReport {
  /** 任务 ID */
  taskId: string;
  /** 文件名 */
  fileName: string;
  /** 文件类型 */
  fileType: string;
  /** 总行数 */
  totalRows: number;
  /** 总错误数 */
  totalErrors: number;
  /** 总警告数 */
  totalWarnings: number;
  /** 各规则统计 */
  ruleResults: RuleResult[];
  /** 所有校验错误（按行号排序） */
  errors: ValidationError[];
  /** 校验耗时（毫秒） */
  duration: number;
  /** 完成时间（ISO 字符串） */
  completedAt: string;
  /** 报告等级：pass=可入库, warning=需整改, fail=需返工 */
  grade: ReportGrade;
  /** 等级说明 */
  gradeLabel: string;
}

/** 进度回调 */
export type ProgressCallback = (progress: ValidationProgress) => void;

// ── 预设规则配置 ──────────────────────────────────────

type PresetName = 'standard' | 'strict' | 'loose';

interface PresetRuleEntry {
  type: string;
  config: Partial<RuleConfig> & Record<string, unknown>;
}

/**
 * 宽松模式 - "收上来就行"
 * 适用场景：档案移交初期，先确保数据不缺失
 * 检查项：必填字段（档号、题名、责任者、日期、保管期限）
 * 严重程度：全部为警告
 */
function buildLoosePreset(fields: string[]): PresetRuleEntry[] {
  return [
    {
      type: 'required',
      config: { enabled: true, severity: 'warning' as const, fields },
    },
  ];
}

/**
 * 标准模式 - "符合国标"
 * 适用场景：按照 DA/T 18-2022 等档案行业标准进行规范性检查
 * 检查项：
 * - 必填字段（缺失为错误）
 * - 日期格式（YYYYMMDD 或 YYYY-MM-DD）
 * - 保管期限（永久/30年/10年）
 * - 密级（公开/内部/秘密/机密）
 * - 页数（正整数）
 */
function buildStandardPreset(fields: string[]): PresetRuleEntry[] {
  return [
    {
      type: 'required',
      config: { enabled: true, severity: 'error' as const, fields },
    },
    {
      type: 'format',
      config: {
        enabled: true,
        severity: 'error' as const,
        fields,
        formatType: 'archive_standard' as const, // 档案标准格式
      },
    },
    {
      type: 'range',
      config: {
        enabled: true,
        severity: 'warning' as const,
        fields,
        rangeType: 'archive_enum' as const, // 档案枚举校验
      },
    },
  ];
}

/**
 * 严格模式 - "进馆级审查"
 * 适用场景：档案正式进馆前的终审，要求零缺陷
 * 检查项：
 * - 标准模式全部
 * - 档号格式（全宗号-目录号-案卷号-件号）
 * - 责任者格式（不能包含数字/特殊字符）
 * - 日期合理性（不能晚于当前日期，不能早于1949年）
 * - 档号唯一性
 * - 页数范围（1-9999）
 * 严重程度：全部为错误
 */
function buildStrictPreset(fields: string[]): PresetRuleEntry[] {
  return [
    {
      type: 'required',
      config: { enabled: true, severity: 'error' as const, fields },
    },
    {
      type: 'format',
      config: {
        enabled: true,
        severity: 'error' as const,
        fields,
        formatType: 'archive_strict' as const, // 档案严格格式
      },
    },
    {
      type: 'range',
      config: {
        enabled: true,
        severity: 'error' as const,
        fields,
        rangeType: 'archive_strict' as const, // 档案严格校验
      },
    },
  ];
}

const PRESET_BUILDERS: Record<PresetName, (fields: string[]) => PresetRuleEntry[]> = {
  standard: buildStandardPreset,
  strict: buildStrictPreset,
  loose: buildLoosePreset,
};

// ── ValidationEngine ───────────────────────────────────

/**
 * 校验引擎
 *
 * 协调文件解析与规则执行，生成最终校验报告。
 * 支持动态添加/删除规则，以及通过预设快速配置。
 */
export class ValidationEngine {
  /** 当前激活的规则配置 */
  private ruleConfigs: Map<string, RuleConfig> = new Map();

  /** 中止标志：设置为 true 后 validate() 将在下次检查点抛出 CANCELLED */
  private _aborted = false;

  /**
   * 添加规则配置
   *
   * @param type - 规则类型标识
   * @param config - 规则配置
   */
  addRule(type: string, config: RuleConfig): void {
    // 验证规则是否存在
    const rule = getRule(type);
    if (!rule) {
      throw new Error(
        `Unknown rule type: "${type}". Available: ${getAllRules()
          .map((r) => r.type)
          .join(', ')}`,
      );
    }
    this.ruleConfigs.set(type, config);
  }

  /**
   * 移除规则配置
   *
   * @param type - 规则类型标识
   */
  removeRule(type: string): void {
    this.ruleConfigs.delete(type);
  }

  /**
   * 中止正在执行的校验任务
   */
  abort(): void {
    this._aborted = true;
  }

  /**
   * 获取当前所有激活的规则配置
   *
   * @returns 规则类型到配置的映射
   */
  getActiveRules(): Map<string, RuleConfig> {
    return new Map(this.ruleConfigs);
  }

  /**
   * 加载预设规则
   *
   * @param preset - 预设名称：'standard' | 'strict' | 'loose'
   * @param fields - 需要校验的字段列表
   */
  loadPreset(preset: PresetName, fields: string[]): void {
    const builder = PRESET_BUILDERS[preset];
    if (!builder) {
      throw new Error(
        `Unknown preset: "${preset}". Available: ${Object.keys(PRESET_BUILDERS).join(', ')}`,
      );
    }

    this.ruleConfigs.clear();
    const entries = builder(fields);
    for (const entry of entries) {
      this.addRule(entry.type, entry.config as RuleConfig);
    }
  }

  /**
   * 执行校验
   *
   * @param filePath - 待校验文件路径
   * @param taskId - 任务 ID
   * @param onProgress - 进度回调（可选）
   * @returns 校验报告
   */
  async validate(
    filePath: string,
    taskId: string,
    onProgress?: ProgressCallback,
  ): Promise<ValidationReport> {
    const startTime = Date.now();
    const fileName = path.basename(filePath);

    const emitProgress = (
      current: number,
      status: ProgressStatus,
      message: string,
    ): void => {
      if (onProgress) {
        onProgress({
          current,
          total: 100,
          percent: current,
          status,
          message,
        });
      }
    };

    // ── 阶段 1: 解析文件（0-10%） ───────────────────

    emitProgress(0, 'parsing', '开始解析文件...');

    let parseResult: ParseResult;
    try {
      parseResult = await parseFile(filePath);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      emitProgress(0, 'error', `文件解析失败: ${message}`);
      throw err;
    }

    emitProgress(5, 'parsing', `解析完成：${parseResult.totalRows} 行数据，${parseResult.headers.length} 列`);
    emitProgress(10, 'validating', '开始校验...');

    // ── 阶段 2: 逐规则执行（10-90%） ────────────────

    const { headers, rows } = parseResult;
    const allErrors: ValidationError[] = [];
    const ruleResults: RuleResult[] = [];

    const ruleTypes = Array.from(this.ruleConfigs.keys());
    const rulesCount = ruleTypes.length;

    if (rulesCount === 0) {
      emitProgress(90, 'reporting', '无激活规则，跳过校验');
    } else {
      const progressPerRule = 80 / rulesCount; // 10→90 共 80%

      for (let idx = 0; idx < ruleTypes.length; idx++) {
        // 检查中止标志
        if (this._aborted) {
          throw new Error('CANCELLED');
        }

        const type = ruleTypes[idx];
        const config = this.ruleConfigs.get(type)!;

        if (!config.enabled) continue;

        const rule = getRule(type);
        if (!rule) continue;

        const baseProgress = 10 + idx * progressPerRule;
        emitProgress(
          Math.round(baseProgress),
          'validating',
          `执行规则: ${rule.name} (${type})`,
        );

        const errors = rule.validate(headers, rows, config);
        allErrors.push(...errors);

        const errorCount = errors.filter((e) => e.severity === 'error').length;
        const warningCount = errors.filter((e) => e.severity === 'warning').length;

        ruleResults.push({
          ruleType: type,
          ruleName: rule.name,
          errorCount,
          warningCount,
        });

        emitProgress(
          Math.round(baseProgress + progressPerRule),
          'validating',
          `${rule.name} 完成：${errors.length} 个问题`,
        );
      }
    }

    // ── 阶段 3: 生成报告（90-100%） ─────────────────

    emitProgress(90, 'reporting', '生成校验报告...');

    // 按行号排序
    allErrors.sort((a, b) => a.rowNumber - b.rowNumber);

    const totalErrors = allErrors.filter((e) => e.severity === 'error').length;
    const totalWarnings = allErrors.filter((e) => e.severity === 'warning').length;

    emitProgress(95, 'reporting', `统计完成：${totalErrors} 错误, ${totalWarnings} 警告`);

    const duration = Date.now() - startTime;
    
    // 计算报告等级
    const { grade, gradeLabel } = this.calculateGrade(totalErrors, totalWarnings);
    
    const report: ValidationReport = {
      taskId,
      fileName,
      fileType: parseResult.fileType,
      totalRows: parseResult.totalRows,
      totalErrors,
      totalWarnings,
      ruleResults,
      errors: allErrors,
      duration,
      completedAt: new Date().toISOString(),
      grade,
      gradeLabel,
    };

    emitProgress(100, 'done', `校验完成，耗时 ${duration}ms`);

    return report;
  }

  /**
   * 计算报告等级
   * - pass: 0 错误，0 警告 → 可入库
   * - warning: 0 错误，有警告 → 需整改
   * - fail: 有错误 → 需返工
   */
  private calculateGrade(errors: number, warnings: number): { grade: ReportGrade; gradeLabel: string } {
    if (errors > 0) {
      return { grade: 'fail', gradeLabel: '需返工' };
    }
    if (warnings > 0) {
      return { grade: 'warning', gradeLabel: '需整改' };
    }
    return { grade: 'pass', gradeLabel: '可入库' };
  }
}
