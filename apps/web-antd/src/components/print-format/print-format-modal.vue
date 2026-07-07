<script lang="ts" setup>
import { Button, Empty, Modal, Radio, RadioGroup, Spin } from 'ant-design-vue';

import { usePrintFormat } from './use-print-format';

const printFormatState = usePrintFormat();
const {
  visible,
  loading,
  printing,
  templates,
  selectedTemplateId,
  close,
  confirmPrint,
} = printFormatState;

const emptySimpleImage = Empty.PRESENTED_IMAGE_SIMPLE;
</script>

<template>
  <Modal
    v-model:open="visible"
    title="选择打印模板"
    :width="480"
    :destroy-on-close="true"
    :mask-closable="false"
    @cancel="close"
  >
    <Spin :spinning="loading">
      <div v-if="!loading && templates.length === 0" class="py-6">
        <Empty :image="emptySimpleImage" description="暂无可用打印模板" />
      </div>

      <RadioGroup
        v-else
        v-model:value="selectedTemplateId"
        class="flex w-full flex-col gap-3 py-2"
      >
        <Radio
          v-for="item in templates"
          :key="item.id"
          :value="item.id"
          class="!m-0 w-full rounded-md border border-[#f0f0f0] px-3 py-2"
        >
          <div class="flex flex-col gap-0.5">
            <span class="text-sm font-medium text-[#262626]">
              {{ item.name || '未命名模板' }}
            </span>
            <span v-if="item.remark" class="text-xs text-[#8c8c8c]">
              {{ item.remark }}
            </span>
          </div>
        </Radio>
      </RadioGroup>
    </Spin>

    <template #footer>
      <Button @click="close">取消</Button>
      <Button
        type="primary"
        :loading="printing"
        :disabled="!selectedTemplateId || loading"
        @click="confirmPrint"
      >
        打印
      </Button>
    </template>
  </Modal>
</template>
