// Demo 模式 — 为面试演示提供模拟数据，绕过 Electron 依赖

/**
 * 生成演示用的 CSV 数据
 */
export function generateDemoCSV(): string {
  const headers = '姓名,年龄,邮箱,手机,状态,部门';
  const rows = [
    '张三,25,zhangsan@company.com,13800138001,在职,技术部',
    '李四,150,lisi@company,138001380022,在职,市场部',
    '王五,,wangwu@company.com,13800138003,未知,研发部',
    '赵六,28,zhaoliu@company.com,,在职,人事部',
    '孙七,32,sunqi@company.com,13800138005,在职,技术部',
    ',22,invalid-email,abc,离职,财务部',
    '刘八,45,liuba@company.com,13800138007,在职,市场部',
    '陈九,18,chenjiu@company.com,13800138008,在职,技术部',
    '周十,,zhou@company.com,13800138009,离职,研发部',
    '吴十一,60,wuyi@company.com,13800138010,在职,技术部',
  ];
  return headers + '\n' + rows.join('\n');
}

/**
 * 生成演示用的测试图片（Canvas → Blob URL）
 */
export function generateDemoImage(width = 800, height = 600): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // 渐变背景
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#1890FF');
    gradient.addColorStop(0.5, '#52C41A');
    gradient.addColorStop(1, '#FAAD14');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 文字
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Ai质检 Demo', width / 2, height / 2 - 20);

    canvas.toBlob((blob) => {
      resolve(URL.createObjectURL(blob!));
    }, 'image/png');
  });
}

/**
 * 生成多张不同尺寸/质量的演示图片
 */
export async function generateDemoImages(): Promise<Array<{ name: string; url: string; width: number; height: number }>> {
  const images = [];
  const specs = [
    { name: 'product-001.jpg', w: 1920, h: 1080 },
    { name: 'product-002.jpg', w: 800, h: 600 },
    { name: 'product-003.jpg', w: 100, h: 50 },  // 不合格：太小
    { name: 'product-004.png', w: 1280, h: 720 },
    { name: 'product-005.jpg', w: 640, h: 480 },
    { name: 'scan-001.jpg',    w: 200, h: 200 },
  ];

  for (const spec of specs) {
    const url = await generateDemoImage(spec.w, spec.h);
    images.push({ name: spec.name, url, width: spec.w, height: spec.h });
  }

  return images;
}

/**
 * 生成文本 Blob URL（用于 MD5 演示）
 */
export function generateDemoTextFile(content: string, fileName = 'demo.txt'): string {
  const blob = new Blob([content], { type: 'text/plain' });
  return URL.createObjectURL(blob);
}

/**
 * 计算字符串的哈希值（Web Crypto API，用于演示）。
 * 注意：浏览器 Web Crypto API 不支持 MD5，使用 SHA-256 替代。
 * 如需 MD5，请通过 IPC 调用主进程的 hashFile。
 */
export async function computeHash(input: string, algorithm: AlgorithmIdentifier = 'SHA-256'): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest(algorithm, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/** @deprecated 使用 computeHash 替代。Web Crypto 不支持 MD5 */
export const computeMD5 = computeHash;
