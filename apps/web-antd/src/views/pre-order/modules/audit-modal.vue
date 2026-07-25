<script lang="ts" setup>
import type { PreOrderUserRow } from './user-defaults';

import { computed, ref, watch } from 'vue';

import { Alert, Form, FormItem, Modal, Textarea } from 'ant-design-vue';

import UserSelect from '#/adapter/component/biz-select/user-select.vue';

import { USER_ATTRIBUTE } from '../form-data';

const props = withDefaults(
  defineProps<{
    /** true=通过，false=驳回 */
    success?: boolean;
    users?: PreOrderUserRow[];
  }>(),
  { success: true, users: () => [] },
);

const visible = defineModel<boolean>('visible', { default: false });

const emit = defineEmits<{
  confirm: [payload: { remark?: string; operationUserId?: number }];
}>();

const remark = ref('');
const operationUserId = ref<number | undefined>();

const currentOperationUserId = computed(
  () =>
    props.users?.find(
      (row) => Number(row.userAttribute) === USER_ATTRIBUTE.Operation,
    )?.userId,
);

/** 通过时后端要求必须存在「操作」干系人，缺失则本次审核需一并指派 */
const needOperation = computed(
  () => props.success && !currentOperationUserId.value,
);

watch(visible, (value) => {
  if (!value) return;
  remark.value = '';
  operationUserId.value = currentOperationUserId.value ?? undefined;
});

function handleOk() {
  emit('confirm', {
    remark: remark.value || undefined,
    operationUserId: operationUserId.value ?? undefined,
  });
}
</script>

<template>
  <Modal
    v-model:open="visible"
    :title="props.success ? '审核通过' : '审核驳回'"
    :ok-text="props.success ? '通过' : '驳回'"
    :ok-button-props="{
      danger: !props.success,
      disabled: needOperation && !operationUserId,
    }"
    @ok="handleOk"
  >
    <Alert
      v-if="needOperation"
      type="warning"
      show-icon
      class="mb-3"
      message="当前业务联系单未指派「操作」干系人，通过前必须指定，否则无法生成海运出口"
    />
    <Form layout="vertical">
      <FormItem v-if="props.success" label="指派操作干系人">
        <UserSelect v-model="operationUserId" class="w-full" />
      </FormItem>
      <FormItem :label="props.success ? '审核意见' : '驳回原因'">
        <Textarea
          v-model:value="remark"
          :rows="3"
          :maxlength="1024"
          show-count
        />
      </FormItem>
    </Form>
  </Modal>
</template>
