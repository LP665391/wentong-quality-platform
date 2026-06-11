<template>
  <el-config-provider :locale="zhCn">
    <div class="app-wrapper" :class="{ 'is-mac': isMac }">
      <!-- macOS 自定义标题栏 -->
      <TitleBar v-if="isMac" />

      <!-- 主体：侧边栏 + 主内容 -->
      <div class="app-container">
        <Sidebar />
        <main class="main-content">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </main>
      </div>

      <!-- 底部状态栏 -->
      <StatusBar />
    </div>
  </el-config-provider>
</template>

<script setup lang="ts">
import { ElConfigProvider } from 'element-plus';
import zhCn from 'element-plus/dist/locale/zh-cn.mjs';
import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';

import TitleBar from '@/components/TitleBar.vue';
import Sidebar from '@/components/Sidebar.vue';
import StatusBar from '@/components/StatusBar.vue';

const appStore = useAppStore();
const { isMac } = storeToRefs(appStore);
</script>
