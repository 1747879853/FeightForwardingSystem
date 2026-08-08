<script lang="ts" setup>
import { computed, nextTick, ref, shallowRef, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';

import type { AirExportAdminApi } from '#/api/air-export/air-export-admin';

import { getAirExportDetail } from '#/api/air-export/air-export-admin';
import { useUnsavedGuard } from '#/composables/use-unsaved-guard';
import { $t } from '#/locales';
import { buildBrandStorageKey } from '#/utils/brand-storage';

import attachments from './attachments/index.vue';
import Form from './basic-info-form/form.vue';
import YundangAirTrackingPanel from './modules/yundang-air-tracking-panel.vue';
import orderFee from './orderFee/index.vue';

type SectionKey = 'basic' | 'cargo' | 'date' | 'leg' | 'party';
type TabKey = 'attachments' | 'basic' | 'fee' | 'tracking';
type FormExpose = {
  isFormDirty: () => boolean | Promise<boolean>;
  scrollToSection: (key: SectionKey) => void;
};

/** 空运出口本期不做更改单，标签只有基础信息、只读费用、附件、运踪四个 */
const VALID_TAB_KEYS: readonly TabKey[] = [
  'basic',
  'fee',
  'attachments',
  'tracking',
];

const TAB_STORAGE_KEY_PREFIX = 'air-export-edit-active-tab';

function isValidTabKey(key: string): key is TabKey {
  return (VALID_TAB_KEYS as readonly string[]).includes(key);
}

function getTabStorageKey(id: string) {
  return buildBrandStorageKey(`${TAB_STORAGE_KEY_PREFIX}:${id}`);
}

function readStoredTab(id: string | undefined): null | TabKey {
  if (!id) return null;
  try {
    const raw = sessionStorage.getItem(getTabStorageKey(id));
    if (raw && isValidTabKey(raw)) return raw;
  } catch {
    // sessionStorage 不可用时忽略
  }
  return null;
}

function writeStoredTab(id: string | undefined, tab: TabKey) {
  if (!id) return;
  try {
    sessionStorage.setItem(getTabStorageKey(id), tab);
  } catch {
    // sessionStorage 不可用时忽略
  }
}

const formRef = ref<FormExpose | null>(null);
const route = useRoute();

/** 编辑页对外暴露：基础信息保存成功后携带最新详情 DTO */
const emit = defineEmits<{
  saved: [detail: AirExportAdminApi.AirExportDto];
}>();

/** 最近一次保存成功后的最新详情，下发给只读费用 Tab 联动刷新 */
const savedDetail = shallowRef<AirExportAdminApi.AirExportDto>();

const editId = computed<string | undefined>(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0];
  return id ? String(id) : undefined;
});

/** 按委托 ID 记忆当前 Tab，离开后再进入时恢复 */
const activeTab = ref<TabKey>(readStoredTab(editId.value) ?? 'basic');

watch(editId, (id) => {
  activeTab.value = readStoredTab(id) ?? 'basic';
});

watch(activeTab, (tab) => {
  writeStoredTab(editId.value, tab);
});

const feeNumber = ref<string>('');
const feeName = computed(() =>
  feeNumber.value
    ? `${$t('airExport.export.orderFee.tabTitle')} ${feeNumber.value}`
    : $t('airExport.export.orderFee.tabTitle'),
);

const tabs = computed<
  { key: TabKey; label: string; sectionKey?: SectionKey }[]
>(() => [
  {
    key: 'basic',
    label: $t('airExport.export.formCardBasicInfo'),
    sectionKey: 'basic',
  },
  { key: 'fee', label: feeName.value },
  { key: 'attachments', label: $t('airExport.export.attachments.tabTitle') },
  { key: 'tracking', label: $t('airExport.yundang.trackingInfo') },
]);

/** 由详情计算费用 Tab 徽标上的收 - 付计数 */
const updateFeeNumber = (detail: AirExportAdminApi.AirExportDto) => {
  const fees = detail.transportOrder?.orderFees ?? [];
  const receiveCount = fees.filter((item) => item.paySide === 0).length;
  const payCount = fees.filter((item) => item.paySide === 1).length;
  feeNumber.value = `${receiveCount} - ${payCount}`;
};

/** 详情已带回全部费用，标签上的收 - 付计数直接由它算，不再调费用接口 */
const loadOrderFeeNumber = async () => {
  if (!editId.value) return;
  try {
    const detail = await getAirExportDetail(editId.value);
    updateFeeNumber(detail);
  } catch {
    // 费用数量仅用于 Tab 标签展示，失败时静默
  }
};
loadOrderFeeNumber();

const onFormSaved = (detail: AirExportAdminApi.AirExportDto) => {
  savedDetail.value = detail;
  // 顺带用最新详情刷新费用 Tab 徽标，不再重复拉详情接口
  updateFeeNumber(detail);
  emit('saved', detail);
};

const onTabClick = (tab: { key: TabKey; sectionKey?: SectionKey }) => {
  activeTab.value = tab.key;
  if (!tab.sectionKey) return;
  nextTick(() => {
    formRef.value?.scrollToSection(tab.sectionKey as SectionKey);
  });
};

// 编辑工作台未保存拦截：无论当前停留在哪个内部标签，离开路由时都基于基础信息表单的脏状态二次确认
useUnsavedGuard({
  isDirty: async () => {
    const check = formRef.value?.isFormDirty;
    return check ? await check() : false;
  },
});

const contentTabsStyle = {
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
  padding: '8px',
  overflowX: 'auto',
  position: 'sticky',
  top: '0',
  zIndex: 20,
  background: '#fff',
  border: '1px solid #e8e8e8',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
} as const;

const contentTabStyle = {
  padding: '6px 10px',
  fontSize: '12px',
  color: '#595959',
  cursor: 'pointer',
  borderBottom: '2px solid transparent',
  whiteSpace: 'nowrap',
} as const;

const getContentTabStyle = (isActive: boolean) =>
  isActive
    ? {
        ...contentTabStyle,
        fontWeight: 600,
        color: '#1677ff',
        borderBottomColor: '#1677ff',
      }
    : contentTabStyle;
</script>

<template>
  <Page auto-content-height content-class="!p-0">
    <div class="flex min-w-0 flex-1 flex-col">
      <div class="content-tabs" :style="contentTabsStyle">
        <span
          v-for="tab in tabs"
          :key="tab.key"
          class="content-tab"
          :class="{ 'content-tab--active': activeTab === tab.key }"
          :style="getContentTabStyle(activeTab === tab.key)"
          @click="onTabClick(tab)"
        >
          {{ tab.label }}
        </span>
      </div>
      <div class="flex flex-1 items-stretch gap-3">
        <div class="flex min-w-0 flex-1 flex-col">
          <KeepAlive include="AirExportOrderFee">
            <orderFee v-if="activeTab === 'fee'" :latest-detail="savedDetail" />
          </KeepAlive>
          <KeepAlive include="AirExportAttachments">
            <attachments v-if="activeTab === 'attachments'" />
          </KeepAlive>
          <div
            v-if="activeTab === 'tracking'"
            class="m-3 flex flex-1 flex-col rounded-xl bg-white p-4"
          >
            <YundangAirTrackingPanel
              :air-export-id="editId"
              resolve-state-from-subscription
            />
          </div>
          <KeepAlive include="AirExportAdminForm">
            <Form
              v-if="activeTab === 'basic'"
              ref="formRef"
              embedded
              @saved="onFormSaved"
            />
          </KeepAlive>
        </div>
      </div>
    </div>
  </Page>
</template>
