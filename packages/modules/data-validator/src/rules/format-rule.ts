import {
  BaseRule,
  type RuleConfig,
  type ValidationError,
} from './base-rule.js';

// ── 内置格式模式 ──────────────────────────────────────

type FormatType = 'date' | 'datetime' | 'phone' | 'email' | 'number' | 'integer' | 'archive_standard' | 'archive_strict';

const PATTERNS: Record<string, RegExp> = {
  date: /^\d{4}-\d{2}-\d{2}$/,
  datetime: /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/,
  phone: /^1[3-9]\d{9}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  number: /^-?\d+(\.\d+)?$/,
  integer: /^-?\d+$/,
  // 档案日期格式：YYYYMMDD 或 YYYY-MM-DD 或 YYYY.MM.DD
  archive_date: /^(\d{4}[-.]?\d{2}[-.]?\d{2})$/,
  // 档号格式：全宗号-目录号-案卷号-件号（允许变体）
  archive_code: /^[A-Za-z0-9]+[-\/][A-Za-z0-9]+[-\/][A-Za-z0-9]+([-\/][A-Za-z0-9]+)?$/,
  // 责任者：不能包含数字和特殊字符（允许中文、字母）
  responsible_person: /^[\u4e00-\u9fa5a-zA-Z·]+$/,
};

const FORMAT_LABELS: Record<string, string> = {
  date: 'YYYY-MM-DD',
  datetime: 'YYYY-MM-DD HH:mm:ss',
  phone: '手机号',
  email: '邮箱',
  number: '数字',
  integer: '整数',
  archive_standard: '档案标准格式',
  archive_strict: '档案严格格式',
};

// 档案字段名映射（用于智能识别字段类型）
const ARCHIVE_FIELD_PATTERNS: Record<string, string[]> = {
  date: ['日期', '时间', 'date', 'time', '成文日期', '归档日期'],
  archive_code: ['档号', '案卷号', '文号', '档案号', 'archive_code', 'file_code'],
  responsible_person: ['责任者', '作者', '拟稿人', '责任人', 'author', 'responsible'],
  retention_period: ['保管期限', '保管期', 'retention'],
  security_level: ['密级', '保密等级', 'security'],
  pages: ['页数', '张数', '份数', 'pages'],
};

/**
 * 格式校验规则
 *
 * 检查 config.fields 中每个字段是否符合 config.formatType 指定的格式。
 * 空值跳过（交由 required 规则处理）。
 * 
 * 支持档案业务格式：
 * - archive_standard: 日期格式校验
 * - archive_strict: 日期合理性 + 档号正则 + 责任者格式
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

    // 档案标准模式：按字段名智能匹配校验规则
    if (formatType === 'archive_standard') {
      return this.validateArchiveStandard(headers, rows, fields, config, errors);
    }

    // 档案严格模式：更严格的校验
    if (formatType === 'archive_strict') {
      return this.validateArchiveStrict(headers, rows, fields, config, errors);
    }

    // 通用格式校验
    const pattern = PATTERNS[formatType];
    if (!pattern) {
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
      if (!headers.includes(field)) continue;

      for (let i = 0; i < rows.length; i++) {
        const value = this.getFieldValue(rows[i], field);
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

  /**
   * 档案标准模式校验
   * - 日期字段：YYYYMMDD 或 YYYY-MM-DD 或 YYYY.MM.DD
   * - 其他字段：跳过格式检查
   */
  private validateArchiveStandard(
    headers: string[],
    rows: Record<string, unknown>[],
    fields: string[],
    config: RuleConfig,
    errors: ValidationError[],
  ): ValidationError[] {
    for (const field of fields) {
      if (!headers.includes(field)) continue;

      // 判断字段类型
      const fieldType = this.detectFieldType(field);

      for (let i = 0; i < rows.length; i++) {
        const value = this.getFieldValue(rows[i], field);
        if (this.isFieldEmpty(value)) continue;

        const strValue = String(value).trim();

        // 日期字段校验
        if (fieldType === 'date') {
          if (!PATTERNS.archive_date.test(strValue)) {
            errors.push(
              this.error(
                i + 1,
                field,
                'format_mismatch',
                `"${field}" 日期格式不正确，期望 YYYY-MM-DD 或 YYYYMMDD`,
                value,
                config,
                `请使用标准日期格式，如 2024-01-15 或 20240115`,
              ),
            );
          }
        }
        // 其他字段在标准模式下不做格式检查
      }
    }

    return errors;
  }

  /**
   * 档案严格模式校验
   * - 日期字段：格式 + 合理性（不晚于今天，不早于1949年）
   * - 档号字段：正则校验
   * - 责任者字段：不能包含数字和特殊字符
   */
  private validateArchiveStrict(
    headers: string[],
    rows: Record<string, unknown>[],
    fields: string[],
    config: RuleConfig,
    errors: ValidationError[],
  ): ValidationError[] {
    const today = new Date();
    const minDate = new Date('1949-10-01'); // 建国日期

    for (const field of fields) {
      if (!headers.includes(field)) continue;

      const fieldType = this.detectFieldType(field);

      for (let i = 0; i < rows.length; i++) {
        const value = this.getFieldValue(rows[i], field);
        if (this.isFieldEmpty(value)) continue;

        const strValue = String(value).trim();

        // 日期字段：格式 + 合理性
        if (fieldType === 'date') {
          if (!PATTERNS.archive_date.test(strValue)) {
            errors.push(
              this.error(
                i + 1,
                field,
                'format_mismatch',
                `"${field}" 日期格式不正确`,
                value,
                config,
                `请使用标准日期格式`,
              ),
            );
          } else {
            // 检查日期合理性
            const normalizedDate = strValue.replace(/[-.]/g, '');
            const year = parseInt(normalizedDate.substring(0, 4));
            const month = parseInt(normalizedDate.substring(4, 6));
            const day = parseInt(normalizedDate.substring(6, 8));
            const dateObj = new Date(year, month - 1, day);

            if (dateObj > today) {
              errors.push(
                this.error(
                  i + 1,
                  field,
                  'date_future',
                  `"${field}" 日期不能晚于当前日期`,
                  value,
                  config,
                  `请检查日期是否正确`,
                ),
              );
            } else if (dateObj < minDate) {
              errors.push(
                this.error(
                  i + 1,
                  field,
                  'date_too_old',
                  `"${field}" 日期不能早于1949年10月1日`,
                  value,
                  config,
                  `请检查日期是否正确`,
                ),
              );
            }
          }
        }

        // 档号字段：正则校验
        if (fieldType === 'archive_code') {
          if (!PATTERNS.archive_code.test(strValue)) {
            errors.push(
              this.error(
                i + 1,
                field,
                'archive_code_invalid',
                `"${field}" 档号格式不正确，应为 全宗号-目录号-案卷号-件号`,
                value,
                config,
                `档号示例：001-1-001-001`,
              ),
            );
          }
        }

        // 责任者字段：不能包含数字和特殊字符
        if (fieldType === 'responsible_person') {
          if (!PATTERNS.responsible_person.test(strValue)) {
            errors.push(
              this.error(
                i + 1,
                field,
                'responsible_person_invalid',
                `"${field}" 责任者格式不正确，不应包含数字或特殊字符`,
                value,
                config,
                `责任者应为姓名或单位名称`,
              ),
            );
          }
        }
      }
    }

    return errors;
  }

  /**
   * 根据字段名智能识别字段类型
   */
  private detectFieldType(fieldName: string): string {
    const lowerName = fieldName.toLowerCase();
    
    for (const [type, patterns] of Object.entries(ARCHIVE_FIELD_PATTERNS)) {
      for (const pattern of patterns) {
        if (lowerName.includes(pattern.toLowerCase())) {
          return type;
        }
      }
    }
    
    return 'unknown';
  }
}
