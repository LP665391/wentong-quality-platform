import * as crypto from 'node:crypto';
import * as fs from 'node:fs';

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
 * 由于 pdf-lib v1.17 不原生支持 PDF 加密标准，
 * 此处使用 AES-256-CBC 对整个 PDF 文件进行加密，
 * 并在加密数据前添加简单的 magic header 用于识别。
 */
export class PdfEncryptor {
  private static readonly ALGORITHM = 'aes-256-cbc';
  private static readonly MAGIC = Buffer.from('WTENC'); // 文通加密标识

  /**
   * 加密 PDF 文件
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

    // 使用 SHA-256 从密码派生 32 字节密钥
    const key = crypto.createHash('sha256').update(options.userPassword).digest();

    // 生成随机 IV
    const iv = crypto.randomBytes(16);

    // AES-256-CBC 加密
    const cipher = crypto.createCipheriv(PdfEncryptor.ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(fileBytes), cipher.final()]);

    // 写入格式: MAGIC (5B) + IV (16B) + encrypted data
    const output = Buffer.concat([PdfEncryptor.MAGIC, iv, encrypted]);

    // 同时保存权限配置到文件末尾（JSON）
    const permsJson = JSON.stringify({
      canPrint: options.canPrint ?? false,
      canModify: options.canModify ?? false,
      canCopy: options.canCopy ?? false,
      ownerPassword: options.ownerPassword ?? options.userPassword,
    });
    const permsBuffer = Buffer.from(permsJson, 'utf-8');
    const permsLengthBuffer = Buffer.alloc(4);
    permsLengthBuffer.writeUInt32BE(permsBuffer.length, 0);

    fs.writeFileSync(outputPath, Buffer.concat([output, permsBuffer, permsLengthBuffer]));
  }

  /**
   * 解密 PDF 文件
   * @param filePath - 加密的 PDF 文件路径
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

    // 读取权限长度（最后4字节）
    const permsLength = fileBytes.readUInt32BE(fileBytes.length - 4);
    const encryptedData = fileBytes.subarray(0, fileBytes.length - permsLength - 4);

    // 检查 magic header
    const magic = encryptedData.subarray(0, 5);
    if (!magic.equals(PdfEncryptor.MAGIC)) {
      throw new Error('文件不是有效的加密格式，或密码不正确');
    }

    // 读取 IV（magic 之后的 16 字节）
    const iv = encryptedData.subarray(5, 21);
    const ciphertext = encryptedData.subarray(21);

    // 从密码派生密钥
    const key = crypto.createHash('sha256').update(password).digest();

    try {
      const decipher = crypto.createDecipheriv(PdfEncryptor.ALGORITHM, key, iv);
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      fs.writeFileSync(outputPath, decrypted);
    } catch {
      throw new Error('解密失败：密码错误或文件已损坏');
    }
  }
}
