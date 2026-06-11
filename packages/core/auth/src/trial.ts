/**
 * 试用管理模块
 *
 * 管理 30 天免费试用期。
 * - 首次运行记录试用开始时间
 * - 每次检查计算剩余天数
 * - 30 天到期后显示已过期
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------

/** 试用时长（天数） */
const TRIAL_DURATION_DAYS = 30;

/** 试用信息存储路径 */
function getTrialFilePath(): string {
  const dataDir = path.join(os.homedir(), '.wentong-quality');
  return path.join(dataDir, 'trial.json');
}

// ---------------------------------------------------------------------------
// 接口
// ---------------------------------------------------------------------------

/**
 * 试用信息
 */
export interface TrialInfo {
  /** 是否为试用模式 */
  isTrial: boolean;
  /** 试用开始日期 (YYYY-MM-DD) */
  startDate: string;
  /** 试用结束日期 (YYYY-MM-DD) */
  endDate: string;
  /** 剩余天数 */
  remainingDays: number;
  /** 是否已过期 */
  expired: boolean;
}

// ---------------------------------------------------------------------------
// 内部数据
// ---------------------------------------------------------------------------

interface TrialData {
  startDate: string; // ISO 日期字符串 YYYY-MM-DD
}

// ---------------------------------------------------------------------------
// 功能函数
// ---------------------------------------------------------------------------

/**
 * 读取试用数据文件
 */
function readTrialData(): TrialData | null {
  try {
    const filePath = getTrialFilePath();
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as TrialData;
  } catch {
    return null;
  }
}

/**
 * 写入试用数据文件
 */
function writeTrialData(data: TrialData): void {
  const filePath = getTrialFilePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * 获取试用信息
 *
 * @returns 试用状态信息
 */
export function getTrialInfo(): TrialInfo {
  const data = readTrialData();

  if (!data) {
    return {
      isTrial: false,
      startDate: '',
      endDate: '',
      remainingDays: 0,
      expired: false,
    };
  }

  const startDate = new Date(data.startDate);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + TRIAL_DURATION_DAYS);

  const now = new Date();
  const remainingMs = endDate.getTime() - now.getTime();
  const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
  const expired = remainingDays <= 0;

  return {
    isTrial: true,
    startDate: data.startDate,
    endDate: endDate.toISOString().split('T')[0],
    remainingDays,
    expired,
  };
}

/**
 * 开始试用（或获取当前试用状态）
 *
 * 如果尚未开始试用，则记录当前日期为试用开始日期。
 * 如果已经开始了试用，直接返回当前试用信息。
 *
 * @returns 试用信息
 */
export function startTrial(): TrialInfo {
  const existing = getTrialInfo();

  // 如果已经在试用中，直接返回
  if (existing.isTrial) {
    return existing;
  }

  // 开始新的试用
  const today = new Date().toISOString().split('T')[0];
  writeTrialData({ startDate: today });

  return getTrialInfo();
}
