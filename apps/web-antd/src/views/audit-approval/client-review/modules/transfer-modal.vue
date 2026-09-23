<script lang="ts" setup>
import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { message } from 'ant-design-vue';

import UserSelect from '#/adapter/component/biz-select/user-select.vue';
import { transferWorkFlowInstance } from '#/api/system/workflow-instance-admin';

defineOptions({ name: 'ClientAuditTransferModal' });

const emit = defineEmits<{ success: [] }>();

const userStore = useUserStore();
const toUserId = ref<null | number | undefined>();
const submitting = ref(false);
const itemIds = ref<string[]>([]);
/** 当前审核任务对应权限；选人接口 AND 过滤，勿写死客户权限 */
const permissions = ref<string[]>([]);

const [Modal, modalApi] = useVbenModal({
  class: 'w-[480px]',
  async onConfirm() {
    await handleSubmit();
  },
  onOpenChange(isOpen) {
    if (!isOpen) {
      toUserId.value = undefined;
      itemIds.value = [];
      permissions.value = [];
      return;
    }
    const data = modalApi.getData<{
      itemIds?: string[];
      permissions?: string[];
    }>();
    itemIds.value = data?.itemIds ?? [];
    permissions.value = (data?.permissions ?? [])
      .map((p) => String(p ?? '').trim())
      .filter(Boolean);
    toUserId.value = undefined;
  },
});

async function handleSubmit() {
  if (itemIds.value.length === 0) {
    message.warning('缺少待转交的审核明细');
    return;
  }
  if (permissions.value.length === 0) {
    message.warning('缺少审核权限参数，无法筛选被转交人');
    return;
  }
  if (!toUserId.value) {
    message.warning('请选择被转交人');
    return;
  }
  const selfId = Number(userStore.userInfo?.userId);
  if (Number.isFinite(selfId) && Number(toUserId.value) === selfId) {
    message.warning('不能转交给自己');
    return;
  }

  submitting.value = true;
  modalApi.setState({ confirming: true });
  try {
    for (const workFlowInstanceItemId of itemIds.value) {
      await transferWorkFlowInstance({
        toUserId: Number(toUserId.value),
        workFlowInstanceItemId,
      });
    }
    message.success(
      itemIds.value.length > 1
        ? `已转交 ${itemIds.value.length} 条审核`
        : '转交成功',
    );
    emit('success');
    modalApi.close();
  } finally {
    submitting.value = false;
    modalApi.setState({ confirming: false });
  }
}
</script>

<template>
  <Modal title="转交审核" :confirm-loading="submitting">
    <div class="space-y-3 py-1">
      <p class="m-0 text-sm text-[hsl(var(--muted-foreground))]">
        转交后你将从待办消失，对方会出现在待办中。会签同级已有的人不能再转给他。
      </p>
      <div>
        <div class="mb-1 text-sm">被转交人</div>
        <UserSelect
          :key="permissions.join('|')"
          v-model="toUserId"
          class="w-full"
          label-key="nickName"
          :permissions="permissions"
          placeholder="请选择被转交人（仅有对应审核权限）"
        />
      </div>
    </div>
  </Modal>
</template>
