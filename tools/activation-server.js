/**
 * 授权验证服务器（Express）
 *
 * 部署到云服务器或内网服务器上。
 * 客户端通过 activateOnline 调用此 API。
 *
 * 启动方式：
 *   npm install express
 *   node server.js
 */

const express = require('express');
const crypto = require('node:crypto');
const fs = require('node:fs');

// ⚠️ 必须与客户端的 SECRET_KEY 一致！
const SECRET_KEY = Buffer.from('V2VuVG9uZ1F1YWxpdHlQbGF0Zm9ybVNlY3JldEtleTIwMjU=', 'base64');

// 授权码数据库（生产环境请用数据库）
const LICENSES = {
  'WT-DEMO-001': {
    customerName: '演示用户',
    company: '文安档案',
    type: 'permanent',
    used: false,        // 是否已绑定机器
    boundMachineId: null,
  },
};

const app = express();
app.use(express.json());

// ============================================================
// 激活接口
// ============================================================

app.post('/api/activate', (req, res) => {
  const { licenseKey, machineId } = req.body;

  // 1. 验证授权码是否存在
  const license = LICENSES[licenseKey];
  if (!license) {
    return res.status(400).json({ error: '授权码无效' });
  }

  // 2. 检查是否已被其他机器占用
  if (license.used && license.boundMachineId !== machineId) {
    return res.status(400).json({
      error: `该授权码已于 ${license.activatedDate} 绑定到其他机器`,
    });
  }

  // 3. 生成签名许可证
  const content = {
    licenseId: licenseKey,
    customerName: license.customerName,
    company: license.company,
    type: license.type,
    machineId,
    issueDate: new Date().toISOString().split('T')[0],
  };

  const hmac = crypto.createHmac('sha256', SECRET_KEY);
  hmac.update(JSON.stringify(content), 'utf-8');
  const signature = hmac.digest('base64');

  // 4. 标记已使用
  license.used = true;
  license.boundMachineId = machineId;
  license.activatedDate = content.issueDate;

  // 5. 返回许可证
  res.json({ content, signature });
});

// ============================================================
// 查询授权信息
// ============================================================

app.get('/api/license/:key', (req, res) => {
  const license = LICENSES[req.params.key];
  if (!license) return res.status(404).json({ error: '授权码不存在' });
  res.json({
    key: req.params.key,
    customerName: license.customerName,
    type: license.type,
    used: license.used,
    boundMachineId: license.boundMachineId,
    activatedDate: license.activatedDate,
  });
});

// ============================================================
// 启动
// ============================================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 授权服务器运行在 http://localhost:${PORT}`);
  console.log(`📋 可用授权码: ${Object.keys(LICENSES).join(', ')}`);
});
