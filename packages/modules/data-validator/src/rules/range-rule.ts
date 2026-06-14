import {
  BaseRule,
  type RuleConfig,
  type ValidationError,
} from './base-rule.js';

// ── Types ──────────────────────────────────────────────

type RangeType = 'number' | 'enum' | 'length' | 'archive_enum' | 'archive_strict';

// 档案业务枚举值
const ARCHIVE_ENUMS: Record<string, string[]> = {
  retention_period: ['永久', '30年', '10年', '三十年', '十年'],
  security_level: ['公开', '内部', '秘密', '机密', '绝密'],
  file_status: ['正常', '完整', '完整件', '破损', '缺页'],
  carrier_type: ['纸质', '光盘', '磁盘', '胶片', '照片', '电子'],
};

// 档案字段名映射
const ARCHIVE_FIELD_ENUM_MAP: Record<string, string> = {
  '保管期限': 'retention_period',
  '保管期': 'retention_period',
  'retention': 'retention_period',
  '密级': 'security_level',
  '保密等级': 'security_level',
  'security': 'security_level',
  '文件状态': 'file_status',
  '载体类型': 'carrier_type',
  '载体': 'carrier_type',
};

/**
 * 范围校验规则
 *
 * 支持多种 rangeType：
 * - 'number': 数字范围，检查 min-max
 * - 'enum':  枚举范围，检查 allowedValues 列表
 * - 'length': 长度范围，检查 minLength-maxLength
 * - 'archive_enum': 档案业务枚举校验（保管期限、密级等）
 * - 'archive_strict': 档案严格校验（枚举 + 页数范围 + 档号唯一性）
 */
export class RangeRule extends BaseRule {
  readonly name = '范围校验';
  readonly type = 'range';

  validate(
    headers: string[],
    rows: Record<string, unknown>[],
    config: RuleConfig,
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const fields = config.fields as string[] | undefined;
    const rangeType = config.rangeType as RangeType | undefined;

    if (!fields || fields.length === 0) return errors;
    if (!rangeType) return errors;

    switch (rangeType) {
      case 'number':
        return this.validateNumber(headers, rows, fields, config, errors);
      case 'enum':
        return this.validateEnum(headers, rows, fields, config, errors);
      case 'length':
        return this.validateLength(headers, rows, fields, config, errors);
      case 'archive_enum':
        return this.validateArchiveEnum(headers, rows, fields, config, errors);
      case 'archive_strict':
        return this.validateArchiveStrict(headers, rows, fields, config, errors);
      default:
        return errors;
    }
  }

  // ── 数字范围校验 ──────────────────────────────────

  private validateNumber(
    headers: string[],
    rows: Record<string, unknown>[],
    fields: string[],
    config: RuleConfig,
    errors: ValidationError[],
  ): ValidationError[] {
    const min = config.min as number | undefined;
    const max = config.max as number | undefined;

    for (const field of fields) {
      if (!headers.includes(field)) continue;

      for (let i = 0; i < rows.length; i++) {
        const value = this.getFieldValue(rows[i], field);
        if (this.isFieldEmpty(value)) continue;

        const num = Number(value);
        if (isNaN(num)) {
          errors.push(
            this.error(
              i + 1,
              field,
              'not_a_number',
              `"${field}" 不是有效的数字`,
              value,
              config,
              `请为 "${field}" 输入一个有效的数字`,
            ),
          );
          continue;
        }

        if (min !== undefined && num < min) {
          errors.push(
            this.error(
              i + 1,
              field,
              'number_out_of_range',
              `"${field}" 的值 ${num} 小于最小值 ${min}`,
              value,
              config,
              `请确保 "${field}" ≥ ${min}`,
            ),
          );
        }

        if (max !== undefined && num > max) {
          errors.push(
            this.error(
              i + 1,
              field,
              'number_out_of_range',
              `"${field}" 的值 ${num} 大于最大值 ${max}`,
              value,
              config,
              `请确保 "${field}" ≤ ${max}`,
            ),
          );
        }
      }
    }

    return errors;
  }

  // ── 枚举校验 ──────────────────────────────────────

  private validateEnum(
    headers: string[],
    rows: Record<string, unknown>[],
    fields: string[],
    config: RuleConfig,
    errors: ValidationError[],
  ): ValidationError[] {
    const allowedValues = config.allowedValues as unknown[] | undefined;

    if (!allowedValues || allowedValues.length === 0) return errors;

    for (const field of fields) {
      if (!headers.includes(field)) continue;

      for (let i = 0; i < rows.length; i++) {
        const value = this.getFieldValue(rows[i], field);
        if (this.isFieldEmpty(value)) continue;

        if (!allowedValues.includes(value)) {
          errors.push(
            this.error(
              i + 1,
              field,
              'enum_out_of_range',
              `"${field}" 的值 "${String(value)}" 不在允许的范围内`,
              value,
              config,
              `允许的值：${allowedValues.join(', ')}`,
            ),
          );
        }
      }
    }

    return errors;
  }

  // ── 长度校验 ──────────────────────────────────────

  private validateLength(
    headers: string[],
    rows: Record<string, unknown>[],
    fields: string[],
    config: RuleConfig,
    errors: ValidationError[],
  ): ValidationError[] {
    const minLength = config.minLength as number | undefined;
    const maxLength = config.maxLength as number | undefined;

    for (const field of fields) {
      if (!headers.includes(field)) continue;

      for (let i = 0; i < rows.length; i++) {
        const value = this.getFieldValue(rows[i], field);
        if (this.isFieldEmpty(value)) continue;

        const len = String(value).length;

        if (minLength !== undefined && len < minLength) {
          errors.push(
            this.error(
              i + 1,
              field,
              'length_out_of_range',
              `"${field}" 的长度 ${len} 小于最小长度 ${minLength}`,
              value,
              config,
              `请确保 "${field}" 长度 ≥ ${minLength}`,
            ),
          );
        }

        if (maxLength !== undefined && len > maxLength) {
          errors.push(
            this.error(
              i + 1,
              field,
              'length_out_of_range',
              `"${field}" 的长度 ${len} 大于最大长度 ${maxLength}`,
              value,
              config,
              `请确保 "${field}" 长度 ≤ ${maxLength}`,
            ),
          );
        }
      }
    }

    return errors;
  }

  // ── 档案枚举校验 ──────────────────────────────────

  /**
   * 档案业务枚举校验
   * 根据字段名自动匹配对应的枚举值列表
   */
  private validateArchiveEnum(
    headers: string[],
    rows: Record<string, unknown>[],
    fields: string[],
    config: RuleConfig,
    errors: ValidationError[],
  ): ValidationError[] {
    for (const field of fields) {
      if (!headers.includes(field)) continue;

      // 根据字段名查找对应的枚举类型
      const enumType = this.getEnumTypeForField(field);
      if (!enumType) continue; // 不是已知的枚举字段，跳过

      const allowedValues = ARCHIVE_ENUMS[enumType];
      if (!allowedValues) continue;

      for (let i = 0; i < rows.length; i++) {
        const value = this.getFieldValue(rows[i], field);
        if (this.isFieldEmpty(value)) continue;

        const strValue = String(value).trim();
        if (!allowedValues.includes(strValue)) {
          errors.push(
            this.error(
              i + 1,
              field,
              'enum_out_of_range',
              `"${field}" 的值 "${strValue}" 不在允许的范围内`,
              value,
              config,
              `允许的值：${allowedValues.join('、')}`,
            ),
          );
        }
      }
    }

    return errors;
  }

  // ── 档案严格校验 ──────────────────────────────────

  /**
   * 档案严格校验
   * - 枚举字段：同 archive_enum
   * - 页数字段：1-9999
   * - 档号唯一性检查
   */
  private validateArchiveStrict(
    headers: string[],
    rows: Record<string, unknown>[],
    fields: string[],
    config: RuleConfig,
    errors: ValidationError[],
  ): ValidationError[] {
    // 先执行枚举校验
    this.validateArchiveEnum(headers, rows, fields, config, errors);

    // 页数字段范围校验
    const pageFields = fields.filter(f => this.isPageField(f));
    for (const field of pageFields) {
      if (!headers.includes(field)) continue;

      for (let i = 0; i < rows.length; i++) {
        const value = this.getFieldValue(rows[i], field);
        if (this.isFieldEmpty(value)) continue;

        const num = Number(value);
        if (isNaN(num) || num < 1 || num > 9999) {
          errors.push(
            this.error(
              i + 1,
              field,
              'pages_out_of_range',
              `"${field}" 的值 ${value} 不在有效范围内（1-9999）`,
              value,
              config,
              `页数应为 1-9999 之间的整数`,
            ),
          );
        }
      }
    }

    // 档号唯一性检查
    const codeFields = fields.filter(f => this.isArchiveCodeField(f));
    for (const field of codeFields) {
      if (!headers.includes(field)) continue;

      const seen = new Map<string, number>();
      for (let i = 0; i < rows.length; i++) {
        const value = this.getFieldValue(rows[i], field);
        if (this.isFieldEmpty(value)) continue;

        const strValue = String(value).trim();
        if (seen.has(strValue)) {
          errors.push(
            this.error(
              i + 1,
              field,
              'duplicate_archive_code',
              `"${field}" 档号 "${strValue}" 与第 ${seen.get(strValue)} 行重复`,
              value,
              config,
              `档号必须唯一`,
            ),
          );
        } else {
          seen.set(strValue, i + 1);
        }
      }
    }

    return errors;
  }

  // ── 辅助方法 ──────────────────────────────────────

  /**
   * 根据字段名获取对应的枚举类型
   */
  private getEnumTypeForField(fieldName: string): string | null {
    const lowerName = fieldName.toLowerCase();
    for (const [pattern, enumType] of Object.entries(ARCHIVE_FIELD_ENUM_MAP)) {
      if (lowerName.includes(pattern.toLowerCase())) {
        return enumType;
      }
    }
    return null;
  }

  /**
   * 判断是否为页数字段
   */
  private isPageField(fieldName: string): boolean {
    const patterns = ['页数', '张数', '份数', 'pages'];
    const lowerName = fieldName.toLowerCase();
    return patterns.some(p => lowerName.includes(p));
  }

  /**
   * 判断是否为档号字段
   */
  private isArchiveCodeField(fieldName: string): boolean {
    const patterns = ['档号', '案卷号', '档案号', 'archive_code', 'file_code'];
    const lowerName = fieldName.toLowerCase();
    return patterns.some(p => lowerName.includes(p));
  }
}
