// ── Types ──────────────────────────────────────────────

/** 错误严重程度 */
export type ErrorSeverity = 'error' | 'warning';

/** 单条校验错误 */
export interface ValidationError {
  /** 行号（从 1 开始，对应数据行在 rows 数组中的索引 + 1） */
  rowNumber: number;
  /** 字段名 */
  fieldName: string;
  /** 错误类型标识 */
  errorType: string;
  /** 错误描述 */
  description: string;
  /** 修复建议（可选） */
  suggestion?: string;
  /** 严重程度 */
  severity: ErrorSeverity;
  /** 实际值 */
  value: unknown;
}

/** 规则配置 */
export interface RuleConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 默认严重程度 */
  severity: ErrorSeverity;
  /** 扩展配置 */
  [key: string]: unknown;
}

// ── Base 抽象类 ───────────────────────────────────────

/**
 * 校验规则基类
 *
 * 所有自定义规则需继承此类并实现抽象方法。
 * 提供了 error() 工厂方法、getFieldValue()、isFieldEmpty() 等辅助方法。
 */
export abstract class BaseRule {
  /** 规则名称（用于展示） */
  abstract readonly name: string;

  /** 规则类型标识（用于注册和查找） */
  abstract readonly type: string;

  /**
   * 执行校验
   *
   * @param headers - 表头列表
   * @param rows - 数据行
   * @param config - 规则配置
   * @returns 校验错误列表
   */
  abstract validate(
    headers: string[],
    rows: Record<string, unknown>[],
    config: RuleConfig,
  ): ValidationError[];

  /**
   * 创建校验错误的工厂方法
   */
  protected error(
    rowNumber: number,
    fieldName: string,
    errorType: string,
    description: string,
    value: unknown,
    config: RuleConfig,
    suggestion?: string,
  ): ValidationError {
    return {
      rowNumber,
      fieldName,
      errorType,
      description,
      value,
      severity: config.severity,
      ...(suggestion ? { suggestion } : {}),
    };
  }

  /**
   * 从行数据中获取指定字段的值
   */
  protected getFieldValue(
    row: Record<string, unknown>,
    fieldName: string,
  ): unknown {
    return row[fieldName];
  }

  /**
   * 判断字段值是否为空
   */
  protected isFieldEmpty(value: unknown): boolean {
    return (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    );
  }
}
