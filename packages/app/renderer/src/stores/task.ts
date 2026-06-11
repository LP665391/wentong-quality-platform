import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface TaskRecord {
  /** 唯一标识 */
  id: string;
  /** 任务名称 */
  name: string;
  /** 关联模块 */
  module: string;
  /** 任务状态 */
  status: TaskStatus;
  /** 创建时间戳 */
  createdAt: number;
  /** 完成时间戳 */
  completedAt?: number;
  /** 错误信息（失败时） */
  error?: string;
  /** 进度 (0-1) */
  progress?: number;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/**
 * 任务历史状态管理
 *
 * 记录所有任务的执行历史，提供最近任务和运行中任务的查询。
 */
export const useTaskStore = defineStore('task', () => {
  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  /** 所有任务记录 */
  const tasks = ref<TaskRecord[]>([]);

  /** 最大保留记录数 */
  const MAX_HISTORY = 100;

  // -------------------------------------------------------------------------
  // Getters
  // -------------------------------------------------------------------------

  /** 最近 10 条任务（按创建时间倒序） */
  const recentTasks = computed<TaskRecord[]>(() => {
    return [...tasks.value]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10);
  });

  /** 运行中的任务 */
  const runningTasks = computed<TaskRecord[]>(() => {
    return tasks.value.filter((t) => t.status === 'running');
  });

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  /**
   * 添加新任务
   */
  function addTask(record: Omit<TaskRecord, 'id' | 'createdAt'>): string {
    const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const task: TaskRecord = {
      ...record,
      id,
      createdAt: Date.now(),
      status: record.status ?? 'pending',
    };

    tasks.value.unshift(task);

    // 超出上限时移除最旧的记录
    if (tasks.value.length > MAX_HISTORY) {
      tasks.value = tasks.value.slice(0, MAX_HISTORY);
    }

    return id;
  }

  /**
   * 更新任务状态
   */
  function updateTask(id: string, patch: Partial<Omit<TaskRecord, 'id' | 'createdAt'>>): boolean {
    const idx = tasks.value.findIndex((t) => t.id === id);
    if (idx === -1) return false;

    const current = tasks.value[idx];
    const updated: TaskRecord = {
      ...current,
      ...patch,
    };

    // 自动设置完成时间戳
    if (
      patch.status &&
      (patch.status === 'completed' || patch.status === 'failed' || patch.status === 'cancelled') &&
      !updated.completedAt
    ) {
      updated.completedAt = Date.now();
    }

    tasks.value[idx] = updated;
    return true;
  }

  /** 清空所有任务历史 */
  function clearHistory(): void {
    tasks.value = [];
  }

  return {
    // state
    tasks,
    // getters
    recentTasks,
    runningTasks,
    // actions
    addTask,
    updateTask,
    clearHistory,
  };
});
