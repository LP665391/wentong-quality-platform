/**
 * Preload 脚本 — 在渲染进程中暴露 Electron IPC API
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 应用信息
  getAppInfo: () => ipcRenderer.invoke('app:getInfo'),

  // 配置
  getConfig: (key) => ipcRenderer.invoke('config:get', key),
  setConfig: (key, value) => ipcRenderer.invoke('config:set', key, value),

  // 文件对话框
  selectFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
  selectDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),

  // 数据校验
  createValidationTask: (filePath, options) => ipcRenderer.invoke('validator:create', filePath, options),
  runValidation: (taskId, filePath) => ipcRenderer.invoke('validator:run', taskId, filePath),
  cancelValidation: (taskId) => ipcRenderer.invoke('validator:cancel', taskId),
  onValidatorProgress: (callback) => {
    ipcRenderer.on('validator:progress', (_event, data) => callback(data));
  },
  exportValidationReport: (taskId, format) => ipcRenderer.invoke('validator:export', taskId, format),

  // 图像检测
  createImageTask: (dirPath, modelId, options) => ipcRenderer.invoke('image-detector:create', dirPath, modelId, options),
  runImageDetection: (taskId, dirPath) => ipcRenderer.invoke('image-detector:run', taskId, dirPath),
  cancelImageDetection: (taskId) => ipcRenderer.invoke('image-detector:cancel', taskId),
  onImageProgress: (callback) => {
    ipcRenderer.on('image-detector:progress', (_event, data) => callback(data));
  },
  getImageResults: (taskId) => ipcRenderer.invoke('image-detector:getResults', taskId),

  // PDF处理
  mergePdf: (filePaths, outputPath) => ipcRenderer.invoke('pdf:merge', { filePaths, outputPath }),
  splitPdf: (filePath, outputDir, options) => ipcRenderer.invoke('pdf:split', { filePath, outputDir, options }),
  encryptPdf: (filePath, outputPath, options) => ipcRenderer.invoke('pdf:encrypt', { filePath, outputPath, options }),
  decryptPdf: (filePath, password, outputPath) => ipcRenderer.invoke('pdf:decrypt', { filePath, password, outputPath }),
  addWatermark: (filePath, outputPath, options) => ipcRenderer.invoke('pdf:watermark', { filePath, outputPath, options }),

  // MD5校验
  hashFile: (filePath, algorithm) => ipcRenderer.invoke('md5:hash', { filePath, algorithm }),
  hashDirectory: (dirPath, algorithm) => ipcRenderer.invoke('md5:hashDir', { dirPath, algorithm }),
  verifyHash: (filePath, expectedHash, algorithm) => ipcRenderer.invoke('md5:verify', { filePath, expectedHash, algorithm }),

  // 元数据
  extractMetadata: (filePath) => ipcRenderer.invoke('metadata:extract', filePath),
  injectMetadata: (filePath, properties, outputPath) => ipcRenderer.invoke('metadata:inject', filePath, properties, outputPath),

  // 文档管理
  parseDocument: (filePath, selectedFields) => ipcRenderer.invoke('doc:parse', filePath, selectedFields),

  // 授权
  startTrial: () => ipcRenderer.invoke('auth:startTrial'),
  getAuthStatus: () => ipcRenderer.invoke('auth:getStatus'),
  getMachineId: () => ipcRenderer.invoke('auth:getMachineId'),
  activate: (method, data) => ipcRenderer.invoke('auth:activate', { method, ...data }),
});

// 暴露 ipcRenderer.on 的监听能力（简化版）
contextBridge.exposeInMainWorld('api', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, callback) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },
});
