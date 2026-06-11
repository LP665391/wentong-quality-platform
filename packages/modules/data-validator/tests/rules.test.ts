import { describe, it, expect } from 'vitest';
import {
  RequiredRule,
  FormatRule,
  RangeRule,
  type RuleConfig,
} from '../src/rules/index.js';

// ── Helper ────────────────────────────────────────────

function makeConfig(overrides: Partial<RuleConfig> = {}): RuleConfig {
  return {
    enabled: true,
    severity: 'error',
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────

describe('规则引擎 - Rules', () => {
  const headers = ['name', 'email', 'age', 'phone'];

  const rows = [
    { name: 'Alice', email: 'alice@test.com', age: '30', phone: '13800001111' },
    { name: '', email: 'bob', age: '150', phone: '' },  // row 2: name 空, email 格式错, age 超出, phone 空
    { name: 'Charlie', email: 'charlie@test.com', age: 'not-a-number', phone: '13800003333' },  // row 3: age NaN
  ];

  // ── 1. RequiredRule - 检测空值 ──────────────────────

  it('RequiredRule - 应正确检测空值字段', () => {
    const rule = new RequiredRule();
    const config = makeConfig({ fields: ['name', 'phone'] });

    const errors = rule.validate(headers, rows, config);

    // row 2: name 空, phone 空 → 2 errors
    // row 3: name 有值, phone 有值 → 0 errors
    expect(errors).toHaveLength(2);

    expect(errors[0]).toMatchObject({
      rowNumber: 2,
      fieldName: 'name',
      errorType: 'required',
    });
    expect(errors[1]).toMatchObject({
      rowNumber: 2,
      fieldName: 'phone',
      errorType: 'required',
    });
  });

  // ── 2. RequiredRule - 空文件 ────────────────────────

  it('RequiredRule - 空文件应无错误', () => {
    const rule = new RequiredRule();
    const config = makeConfig({ fields: ['name'] });

    const errors = rule.validate(['name'], [], config);
    expect(errors).toHaveLength(0);
  });

  it('RequiredRule - 列不存在时应报告', () => {
    const rule = new RequiredRule();
    const config = makeConfig({ fields: ['nonexistent'] });

    const errors = rule.validate(headers, rows, config);

    // 3 rows, each with column_not_found
    expect(errors).toHaveLength(3);
    expect(errors[0].errorType).toBe('column_not_found');
    expect(errors[0].fieldName).toBe('nonexistent');
  });

  // ── 3. FormatRule - email 检测 ──────────────────────

  it('FormatRule - 应正确检测不合法的 email', () => {
    const rule = new FormatRule();
    const config = makeConfig({
      fields: ['email'],
      formatType: 'email',
    });

    const errors = rule.validate(headers, rows, config);

    // row 2: 'bob' is not valid email → 1 error
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      rowNumber: 2,
      fieldName: 'email',
      errorType: 'format_mismatch',
    });
  });

  // ── 4. FormatRule - 跳过空值 ────────────────────────

  it('FormatRule - 应跳过空值字段', () => {
    const rule = new FormatRule();
    const config = makeConfig({
      fields: ['phone'],
      formatType: 'phone',
    });

    const errors = rule.validate(headers, rows, config);

    // row 2: phone is empty → skipped (交给 required)
    // row 1: '13800001111' valid
    // row 3: '13800003333' valid
    expect(errors).toHaveLength(0);
  });

  // ── 5. RangeRule - number 超出 ──────────────────────

  it('RangeRule - 应检测 number 超出范围', () => {
    const rule = new RangeRule();
    const config = makeConfig({
      fields: ['age'],
      rangeType: 'number',
      min: 0,
      max: 120,
    });

    const errors = rule.validate(headers, rows, config);

    // row 2: age=150 > 120 → 1 error
    // row 3: age='not-a-number' → NaN → 1 error
    expect(errors).toHaveLength(2);

    expect(errors[0]).toMatchObject({
      rowNumber: 2,
      fieldName: 'age',
      errorType: 'number_out_of_range',
    });
    expect(errors[1]).toMatchObject({
      rowNumber: 3,
      fieldName: 'age',
      errorType: 'not_a_number',
    });
  });

  // ── 6. RangeRule - enum 不在范围 ────────────────────

  it('RangeRule - 应检测 enum 值不在允许范围内', () => {
    const rule = new RangeRule();
    const config = makeConfig({
      fields: ['name'],
      rangeType: 'enum',
      allowedValues: ['Alice', 'Bob'],
    });

    const errors = rule.validate(headers, rows, config);

    // row 2: name='' → empty, skipped
    // row 3: name='Charlie' → not in allowed → 1 error
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      rowNumber: 3,
      fieldName: 'name',
      errorType: 'enum_out_of_range',
    });
  });

  // ── 7. RangeRule - length 超出 ──────────────────────

  it('RangeRule - 应检测字符串长度超出范围', () => {
    const rule = new RangeRule();
    const config = makeConfig({
      fields: ['name'],
      rangeType: 'length',
      minLength: 3,
      maxLength: 5,
    });

    const errors = rule.validate(headers, rows, config);

    // row 1: Alice=5 → ok (inclusive)
    // row 2: '' → empty, skipped
    // row 3: Charlie=7 → > 5 → 1 error
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      rowNumber: 3,
      fieldName: 'name',
      errorType: 'length_out_of_range',
    });
  });
});
