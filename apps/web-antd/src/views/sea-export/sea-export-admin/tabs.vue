<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import {
  ArrowLeft,
  FileText,
  MapPin,
  Package,
  Save,
  Ship,
  Users,
} from '@vben/icons';

import {
  Button,
  Card,
  message,
  Space,
  Spin,
  Tabs,
  TabPane,
} from 'ant-design-vue';

import From from './form.vue';
import orderFee from './orderFee/index.vue';
import defaultInfo from './modules/default-info.vue';

import { $t } from '#/locales';
const route = useRoute();
const router = useRouter();

const editId = computed(() => {
  const id = route.params.id;
  return id ? Number(id) : undefined;
});

const isEdit = computed(() => !!editId.value);
const handleBack = () => {
  router.push('/sea-exports');
};

const pageTitle = computed(() => {
  return isEdit.value
    ? $t('ui.actionTitle.edit', [$t('seaExport.export.name')])
    : $t('ui.actionTitle.create', [$t('seaExport.export.name')]);
});

const activeKey = ref('base');

const displayList = [
  {
    name: $t('seaExport.export.vessel'),
    value: 'vessel',
  },
  {
    name: $t('seaExport.export.innerVoyno'),
    value: 'innerVoyno',
  },
  {
    name: $t('seaExport.export.carrierId'),
    value: 'carrier',
  },
  {
    name: $t('seaExport.export.issueType'),
  },
];
</script>

<template>
  <Page auto-content-height>
    <template #title>
      <div class="flex items-center gap-2">
        <Button
          type="text"
          class="flex items-center justify-center p-0"
          @click="handleBack"
        >
          <ArrowLeft class="size-5" />
        </Button>
        <span class="text-lg font-semibold">{{ pageTitle }}</span>
      </div>
    </template>
    <div class="mx-4 flex items-stretch gap-3">
      <defaultInfo />
      <div class="flex min-w-0 flex-1 flex-col gap-2">
        <Tabs type="card" v-model:activeKey="activeKey">
          <TabPane key="base" tab="基础信息">
            <From></From>
          </TabPane>
          <TabPane key="fee" tab="应收应付费用" force-render>
            <orderFee />
          </TabPane>
        </Tabs>
      </div>
    </div>
  </Page>
</template>
