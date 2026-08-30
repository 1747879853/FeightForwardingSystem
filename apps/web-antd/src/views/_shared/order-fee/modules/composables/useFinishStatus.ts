import { ref } from 'vue';
import { message } from 'ant-design-vue';

import { useOrderFeeAdapter } from '../../use-adapter';

/**
 * 完结状态管理 Composable
 */
export function useFinishStatus(editId: any) {
  const adapter = useOrderFeeAdapter();
  const isFinished = ref<boolean>(true); // true表示已完结，false表示未完结
  const loadingFinishStatus = ref(false);

  /**
   * 获取完结状态
   */
  const loadFinishStatus = async () => {
    if (!editId.value) return;

    loadingFinishStatus.value = true;
    try {
      const finished = await adapter.api.getIsFinishedAsync(editId.value);
      isFinished.value = finished;
    } catch (error) {
      console.error('❌ [完结状态] 获取失败:', error);
    } finally {
      loadingFinishStatus.value = false;
    }
  };

  /**
   * 切换完结/未完结状态
   */
  const toggleFinishStatus = async () => {
    if (!editId.value) {
      message.warning('请先保存业务信息');
      return;
    }

    try {
      await adapter.api.changeIsUnfinishedAsync(editId.value);
      isFinished.value = !isFinished.value;

      message.success({
        content: isFinished.value ? '已设置为已完结' : '已设置为未完结',
        key: 'action_process_msg',
      });
    } catch (error) {
      console.error('❌ [完结状态] 切换失败:', error);
    }
  };

  return {
    isFinished,
    loadingFinishStatus,
    loadFinishStatus,
    toggleFinishStatus,
  };
}
