<script lang="ts" setup>
import type { BillingPeriodAdminApi } from '#/api/sea-export/billing-period-admin';

import { computed, nextTick, ref, watch } from 'vue';

import { useAccess } from '@vben/access';
import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { Button, message, Modal as AntModal, Space } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { syncClientBillingPeriod } from '#/api/sea-export/client-admin';
import { getCurrencyDetail } from '#/api/system/base-data/currency-admin';
import { getMyPermissionCompanies } from '#/api/system/organization-unit';
import { getUserListByIds } from '#/api/system/user-admin';
import { $t } from '#/locales';
import { createAbpPermission } from '#/utils/abp-permission';

import AddModal from './add-modal.vue';
import {
  MonthsOptions,
  SettlementDayOptions,
  SettlementTypeOptions,
  useColumns,
} from './data';

defineOptions({ name: 'ClientPaymentList' });

const props = withDefaults(
  defineProps<{
    /** 客户未进入申请修改时，账期只读 */
    readonly?: boolean;
  }>(),
  { readonly: false },
);

/** 账期随客户权限，不再使用已删除的 Admin.Client.BillingPeriod.* */
const perm = createAbpPermission('Admin.Client');
const { hasAccessByCodes } = useAccess();
const canMutateBillingPeriod = computed(
  () => !props.readonly && hasAccessByCodes([perm.add, perm.edit]),
);

type BillingPeriodRow = BillingPeriodAdminApi.ClientBillingPeriodForViewDto & {
  _localKey: string;
  organizationUnitIds?: number[];
  userIds?: number[];
  codeSourceIds?: number[];
};

const periods = defineModel<BillingPeriodRow[]>({ default: () => [] });

function hasPersistedId(id: unknown) {
  return id !== undefined && id !== null && id !== '' && id !== 0 && id !== '0';
}

function createLocalKey() {
  return `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function ensureRow(row: BillingPeriodRow): BillingPeriodRow {
  const organizationUnitIds =
    row.organizationUnitIds ??
    row.cbpOrgs
      ?.map((item) => item.organizationUnitId)
      .filter((id) => id !== undefined && id !== null) ??
    [];
  const userIds =
    row.userIds ??
    row.cbpUsers
      ?.map((item) => item.userId)
      .filter((id) => id !== undefined && id !== null) ??
    [];
  const codeSourceIds =
    row.codeSourceIds ??
    row.cbpCodeSources
      ?.map((item) => item.codeSourceId)
      .filter((id) => id !== undefined && id !== null) ??
    [];
  return {
    ...row,
    _localKey:
      row._localKey ||
      (hasPersistedId(row.id) ? `id-${row.id}` : createLocalKey()),
    organizationUnitIds,
    userIds,
    codeSourceIds,
  };
}

watch(
  periods,
  (list) => {
    if (!list?.some((row) => !row._localKey)) return;
    periods.value = list.map((row) => ensureRow(row));
  },
  { deep: true, immediate: true },
);

/** 弹窗只回传 id，组织/销售/币别名称按 id 补齐，否则新增的行这几列是空的 */
const orgNameMap = ref(new Map<string, string>());
const userNameMap = ref(new Map<string, string>());
const currencyNameMap = ref(new Map<string, string>());

let companiesLoaded = false;
let companiesLoading = false;
const requestedUserIds = new Set<string>();
const requestedCurrencyIds = new Set<string>();

function collectMissingIds(
  ids: Array<null | number | string | undefined>,
  known: Map<string, string>,
) {
  return [
    ...new Set(
      ids
        .filter((id) => id !== undefined && id !== null && id !== '')
        .map((id) => String(id)),
    ),
  ].filter((id) => !known.has(id));
}

function seedLabelsFromRows(rows: BillingPeriodRow[]) {
  for (const row of rows) {
    for (const org of row.cbpOrgs ?? []) {
      const name = org.organizationUnit?.name;
      if (name) orgNameMap.value.set(String(org.organizationUnitId), name);
    }
    for (const user of row.cbpUsers ?? []) {
      if (user.userNickName) {
        userNameMap.value.set(String(user.userId), user.userNickName);
      }
    }
    const currencyName = row.creditCurrency?.cnName || row.creditCurrency?.code;
    if (row.creditCurrencyId && currencyName) {
      currencyNameMap.value.set(String(row.creditCurrencyId), currencyName);
    }
  }
}

async function resolveOrgNames(rows: BillingPeriodRow[]) {
  const missing = collectMissingIds(
    rows.flatMap((row) => row.organizationUnitIds ?? []),
    orgNameMap.value,
  );
  if (missing.length === 0 || companiesLoaded || companiesLoading) return;
  companiesLoading = true;
  try {
    const companies = await getMyPermissionCompanies();
    for (const company of companies) {
      if (company.name) orgNameMap.value.set(String(company.id), company.name);
    }
    companiesLoaded = true;
  } finally {
    companiesLoading = false;
  }
}

async function resolveUserNames(rows: BillingPeriodRow[]) {
  const missing = collectMissingIds(
    rows.flatMap((row) => row.userIds ?? []),
    userNameMap.value,
  ).filter((id) => !requestedUserIds.has(id));
  if (missing.length === 0) return;
  for (const id of missing) requestedUserIds.add(id);
  try {
    const users = await getUserListByIds(missing, { silent: true });
    for (const user of users) {
      const name = (user.nickName || user.userName || '').trim();
      if (name) userNameMap.value.set(String(user.id), name);
    }
  } catch {
    for (const id of missing) requestedUserIds.delete(id);
  }
}

async function resolveCurrencyNames(rows: BillingPeriodRow[]) {
  const missing = collectMissingIds(
    rows.map((row) => row.creditCurrencyId),
    currencyNameMap.value,
  ).filter((id) => !requestedCurrencyIds.has(id));
  if (missing.length === 0) return;
  await Promise.all(
    missing.map(async (id) => {
      requestedCurrencyIds.add(id);
      try {
        const detail = await getCurrencyDetail(id);
        const name = detail.cnName || detail.code || '';
        if (name) currencyNameMap.value.set(id, name);
      } catch {
        requestedCurrencyIds.delete(id);
      }
    }),
  );
}

watch(
  periods,
  (list) => {
    const rows = list ?? [];
    if (rows.length === 0) return;
    seedLabelsFromRows(rows);
    void resolveOrgNames(rows);
    void resolveUserNames(rows);
    void resolveCurrencyNames(rows);
  },
  { deep: true, immediate: true },
);

function getSelectedRows() {
  return (gridApi.grid?.getCheckboxRecords?.() ?? []) as BillingPeriodRow[];
}

const handleBatchDelete = () => {
  const selectedRows = getSelectedRows();
  if (selectedRows.length === 0) {
    message.warning($t('common.selectAtLeastOne'));
    return;
  }
  AntModal.confirm({
    title: $t('common.confirmDelete'),
    content: $t('common.confirmDeleteItems', [selectedRows.length]),
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    okType: 'danger',
    onOk: () => {
      const keys = new Set(selectedRows.map((row) => row._localKey));
      periods.value = periods.value.filter((row) => !keys.has(row._localKey));
      message.success($t('common.deleteSuccess'));
    },
  });
};

const handleSync = () => {
  const selectedRows = getSelectedRows();
  if (selectedRows.length !== 1) {
    message.warning('请选择一条账期记录进行同步');
    return;
  }
  const row = selectedRows[0];
  if (!row || !hasPersistedId(row.id)) {
    message.warning('请先保存客户后再同步账期');
    return;
  }
  AntModal.confirm({
    title: '同步账期',
    content:
      '将按当前账期规则重算该客户票结历史业务的应结日期与结算方式，是否继续？',
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    onOk: async () => {
      const changedCount = await syncClientBillingPeriod({ id: row.id });
      message.success(`同步完成，共改动 ${changedCount ?? 0} 票业务`);
    },
  });
};

const formatPeriod = (
  row: BillingPeriodAdminApi.ClientBillingPeriodForViewDto,
): string => {
  const settlementTypeText =
    SettlementTypeOptions.find((item) => item.value === row.settlementType)
      ?.label || '';

  if (row.permanent) {
    return `${settlementTypeText} - 长期有效`;
  }

  let periodText = settlementTypeText;
  if (row.settlementType === 0 && row.addDays) {
    periodText += ` - +${row.addDays}天`;
  }
  if (row.settlementType === 1 && row.months) {
    const monthsText =
      MonthsOptions.find((item) => item.value === row.months)?.label || '';
    periodText += ` - ${monthsText}`;
  }
  if (row.settlementType === 2 && row.settlementDay) {
    const dayText =
      SettlementDayOptions.find((item) => item.value === row.settlementDay)
        ?.label || '';
    periodText += ` - ${dayText}`;
  }
  if (row.days) {
    periodText += ` - ${row.days}天`;
  }
  return periodText;
};

const formatOrganizationUnitName = (row: BillingPeriodRow): string => {
  const ids = row.organizationUnitIds ?? [];
  return ids
    .map(
      (id) =>
        row.cbpOrgs?.find(
          (item) => String(item.organizationUnitId) === String(id),
        )?.organizationUnit?.name ||
        orgNameMap.value.get(String(id)) ||
        '',
    )
    .filter(Boolean)
    .join(', ');
};

const formatUserNames = (row: BillingPeriodRow): string => {
  const ids = row.userIds ?? [];
  return ids
    .map(
      (id) =>
        row.cbpUsers?.find((item) => String(item.userId) === String(id))
          ?.userNickName ||
        userNameMap.value.get(String(id)) ||
        '',
    )
    .filter(Boolean)
    .join(', ');
};

const formatCreditCurrency = (
  row: BillingPeriodRow,
): BillingPeriodAdminApi.CurrencySimpleDto | undefined => {
  if (!row.creditCurrencyId) return undefined;
  const cnName =
    row.creditCurrency?.cnName ||
    currencyNameMap.value.get(String(row.creditCurrencyId)) ||
    row.creditCurrency?.code ||
    '';
  return { code: '', enName: '', ...row.creditCurrency, cnName };
};

const formatPayment = (row: BillingPeriodRow) => {
  const next = { ...row };
  next.period = formatPeriod(row);
  next.organizationUnitName = formatOrganizationUnitName(row);
  next.userName = formatUserNames(row);
  next.creditCurrency = formatCreditCurrency(row);
  return next;
};

function mergeFormRow(
  prev: BillingPeriodRow | undefined,
  form: Record<string, any>,
): BillingPeriodRow {
  const organizationUnitIds = (form.organizationUnitIds ?? []) as number[];
  const userIds = (form.userIds ?? []) as number[];
  const codeSourceIds = (form.codeSourceIds ?? []) as number[];
  const id = hasPersistedId(form.id) ? form.id : (prev?.id ?? 0);
  /** 改了币别就丢掉旧的币别对象，否则列上还是旧币别名 */
  const keepCurrency =
    String(prev?.creditCurrencyId ?? '') ===
    String(form.creditCurrencyId ?? '');
  return ensureRow({
    ...(prev ?? ({} as BillingPeriodRow)),
    ...form,
    id,
    _localKey: form._localKey || prev?._localKey || createLocalKey(),
    organizationUnitIds,
    userIds,
    codeSourceIds,
    cbpOrgs: organizationUnitIds.map((organizationUnitId) => {
      const old = prev?.cbpOrgs?.find(
        (item) => item.organizationUnitId === organizationUnitId,
      );
      return old ?? { id: 0, organizationUnitId };
    }),
    cbpUsers: userIds.map((userId) => {
      const old = prev?.cbpUsers?.find((item) => item.userId === userId);
      return old ?? { id: 0, userId, userNickName: '' };
    }),
    cbpCodeSources: codeSourceIds.map((codeSourceId) => {
      const old = prev?.cbpCodeSources?.find(
        (item) => item.codeSourceId === codeSourceId,
      );
      return old ?? { id: 0, codeSourceId };
    }),
    attachments: form.attachments ?? prev?.attachments ?? [],
    permanent: !!form.permanent,
    dateType: form.dateType ?? 0,
    creditCurrency: keepCurrency ? prev?.creditCurrency : undefined,
    /** 未保存的行后端还没有录入时间，先用本地时间占位，保存后按详情回填 */
    creationTime: prev?.creationTime ?? new Date().toISOString(),
  });
}

const tableRows = computed(() =>
  periods.value.map((row) => formatPayment(ensureRow(row))),
);

const [Grid, gridApi] = useVbenVxeGrid<BillingPeriodRow>({
  gridOptions: {
    columns: useColumns(),
    data: [],
    height: 360,
    keepSource: true,
    checkboxConfig: {
      highlight: true,
      reserve: true,
      trigger: 'default',
    },
    rowConfig: {
      keyField: '_localKey',
      isHover: true,
    },
    pagerConfig: {
      enabled: false,
    },
    toolbarConfig: {
      custom: true,
      export: false,
      refresh: false,
      zoom: false,
    },
  },
  gridEvents: {
    cellDblclick: ({ row }: { row: BillingPeriodRow }) => {
      if (props.readonly) return;
      editContact(row);
    },
  },
});

watch(
  tableRows,
  async (rows) => {
    await nextTick();
    gridApi.grid?.loadData?.(rows);
  },
  { deep: true, immediate: true },
);

const [Modal, modalApi] = useVbenModal({
  connectedComponent: AddModal,
  class: 'w-[1200px]',
});

const addContactData = (data: Record<string, any>) => {
  periods.value = [...periods.value, mergeFormRow(undefined, data)];
  modalApi.close();
};

const editContactData = (data: Record<string, any>) => {
  periods.value = periods.value.map((row) => {
    const sameKey = data._localKey && row._localKey === data._localKey;
    const sameId = hasPersistedId(data.id) && row.id === data.id;
    return sameKey || sameId ? mergeFormRow(row, data) : row;
  });
  modalApi.close();
};

const addContact = () => {
  modalApi.setData(undefined);
  modalApi.open();
};

const editContact = (data: BillingPeriodRow) => {
  modalApi.setData(data).open();
};
</script>

<template>
  <div class="client-billing-period-panel">
    <Grid :table-title="$t('seaExport.client.paymentTerms.title')">
      <template #toolbar-tools>
        <Space>
          <Button
            v-if="canMutateBillingPeriod"
            type="primary"
            @click="addContact"
          >
            <IconifyIcon icon="ant-design:plus-outlined" class="size-4" />
            {{ $t('common.create') }}
          </Button>
          <Button
            v-if="!readonly && hasAccessByCodes([perm.edit])"
            @click="handleSync"
          >
            <IconifyIcon icon="ant-design:sync-outlined" class="size-4" />
            同步账期
          </Button>
          <Button
            v-if="canMutateBillingPeriod"
            danger
            @click="handleBatchDelete"
          >
            <IconifyIcon icon="ant-design:delete-outlined" class="size-4" />
            {{ $t('common.batchDelete') }}
          </Button>
        </Space>
      </template>
    </Grid>
  </div>

  <Modal @add="addContactData" @edit="editContactData" />
</template>
