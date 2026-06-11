import { BaseRule } from './base-rule.js';
import { RequiredRule } from './required-rule.js';
import { FormatRule } from './format-rule.js';
import { RangeRule } from './range-rule.js';

// ── Rule Registry ──────────────────────────────────────

/** 规则注册表：type → BaseRule 实例 */
const ruleRegistry = new Map<string, BaseRule>();

/**
 * 注册规则到注册表
 *
 * @param rule - 规则实例
 */
export function registerRule(rule: BaseRule): void {
  ruleRegistry.set(rule.type, rule);
}

/**
 * 根据类型获取规则
 *
 * @param type - 规则类型标识
 * @returns 规则实例，未找到返回 undefined
 */
export function getRule(type: string): BaseRule | undefined {
  return ruleRegistry.get(type);
}

/**
 * 获取所有已注册的规则
 *
 * @returns 规则实例数组
 */
export function getAllRules(): BaseRule[] {
  return Array.from(ruleRegistry.values());
}

/**
 * 获取所有可用的规则类型列表
 *
 * @returns 规则类型字符串数组
 */
export function getAvailableRuleTypes(): string[] {
  return Array.from(ruleRegistry.keys());
}

// ── 预注册内置规则 ──────────────────────────────────────

registerRule(new RequiredRule());
registerRule(new FormatRule());
registerRule(new RangeRule());

// ── Re-exports ──────────────────────────────────────────

export { BaseRule, RequiredRule, FormatRule, RangeRule };
export type { ValidationError, RuleConfig, ErrorSeverity } from './base-rule.js';
