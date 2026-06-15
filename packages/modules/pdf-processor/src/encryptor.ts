import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface EncryptOptions {
  /** 用户密码（打开文档时需要） */
  userPassword: string;
  /** 所有者密码（修改权限时需要），默认同 userPassword */
  ownerPassword?: string;
  /** 是否允许打印 */
  canPrint?: boolean;
  /** 是否允许修改 */
  canModify?: boolean;
  /** 是否允许复制 */
  canCopy?: boolean;
}

/**
 * PDF 加密/解密器
 *
 * 使用 AES-256-GCM 对 PDF 内容进行加密，并生成一个有效的 PDF 包装文件。
 * 加密数据追加在 PDF 文件尾部（%%EOF 标记之后），标准 PDF 阅读器忽略尾部数据，
 * 因此可以正常打开看到加密提示，而本应用可提取尾部加密数据进行解密。
 *
 * 文件结构：
 *   [PDF 包装（含加密提示页）] + "%%EOF\n" + [WTENC标记 + 加密数据]
 */
export class PdfEncryptor {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly MAGIC = Buffer.from('WTENC'); // 文通加密标识
  private static readonly IV_LENGTH = 12; // GCM 推荐 IV 长度
  private static readonly AUTH_TAG_LENGTH = 16; // GCM 认证标签长度
  private static readonly TAIL_MARKER = Buffer.from('\n%%WTENC_DATA_START%%\n');

  /**
   * 加密 PDF 文件
   * 输出为一个有效的 PDF 包装文件，加密数据追加在尾部
   *
   * @param filePath - 源 PDF 文件路径
   * @param outputPath - 加密后输出路径
   * @param options - 加密选项（密码和权限）
   */
  async encrypt(
    filePath: string,
    outputPath: string,
    options: EncryptOptions,
  ): Promise<void> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }

    if (!options.userPassword || options.userPassword.length === 0) {
      throw new Error('用户密码不能为空');
    }

    const fileBytes = fs.readFileSync(filePath);

    // 生成随机 16 字节盐
    const salt = crypto.randomBytes(16);

    // 使用 PBKDF2 从密码派生 32 字节密钥（100,000 次迭代防暴力破解）
    const key = crypto.pbkdf2Sync(options.userPassword, salt, 100000, 32, 'sha256');

    // 生成随机 IV（GCM 推荐 12 字节）
    const iv = crypto.randomBytes(PdfEncryptor.IV_LENGTH);

    // AES-256-GCM 加密（自带认证标签防篡改）
    const cipher = crypto.createCipheriv(PdfEncryptor.ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(fileBytes), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // 权限配置
    const permsJson = JSON.stringify({
      canPrint: options.canPrint ?? false,
      canModify: options.canModify ?? false,
      canCopy: options.canCopy ?? false,
      ownerPassword: options.ownerPassword ?? options.userPassword,
    });
    const permsBuffer = Buffer.from(permsJson, 'utf-8');
    const permsLengthBuffer = Buffer.alloc(4);
    permsLengthBuffer.writeUInt32BE(permsBuffer.length, 0);

    // 构建加密数据块：
    // MAGIC(5) + salt(16) + IV(12) + authTag(16) + encryptedData + permsJson + permsLength(4)
    const encryptedBlock = Buffer.concat([
      PdfEncryptor.MAGIC,
      salt,
      iv,
      authTag,
      encrypted,
      permsBuffer,
      permsLengthBuffer,
    ]);

    // 创建包装 PDF（含加密提示页）
    const doc = await PDFDocument.create();

    // 注册 fontkit，支持中文
    try {
      const fontkit = require('fontkit');
      (doc as any).registerFontkit(fontkit);
    } catch {}

    // 使用系统中文 TTF 字体
    let font;
    const cjkFontPaths = [
      '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
      '/Library/Fonts/Arial Unicode.ttf',
    ];
    let cjkFontFound = false;
    for (const fp of cjkFontPaths) {
      try {
        if (fs.existsSync(fp)) {
          font = await doc.embedFont(fs.readFileSync(fp));
          cjkFontFound = true;
          break;
        }
      } catch {}
    }
    if (!cjkFontFound) {
      font = await doc.embedFont(StandardFonts.Helvetica);
    }

    const page = doc.addPage([595, 842]); // A4

    // 标题
    page.drawText('本文件已被加密保护', {
      x: 80, y: 640, size: 24, font,
      color: rgb(0.15, 0.15, 0.15),
    });

    // 文件名
    page.drawText(`文件 "${path.basename(filePath)}" 已被 AES-256 加密`, {
      x: 80, y: 590, size: 14, font,
      color: rgb(0.35, 0.35, 0.35),
    });

    // 操作提示
    page.drawText('请在 Ai 质检系统 中使用「解密」功能输入密码后还原查看', {
      x: 80, y: 540, size: 14, font,
      color: rgb(0.4, 0.4, 0.4),
    });

    // 分隔线
    page.drawText('───', {
      x: 80, y: 480, size: 12, font,
      color: rgb(0.7, 0.7, 0.7),
    });

    // 公司信息
    page.drawText('连云港文安档案科技有限公司', {
      x: 80, y: 440, size: 12, font,
      color: rgb(0.5, 0.5, 0.5),
    });

    // 加密时间
    page.drawText(`加密时间: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`, {
      x: 80, y: 410, size: 11, font,
      color: rgb(0.55, 0.55, 0.55),
    });

    // 技术支持
    page.drawText('技术支持: 183 5281 1015', {
      x: 80, y: 380, size: 11, font,
      color: rgb(0.55, 0.55, 0.55),
    });

    // 保存包装 PDF
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const wrapperBytes = await doc.save();

    // 追加加密数据块到包装 PDF 尾部
    // PDF 阅读器只读取到 %%EOF，忽略之后的内容
    const finalBytes = Buffer.concat([
      wrapperBytes,
      PdfEncryptor.TAIL_MARKER,
      encryptedBlock,
    ]);

    fs.writeFileSync(outputPath, finalBytes);
  }

  /**
   * 解密 PDF 文件
   * 从文件尾部提取加密数据并解密还原
   *
   * @param filePath - 加密的 PDF 包装文件路径
   * @param password - 解密密码
   * @param outputPath - 解密后输出路径
   */
  async decrypt(
    filePath: string,
    password: string,
    outputPath: string,
  ): Promise<void> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }

    if (!password || password.length === 0) {
      throw new Error('解密密码不能为空');
    }

    const fileBytes = fs.readFileSync(filePath);

    // 尝试提取尾部加密数据（WTENC 格式）
    let encryptedBlock = this.extractTailData(fileBytes);

    // 如果尾部未找到，尝试旧版格式（整个文件就是加密数据）
    if (!encryptedBlock) {
      encryptedBlock = this.tryReadLegacyFormat(fileBytes);
    }

    if (!encryptedBlock) {
      throw new Error('文件不是有效的加密格式，或文件已损坏');
    }

    // 解析加密数据块
    const parsed = this.parseBlock(encryptedBlock);
    if (!parsed) {
      throw new Error('文件不是有效的加密格式，或密码不正确');
    }

    const { salt, iv, authTag, ciphertext } = parsed;

    // 使用 PBKDF2 从密码和盐派生密钥
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

    try {
      const decipher = crypto.createDecipheriv(PdfEncryptor.ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

      // 确保输出目录存在
      const outDir = path.dirname(outputPath);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      fs.writeFileSync(outputPath, decrypted);
    } catch {
      throw new Error('解密失败：密码错误或文件已损坏');
    }
  }

  /**
   * 从文件尾部提取加密数据
   * 查找 %%WTENC_DATA_START%% 标记，之后的内容即为加密数据块
   */
  private extractTailData(fileBytes: Buffer): Buffer | null {
    const marker = PdfEncryptor.TAIL_MARKER;
    const markerIndex = fileBytes.indexOf(marker);
    if (markerIndex === -1) return null;

    return fileBytes.subarray(markerIndex + marker.length);
  }

  /**
   * 尝试以旧版格式读取加密数据
   */
  private tryReadLegacyFormat(fileBytes: Buffer): Buffer | null {
    if (fileBytes.length < 5) return null;

    const magic = fileBytes.subarray(0, 5);
    if (!magic.equals(PdfEncryptor.MAGIC)) return null;

    return fileBytes;
  }

  /**
   * 解析加密数据块
   * 格式: MAGIC(5) + salt(16) + IV(12) + authTag(16) + ciphertext + permsJson + permsLength(4)
   */
  private parseBlock(data: Buffer): {
    salt: Buffer;
    iv: Buffer;
    authTag: Buffer;
    ciphertext: Buffer;
    permissions?: any;
  } | null {
    const SALT_LENGTH = 16;
    const MIN_LENGTH = 5 + SALT_LENGTH + PdfEncryptor.IV_LENGTH + PdfEncryptor.AUTH_TAG_LENGTH;

    if (data.length < MIN_LENGTH) return null;

    const magic = data.subarray(0, 5);
    if (!magic.equals(PdfEncryptor.MAGIC)) return null;

    let offset = 5;
    const salt = data.subarray(offset, offset + SALT_LENGTH);
    offset += SALT_LENGTH;
    const iv = data.subarray(offset, offset + PdfEncryptor.IV_LENGTH);
    offset += PdfEncryptor.IV_LENGTH;
    const authTag = data.subarray(offset, offset + PdfEncryptor.AUTH_TAG_LENGTH);
    offset += PdfEncryptor.AUTH_TAG_LENGTH;

    // 读取权限信息（最后4字节为权限JSON长度）
    let permissions: any = undefined;
    let ciphertextEnd = data.length;

    if (data.length >= 4) {
      try {
        const permsLength = data.readUInt32BE(data.length - 4);
        if (permsLength > 0 && permsLength < data.length - offset - 4) {
          const permsStart = data.length - 4 - permsLength;
          const permsJson = data.toString('utf-8', permsStart, data.length - 4);
          permissions = JSON.parse(permsJson);
          ciphertextEnd = permsStart;
        }
      } catch {
        // 权限信息解析失败，忽略
      }
    }

    const ciphertext = data.subarray(offset, ciphertextEnd);

    return { salt, iv, authTag, ciphertext, permissions };
  }
}
