<script setup lang="ts">
import { computed } from 'vue';

import { buildMailSrcdoc } from '#/views/personal-mail/mail-format';

const props = withDefaults(
  defineProps<{
    htmlBody?: null | string;
    textBody?: null | string;
  }>(),
  {
    htmlBody: '',
    textBody: '',
  },
);

const srcdoc = computed(() => buildMailSrcdoc(props.htmlBody, props.textBody));
</script>

<template>
  <iframe
    class="mail-html-frame"
    sandbox="allow-popups allow-popups-to-escape-sandbox"
    :srcdoc="srcdoc"
    title="邮件正文"
  ></iframe>
</template>

<style scoped>
.mail-html-frame {
  display: block;
  width: 100%;
  height: 100%;
  background: #fff;
  border: 0;
}
</style>
