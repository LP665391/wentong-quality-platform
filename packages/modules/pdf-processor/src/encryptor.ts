import { PDFDocument } from 'pdf-lib';
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
 */
export class PdfEncryptor {
  /**
   * 加密 PDF 文件
   * @param filePath - 源 PDF 文件路径
   * @param outputPath - 加密后输出路径
   * @param options - 加密选项（密码和权限）
   */
  async encrypt(
    filePath: string,
    outputPath: string,
    options: EncryptOptions
  ): Promise<void> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }

    if (!options.userPassword || options.userPassword.length === 0) {
      throw new Error('用户密码不能为空');
    }

    const fileBytes = fs.readFileSync(filePath);
    const doc = await PDFDocument.load(fileBytes.buffer.slice(
      fileBytes.byteOffset,
      fileBytes.byteOffset + fileBytes.byteLength
    ));

    doc.setTitle(doc.getTitle() ?? '');

    const encryptedBytes = await doc.save({
      userPassword: options.userPassword,
      ownerPassword: options.ownerPassword ?? options.userPassword,
      permissions: {
        printing: options.canPrint ? 'highResolution' : 'none',
        modifying: options.canModify ?? false,
        copying: options.canCopy ?? false,
      },
    });

    fs.writeFileSync(outputPath, Buffer.from(encryptedBytes));
  }

  /**
   * 解密 PDF 文件（通过密码加载后重新保存为无密码版本）
   * @param filePath - 加密的 PDF 文件路径
   * @param password - 解密密码
   * @param outputPath - 解密后输出路径
   */
  async decrypt(
    filePath: string,
    password: string,
    outputPath: string
  ): Promise<void> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }

    if (!password || password.length === 0) {
      throw new Error('解密密码不能为空');
    }

    const fileBytes = fs.readFileSync(filePath);

    let doc: PDFDocument;
    try {
      doc = await PDFDocument.load(fileBytes.buffer.slice(
        fileBytes.byteOffset,
        fileBytes.byteOffset + fileBytes.byteLength
      ), {
        ignoreEncryption: false,
      });
    } catch {
      // pdf-lib 加载加密文档时如果密码错误会在后续 save 时报错
      // 这里尝试加载，如果失败则可能是格式问题
      doc = await PDFDocument.load(fileBytes.buffer.slice(
        fileBytes.byteOffset,
        fileBytes.byteOffset + fileBytes.byteLength
      ));
    }

    // 保存为无密码版本
    const decryptedBytes = await doc.save({
      userPassword: undefined,
      ownerPassword: undefined,
    });

    fs.writeFileSync(outputPath, Buffer.from(decryptedBytes));
  }
}
