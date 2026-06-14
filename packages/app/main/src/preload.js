/**
 * Preload 脚本 — 在渲染进程中暴露安全的 Electron IPC API
 *
 * 注意：所有 IPC handler 期望接收单个 params 对象作为参数（_event 之后）。
 * 因此 electronAPI 方法要么直接透传对象（params 模式），
 * 要么将多个位置参数组合成对象传递。
 */
const { contextBridge, ipcRenderer } = require('electron');

// ---------------------------------------------------------------------------
// IPC 通道白名单（安全：仅允许前端调用的通道）
// ---------------------------------------------------------------------------
const ALLOWED_INVOKE_CHANNELS = new Set([
  'app:getInfo',
  'config:get',
  'config:set',
  'dialog:openFile',
  'dialog:openDirectory',
  'dialog:saveFile',
  'file:write',
  'validator:create',
  'validator:run',
  'validator:cancel',
  'validator:export',
  'image-detector:create',
  'image-detector:run',
  'image-detector:cancel',
  'image-detector:getResults',
  'pdf:merge',
  'pdf:split',
  'pdf:encrypt',
  'pdf:decrypt',
  'pdf:watermark',
  'md5:hash',
  'md5:hashDir',
  'md5:verify',
  'metadata:extract',
  'metadata:inject',
  'doc:parse',
  'task:create',
  'task:get',
  'task:list',
  'task:updateStatus',
  'auth:getStatus',
  'auth:getMachineId',
  'auth:activate',
  'auth:startTrial',
  'auth:getTrialInfo',
]);

const ALLOWED_ON_CHANNELS = new Set([
  'validator:progress',
  'image-detector:progress',
  'pdf:progress',
  'md5:progress',
  'doc:progress',
]);

// ---------------------------------------------------------------------------
// window.electronAPI — 语义化 API（推荐使用）
// ---------------------------------------------------------------------------

contextBridge.exposeInMainWorld('electronAPI', {
  // --- 应用信息 ---
  getAppInfo: () => ipcRenderer.invoke('app:getInfo'),

  // --- 配置 ---
  getConfig: (key) => ipcRenderer.invoke('config:get', key),
  setConfig: (key, value) => ipcRenderer.invoke('config:set', key, value),

  // --- 文件对话框 ---
  selectFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
  selectDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),
  writeFile: (params) => ipcRenderer.invoke('file:write', params),

  // --- 数据校验 ---
  // 对象参数形式（推荐）
  createValidatorTask: (params) => ipcRenderer.invoke('validator:create', params),
  // 位置参数形式（兼容）
  createValidationTask: (filePath, options) => ipcRenderer.invoke('validator:create', { filePath, options }),

  // 对象参数形式（推荐）
  runValidator: (params) => ipcRenderer.invoke('validator:run', params),
  // 位置参数形式（兼容），preset 为可选
  runValidation: (taskId, filePath, preset) => ipcRenderer.invoke('validator:run', { taskId, filePath, preset }),

  // 对象参数形式（推荐）
  cancelValidator: (params) => ipcRenderer.invoke('validator:cancel', params),
  // 位置参数形式（兼容）
  cancelValidation: (taskId) => ipcRenderer.invoke('validator:cancel', { taskId }),

  // 进度监听（返回取消监听的函数）
  onValidatorProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('validator:progress', handler);
    return () => ipcRenderer.removeListener('validator:progress', handler);
  },

  // 对象参数形式（推荐）
  exportValidatorReport: (params) => ipcRenderer.invoke('validator:export', params),
  // 位置参数形式（兼容）
  exportValidationReport: (taskId, format, outputPath) => ipcRenderer.invoke('validator:export', { taskId, format, outputPath }),

  // --- 图像检测 ---
  createImageDetectorTask: (params) => ipcRenderer.invoke('image-detector:create', params),
  createImageTask: (dirPath, modelId, options) => ipcRenderer.invoke('image-detector:create', { dirPath, modelId, options }),

  runImageDetector: (params) => ipcRenderer.invoke('image-detector:run', params),
  runImageDetection: (taskId, dirPath, modelId, options) => ipcRenderer.invoke('image-detector:run', { taskId, dirPath, modelId, options }),

  cancelImageDetector: (params) => ipcRenderer.invoke('image-detector:cancel', params),
  cancelImageDetection: (taskId) => ipcRenderer.invoke('image-detector:cancel', { taskId }),

  onImageDetectorProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('image-detector:progress', handler);
    return () => ipcRenderer.removeListener('image-detector:progress', handler);
  },
  onImageProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('image-detector:progress', handler);
    return () => ipcRenderer.removeListener('image-detector:progress', handler);
  },

  getImageResults: (taskId) => ipcRenderer.invoke('image-detector:getResults', { taskId }),

  // --- PDF 处理（兼容对象参数和位置参数） ---
  mergePdf: (filePathsOrParams, outputPath) => {
    if (typeof filePathsOrParams === 'object' && filePathsOrParams !== null && !Array.isArray(filePathsOrParams)) {
      return ipcRenderer.invoke('pdf:merge', filePathsOrParams);
    }
    return ipcRenderer.invoke('pdf:merge', { filePaths: filePathsOrParams, outputPath });
  },
  splitPdf: (filePathOrParams, outputDir, options) => {
    if (typeof filePathOrParams === 'object' && filePathOrParams !== null) {
      return ipcRenderer.invoke('pdf:split', filePathOrParams);
    }
    return ipcRenderer.invoke('pdf:split', { filePath: filePathOrParams, outputDir, options });
  },
  encryptPdf: (filePathOrParams, outputPath, options) => {
    if (typeof filePathOrParams === 'object' && filePathOrParams !== null) {
      return ipcRenderer.invoke('pdf:encrypt', filePathOrParams);
    }
    return ipcRenderer.invoke('pdf:encrypt', { filePath: filePathOrParams, outputPath, options });
  },
  decryptPdf: (filePathOrParams, password, outputPath) => {
    if (typeof filePathOrParams === 'object' && filePathOrParams !== null) {
      return ipcRenderer.invoke('pdf:decrypt', filePathOrParams);
    }
    return ipcRenderer.invoke('pdf:decrypt', { filePath: filePathOrParams, password, outputPath });
  },
  // PdfProcessor.vue 调用的是 watermarkPdf
  watermarkPdf: (filePathOrParams, outputPath, options) => {
    if (typeof filePathOrParams === 'object' && filePathOrParams !== null) {
      return ipcRenderer.invoke('pdf:watermark', filePathOrParams);
    }
    return ipcRenderer.invoke('pdf:watermark', { filePath: filePathOrParams, outputPath, options });
  },
  // 别名
  addWatermark: (filePath, outputPath, options) => ipcRenderer.invoke('pdf:watermark', { filePath, outputPath, options }),

  // PDF 进度
  onPdfProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('pdf:progress', handler);
    return () => ipcRenderer.removeListener('pdf:progress', handler);
  },

  // --- MD5 校验（兼容对象参数和位置参数） ---
  hashFile: (filePathOrParams, algorithm) => {
    if (typeof filePathOrParams === 'object' && filePathOrParams !== null) {
      return ipcRenderer.invoke('md5:hash', filePathOrParams);
    }
    return ipcRenderer.invoke('md5:hash', { filePath: filePathOrParams, algorithm });
  },
  hashDirectory: (dirPathOrParams, algorithm, concurrency) => {
    if (typeof dirPathOrParams === 'object' && dirPathOrParams !== null) {
      return ipcRenderer.invoke('md5:hashDir', dirPathOrParams);
    }
    return ipcRenderer.invoke('md5:hashDir', { dirPath: dirPathOrParams, algorithm, concurrency });
  },
  verifyHash: (filePathOrParams, expectedHash, algorithm) => {
    if (typeof filePathOrParams === 'object' && filePathOrParams !== null) {
      return ipcRenderer.invoke('md5:verify', filePathOrParams);
    }
    return ipcRenderer.invoke('md5:verify', { filePath: filePathOrParams, expectedHash, algorithm });
  },

  onMd5Progress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('md5:progress', handler);
    return () => ipcRenderer.removeListener('md5:progress', handler);
  },

  // --- 元数据（兼容对象参数和位置参数） ---
  extractMetadata: (filePathOrParams) => {
    if (typeof filePathOrParams === 'object' && filePathOrParams !== null) {
      return ipcRenderer.invoke('metadata:extract', filePathOrParams);
    }
    return ipcRenderer.invoke('metadata:extract', { filePath: filePathOrParams });
  },
  injectMetadata: (filePathOrParams, properties, outputPath) => {
    if (typeof filePathOrParams === 'object' && filePathOrParams !== null) {
      return ipcRenderer.invoke('metadata:inject', filePathOrParams);
    }
    return ipcRenderer.invoke('metadata:inject', { filePath: filePathOrParams, properties, outputPath });
  },

  // --- 文档管理（兼容对象参数和位置参数） ---
  parseDocument: (filePathOrParams, selectedFields) => {
    if (typeof filePathOrParams === 'object' && filePathOrParams !== null) {
      return ipcRenderer.invoke('doc:parse', filePathOrParams);
    }
    return ipcRenderer.invoke('doc:parse', { filePath: filePathOrParams, selectedFields });
  },

  onDocProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('doc:progress', handler);
    return () => ipcRenderer.removeListener('doc:progress', handler);
  },

  // --- 授权 ---
  startTrial: () => ipcRenderer.invoke('auth:startTrial'),
  getAuthStatus: () => ipcRenderer.invoke('auth:getStatus'),
  getMachineId: () => ipcRenderer.invoke('auth:getMachineId'),
  getTrialInfo: () => ipcRenderer.invoke('auth:getTrialInfo'),
  activate: (method, data) => ipcRenderer.invoke('auth:activate', { method, ...data }),
});

// ---------------------------------------------------------------------------
// window.api — 通用 IPC 透传（带白名单过滤）
// ---------------------------------------------------------------------------

contextBridge.exposeInMainWorld('api', {
  invoke: (channel, ...args) => {
    if (!ALLOWED_INVOKE_CHANNELS.has(channel)) {
      console.error(`[preload] 拒绝调用未授权通道: ${channel}`);
      return Promise.reject(new Error(`不允许的 IPC 通道: ${channel}`));
    }
    return ipcRenderer.invoke(channel, ...args);
  },
  on: (channel, callback) => {
    if (!ALLOWED_ON_CHANNELS.has(channel)) {
      console.error(`[preload] 拒绝监听未授权通道: ${channel}`);
      return () => {};
    }
    const handler = (_event, ...args) => callback(...args);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
});
