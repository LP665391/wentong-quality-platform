import {
  BaseRule,
  type RuleConfig,
  type ValidationError,
} from './base-rule.js';

// ── 内置格式模式 ──────────────────────────────────────

type FormatType = 'date' | 'datetime' | 'phone' | 'email' | 'number' | 'integer';

const PATTERNS: Record<FormatType, RegExp> = {
  date: /^\d{4}-\d{2}-\d{2}$/,
  datetime: /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/,
  phone: /^1[3-9]\d{9}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  number: /^-?\d+(\.\d+)?$/,
  integer: /^-?\d+$/,
};

const FORMAT_LABELS: Record<FormatType, string> = {
  date: 'YYYY-MM-DD',
  datetime: 'YYYY-MM-DD HH:mm:ss',
  phone: '手机号',
  email: '邮箱',
  number: '数字',
  integer: '整数',
};

/**
 * 格式校验规则
 *
 * 检查 config.fields 中每个字段是否符合 config.formatType 指定的格式。
 * 空值跳过（交由 required 规则处理）。
 */
export class FormatRule extends BaseRule {
  readonly name = '格式校验';
  readonly type = 'format';

  /** 暴露内置模式供外部使用 */
  static readonly patterns = PATTERNS;

  validate(
    headers: string[],
    rows: Record<string, unknown>[],
    config: RuleConfig,
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const fields = config.fields as string[] | undefined;
    const formatType = config.formatType as FormatType | undefined;

    if (!fields || fields.length === 0) return errors;
    if (!formatType) return errors;

    const pattern = PATTERNS[formatType];
    if (!pattern) {
      // 未知格式类型，每行每字段报错
      for (const field of fields) {
        for (let i = 0; i < rows.length; i++) {
          errors.push(
            this.error(
              i + 1,
              field,
              'unknown_format',
              `未知的格式类型：${String(formatType)}`,
              this.getFieldValue(rows[i], field),
              config,
              `支持的格式类型：${Object.keys(PATTERNS).join(', ')}`,
            ),
          );
        }
      }
      return errors;
    }

    const formatLabel = FORMAT_LABELS[formatType];

    for (const field of fields) {
      // 字段不存在则跳过
      if (!headers.includes(field)) continue;

      for (let i = 0; i < rows.length; i++) {
        const value = this.getFieldValue(rows[i], field);

        // 空值跳过，交给 required 规则处理
        if (this.isFieldEmpty(value)) continue;

        const strValue = String(value).trim();
        if (!pattern.test(strValue)) {
          errors.push(
            this.error(
              i + 1,
              field,
              'format_mismatch',
              `"${field}" 格式不正确，期望 ${formatLabel}`,
              value,
              config,
              `请确保 "${field}" 符合 ${formatLabel} 格式`,
            ),
          );
        }
      }
    }

    return errors;
  }
}
