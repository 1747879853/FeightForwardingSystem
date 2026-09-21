<script lang="ts" setup>
import type { ClientAdminApi } from '#/api/sea-export/client-admin';

import { computed, ref, watch } from 'vue';

import { Empty, Switch } from 'ant-design-vue';
import dayjs from 'dayjs';

import { getAreaAndParents } from '#/api/common/area';
import { getCodeSourceDetail } from '#/api/system/base-data/code-source-admin';
import { getCountryCodeDetail } from '#/api/system/base-data/country-code-admin';
import { getCurrencyDetail } from '#/api/system/base-data/currency-admin';
import { getLaneCodeDetail } from '#/api/system/base-data/lane-code-admin';
import {
  getMyPermissionCompanies,
  getOrganizationUnit,
} from '#/api/system/organization-unit';
import { getUserListByIds } from '#/api/system/user-admin';
import { formatIndustryCategories } from '#/views/client/base/data';
import {
  getAddressTypeOptions,
  getClientLevelOptions,
  getClientSourceOptions,
  getClientTypeOptions,
  getEnterpriseTypeOptions,
  getSupplierLevelOptions,
} from '#/views/client/base/options';
import { getClientSharedTypeOptions } from '#/views/client/base/shared-type';
import { getCargoTypeOptions } from '#/views/sea-export-admin/data';

defineOptions({ name: 'ClientModifyDiff' });

type ClientEdit = ClientAdminApi.ClientEditDto;

interface Props {
  /** 发起申请那一刻客户的原值 */
  from?: ClientEdit | null;
  /** 要修改为的客户全量信息；客户提交时作为新增内容 */
  to?: ClientEdit | null;
  /**
   * diff：申请修改前后对比。
   * create：客户提交，只展示新增内容。
   */
  mode?: 'create' | 'diff';
}

const props = withDefaults(defineProps<Props>(), {
  from: null,
  mode: 'diff',
  to: null,
});

const EMPTY_TEXT = '—';

/** 按 id 补齐展示名；详情快照通常只带外键 id */
const userNameMap = ref(new Map<string, string>());
const orgNameMap = ref(new Map<string, string>());
const currencyNameMap = ref(new Map<string, string>());
const countryNameMap = ref(new Map<string, string>());
const areaNameMap = ref(new Map<string, string>());
const codeSourceNameMap = ref(new Map<string, string>());
const laneNameMap = ref(new Map<string, string>());

const requestedUserIds = new Set<string>();
const requestedOrgIds = new Set<string>();
const requestedCurrencyIds = new Set<string>();
const requestedCountryIds = new Set<string>();
const requestedAreaIds = new Set<string>();
const requestedCodeSourceIds = new Set<string>();
const requestedLaneIds = new Set<string>();

let companiesLoaded = false;
let companiesLoading = false;

const collectUserIds = (dto?: ClientEdit | null): number[] => {
  if (!dto) return [];
  const stakeholderIds = [
    ...(dto.sales ?? []),
    ...(dto.customerServices ?? []),
    ...(dto.operations ?? []),
    ...(dto.documentations ?? []),
  ].map((item) => item.userId);
  const billingUserIds = (dto.billingPeriods ?? []).flatMap(
    (item) => item.userIds ?? [],
  );
  return [
    ...stakeholderIds,
    ...(dto.reconcilerUserIds ?? []),
    ...billingUserIds,
  ].filter((id): id is number => id !== undefined && id !== null);
};

const collectIds = (
  values: Array<null | number | string | undefined>,
): string[] => [
  ...new Set(
    values
      .filter((id) => id !== undefined && id !== null && id !== '')
      .map((id) => String(id)),
  ),
];

const missingIds = (
  values: Array<null | number | string | undefined>,
  known: Map<string, string>,
  requested: Set<string>,
) => collectIds(values).filter((id) => !known.has(id) && !requested.has(id));

const mapLabel = (
  map: Map<string, string>,
  id: null | number | string | undefined,
) => {
  if (id === undefined || id === null || id === '') return EMPTY_TEXT;
  // 名称还在请求中时先显示 id，回来后 computed 会刷成文案
  return map.get(String(id)) || String(id);
};

const seedNestedLabels = (dto?: ClientEdit | null) => {
  if (!dto) return;
  const codeSource = dto.codeSource;
  if (dto.codeSourceId && codeSource) {
    const name = codeSource.cnName || codeSource.code || '';
    if (name) codeSourceNameMap.value.set(String(dto.codeSourceId), name);
  }
  for (const period of dto.billingPeriods ?? []) {
    const currency = (
      period as { creditCurrency?: { cnName?: string; code?: string } }
    ).creditCurrency;
    if (period.creditCurrencyId && currency) {
      const name = currency.cnName || currency.code || '';
      if (name)
        currencyNameMap.value.set(String(period.creditCurrencyId), name);
    }
  }
};

async function resolveUserNames(dtos: Array<ClientEdit | null | undefined>) {
  const missing = missingIds(
    dtos.flatMap((dto) => collectUserIds(dto)),
    userNameMap.value,
    requestedUserIds,
  );
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

async function resolveOrgNames(dtos: Array<ClientEdit | null | undefined>) {
  const ids = collectIds([
    ...dtos.map((dto) => dto?.orgId),
    ...dtos.flatMap((dto) =>
      (dto?.billingPeriods ?? []).flatMap(
        (item) => item.organizationUnitIds ?? [],
      ),
    ),
  ]);
  const missing = ids.filter((id) => !orgNameMap.value.has(id));
  if (missing.length === 0) return;

  if (!companiesLoaded && !companiesLoading) {
    companiesLoading = true;
    try {
      const companies = await getMyPermissionCompanies();
      for (const company of companies) {
        if (company.name)
          orgNameMap.value.set(String(company.id), company.name);
      }
      companiesLoaded = true;
    } catch {
      // 权限公司拉不到时再逐条补
    } finally {
      companiesLoading = false;
    }
  }

  const stillMissing = missingIds(missing, orgNameMap.value, requestedOrgIds);
  await Promise.all(
    stillMissing.map(async (id) => {
      requestedOrgIds.add(id);
      try {
        const org = await getOrganizationUnit(id);
        if (org.displayName) orgNameMap.value.set(id, org.displayName);
      } catch {
        requestedOrgIds.delete(id);
      }
    }),
  );
}

async function resolveCurrencyNames(
  dtos: Array<ClientEdit | null | undefined>,
) {
  const missing = missingIds(
    [
      ...dtos.map((dto) => dto?.clientCurrencyId),
      ...dtos.map((dto) => dto?.supplierCurrencyId),
      ...dtos.flatMap((dto) =>
        (dto?.billingPeriods ?? []).map((item) => item.creditCurrencyId),
      ),
    ],
    currencyNameMap.value,
    requestedCurrencyIds,
  );
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

async function resolveCountryNames(dtos: Array<ClientEdit | null | undefined>) {
  const missing = missingIds(
    dtos.map((dto) => dto?.countryId),
    countryNameMap.value,
    requestedCountryIds,
  );
  await Promise.all(
    missing.map(async (id) => {
      requestedCountryIds.add(id);
      try {
        const detail = await getCountryCodeDetail(id);
        const name = detail.countryName || detail.code || '';
        if (name) countryNameMap.value.set(id, name);
      } catch {
        requestedCountryIds.delete(id);
      }
    }),
  );
}

async function resolveAreaNames(dtos: Array<ClientEdit | null | undefined>) {
  const missing = missingIds(
    dtos.map((dto) => dto?.areaId),
    areaNameMap.value,
    requestedAreaIds,
  );
  await Promise.all(
    missing.map(async (id) => {
      requestedAreaIds.add(id);
      try {
        const areas = await getAreaAndParents(id);
        const name = (areas ?? [])
          .map((item) => item.displayName)
          .filter(Boolean)
          .join(' / ');
        if (name) areaNameMap.value.set(id, name);
      } catch {
        requestedAreaIds.delete(id);
      }
    }),
  );
}

async function resolveCodeSourceNames(
  dtos: Array<ClientEdit | null | undefined>,
) {
  const missing = missingIds(
    [
      ...dtos.map((dto) => dto?.codeSourceId),
      ...dtos.flatMap((dto) =>
        (dto?.billingPeriods ?? []).flatMap((item) => item.codeSourceIds ?? []),
      ),
    ],
    codeSourceNameMap.value,
    requestedCodeSourceIds,
  );
  await Promise.all(
    missing.map(async (id) => {
      requestedCodeSourceIds.add(id);
      try {
        const detail = await getCodeSourceDetail(id);
        const name = detail.cnName || detail.code || '';
        if (name) codeSourceNameMap.value.set(id, name);
      } catch {
        requestedCodeSourceIds.delete(id);
      }
    }),
  );
}

async function resolveLaneNames(dtos: Array<ClientEdit | null | undefined>) {
  const missing = missingIds(
    dtos.flatMap((dto) => dto?.laneIds ?? []),
    laneNameMap.value,
    requestedLaneIds,
  );
  await Promise.all(
    missing.map(async (id) => {
      requestedLaneIds.add(id);
      try {
        const detail = await getLaneCodeDetail(id);
        const name = detail.laneName || detail.code || '';
        if (name) laneNameMap.value.set(id, name);
      } catch {
        requestedLaneIds.delete(id);
      }
    }),
  );
}

watch(
  () => [props.from, props.to],
  async () => {
    const dtos = [props.from, props.to];
    seedNestedLabels(props.from);
    seedNestedLabels(props.to);
    await Promise.all([
      resolveUserNames(dtos),
      resolveOrgNames(dtos),
      resolveCurrencyNames(dtos),
      resolveCountryNames(dtos),
      resolveAreaNames(dtos),
      resolveCodeSourceNames(dtos),
      resolveLaneNames(dtos),
    ]);
  },
  { immediate: true },
);

const optionLabel = (
  options: Array<{ label: string; value: any }>,
  value: unknown,
) => {
  const hit = options.find(
    (item) => item.value === value || String(item.value) === String(value),
  );
  return hit?.label ?? String(value);
};

const userNames = (ids: Array<number | undefined>) => {
  const list = ids.filter(
    (id): id is number => id !== undefined && id !== null,
  );
  if (list.length === 0) return EMPTY_TEXT;
  return list
    .map((id) => userNameMap.value.get(String(id)) || `用户${id}`)
    .join('、');
};

const stakeholderText = (list?: Array<{ userId: number }> | null): string =>
  userNames((list ?? []).map((item) => item.userId));

const orgNames = (ids?: Array<number | undefined> | null) => {
  const list = (ids ?? []).filter(
    (id): id is number => id !== undefined && id !== null,
  );
  if (list.length === 0) return EMPTY_TEXT;
  return list
    .map((id) => orgNameMap.value.get(String(id)) || `组织${id}`)
    .join('、');
};

const codeSourceNames = (ids?: Array<number | undefined> | null) => {
  const list = (ids ?? []).filter(
    (id): id is number => id !== undefined && id !== null,
  );
  if (list.length === 0) return EMPTY_TEXT;
  return list
    .map((id) => codeSourceNameMap.value.get(String(id)) || `来源${id}`)
    .join('、');
};

const laneNames = (ids?: number[] | null) => {
  if (!ids || ids.length === 0) return EMPTY_TEXT;
  return ids
    .map((id) => laneNameMap.value.get(String(id)) || `航线${id}`)
    .join('、');
};

const addressesText = (dto?: ClientEdit | null): string => {
  const list = dto?.addresses ?? [];
  if (list.length === 0) return EMPTY_TEXT;
  return list
    .map((item) => {
      const typeLabel =
        item.addressType === undefined || item.addressType === null
          ? ''
          : optionLabel(getAddressTypeOptions(), item.addressType);
      const parts = [
        typeLabel,
        item.name,
        item.address,
        item.contactPerson,
        item.mobile,
      ]
        .filter(Boolean)
        .join('/');
      return item.isDefault ? `${parts}（默认）` : parts;
    })
    .join('；');
};

const billingPeriodsText = (dto?: ClientEdit | null): string => {
  const list = dto?.billingPeriods ?? [];
  if (list.length === 0) return EMPTY_TEXT;
  return list
    .map((item) => {
      const currency =
        item.creditCurrencyId === undefined || item.creditCurrencyId === null
          ? undefined
          : currencyNameMap.value.get(String(item.creditCurrencyId)) ||
            `币别${item.creditCurrencyId}`;
      const pieces = [
        item.contractNo,
        item.permanent ? '长期有效' : undefined,
        currency,
        item.creditLimit === undefined || item.creditLimit === null
          ? undefined
          : `授信${item.creditLimit}`,
        orgNames(item.organizationUnitIds) === EMPTY_TEXT
          ? undefined
          : `组织:${orgNames(item.organizationUnitIds)}`,
        userNames(item.userIds ?? []) === EMPTY_TEXT
          ? undefined
          : `销售:${userNames(item.userIds ?? [])}`,
        codeSourceNames(item.codeSourceIds) === EMPTY_TEXT
          ? undefined
          : `来源:${codeSourceNames(item.codeSourceIds)}`,
      ].filter(Boolean);
      return pieces.length > 0 ? pieces.join('/') : '账期';
    })
    .join('；');
};

const dateText = (value: unknown) => {
  if (!value) return EMPTY_TEXT;
  const date = dayjs(value as string);
  return date.isValid() ? date.format('YYYY-MM-DD') : String(value);
};

const boolText = (value: unknown) => {
  if (value === undefined || value === null) return EMPTY_TEXT;
  return value ? '是' : '否';
};

const plainText = (value: unknown) => {
  if (value === undefined || value === null || value === '') return EMPTY_TEXT;
  if (Array.isArray(value)) {
    return value.length === 0 ? EMPTY_TEXT : value.join('、');
  }
  return String(value);
};

type FieldDef = {
  label: string;
  /** 分组，用于把主表字段与子表分开展示 */
  group: '业务子表' | '客户信息' | '基础信息' | '工商信息' | '供应商信息';
  read: (dto?: ClientEdit | null) => string;
};

/** 依赖 nameMap 的字段放在 computed 里，名称补齐后会自动重算对比行 */
const fieldDefs = computed<FieldDef[]>(() => [
  { group: '基础信息', label: '客户简称', read: (d) => plainText(d?.name) },
  { group: '基础信息', label: '客户代码', read: (d) => plainText(d?.code) },
  { group: '基础信息', label: '客户全称', read: (d) => plainText(d?.fullName) },
  { group: '基础信息', label: '客户英文名', read: (d) => plainText(d?.enName) },
  {
    group: '基础信息',
    label: '客户英文全称',
    read: (d) => plainText(d?.enFullName),
  },
  {
    group: '基础信息',
    label: '纳税人识别号',
    read: (d) => plainText(d?.taxNo),
  },
  {
    group: '基础信息',
    label: '税率(%)',
    read: (d) => plainText(d?.taxRate),
  },
  { group: '基础信息', label: '公司电话', read: (d) => plainText(d?.phone) },
  { group: '基础信息', label: '手机号', read: (d) => plainText(d?.mobile) },
  { group: '基础信息', label: '邮箱', read: (d) => plainText(d?.email) },
  { group: '基础信息', label: '网址', read: (d) => plainText(d?.url) },
  {
    group: '基础信息',
    label: '企业类型',
    read: (d) =>
      d?.enterpriseType === undefined || d?.enterpriseType === null
        ? EMPTY_TEXT
        : optionLabel(getEnterpriseTypeOptions(), d.enterpriseType),
  },
  {
    group: '基础信息',
    label: '共享类型',
    read: (d) =>
      d?.isShared === undefined || d?.isShared === null
        ? EMPTY_TEXT
        : optionLabel(getClientSharedTypeOptions(), d.isShared),
  },
  {
    group: '基础信息',
    label: '归属公司',
    read: (d) => mapLabel(orgNameMap.value, d?.orgId),
  },
  {
    group: '基础信息',
    label: '行业类别',
    read: (d) =>
      d?.industryCategories
        ? formatIndustryCategories(d.industryCategories)
        : EMPTY_TEXT,
  },
  {
    group: '基础信息',
    label: '业务来源',
    read: (d) => mapLabel(codeSourceNameMap.value, d?.codeSourceId),
  },
  {
    group: '基础信息',
    label: '国家',
    read: (d) => mapLabel(countryNameMap.value, d?.countryId),
  },
  {
    group: '基础信息',
    label: '所在省市',
    read: (d) => mapLabel(areaNameMap.value, d?.areaId),
  },
  { group: '基础信息', label: '地址', read: (d) => plainText(d?.address) },
  {
    group: '基础信息',
    label: '英文地址',
    read: (d) => plainText(d?.enAddress),
  },
  {
    group: '基础信息',
    label: '主营产品',
    read: (d) => plainText(d?.mainProduct),
  },
  { group: '基础信息', label: '是否有效', read: (d) => boolText(d?.enable) },
  { group: '基础信息', label: '备注', read: (d) => plainText(d?.remark) },

  { group: '工商信息', label: '法人', read: (d) => plainText(d?.legalPerson) },
  {
    group: '工商信息',
    label: '注册资本(万)',
    read: (d) => plainText(d?.registeredCapital),
  },
  {
    group: '工商信息',
    label: '成立日期',
    read: (d) => dateText(d?.establishmentDate),
  },
  {
    group: '工商信息',
    label: '营业期限',
    read: (d) => plainText(d?.businessTerm),
  },

  { group: '客户信息', label: '是否客户', read: (d) => boolText(d?.isClient) },
  {
    group: '客户信息',
    label: '客户性质',
    read: (d) =>
      d?.clientType === undefined || d?.clientType === null
        ? EMPTY_TEXT
        : optionLabel(getClientTypeOptions(), d.clientType),
  },
  {
    group: '客户信息',
    label: '客户等级',
    read: (d) =>
      d?.clientLevel === undefined || d?.clientLevel === null
        ? EMPTY_TEXT
        : optionLabel(getClientLevelOptions(), d.clientLevel),
  },
  {
    group: '客户信息',
    label: '客户来源',
    read: (d) =>
      d?.source === undefined || d?.source === null
        ? EMPTY_TEXT
        : optionLabel(getClientSourceOptions(), d.source),
  },
  {
    group: '客户信息',
    label: '主要货物类型',
    read: (d) =>
      d?.cargoType === undefined || d?.cargoType === null
        ? EMPTY_TEXT
        : optionLabel(getCargoTypeOptions(), d.cargoType),
  },
  {
    group: '客户信息',
    label: '客户结算币种',
    read: (d) => mapLabel(currencyNameMap.value, d?.clientCurrencyId),
  },

  {
    group: '供应商信息',
    label: '是否供应商',
    read: (d) => boolText(d?.isSupplier),
  },
  {
    group: '供应商信息',
    label: '供应商等级',
    read: (d) =>
      d?.supplierLevel === undefined || d?.supplierLevel === null
        ? EMPTY_TEXT
        : optionLabel(getSupplierLevelOptions(), d.supplierLevel),
  },
  {
    group: '供应商信息',
    label: '供应商结算币种',
    read: (d) => mapLabel(currencyNameMap.value, d?.supplierCurrencyId),
  },
  {
    group: '供应商信息',
    label: '优质航线',
    read: (d) => laneNames(d?.laneIds),
  },

  { group: '业务子表', label: '销售', read: (d) => stakeholderText(d?.sales) },
  {
    group: '业务子表',
    label: '客服',
    read: (d) => stakeholderText(d?.customerServices),
  },
  {
    group: '业务子表',
    label: '操作',
    read: (d) => stakeholderText(d?.operations),
  },
  {
    group: '业务子表',
    label: '单证',
    read: (d) => stakeholderText(d?.documentations),
  },
  {
    group: '业务子表',
    label: '对账人',
    read: (d) => userNames(d?.reconcilerUserIds ?? []),
  },
  { group: '业务子表', label: '地址', read: (d) => addressesText(d) },
  { group: '业务子表', label: '账期', read: (d) => billingPeriodsText(d) },
]);

/** 默认只看改动过的字段；打开开关看全部 */
const showAll = ref(false);

const rows = computed(() => {
  // 读一遍 map.size，保证名称补齐后 computed 会刷新
  void userNameMap.value.size;
  void orgNameMap.value.size;
  void currencyNameMap.value.size;
  void countryNameMap.value.size;
  void areaNameMap.value.size;
  void codeSourceNameMap.value.size;
  void laneNameMap.value.size;

  return fieldDefs.value.map((def) => {
    const from = def.read(props.from) || EMPTY_TEXT;
    const to = def.read(props.to) || EMPTY_TEXT;
    return {
      changed: from !== to,
      from,
      group: def.group,
      label: def.label,
      to,
    };
  });
});

const changedCount = computed(() => rows.value.filter((r) => r.changed).length);

const isCreateMode = computed(() => props.mode === 'create');

const filledCount = computed(
  () => rows.value.filter((row) => row.to !== EMPTY_TEXT).length,
);

const visibleRows = computed(() => {
  if (isCreateMode.value) {
    return showAll.value
      ? rows.value
      : rows.value.filter((row) => row.to !== EMPTY_TEXT);
  }
  return showAll.value ? rows.value : rows.value.filter((row) => row.changed);
});
</script>

<template>
  <div class="client-modify-diff">
    <div class="client-modify-diff__toolbar">
      <span class="client-modify-diff__count">
        {{
          isCreateMode
            ? `共 ${filledCount} 个已填写字段`
            : `共 ${changedCount} 个字段有改动`
        }}
      </span>
      <span class="client-modify-diff__switch">
        显示全部字段
        <Switch v-model:checked="showAll" size="small" />
      </span>
    </div>

    <Empty
      v-if="visibleRows.length === 0"
      :image-style="{ height: '36px' }"
      :description="
        isCreateMode ? '暂无已填写的新增内容' : '本次申请没有字段变化'
      "
    />

    <table v-else class="client-modify-diff__table">
      <thead>
        <tr>
          <th class="w-28">字段</th>
          <th v-if="!isCreateMode">原值</th>
          <th>{{ isCreateMode ? '新增内容' : '申请修改为' }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in visibleRows"
          :key="`${row.group}-${row.label}`"
          :class="{
            'is-changed': isCreateMode ? row.to !== EMPTY_TEXT : row.changed,
          }"
        >
          <td>
            <span class="client-modify-diff__group">{{ row.group }}</span>
            {{ row.label }}
          </td>
          <td v-if="!isCreateMode" class="client-modify-diff__from">
            {{ row.from }}
          </td>
          <td class="client-modify-diff__to">{{ row.to }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.client-modify-diff__toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  margin-bottom: 8px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--primary) / 4%);
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
}

.client-modify-diff__count {
  font-weight: 500;
  color: hsl(var(--foreground) / 78%);
}

.client-modify-diff__switch {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.client-modify-diff__table {
  width: 100%;
  overflow: hidden;
  font-size: 12px;
  border-collapse: collapse;
  border-radius: 6px;
}

.client-modify-diff__table th,
.client-modify-diff__table td {
  padding: 7px 8px;
  vertical-align: top;
  text-align: left;
  overflow-wrap: anywhere;
  border: 1px solid hsl(var(--border));
  transition: background 0.15s ease;
}

.client-modify-diff__table th {
  font-weight: 600;
  color: hsl(var(--foreground) / 78%);
  background: hsl(var(--primary) / 6%);
}

.client-modify-diff__table tbody tr:hover td {
  background: hsl(var(--primary) / 4%);
}

.client-modify-diff__group {
  margin-right: 4px;
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}

.client-modify-diff__table tr.is-changed .client-modify-diff__from {
  color: hsl(0deg 55% 46%);
  text-decoration: line-through;
  text-decoration-color: hsl(0deg 55% 46% / 45%);
}

.client-modify-diff__table tr.is-changed .client-modify-diff__to {
  font-weight: 600;
  color: hsl(142deg 40% 34%);
}

.client-modify-diff__table tr.is-changed:hover td {
  background: hsl(var(--primary) / 6%);
}
</style>
