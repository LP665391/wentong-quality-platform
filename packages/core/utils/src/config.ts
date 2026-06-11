import fs from 'node:fs';
import path from 'node:path';
import { getPlatformInfo } from './platform.js';

/**
 * 应用配置接口
 */
export interface AppConfig {
  /** 界面语言 */
  language: string;
  /** 界面主题 */
  theme: 'light' | 'dark';
  /** 默认输出目录 */
  defaultOutputDir: string;
  /** 最大并发任务数 */
  maxConcurrentTasks: number;
  /** 日志级别 */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  /** 是否自动检查更新 */
  autoCheckUpdate: boolean;
  /** 最近打开的文件列表 */
  recentFiles: string[];
  /** 最大最近文件数量 */
  maxRecentFiles: number;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: AppConfig = {
  language: 'zh-CN',
  theme: 'light',
  defaultOutputDir: '',
  maxConcurrentTasks: 4,
  logLevel: 'info',
  autoCheckUpdate: true,
  recentFiles: [],
  maxRecentFiles: 10,
};

/**
 * 配置文件路径
 */
function getConfigPath(): string {
  const dataDir = getPlatformInfo().dataDir;
  return path.join(dataDir, 'config.json');
}

/**
 * 配置管理器类
 * 负责配置的读写与持久化
 */
export class ConfigManager {
  private config: AppConfig;
  private configPath: string;

  constructor() {
    this.configPath = getConfigPath();
    this.config = this.load();
  }

  /**
   * 从文件加载配置，如果文件不存在则使用默认配置
   */
  private load(): AppConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<AppConfig>;
        return { ...DEFAULT_CONFIG, ...parsed };
      }
    } catch {
      // 文件损坏或无法解析时使用默认配置
    }
    return { ...DEFAULT_CONFIG };
  }

  /**
   * 将配置持久化到文件
   */
  private save(): void {
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
  }

  /**
   * 获取单个配置项
   */
  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  /**
   * 设置单个配置项并持久化
   */
  set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
    this.config[key] = value;
    this.save();
  }

  /**
   * 获取完整配置对象（只读副本）
   */
  getAll(): Readonly<AppConfig> {
    return { ...this.config };
  }

  /**
   * 重置为默认配置
   */
  reset(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.save();
  }

  /**
   * 添加最近打开的文件（自动去重，保持最大数量限制）
   */
  addRecentFile(filePath: string): void {
    // 移除已存在的相同路径
    const filtered = this.config.recentFiles.filter(f => f !== filePath);
    // 添加到开头
    filtered.unshift(filePath);
    // 限制最大数量
    if (filtered.length > this.config.maxRecentFiles) {
      filtered.length = this.config.maxRecentFiles;
    }
    this.config.recentFiles = filtered;
    this.save();
  }
}

/**
 * 默认 ConfigManager 单例
 */
export const configManager = new ConfigManager();
