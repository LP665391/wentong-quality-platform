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
 * 使用 AES-256-GCM 对整个 PDF 文件进行加密（带认证标签，防篡改），
 * 并在加密数据前添加简单的 magic header 用于识别。
 */
export class PdfEncryptor {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly MAGIC = Buffer.from('WTENC'); // 文通加密标识
  private static readonly IV_LENGTH = 12; // GCM 推荐 IV 长度
  private static readonly AUTH_TAG_LENGTH = 16; // GCM 认证标签长度

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

    // 写入格式: MAGIC (5B) + salt (16B) + IV (12B) + authTag (16B) + encrypted data
    const output = Buffer.concat([PdfEncryptor.MAGIC, salt, iv, authTag, encrypted]);

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
    if (fileBytes.length < 4) {
      throw new Error('文件格式无效或已损坏');
    }
    const permsLength = fileBytes.readUInt32BE(fileBytes.length - 4);
    const encryptedData = fileBytes.subarray(0, fileBytes.length - permsLength - 4);

    // 最小长度: MAGIC(5) + salt(16) + IV(12) + authTag(16) = 49 字节
    const SALT_LENGTH = 16;
    const MIN_ENCRYPTED_LENGTH = 5 + SALT_LENGTH + PdfEncryptor.IV_LENGTH + PdfEncryptor.AUTH_TAG_LENGTH;
    if (encryptedData.length < MIN_ENCRYPTED_LENGTH) {
      throw new Error('文件不是有效的加密格式，或文件已损坏');
    }

    // 检查 magic header
    const magic = encryptedData.subarray(0, 5);
    if (!magic.equals(PdfEncryptor.MAGIC)) {
      throw new Error('文件不是有效的加密格式，或密码不正确');
    }

    let offset = 5;
    // 读取盐
    const salt = encryptedData.subarray(offset, offset + SALT_LENGTH);
    offset += SALT_LENGTH;
    // 读取 IV
    const iv = encryptedData.subarray(offset, offset + PdfEncryptor.IV_LENGTH);
    offset += PdfEncryptor.IV_LENGTH;
    // 读取认证标签
    const authTag = encryptedData.subarray(offset, offset + PdfEncryptor.AUTH_TAG_LENGTH);
    offset += PdfEncryptor.AUTH_TAG_LENGTH;
    // 剩余部分为密文
    const ciphertext = encryptedData.subarray(offset);

    // 使用 PBKDF2 从密码和盐派生密钥
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

    try {
      const decipher = crypto.createDecipheriv(PdfEncryptor.ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      fs.writeFileSync(outputPath, decrypted);
    } catch {
      throw new Error('解密失败：密码错误或文件已损坏');
    }
  }
}
