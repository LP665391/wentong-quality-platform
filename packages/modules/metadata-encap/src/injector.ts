/**
 * 元数据注入器
 *
 * 将自定义属性写入 JSON sidecar 文件（.meta.json），实现元数据封装。
 * 不对原始文件做任何修改。
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ---------------------------------------------------------------------------
// injectMetadata
// ---------------------------------------------------------------------------

/**
 * 将自定义元数据属性写入 JSON sidecar 文件
 *
 * 生成与源文件同目录的 .meta.json 文件，包含：
 * - sourceFile：源文件名
 * - injectedAt：注入时间
 * - properties：自定义属性
 *
 * 如果 sidecar 已存在，会将新属性合并（覆盖同名字段）。
 *
 * @param filePath   - 源文件路径
 * @param properties - 自定义属性键值对
 * @param outputPath - sidecar 输出路径（可选，默认与源文件同目录）
 */
export async function injectMetadata(
  filePath: string,
  properties: Record<string, string>,
  outputPath?: string,
): Promise<void> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }

  const sourceDir = path.dirname(filePath);
  const sourceName = path.basename(filePath);

  // 确定 sidecar 路径
  const sidecarPath =
    outputPath ??
    path.join(sourceDir, `${sourceName}.meta.json`);

  // 如果已存在 sidecar，先读取合并
  let existing: Record<string, string> = {};
  if (fs.existsSync(sidecarPath)) {
    try {
      const raw = fs.readFileSync(sidecarPath, 'utf-8');
      const parsed = JSON.parse(raw);
      existing = parsed.properties ?? {};
    } catch {
      // 文件损坏，重新开始
    }
  }

  // 合并属性（新值覆盖旧值）
  const merged = { ...existing, ...properties };

  const sidecar = {
    sourceFile: sourceName,
    sourcePath: filePath,
    injectedAt: new Date().toISOString(),
    properties: merged,
  };

  fs.writeFileSync(sidecarPath, JSON.stringify(sidecar, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// readSidecar
// ---------------------------------------------------------------------------

/**
 * 读取已存在的 sidecar 文件
 *
 * @param filePath - 源文件路径
 * @returns sidecar 数据，不存在返回 null
 */
export function readSidecar(filePath: string): {
  sourceFile: string;
  sourcePath: string;
  injectedAt: string;
  properties: Record<string, string>;
} | null {
  const sidecarPath = path.join(
    path.dirname(filePath),
    `${path.basename(filePath)}.meta.json`,
  );

  if (!fs.existsSync(sidecarPath)) return null;

  try {
    const raw = fs.readFileSync(sidecarPath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
