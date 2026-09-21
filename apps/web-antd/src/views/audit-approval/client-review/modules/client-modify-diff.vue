<script lang="ts" setup>
import type { ClientAdminApi } from '#/api/sea-export/client-admin';

import { computed, ref, watch } from 'vue';

import { Empty, Switch } from 'ant-design-vue';
import dayjs from 'dayjs';

import { getUserListByIds } from '#/api/system/user-admin';
import { formatIndustryCategories } from '#/views/client/base/data';
import {
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
  /** 要修改为的客户全量信息 */
  to?: ClientEdit | null;
}

const props = withDefaults(defineProps<Props>(), { from: null, to: null });

const EMPTY_TEXT = '—';

/** 干系人/对账人只有 userId，昵称按 id 补齐，否则逐字段对比只能看到一串数字 */
const userNameMap = ref(new Map<string, string>());

const collectUserIds = (dto?: ClientEdit | null): number[] => {
  if (!dto) return [];
  const stakeholderIds = [
    ...(dto.sales ?? []),
    ...(dto.customerServices ?? []),
    ...(dto.operations ?? []),
    ...(dto.documentations ?? []),
  ].map((item) => item.userId);
  return [...stakeholderIds, ...(dto.reconcilerUserIds ?? [])].filter(
    (id): id is number => id !== undefined && id !== null,
  );
};

watch(
  () => [props.from, props.to],
  async () => {
    const ids = [
      ...new Set(
        [...collectUserIds(props.from), ...collectUserIds(props.to)].map(
          String,
        ),
      ),
    ].filter((id) => !userNameMap.value.has(id));
    if (ids.length === 0) return;
    try {
      const users = await getUserListByIds(ids, { silent: true });
      for (const user of users) {
        const name = (user.nickName || user.userName || '').trim();
        if (name) userNameMap.value.set(String(user.id), name);
      }
    } catch {
      // 拉不到昵称就退回显示 id，不影响对比本身
    }
  },
  { immediate: true },
);

const optionLabel = (
  options: Array<{ label: string; value: any }>,
  value: unknown,
) => {
  const hit = options.find((item) => item.value === value);
  return hit?.label ?? String(value);
};

const userNames = (ids: Array<number | undefined>) =>
  ids
    .filter((id): id is number => id !== undefined && id !== null)
    .map((id) => userNameMap.value.get(String(id)) || `用户${id}`)
    .join('、');

const stakeholderText = (list?: Array<{ userId: number }> | null): string =>
  userNames((list ?? []).map((item) => item.userId));

const addressesText = (dto?: ClientEdit | null): string => {
  const list = dto?.addresses ?? [];
  if (list.length === 0) return EMPTY_TEXT;
  return list
    .map((item) => {
      const parts = [item.name, item.address, item.contactPerson, item.mobile]
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
      const pieces = [
        item.contractNo,
        item.permanent ? '长期有效' : undefined,
        item.creditLimit === undefined || item.creditLimit === null
          ? undefined
          : `授信${item.creditLimit}`,
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

const FIELD_DEFS: FieldDef[] = [
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
    label: '归属公司id',
    read: (d) => plainText(d?.orgId),
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
    label: '业务来源id',
    read: (d) => plainText(d?.codeSourceId),
  },
  { group: '基础信息', label: '国家id', read: (d) => plainText(d?.countryId) },
  { group: '基础信息', label: '所在省市', read: (d) => plainText(d?.areaId) },
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
    label: '客户结算币种id',
    read: (d) => plainText(d?.clientCurrencyId),
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
    label: '供应商结算币种id',
    read: (d) => plainText(d?.supplierCurrencyId),
  },
  {
    group: '供应商信息',
    label: '优质航线ids',
    read: (d) => plainText(d?.laneIds),
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
];

/** 默认只看改动过的字段；打开开关看全部 */
const showAll = ref(false);

const rows = computed(() => {
  return FIELD_DEFS.map((def) => {
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

const visibleRows = computed(() =>
  showAll.value ? rows.value : rows.value.filter((row) => row.changed),
);
</script>

<template>
  <div class="client-modify-diff">
    <div class="client-modify-diff__toolbar">
      <span class="client-modify-diff__count">
        共 {{ changedCount }} 个字段有改动
      </span>
      <span class="client-modify-diff__switch">
        显示全部字段
        <Switch v-model:checked="showAll" size="small" />
      </span>
    </div>

    <Empty
      v-if="visibleRows.length === 0"
      :image-style="{ height: '36px' }"
      description="本次申请没有字段变化"
    />

    <table v-else class="client-modify-diff__table">
      <thead>
        <tr>
          <th class="w-28">字段</th>
          <th>原值</th>
          <th>申请修改为</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in visibleRows"
          :key="`${row.group}-${row.label}`"
          :class="{ 'is-changed': row.changed }"
        >
          <td>
            <span class="client-modify-diff__group">{{ row.group }}</span>
            {{ row.label }}
          </td>
          <td class="client-modify-diff__from">{{ row.from }}</td>
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
  margin-bottom: 8px;
  font-size: 12px;
  color: #64748b;
}

.client-modify-diff__switch {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.client-modify-diff__table {
  width: 100%;
  font-size: 12px;
  border-collapse: collapse;
}

.client-modify-diff__table th,
.client-modify-diff__table td {
  padding: 6px 8px;
  vertical-align: top;
  text-align: left;
  overflow-wrap: anywhere;
  border: 1px solid hsl(var(--border));
}

.client-modify-diff__table th {
  font-weight: 600;
  color: #475569;
  background: hsl(var(--primary) / 6%);
}

.client-modify-diff__group {
  margin-right: 4px;
  font-size: 11px;
  color: #94a3b8;
}

.client-modify-diff__table tr.is-changed .client-modify-diff__from {
  color: #dc2626;
  text-decoration: line-through;
}

.client-modify-diff__table tr.is-changed .client-modify-diff__to {
  font-weight: 600;
  color: #16a34a;
}
</style>
