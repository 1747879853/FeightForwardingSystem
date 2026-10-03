<script lang="ts" setup>
import { Page } from '@vben/common-ui';

import SendRecordPane from './send-record-pane.vue';

defineOptions({ name: 'MailSendRecordList' });
</script>

<template>
  <Page auto-content-height>
    <SendRecordPane />
  </Page>
</template>
