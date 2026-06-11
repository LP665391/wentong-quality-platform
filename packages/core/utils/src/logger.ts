import fs from 'node:fs';
import path from 'node:path';
import { getPlatformInfo } from './platform.js';

/**
 * 日志级别
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Logger 配置选项
 */
export interface LoggerOptions {
  /** 最小输出级别，低于此级别的日志将被忽略 */
  level: LogLevel;
  /** 是否启用文件日志 */
  enableFile: boolean;
  /** 日志目录，默认 ~/.wentong-quality/logs */
  logDir?: string;
}

/**
 * 默认日志选项
 */
const DEFAULT_OPTIONS: LoggerOptions = {
  level: 'debug',
  enableFile: true,
};

/**
 * 日志记录器类
 * 同时输出到控制台和文件
 */
export class Logger {
  private options: LoggerOptions;
  private logFilePath: string;
  private stream: fs.WriteStream | null = null;

  constructor(options: Partial<LoggerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    const dataDir = getPlatformInfo().dataDir;
    const logDir = this.options.logDir ?? path.join(dataDir, 'logs');
    this.logFilePath = path.join(logDir, 'app.log');

    if (this.options.enableFile) {
      this.ensureLogDir(logDir);
      this.stream = fs.createWriteStream(this.logFilePath, { flags: 'a' });
    }
  }

  /**
   * 确保日志目录存在
   */
  private ensureLogDir(logDir: string): void {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * 检查日志级别是否应该输出
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_VALUES[level] >= LOG_LEVEL_VALUES[this.options.level];
  }

  /**
   * 格式化时间戳
   */
  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * 格式化日志消息
   */
  private formatMessage(level: LogLevel, message: string, ...args: unknown[]): string {
    const timestamp = this.formatTimestamp();
    const argsStr = args.length > 0 ? ' ' + args.map(a => {
      if (a instanceof Error) {
        return a.stack ?? a.message;
      }
      if (typeof a === 'object') {
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      }
      return String(a);
    }).join(' ') : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${argsStr}`;
  }

  /**
   * 输出日志到控制台
   */
  private writeConsole(level: LogLevel, formatted: string): void {
    switch (level) {
      case 'error':
        console.error(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'debug':
        console.debug(formatted);
        break;
      default:
        console.log(formatted);
    }
  }

  /**
   * 输出日志到文件
   */
  private writeFile(formatted: string): void {
    if (this.stream) {
      this.stream.write(formatted + '\n');
    }
  }

  /**
   * 核心日志方法
   */
  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (!this.shouldLog(level)) return;

    const formatted = this.formatMessage(level, message, ...args);
    this.writeConsole(level, formatted);
    this.writeFile(formatted);
  }

  debug(message: string, ...args: unknown[]): void {
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log('error', message, ...args);
  }

  /**
   * 关闭日志文件流
   */
  close(): void {
    if (this.stream) {
      this.stream.end();
      this.stream = null;
    }
  }
}

/**
 * 默认 Logger 单例
 */
export const logger = new Logger({ level: 'debug', enableFile: true });

/**
 * 创建 Logger 实例的工厂函数
 */
export function createLogger(options: Partial<LoggerOptions> = {}): Logger {
  return new Logger(options);
}
