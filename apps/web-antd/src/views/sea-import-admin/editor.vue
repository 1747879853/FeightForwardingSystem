<script lang="ts" setup>
import type { SeaImportAdminApi } from '#/api/sea-import/sea-import-admin';

import { computed, nextTick, ref, shallowRef, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';

import { getOrderFeePagedList } from '#/api/sea-import/order-fee-admin';
import { FeituoTrackingAdminApi } from '#/api/tracking/feituo-tracking-admin';
import { ContainerTrackingPanel } from '#/components/tracking';
import { useUnsavedGuard } from '#/composables/use-unsaved-guard';
import { $t } from '#/locales';
import { buildBrandStorageKey } from '#/utils/brand-storage';

import attachments from './attachments/index.vue';
import Form from './basic-info-form/form.vue';
import changeOrder from './changeOrder/index.vue';
import orderFee from './orderFee/index.vue';

type SectionKey = 'basic' | 'cargo' | 'party' | 'port' | 'shipment';
type TabKey = 'attachments' | 'basic' | 'changeOrder' | 'fee' | 'tracking';
type FormExpose = {
  isFormDirty: () => boolean | Promise<boolean>;
  scrollToSection: (key: SectionKey) => void;
};

const VALID_TAB_KEYS: readonly TabKey[] = [
  'basic',
  'fee',
  'changeOrder',
  'attachments',
  'tracking',
] as const;

const TAB_STORAGE_KEY_PREFIX = 'sea-import-edit-active-tab';

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
  saved: [detail: SeaImportAdminApi.SeaImportDto];
}>();

/** 最近一次保存成功后的最新详情，下发给费用/更改单 Tab 联动刷新 */
const savedDetail = shallowRef<SeaImportAdminApi.SeaImportDto>();

const onFormSaved = (detail: SeaImportAdminApi.SeaImportDto) => {
  savedDetail.value = detail;
  emit('saved', detail);
};

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
  feeNumber.value ? `应收应付 ${feeNumber.value}` : '应收应付',
);

const tabs = computed<
  { key: TabKey; label: string; sectionKey?: SectionKey }[]
>(() => [
  { key: 'basic', label: '基础信息', sectionKey: 'basic' },
  { key: 'fee', label: feeName.value },
  { key: 'changeOrder', label: '更改单' },
  { key: 'attachments', label: $t('seaImport.import.attachments.tabTitle') },
  { key: 'tracking', label: $t('tracking.trackingInfo') },
]);

const setFeeNumber = (recCount: number, payCount: number) => {
  feeNumber.value = `${recCount} - ${payCount}`;
};

const loadOrderFeeNumber = async () => {
  if (!editId.value) return;
  try {
    const [receive, pay] = await Promise.all(
      [0, 1].map((paySide) =>
        getOrderFeePagedList({
          TransportOrderId: editId.value,
          PaySide: paySide,
          PageIndex: 1,
          PageSize: 999,
        }),
      ),
    );
    setFeeNumber(receive?.totalCount ?? 0, pay?.totalCount ?? 0);
  } catch {
    // 费用数量仅用于 Tab 标签展示，失败时静默
  }
};
loadOrderFeeNumber();

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
          <KeepAlive include="ChangeOrder">
            <changeOrder
              v-if="activeTab === 'changeOrder'"
              :latest-detail="savedDetail"
            />
          </KeepAlive>
          <KeepAlive include="OrderFee">
            <orderFee v-if="activeTab === 'fee'" :latest-detail="savedDetail" />
          </KeepAlive>
          <KeepAlive include="SeaImportAttachments">
            <attachments v-if="activeTab === 'attachments'" />
          </KeepAlive>
          <div
            v-if="activeTab === 'tracking'"
            class="m-3 flex flex-1 flex-col rounded-xl bg-white p-4"
          >
            <ContainerTrackingPanel
              :biz-type="FeituoTrackingAdminApi.TrackingBizType.SeaImport"
              load-detail
              :order-id="editId"
            />
          </div>
          <KeepAlive include="SeaImportAdminForm">
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
