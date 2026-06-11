import {
  BaseRule,
  type RuleConfig,
  type ValidationError,
} from './base-rule.js';

// ── Types ──────────────────────────────────────────────

type RangeType = 'number' | 'enum' | 'length';

/**
 * 范围校验规则
 *
 * 支持 3 种 rangeType：
 * - 'number': 数字范围，检查 min-max
 * - 'enum':  枚举范围，检查 allowedValues 列表
 * - 'length': 长度范围，检查 minLength-maxLength
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

        // 空值跳过
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

        // 不传 min/max 则不检查对应边界
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

        // 空值跳过
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

        // 空值跳过
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
}
