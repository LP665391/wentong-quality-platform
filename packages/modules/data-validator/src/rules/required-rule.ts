import {
  BaseRule,
  type RuleConfig,
  type ValidationError,
} from './base-rule.js';

/**
 * 必填校验规则
 *
 * 检查 config.fields 中指定的每个字段是否有值。
 * 如果字段在 headers 中不存在，每行数据均报告 "列不存在"。
 */
export class RequiredRule extends BaseRule {
  readonly name = '必填校验';
  readonly type = 'required';

  validate(
    headers: string[],
    rows: Record<string, unknown>[],
    config: RuleConfig,
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const fields = config.fields as string[] | undefined;

    if (!fields || fields.length === 0) {
      return errors;
    }

    for (const field of fields) {
      // 检查列是否存在
      if (!headers.includes(field)) {
        for (let i = 0; i < rows.length; i++) {
          errors.push(
            this.error(
              i + 1,
              field,
              'column_not_found',
              `列 "${field}" 不存在于文件中`,
              undefined,
              config,
              `文件中的列：${headers.join(', ')}`,
            ),
          );
        }
        continue;
      }

      // 检查每一行的值是否为空
      for (let i = 0; i < rows.length; i++) {
        const value = this.getFieldValue(rows[i], field);
        if (this.isFieldEmpty(value)) {
          errors.push(
            this.error(
              i + 1,
              field,
              'required',
              `"${field}" 为必填字段，不能为空`,
              value,
              config,
              `请为第 ${i + 1} 行的 "${field}" 填入有效值`,
            ),
          );
        }
      }
    }

    return errors;
  }
}
