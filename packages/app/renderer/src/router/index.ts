import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
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

export default router;
