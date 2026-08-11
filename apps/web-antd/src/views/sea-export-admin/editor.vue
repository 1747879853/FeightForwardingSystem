<script lang="ts" setup>
import { computed, nextTick, ref, shallowRef, watch } from 'vue';
import { Page } from '@vben/common-ui';
import { useRoute } from 'vue-router';
import Form from './basic-info-form/form.vue';
import orderFee from './orderFee/index.vue';
import SeparateBill from './modules/separate-bill.vue';
import changeOrder from '#/views/sea-export-admin/changeOrder/index.vue';
import dispatch from '#/views/sea-export-admin/dispatch/index.vue';
import attachments from '#/views/sea-export-admin/attachments/index.vue';
import YundangTrackingPanel from './modules/yundang-tracking-panel.vue';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';
import { getSeaExportDetail } from '#/api/sea-export/sea-export-admin';
import { getOrderFeePagedList } from '#/api/sea-export/order-fee-admin';
import { clearOrderDetailCache } from '#/views/sea-export-admin/orderFee/modules/composables/useOrderFeeLinkage';
import { useUnsavedGuard } from '#/composables/use-unsaved-guard';
import { $t } from '#/locales';
import { buildBrandStorageKey } from '#/utils/brand-storage';

import { useSeaExportTabTitle } from './use-sea-export-tab-title';

type SectionKey = 'basic' | 'party' | 'shipment' | 'port' | 'cargo';
type FormSectionTabKey = 'basic' | 'party' | 'shipment' | 'port';
type TabKey =
  | FormSectionTabKey
  | 'fee'
  | 'attachments'
  | 'dispatch'
  | 'billInfo'
  | 'tracking'
  | 'issueRecord'
  | 'changeHistory';
type FormExpose = {
  isFormDirty: () => boolean | Promise<boolean>;
  scrollToSection: (key: SectionKey) => void;
};

/** 仅含当前可见且有对应面板的 Tab；隐藏 key 不参与记忆恢复，避免空白页 */
const VALID_TAB_KEYS: readonly TabKey[] = [
  'basic',
  'fee',
  'party',
  'attachments',
  'dispatch',
  'billInfo',
  'tracking',
] as const;

const TAB_STORAGE_KEY_PREFIX = 'sea-export-edit-active-tab';

function isValidTabKey(key: string): key is TabKey {
  return (VALID_TAB_KEYS as readonly string[]).includes(key);
}

function getTabStorageKey(id: string) {
  return buildBrandStorageKey(`${TAB_STORAGE_KEY_PREFIX}:${id}`);
}

function readStoredTab(id: string | undefined): TabKey | null {
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

const props = withDefaults(
  defineProps<{
    /** 业务联系单等宿主内嵌时禁用海出页签标题改写 */
    disableTabTitle?: boolean;
  }>(),
  {
    disableTabTitle: false,
  },
);

/** 编辑页对外暴露：基础信息保存成功后携带最新详情 DTO */
const emit = defineEmits<{
  saved: [detail: SeaExportAdminApi.SeaExportDto];
}>();

/** 最近一次保存成功后的最新详情，下发给费用/更改单 Tab 联动刷新 */
const savedDetail = shallowRef<SeaExportAdminApi.SeaExportDto>();

/** 工作台级页签标题：不依赖基础信息 Form 是否挂载（记忆 Tab 可能落在费用等） */
const tabMblNum = ref<string | undefined>();
const tabCommissionNum = ref<string | undefined>();
const tabTitleEnabled = computed(() => !props.disableTabTitle);
const isOrderSaved = computed(() => !!editId.value);

function applyTabTitleFromDetail(
  detail: SeaExportAdminApi.SeaExportDto | null | undefined,
) {
  const to = detail?.transportOrder;
  tabMblNum.value = to?.mblNum?.trim() || undefined;
  tabCommissionNum.value = to?.commissionNum?.trim() || undefined;
}

const onFormSaved = (detail: SeaExportAdminApi.SeaExportDto) => {
  savedDetail.value = detail;
  applyTabTitleFromDetail(detail);
  // 清掉费用联动里永不过期的订单详情缓存，避免结算对象/箱型等沿用旧数据
  clearOrderDetailCache(editId.value);
  emit('saved', detail);
};

const editId = computed<string | undefined>(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0];
  return id ? String(id) : undefined;
});

useSeaExportTabTitle(tabMblNum, tabCommissionNum, isOrderSaved, {
  enabled: tabTitleEnabled,
  // 关闭工作台时由路由/页签关闭清理；勿在此处随子 Form 卸载复位
  resetOnUnmount: true,
});

async function syncTabTitleFromOrder(id: string | undefined) {
  if (!id || props.disableTabTitle) {
    tabMblNum.value = undefined;
    tabCommissionNum.value = undefined;
    return;
  }
  try {
    const detail = await getSeaExportDetail(id);
    // 切单过程中以最新 editId 为准，避免慢请求回写旧票
    if (String(editId.value ?? '') !== String(id)) return;
    applyTabTitleFromDetail(detail);
  } catch {
    // 详情失败时保留路由默认「海运出口」，不阻断进页
  }
}

/** 按委托 ID 记忆当前 Tab，离开后再进入时恢复 */
const activeTab = ref<TabKey>(readStoredTab(editId.value) ?? 'basic');

watch(
  editId,
  (id) => {
    activeTab.value = readStoredTab(id) ?? 'basic';
    void syncTabTitleFromOrder(id);
  },
  { immediate: true },
);

watch(activeTab, (tab) => {
  writeStoredTab(editId.value, tab);
});

const feeName = computed(() => `应收应付 ${feeNumber.value}`);
const feeNumber = ref<string>('');

/** 将当前应收/应付数量写入费用 Tab 标签 */
const setFeeNumber = (recCount: number, payCount: number) => {
  feeNumber.value = `${recCount} - ${payCount}`;
  tabs.value = tabs.value.map((tab) => {
    if (tab.key === 'fee') {
      return { ...tab, label: feeName.value };
    }
    return tab;
  });
};

const getOrderFeeNumber = async () => {
  let params = {
    TransportOrderId: editId.value,
    PageIndex: 1,
    PageSize: 999,
  };
  const res = await getOrderFeePagedList(params);
  setFeeNumber(
    res.items.filter((item) => item.paySide === 0).length,
    res.items.filter((item) => item.paySide === 1).length,
  );
  return;
};
getOrderFeeNumber();

/** 费用表新增/删除时，实时刷新 Tab 上的应收/应付数量 */
const onFeeCountChange = (payload: { recCount: number; payCount: number }) => {
  setFeeNumber(payload.recCount, payload.payCount);
};

const tabs = ref<{ key: TabKey; label: string; sectionKey?: SectionKey }[]>([
  { key: 'basic', label: '基础信息', sectionKey: 'basic' },
  { key: 'fee', label: feeName.value },
  { key: 'party', label: '更改单' },
  // 暂时隐藏：服务详情 / 单证信息 / 问题记录 / 修改历史
  // { key: 'shipment', label: '服务详情', sectionKey: 'shipment' },
  // { key: 'port', label: '单证信息', sectionKey: 'port' },
  { key: 'attachments', label: $t('seaExport.export.attachments.tabTitle') },
  { key: 'dispatch', label: '派车' },
  { key: 'billInfo', label: '分单' },
  { key: 'tracking', label: $t('seaExport.yundang.trackingInfo') },
  // { key: 'issueRecord', label: '问题记录' },
  // { key: 'changeHistory', label: '修改历史' },
]);

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
              v-if="activeTab === 'party'"
              :latest-detail="savedDetail"
            />
          </KeepAlive>
          <KeepAlive include="OrderFee">
            <orderFee
              v-if="activeTab === 'fee'"
              :latest-detail="savedDetail"
              @fee-count-change="onFeeCountChange"
            />
          </KeepAlive>
          <KeepAlive include="SeaExportDispatch">
            <dispatch v-if="activeTab === 'dispatch'" />
          </KeepAlive>
          <KeepAlive include="SeaExportSeparateBill">
            <SeparateBill v-if="activeTab === 'billInfo'" />
          </KeepAlive>
          <KeepAlive include="SeaExportAttachments">
            <attachments v-if="activeTab === 'attachments'" />
          </KeepAlive>
          <div
            v-if="activeTab === 'tracking'"
            class="m-3 flex flex-1 flex-col rounded-xl bg-white p-4"
          >
            <YundangTrackingPanel
              :sea-export-id="editId"
              resolve-state-from-subscription
            />
          </div>
          <KeepAlive include="SeaExportAdminForm">
            <Form
              v-if="activeTab === 'basic'"
              :key="props.disableTabTitle ? 'embed-no-tab-title' : 'tab-title'"
              ref="formRef"
              embedded
              :disable-tab-title="props.disableTabTitle"
              @saved="onFormSaved"
            />
          </KeepAlive>
        </div>
      </div>
    </div>
  </Page>
</template>
