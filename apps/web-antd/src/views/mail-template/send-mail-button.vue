<script lang="ts" setup>
import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { Button } from 'ant-design-vue';

import {
  type PrintFormatBizType,
  type PrintJsonType,
} from '#/components/print-format';

import SendMailModal from './send-mail-modal.vue';

const props = defineProps<{
  bizType?: null | PrintFormatBizType;
  entityId?: null | string;
  frightModule: number;
  printJsonType?: PrintJsonType;
  resolvePrintFilter?: () => Promise<null | {
    carrierId?: null | number;
    codeIssueTypeId?: null | number;
    orgId?: null | number | string;
  }>;
  size?: 'large' | 'middle' | 'small';
  viewCode: string;
}>();

const [MailModal, mailModalApi] = useVbenModal({
  connectedComponent: SendMailModal,
  destroyOnClose: true,
});

function open() {
  if (!props.entityId) {
    return;
  }
  mailModalApi
    .setData({
      frightModule: props.frightModule,
      entityId: props.entityId,
      printJsonType: props.printJsonType,
      bizType: props.bizType,
      resolvePrintFilter: props.resolvePrintFilter,
    })
    .open();
}
</script>

<template>
  <span class="inline-flex items-center">
    <MailModal />
    <Button
      v-access:code="viewCode"
      class="flex items-center justify-center"
      :size="props.size || 'small'"
      @click="open"
    >
      <IconifyIcon
        class="mr-1 inline-block size-3.5 align-middle"
        icon="mdi:email-outline"
      />
      <span class="align-middle">发邮件</span>
    </Button>
  </span>
</template>
