<script lang="ts" setup>
import { computed, nextTick, ref, shallowRef, watch } from 'vue';

import { Page } from '@vben/common-ui';

import type { AirExportAdminApi } from '#/api/air-export/air-export-admin';

import { getAirExportDetail } from '#/api/air-export/air-export-admin';
import { useKeepAliveRouteParamId } from '#/composables/use-keep-alive-route-param-id';
import { useUnsavedGuard } from '#/composables/use-unsaved-guard';
import { $t } from '#/locales';
import { buildBrandStorageKey } from '#/utils/brand-storage';

import attachments from './attachments/index.vue';
import changeOrder from './changeOrder/index.vue';
import Form from './basic-info-form/form.vue';
import AirTrackingPanel from './modules/air-tracking-panel.vue';
import orderFee from './orderFee/index.vue';
import { useAirExportTabTitle } from './use-air-export-tab-title';

defineOptions({ name: 'AirExportEdit' });

type SectionKey = 'basic' | 'cargo' | 'date' | 'leg' | 'party';
type TabKey = 'attachments' | 'basic' | 'fee' | 'party' | 'tracking';
type FormExpose = {
  isFormDirty: () => boolean | Promise<boolean>;
  scrollToSection: (key: SectionKey) => void;
};
type FeeExpose = {
  isFeeDirty?: () => boolean;
};

/** 与海出对齐：标签包含基础信息、应收应付费用、更改单、附件、运踪五个 */
const VALID_TAB_KEYS: readonly TabKey[] = [
  'basic',
  'fee',
  'party',
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
const feeRef = ref<FeeExpose | null>(null);

/** 编辑页对外暴露：基础信息保存成功后携带最新详情 DTO */
const emit = defineEmits<{
  saved: [detail: AirExportAdminApi.AirExportDto];
}>();

/** 最近一次保存成功后的最新详情，下发给只读费用 Tab 联动刷新 */
const savedDetail = shallowRef<AirExportAdminApi.AirExportDto>();

const editId = useKeepAliveRouteParamId();

const feeNumber = ref<string>('');

/** 工作台级页签标题：不依赖基础信息 Form 是否挂载（记忆 Tab 可能落在费用等） */
const tabMblNum = ref<string | undefined>();
const tabCommissionNum = ref<string | undefined>();
const isOrderSaved = computed(() => !!editId.value);

function applyTabTitleFromDetail(
  detail: AirExportAdminApi.AirExportDto | null | undefined,
) {
  const to = detail?.transportOrder;
  tabMblNum.value = to?.mblNum?.trim() || undefined;
  tabCommissionNum.value = to?.commissionNum?.trim() || undefined;
}

/** 由详情计算费用 Tab 徽标上的收 - 付计数 */
const updateFeeNumber = (detail: AirExportAdminApi.AirExportDto) => {
  const fees = detail.transportOrder?.orderFees ?? [];
  const receiveCount = fees.filter((item) => item.paySide === 0).length;
  const payCount = fees.filter((item) => item.paySide === 1).length;
  feeNumber.value = `${receiveCount} - ${payCount}`;
};

const onFormSaved = (detail: AirExportAdminApi.AirExportDto) => {
  savedDetail.value = detail;
  applyTabTitleFromDetail(detail);
  // 顺带用最新详情刷新费用 Tab 徽标，不再重复拉详情接口
  updateFeeNumber(detail);
  emit('saved', detail);
};

useAirExportTabTitle(tabMblNum, tabCommissionNum, isOrderSaved, {
  // 关闭工作台时由路由/页签关闭清理；勿在此处随子 Form 卸载复位
  resetOnUnmount: true,
});

async function syncEditorFromOrder(id: string | undefined) {
  if (!id) {
    tabMblNum.value = undefined;
    tabCommissionNum.value = undefined;
    return;
  }
  try {
    const detail = await getAirExportDetail(id);
    // 切单过程中以最新 editId 为准，避免慢请求回写旧票
    if (String(editId.value ?? '') !== String(id)) return;
    applyTabTitleFromDetail(detail);
    updateFeeNumber(detail);
  } catch {
    // 详情失败时保留路由默认「空运出口」，费用徽标静默
  }
}

/** 按委托 ID 记忆当前 Tab，离开后再进入时恢复 */
const activeTab = ref<TabKey>(readStoredTab(editId.value) ?? 'basic');

watch(
  editId,
  (id) => {
    activeTab.value = readStoredTab(id) ?? 'basic';
    void syncEditorFromOrder(id);
  },
  { immediate: true },
);

watch(activeTab, (tab) => {
  writeStoredTab(editId.value, tab);
});

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
  { key: 'party', label: '更改单' },
  { key: 'attachments', label: $t('airExport.export.attachments.tabTitle') },
  { key: 'tracking', label: $t('tracking.trackingInfo') },
]);

const onTabClick = (tab: { key: TabKey; sectionKey?: SectionKey }) => {
  activeTab.value = tab.key;
  if (!tab.sectionKey) return;
  nextTick(() => {
    formRef.value?.scrollToSection(tab.sectionKey as SectionKey);
  });
};

// 编辑工作台未保存拦截：基础信息或应收应付任一未落库都算脏
useUnsavedGuard({
  isDirty: async () => {
    const check = formRef.value?.isFormDirty;
    if (check && (await check())) return true;
    return feeRef.value?.isFeeDirty?.() ?? false;
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
            <orderFee
              v-if="activeTab === 'fee'"
              ref="feeRef"
              :latest-detail="savedDetail"
            />
          </KeepAlive>
          <KeepAlive include="AirChangeOrder">
            <changeOrder
              v-if="activeTab === 'party'"
              :latest-detail="savedDetail"
            />
          </KeepAlive>
          <KeepAlive include="AirExportAttachments">
            <attachments v-if="activeTab === 'attachments'" />
          </KeepAlive>
          <div
            v-if="activeTab === 'tracking'"
            class="m-3 flex flex-1 flex-col rounded-xl bg-white p-4"
          >
            <AirTrackingPanel :air-export-id="editId" />
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
