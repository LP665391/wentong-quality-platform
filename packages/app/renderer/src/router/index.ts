import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/activation',
    name: 'Activation',
    component: () => import('@/views/Activation.vue'),
    meta: { title: '软件激活', noAuth: true },
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: { title: '首页' },
  },
  {
    path: '/validator',
    name: 'DataValidator',
    component: () => import('@/views/DataValidator.vue'),
    meta: { title: '数据校验' },
  },
  {
    path: '/image-detector',
    name: 'ImageDetector',
    component: () => import('@/views/ImageDetector.vue'),
    meta: { title: '图像检测' },
  },
  {
    path: '/pdf-processor',
    name: 'PdfProcessor',
    component: () => import('@/views/PdfProcessor.vue'),
    meta: { title: 'PDF处理' },
  },
  {
    path: '/md5-checker',
    name: 'Md5Checker',
    component: () => import('@/views/Md5Checker.vue'),
    meta: { title: 'MD5校验' },
  },
  {
    path: '/metadata',
    name: 'MetadataEncap',
    component: () => import('@/views/MetadataEncap.vue'),
    meta: { title: '元数据封装' },
  },
  {
    path: '/doc-manager',
    name: 'DocManager',
    component: () => import('@/views/DocManager.vue'),
    meta: { title: '文档管理' },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/Settings.vue'),
    meta: { title: '设置' },
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

// ---------------------------------------------------------------------------
// 全局前置守卫：未激活时只能访问 /activation
// ---------------------------------------------------------------------------
router.beforeEach(async (to, _from, next) => {
  // 激活页面总是可以访问
  if (to.meta.noAuth === true) {
    next();
    return;
  }

  // 浏览器开发环境：跳过激活检查，直接放行
  const electronAPI = (window as any).electronAPI ?? (window as any).api;
  if (!electronAPI) {
    next();
    return;
  }

  // 检查激活状态（通过 IPC 调用主进程）
  try {
    const authStatus = await electronAPI.invoke?.('auth:getStatus');

    if (authStatus?.activated || authStatus?.trialActive) {
      next();
    } else {
      next({ name: 'Activation' });
    }
  } catch {
    // IPC 调用失败（主进程未就绪等），重定向到激活页面以确保安全
    // 不能直接放行，否则会绕过激活检查
    next({ name: 'Activation' });
  }
});

export default router;
