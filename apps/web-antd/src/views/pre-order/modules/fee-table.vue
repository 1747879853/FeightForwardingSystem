<script lang="ts" setup>
import type { PreOrderAdminApi } from '#/api/pre-order/pre-order-admin';
import type { FeeCodeAdminApi } from '#/api/system/base-data/fee-code-admin';

import type { PreOrderCtnRow } from './ctn-table.vue';

import { computed, onMounted, ref, watch } from 'vue';

import {
  Button,
  Checkbox,
  Input,
  InputNumber,
  message,
  Select,
  Space,
  Table,
  Tooltip,
} from 'ant-design-vue';

import { IconifyIcon } from '@vben/icons';

import ClientSelect from '#/adapter/component/biz-select/client-select.vue';
import CurrencySelect from '#/adapter/component/biz-select/currency-select.vue';
import FeeCodeSelect from '#/adapter/component/biz-select/fee-code-select.vue';
import IndustryCategorySelect from '#/adapter/component/biz-select/industry-category-select.vue';
import { getCtnCodeDetail } from '#/api/system/base-data/ctn-code-admin';
import { getCurrencyPagedList } from '#/api/system/base-data/currency-admin';
import {
  getFeeCodeDetail,
  getFeeCodeListAsync,
} from '#/api/system/base-data/fee-code-admin';
import { getClientDetail } from '#/api/sea-export/client-admin';
import {
  ensureExchangeRateCache,
  resolveExchangeRate,
} from '#/utils/exchange-rate-cache';
import { getIndustryCategoryOptions } from '#/views/sea-export-admin/orderFee/data';

import { PAY_SIDE_OPTIONS } from '../form-data';
import { coercePreOrderFeeUnit, PRE_ORDER_GENERIC_UNITS } from './fee-unit';

export interface PreOrderFeeRow extends PreOrderAdminApi.PreOrderFeeDto {
  rowKey: string;
  /** 强制 ClientSelect 在类别/结算对象程序化变更后重挂载回显 */
  settlementUiKey?: number;
  /** 选费用代码时缓存列表行，切换收付复用，避免再打 DetailAsync */
  feeCodeSnapshot?: FeeCodeAdminApi.FeeCodeDto;
  /** 汇率表未维护、按本位币兜底为 1 的行，汇率只读（对齐应收应付费用表） */
  __isLocalCurrency?: boolean;
}

/** 业务联系单上可映射到结算对象的往来单位（字母码 → id / 名称） */
export interface PreOrderFeeParties {
  /** p 委托单位 */
  clientId?: null | string;
  clientName?: null | string;
  /** b 发货人 */
  shipperId?: null | string;
  shipperName?: null | string;
  /** e 收货人 */
  consigneeId?: null | string;
  consigneeName?: null | string;
  /** h 通知人 */
  notifierId?: null | string;
  notifierName?: null | string;
}

/** 货物计量，单位=重量/体积时按此带出数量（对齐后端 ResolveQuantityByUnit） */
export interface PreOrderFeeCargo {
  kgs?: null | number;
  cbm?: null | number;
}

const props = withDefaults(
  defineProps<{
    /** 箱型箱量行，单位=TEU 时按各箱型 teu×箱量累加 */
    ctns?: PreOrderCtnRow[];
    /** 往来单位，用于行业类别 → 结算对象带出 */
    parties?: PreOrderFeeParties;
    /**
     * 切换收付/费用代码前由父组件从主表单现取往来单位（避免 onChange 漏同步导致带不出结算对象）
     */
    resolveParties?: () => Promise<null | PreOrderFeeParties | undefined>;
    /** 货物计量，单位=重量/体积时带出数量 */
    cargo?: PreOrderFeeCargo;
    /** 归属组织本位币 id，命中时汇率锁定为 1 */
    localCurrencyId?: null | number;
    readonly?: boolean;
  }>(),
  {
    ctns: () => [],
    parties: () => ({}),
    resolveParties: undefined,
    cargo: () => ({}),
    localCurrencyId: null,
    readonly: false,
  },
);

const modelValue = defineModel<PreOrderFeeRow[]>({ default: () => [] });

const selectedRowKeys = ref<string[]>([]);
/** 新增费用行默认币别：USD 的 id */
const defaultUsdCurrencyId = ref<null | number | string>(null);

const dataSource = computed({
  get: () => modelValue.value ?? [],
  set: (val) => {
    modelValue.value = val;
  },
});

let rowSeed = 0;
const createRowKey = () => `fee-${Date.now()}-${(rowSeed += 1)}`;

/** a-table 插槽的 record 为 Record<string, any>，在模板边界收敛为费用行 */
const asRow = (record: unknown) => record as PreOrderFeeRow;

/**
 * a-table 对 dataSource 浅比较，行内字段原地改动后 bodyCell 可能不重渲
 *（只读态、金额等依赖计算的列会“看起来没生效”）。换新数组引用强制刷新。
 */
function touchDataSource() {
  dataSource.value = [...dataSource.value];
}

/** 本单出现过的箱型名（去重、保留箱型字典写法），可作为费用单位 */
const ctnUnitNames = computed(() => {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const row of props.ctns ?? []) {
    const name = (row.ctnCodeName ?? '').trim();
    if (name === '' || seen.has(name.toUpperCase())) continue;
    seen.add(name.toUpperCase());
    names.push(name);
  }
  return names;
});

/** 通用四项 + 本单箱型；箱型随箱型箱量表变化，删掉箱型后对应费用行会落回「票」 */
const unitOptions = computed(() => [
  ...PRE_ORDER_GENERIC_UNITS.map((unit) => ({ label: unit, value: unit })),
  ...ctnUnitNames.value
    .filter(
      (name) => !(PRE_ORDER_GENERIC_UNITS as readonly string[]).includes(name),
    )
    .map((name) => ({ label: name, value: name })),
]);

const round = (value: number, digits: number) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

/** 行业类别数值 key → 字母码（给 ClientSelect 过滤） */
function industryKeyToLetter(key?: null | number) {
  if (key == null) return undefined;
  return getIndustryCategoryOptions().find((o) => o.key === key)?.value;
}

/** 字母码 → 行业类别数值 key */
function letterToIndustryKey(letter?: null | string) {
  if (!letter) return undefined;
  return getIndustryCategoryOptions().find((o) => o.value === letter)?.key;
}

/**
 * 费用代码 defaultDebit/CreditName 可能是字母、数字 key 或中文名，统一收敛成字母码。
 */
function resolveIndustryLetter(
  raw?: null | number | string,
): string | undefined {
  if (raw == null || raw === '') return undefined;
  const text = String(raw).trim();
  const options = getIndustryCategoryOptions();
  const byValue = options.find(
    (o) => o.value === text || o.value === text.toLowerCase(),
  );
  if (byValue) return byValue.value;
  const asNum = Number(text);
  if (!Number.isNaN(asNum)) {
    const byKey = options.find((o) => o.key === asNum);
    if (byKey) return byKey.value;
  }
  const byLabel = options.find((o) => o.label === text);
  return byLabel?.value;
}

/** 金额与不含税单价随单价/数量/税率联动，口径与业务费用一致 */
function recalcAmount(row: PreOrderFeeRow) {
  const unitPrice = Number(row.unitPrice ?? 0);
  const quantity = Number(row.quantity ?? 0);
  const taxRate = Number(row.taxRate ?? 0);
  row.amount = round(unitPrice * quantity, 2);
  row.noTaxUnitPrice = round(unitPrice / (1 + taxRate / 100), 4);
  return row;
}

/** 箱型 teu 缓存，避免同一箱型重复打详情 */
const ctnTeuCache = new Map<string, number>();

async function sumCtnTeu() {
  let total = 0;
  for (const row of props.ctns ?? []) {
    const key = String(row.ctnCodeId ?? '');
    if (key === '') continue;
    let teu = ctnTeuCache.get(key);
    if (teu === undefined) {
      try {
        const detail = await getCtnCodeDetail(key);
        teu = Number(detail?.teu ?? 0);
      } catch {
        teu = 0;
      }
      ctnTeuCache.set(key, teu);
    }
    total += teu * Number(row.count ?? 0);
  }
  return round(total, 2);
}

/** 单位=箱型名时的数量：同箱型的箱量合计 */
function sumCtnCountByName(name: string) {
  const target = name.trim().toUpperCase();
  let total = 0;
  for (const row of props.ctns ?? []) {
    if ((row.ctnCodeName ?? '').trim().toUpperCase() !== target) continue;
    total += Number(row.count ?? 0);
  }
  return total;
}

/**
 * 按单位带出数量，口径与后端 `ResolveQuantityByUnit` 对齐：
 * 票=1、重量=kgs、体积=cbm、TEU=Σ(箱型 teu×箱量)、箱型名=该箱型箱量合计；
 * 非法单位（含已被删掉的箱型名）先落到「票」
 */
async function fillQuantityByUnit(row: PreOrderFeeRow, unit?: null | string) {
  const name = coercePreOrderFeeUnit(unit, ctnUnitNames.value) || '票';
  row.unit = name;
  const cargo = props.cargo ?? {};
  switch (name) {
    case 'TEU': {
      row.quantity = await sumCtnTeu();
      break;
    }
    case '体积': {
      row.quantity = cargo.cbm ?? 0;
      break;
    }
    case '票': {
      row.quantity = 1;
      break;
    }
    case '重量': {
      row.quantity = cargo.kgs ?? 0;
      break;
    }
    default: {
      row.quantity = sumCtnCountByName(name);
    }
  }
  recalcAmount(row);
}

/** 结算对象带出时优先用 resolveParties 的最新值，否则退回 props.parties */
const partiesSnapshot = ref<PreOrderFeeParties>({});

/** 客户 id → 名称，命中后不再打详情，直接喂给 ClientSelect 的 selectedItems */
const clientNameCache = new Map<string, string>();

function rememberClientName(id?: null | string, name?: null | string) {
  if (id && name) clientNameCache.set(String(id), String(name));
}

/** 把本单往来单位名称灌进缓存，切换类别带出时优先用，避免二次拉详情 */
function seedClientNameCacheFromParties(p?: PreOrderFeeParties | null) {
  if (!p) return;
  rememberClientName(p.clientId, p.clientName);
  rememberClientName(p.shipperId, p.shipperName);
  rememberClientName(p.consigneeId, p.consigneeName);
  rememberClientName(p.notifierId, p.notifierName);
}

async function refreshPartiesSnapshot() {
  if (props.resolveParties) {
    try {
      const latest = await props.resolveParties();
      if (latest) {
        partiesSnapshot.value = { ...latest };
        seedClientNameCacheFromParties(partiesSnapshot.value);
        return partiesSnapshot.value;
      }
    } catch {
      // 回退 props
    }
  }
  partiesSnapshot.value = { ...(props.parties ?? {}) };
  seedClientNameCacheFromParties(partiesSnapshot.value);
  return partiesSnapshot.value;
}

watch(
  () => props.parties,
  (val) => {
    partiesSnapshot.value = { ...(val ?? {}) };
    seedClientNameCacheFromParties(partiesSnapshot.value);
  },
  { deep: true, immediate: true },
);

/** 按行业字母码从往来单位带出结算对象（同时写入名称，避免 Select 显示成 uuid） */
async function applySettlementByLetter(row: PreOrderFeeRow, letter?: string) {
  // 类别一变先清空，回填不成功时也不能留着上一类别的结算对象
  row.settlementId = undefined;
  row.settlement = undefined;
  if (!letter) return;
  const p = partiesSnapshot.value ?? {};
  const map: Record<string, { id?: null | string; name?: null | string }> = {
    b: { id: p.shipperId, name: p.shipperName },
    e: { id: p.consigneeId, name: p.consigneeName },
    h: { id: p.notifierId, name: p.notifierName },
    p: { id: p.clientId, name: p.clientName },
  };
  const hit = map[letter.toLowerCase()];
  const id = hit?.id;
  // 类别对上了但本单还没填对应往来单位 → 保持清空
  if (id == null || id === '') return;
  const settlementId = String(id);
  rememberClientName(settlementId, hit?.name);
  let name = clientNameCache.get(settlementId);
  if (!name) {
    try {
      const detail = await getClientDetail(settlementId);
      name = detail?.name || detail?.fullName || undefined;
      rememberClientName(settlementId, name);
    } catch {
      name = undefined;
    }
  }
  row.settlementId = settlementId;
  row.settlement = name ? { id: settlementId, name } : undefined;
}

/**
 * 按当前收付类型，用费用代码重写结算对象类别、结算对象、税率。
 * 应收看 defaultDebitName，应付看 defaultCreditName；税率取费用代码维护值。
 */
async function applyFeeCodeByPaySide(
  row: PreOrderFeeRow,
  detail:
    | FeeCodeAdminApi.FeeCodeDto
    | FeeCodeAdminApi.FeeCodeSimpleDto
    | null
    | undefined,
  paySide: number,
) {
  if (!detail) return;
  await refreshPartiesSnapshot();
  const raw =
    Number(paySide) === 1 ? detail.defaultCreditName : detail.defaultDebitName;
  const letter = resolveIndustryLetter(raw);
  if (letter) {
    const key = letterToIndustryKey(letter);
    if (key != null) {
      row.industryCategory = key;
      await applySettlementByLetter(row, letter);
    } else {
      row.industryCategory = undefined;
      await applySettlementByLetter(row, undefined);
    }
  } else {
    row.industryCategory = undefined;
    await applySettlementByLetter(row, undefined);
  }
  if (detail.taxRate !== undefined && detail.taxRate !== null) {
    row.taxRate = detail.taxRate;
  }
  recalcAmount(row);
}

/** 手工选择结算对象：把 option 标签写入 settlement，供 selectedItems 回显 */
function handleSettlementChange(
  row: PreOrderFeeRow,
  value: null | number | string | undefined,
  option?: { label?: string; rawLabel?: string } | null,
) {
  if (value == null || value === '') {
    row.settlementId = undefined;
    row.settlement = undefined;
  } else {
    row.settlementId = String(value);
    const name = option?.label || option?.rawLabel;
    rememberClientName(row.settlementId, name);
    row.settlement = name ? { id: row.settlementId, name } : undefined;
  }
  touchDataSource();
}

/** 币别等于归属组织本位币 */
function isLocalCurrencyRow(row: PreOrderFeeRow) {
  if (props.localCurrencyId == null) return false;
  const currency = String(row.currencyId ?? '');
  if (currency === '') return false;
  return currency === String(props.localCurrencyId);
}

/**
 * 币别 → 汇率（与海出费用表一致）：优先取汇率表中当前生效的记录
 *（应收 drValue / 应付 crValue）；未维护时本位币锁 1，其余置空由用户手填。
 */
async function applyExchangeRate(row: PreOrderFeeRow) {
  const currencyId = String(row.currencyId ?? '');
  if (currencyId === '') {
    row.exchangeRate = undefined;
    row.__isLocalCurrency = false;
    return;
  }
  const rate = await resolveExchangeRate(currencyId, Number(row.paySide ?? 0));
  if (rate === undefined) {
    const isLocal = isLocalCurrencyRow(row);
    row.exchangeRate = isLocal ? 1 : undefined;
    row.__isLocalCurrency = isLocal;
    return;
  }
  row.exchangeRate = rate;
  row.__isLocalCurrency = false;
}

/**
 * 数量恒由单位推导（审核通过时后端会按单位重算并覆盖前端传值），
 * 所以箱型或货物计量一变，全表按单位重新带一次量。
 */
async function syncDerivedRows() {
  // 只读态（待审核 / 通过）如实展示已落库的数据，不做任何改写
  if (props.readonly) return;
  let changed = false;
  for (const row of dataSource.value) {
    const before = `${row.quantity}|${row.unitPrice}|${row.amount}`;
    await fillQuantityByUnit(row, row.unit);
    if (`${row.quantity}|${row.unitPrice}|${row.amount}` !== before) {
      changed = true;
    }
  }
  if (changed) {
    touchDataSource();
  }
}

defineExpose({ generateOceanFreightFees, syncDerivedRows });

onMounted(async () => {
  // 本次进入编辑页重新拉一遍汇率，避免用到上一次会话缓存的旧汇率
  void ensureExchangeRateCache(true);
  try {
    const res = await getCurrencyPagedList({
      Keyword: 'USD',
      PageIndex: 1,
      PageSize: 20,
    });
    const usd = res?.items?.find((item) => item.code?.toUpperCase() === 'USD');
    if (usd?.id != null) {
      defaultUsdCurrencyId.value = usd.id;
    }
  } catch {
    // 币别列表失败时不加默认，避免脏 id
  }
});

/** 币别列表稍晚返回时，把尚未选币别的费用行补上 USD 并带汇率 */
watch(defaultUsdCurrencyId, async (id) => {
  if (id == null) return;
  let changed = false;
  for (const row of dataSource.value) {
    if (row.currencyId == null) {
      row.currencyId = id as number;
      await applyExchangeRate(row);
      changed = true;
    }
  }
  if (changed) touchDataSource();
});

watch(
  () =>
    props.ctns
      ?.map((row) => `${row.ctnCodeId}:${row.ctnCodeName}:${row.count}`)
      .join('|'),
  () => {
    void syncDerivedRows();
  },
);

/** 毛重 / 体积改动后，单位=重量 / 体积的行必须同步，否则与后端重算结果不一致 */
watch(
  () => `${props.cargo?.kgs ?? ''}:${props.cargo?.cbm ?? ''}`,
  () => {
    void syncDerivedRows();
  },
);

/**
 * 整表被替换（详情回显 / 复制预填）后重新按单位带量：历史数据可能是旧单位口径
 * 算出来的数量。二次触发时算不出差异就不会再 touch，不会形成循环。
 */
watch(
  () => modelValue.value,
  () => {
    void syncDerivedRows();
  },
);

/** 归属组织切换后本位币可能变化，已有行需重新按本位币口径取汇率 */
watch(
  () => props.localCurrencyId,
  async () => {
    // 只读态（待审核 / 通过）如实展示已落库的汇率，不做改写
    if (props.readonly) return;
    if (dataSource.value.length === 0) return;
    for (const row of dataSource.value) {
      await applyExchangeRate(row);
    }
    touchDataSource();
  },
);

async function handleUnitChange(row: PreOrderFeeRow, unit: string) {
  row.unit = coercePreOrderFeeUnit(unit, ctnUnitNames.value) || '票';
  await fillQuantityByUnit(row, row.unit);
  touchDataSource();
}

async function handlePaySideChange(row: PreOrderFeeRow, paySide: number) {
  row.paySide = Number(paySide);
  // 收付切换：重取汇率；已有费用代码则按应收/应付重写类别、结算对象、税率
  await applyExchangeRate(row);
  if (row.feeCodeId != null && String(row.feeCodeId) !== '') {
    try {
      const detail =
        row.feeCodeSnapshot &&
        String(row.feeCodeSnapshot.id) === String(row.feeCodeId)
          ? row.feeCodeSnapshot
          : await getFeeCodeDetail(String(row.feeCodeId));
      row.feeCodeSnapshot = detail;
      await applyFeeCodeByPaySide(row, detail, row.paySide);
    } catch {
      recalcAmount(row);
    }
  } else {
    recalcAmount(row);
  }
  // 换新引用 + 递增版本，强制结算对象 ClientSelect 按新类别/id 重挂载回显
  row.settlementUiKey = (Number(row.settlementUiKey) || 0) + 1;
  touchDataSource();
}

/**
 * 切换结算对象类别：先清空结算对象 → ClientSelect 按新字母码过滤 →
 * 本单已录入对应往来单位则直接回填，并写 selectedItems（名称走缓存，不二次拉详情）
 */
async function handleIndustryCategoryChange(
  row: PreOrderFeeRow,
  key: null | number | undefined,
) {
  row.industryCategory = key ?? undefined;
  // 立刻清掉旧结算对象，避免新类别过滤参数生效前短暂显示错户
  row.settlementId = undefined;
  row.settlement = undefined;
  await refreshPartiesSnapshot();
  const letter = industryKeyToLetter(key ?? undefined);
  await applySettlementByLetter(row, letter);
  row.settlementUiKey = (Number(row.settlementUiKey) || 0) + 1;
  touchDataSource();
}

async function handleCurrencyChange(
  row: PreOrderFeeRow,
  currencyId: null | number | string | undefined,
) {
  row.currencyId =
    currencyId == null || currencyId === ''
      ? undefined
      : (currencyId as number);
  await applyExchangeRate(row);
  touchDataSource();
}

/**
 * 费用代码变更：带出行业类别/结算对象、币别/汇率、税率、默认单位，
 * 以及禁开票/机密。优先用下拉 option.raw（列表已含字段），缺省再打详情。
 */
async function handleFeeCodeChange(
  row: PreOrderFeeRow,
  feeCodeId: null | number | string | undefined,
  option?: { raw?: FeeCodeAdminApi.FeeCodeDto } | null,
) {
  row.feeCodeId =
    feeCodeId == null || feeCodeId === ''
      ? undefined
      : (feeCodeId as PreOrderFeeRow['feeCodeId']);
  if (row.feeCodeId == null) {
    row.feeCodeSnapshot = undefined;
    touchDataSource();
    return;
  }
  try {
    let detail = option?.raw;
    if (!detail || String(detail.id) !== String(row.feeCodeId)) {
      detail = await getFeeCodeDetail(String(row.feeCodeId));
    }
    if (!detail) {
      touchDataSource();
      return;
    }
    row.feeCodeSnapshot = detail;
    row.feeCode = {
      id: detail.id,
      name: detail.cnName || detail.enName || detail.code,
      code: detail.code,
    } as PreOrderFeeRow['feeCode'];

    await applyFeeCodeByPaySide(row, detail, Number(row.paySide ?? 0));
    row.settlementUiKey = (Number(row.settlementUiKey) || 0) + 1;

    if (detail.currencyId != null && detail.currencyId !== '') {
      row.currencyId = detail.currencyId as number;
      await applyExchangeRate(row);
    }

    if (detail.isInvoiceProhibit != null) {
      row.invoiceBlocked = !!detail.isInvoiceProhibit;
    }
    if (detail.isConfidential != null) {
      row.isConfidential = !!detail.isConfidential;
    }

    const defaultUnit = detail.defaultUnitName?.trim();
    if (defaultUnit) {
      // 「箱型/CTN」是泛称而非具体箱型，无法定位箱量，仍落到「票」；
      // 默认单位恰好等于本单某个箱型名时才保留
      const coerced = coercePreOrderFeeUnit(
        defaultUnit === '箱型' || defaultUnit.toUpperCase() === 'CTN'
          ? '票'
          : defaultUnit,
        ctnUnitNames.value,
      );
      row.unit = coerced || '票';
      if (
        defaultUnit !== row.unit &&
        defaultUnit !== '箱型' &&
        defaultUnit.toUpperCase() !== 'CTN'
      ) {
        message.warning(
          `费用代码默认单位「${defaultUnit}」暂不支持，已改为「${row.unit}」`,
        );
      } else if (
        defaultUnit === '箱型' ||
        defaultUnit.toUpperCase() === 'CTN'
      ) {
        message.warning('费用代码默认单位为箱型，已改为按「票」计价');
      }
      await fillQuantityByUnit(row, row.unit);
    } else {
      recalcAmount(row);
    }
  } catch {
    recalcAmount(row);
  }
  touchDataSource();
}

/** 新增一行费用：默认应收、币别 USD、单位「票」；数量/金额/汇率按单位带出 */
async function handleAdd() {
  const row = {
    rowKey: createRowKey(),
    paySide: 0,
    currencyId: defaultUsdCurrencyId.value ?? undefined,
    unit: '票',
    taxRate: 0,
    invoiceBlocked: false,
    isConfidential: false,
  } as PreOrderFeeRow;
  await fillQuantityByUnit(row, row.unit);
  await applyExchangeRate(row);
  dataSource.value = [...dataSource.value, row];
}

const OCEAN_FREIGHT_CN_NAME = '海运费';
const OCEAN_FREIGHT_CODES = new Set([
  'O/F',
  'OCEAN FREIGHT',
  'OCEANFREIGHT',
  'OF',
]);

/** 海运费费用代码缓存；取不到时不写缓存，下次点击重试 */
let oceanFreightFeeCode: FeeCodeAdminApi.FeeCodeSimpleDto | undefined;

async function resolveOceanFreightFeeCode() {
  if (oceanFreightFeeCode) return oceanFreightFeeCode;
  let items: FeeCodeAdminApi.FeeCodeSimpleDto[] = [];
  try {
    items = (await getFeeCodeListAsync({ isSea: true })) ?? [];
  } catch {
    return undefined;
  }
  const hit =
    items.find(
      (item) => (item.cnName ?? '').trim() === OCEAN_FREIGHT_CN_NAME,
    ) ??
    items.find((item) =>
      OCEAN_FREIGHT_CODES.has((item.code ?? '').trim().toUpperCase()),
    ) ??
    items.find((item) => (item.cnName ?? '').includes(OCEAN_FREIGHT_CN_NAME));
  if (hit) oceanFreightFeeCode = hit;
  return hit;
}

/** 同箱型合并成一条费用：箱量累加，卖价取首个填了的值 */
function groupCtnsForOceanFreight() {
  const groups = new Map<
    string,
    { count: number; name: string; price: null | number }
  >();
  for (const row of props.ctns ?? []) {
    const name = (row.ctnCodeName ?? '').trim();
    if (name === '') continue;
    const price = row.price == null ? null : Number(row.price);
    const hit = groups.get(name.toUpperCase());
    if (hit) {
      hit.count += Number(row.count ?? 0);
      if (hit.price == null) hit.price = price;
    } else {
      groups.set(name.toUpperCase(), {
        count: Number(row.count ?? 0),
        name,
        price,
      });
    }
  }
  return [...groups.values()];
}

/**
 * 按箱型箱量表一键生成应收海运费：每个箱型一条，单位=箱型名、数量=箱量、含税单价=卖价。
 * 重复点击按「应收 + 海运费 + 同箱型」覆盖旧行，避免累积重复费用。
 */
async function generateOceanFreightFees() {
  if (props.readonly) return;
  const groups = groupCtnsForOceanFreight();
  if (groups.length === 0) {
    message.warning('请先在箱型箱量表中选择箱型');
    return;
  }
  const feeCode = await resolveOceanFreightFeeCode();
  if (!feeCode) {
    message.error('未找到「海运费」费用代码，请先在基础数据中维护');
    return;
  }
  await refreshPartiesSnapshot();

  const regenerating = new Set(groups.map((item) => item.name.toUpperCase()));
  const kept = dataSource.value.filter(
    (row) =>
      !(
        Number(row.paySide) === 0 &&
        String(row.feeCodeId ?? '') === String(feeCode.id) &&
        regenerating.has(
          String(row.unit ?? '')
            .trim()
            .toUpperCase(),
        )
      ),
  );

  const generated: PreOrderFeeRow[] = [];
  for (const group of groups) {
    const row = {
      rowKey: createRowKey(),
      paySide: 0,
      feeCodeId: feeCode.id as PreOrderFeeRow['feeCodeId'],
      feeCode: {
        id: feeCode.id,
        name: feeCode.cnName || feeCode.enName || feeCode.code,
        code: feeCode.code,
      },
      feeCodeSnapshot: feeCode as FeeCodeAdminApi.FeeCodeDto,
      currencyId: (feeCode.currencyId ??
        defaultUsdCurrencyId.value ??
        undefined) as PreOrderFeeRow['currencyId'],
      unit: group.name,
      quantity: group.count,
      unitPrice: group.price ?? 0,
      taxRate: feeCode.taxRate ?? 0,
      invoiceBlocked: !!feeCode.isInvoiceProhibit,
      isConfidential: !!feeCode.isConfidential,
    } as PreOrderFeeRow;
    // 结算对象类别/结算对象/税率沿用费用代码口径，与手工选费用代码一致
    await applyFeeCodeByPaySide(row, feeCode, 0);
    await applyExchangeRate(row);
    recalcAmount(row);
    generated.push(row);
  }

  dataSource.value = [...kept, ...generated];
  message.success(`已生成 ${generated.length} 条应收海运费`);
  const missingPrice = groups.filter((item) => item.price == null).length;
  if (missingPrice > 0) {
    message.warning(`其中 ${missingPrice} 个箱型未填卖价，含税单价按 0 生成`);
  }
}

function handleRemove() {
  if (selectedRowKeys.value.length === 0) return;
  const removing = new Set(selectedRowKeys.value);
  dataSource.value = dataSource.value.filter(
    (row) => !removing.has(row.rowKey),
  );
  selectedRowKeys.value = [];
}

function settlementSelectedItems(row: PreOrderFeeRow) {
  if (!row.settlementId) return [];
  const name =
    row.settlement?.name || clientNameCache.get(String(row.settlementId));
  // 无名称时只传 id，禁止用 uuid 当 label（会污染 ClientSelect 回显）
  if (!name) return [{ id: row.settlementId }];
  return [{ id: row.settlementId, name }];
}

function feeCodeSelectedItems(row: PreOrderFeeRow) {
  if (!row.feeCodeId || !row.feeCode) return [];
  // 详情 feeCode 回 cnName/enName，无 name；FeeCodeSelect 用 cnName 作 rowLabel
  const cnName =
    row.feeCode.cnName || row.feeCode.name || row.feeCode.enName || '';
  return [
    {
      id: row.feeCodeId,
      cnName,
      code: row.feeCode.code,
      enName: row.feeCode.enName,
    },
  ];
}

function currencySelectedItems(row: PreOrderFeeRow) {
  if (!row.currencyId || !row.currency) return [];
  const cnName =
    row.currency.cnName || row.currency.name || row.currency.enName || '';
  return [
    {
      id: row.currencyId,
      code: row.currency.code || cnName,
      cnName,
    },
  ];
}

const columns = [
  { title: '收付', dataIndex: 'paySide', width: 90 },
  { title: '费用代码', dataIndex: 'feeCodeId', width: 180 },
  { title: '结算对象类别', dataIndex: 'industryCategory', width: 140 },
  { title: '结算对象', dataIndex: 'settlementId', width: 180 },
  { title: '币别', dataIndex: 'currencyId', width: 110 },
  { title: '汇率', dataIndex: 'exchangeRate', width: 100 },
  { title: '单位', dataIndex: 'unit', width: 110 },
  { title: '数量', dataIndex: 'quantity', width: 100 },
  { title: '含税单价', dataIndex: 'unitPrice', width: 120 },
  { title: '税率(%)', dataIndex: 'taxRate', width: 90 },
  { title: '不含税单价', dataIndex: 'noTaxUnitPrice', width: 120 },
  { title: '金额', dataIndex: 'amount', width: 120 },
  { title: '禁开票', dataIndex: 'invoiceBlocked', width: 80 },
  { title: '机密', dataIndex: 'isConfidential', width: 70 },
  { title: '备注', dataIndex: 'remark', width: 160 },
];

/** 设计稿只展示计价必需字段；计算结果与后台控制字段仍保留在行数据中。 */
const visibleColumns = columns.filter(
  ({ dataIndex }) =>
    ![
      'amount',
      'invoiceBlocked',
      'isConfidential',
      'noTaxUnitPrice',
      'remark',
    ].includes(dataIndex),
);

const totals = computed(() => {
  let receive = 0;
  let pay = 0;
  for (const row of dataSource.value) {
    const amount = Number(row.amount ?? 0);
    if (Number(row.paySide) === 1) pay += amount;
    else receive += amount;
  }
  return { receive: round(receive, 2), pay: round(pay, 2) };
});
</script>

<template>
  <div>
    <Space v-if="!props.readonly" class="mb-2" :size="8">
      <Tooltip title="添加费用">
        <Button
          type="text"
          size="small"
          class="!flex !h-7 !w-7 !items-center !justify-center !rounded-md !bg-[#e6f4ff] !p-0 transition-all hover:scale-105 hover:!bg-[#bae0ff]"
          @click="handleAdd"
        >
          <IconifyIcon icon="mdi:add-box" class="text-[18px] text-[#1677ff]" />
        </Button>
      </Tooltip>
      <Tooltip title="删除">
        <Button
          type="text"
          size="small"
          :class="[
            '!flex !h-7 !w-7 !items-center !justify-center !rounded-md !p-0 transition-all',
            selectedRowKeys.length
              ? '!bg-[#fff1f0] hover:scale-105 hover:!bg-[#ffccc7]'
              : '!bg-[#f5f5f5]',
          ]"
          :disabled="selectedRowKeys.length === 0"
          @click="handleRemove"
        >
          <IconifyIcon
            icon="mdi:close-box"
            :class="[
              'text-[18px]',
              selectedRowKeys.length ? 'text-[#ff4d4f]' : 'text-[#bfbfbf]',
            ]"
          />
        </Button>
      </Tooltip>
      <span class="text-xs text-gray-500">
        新增默认币别
        USD；费用代码可带出结算对象、币别、税率等；数量按单位自动计算
      </span>
    </Space>
    <Table
      size="small"
      :columns="visibleColumns"
      :data-source="dataSource"
      :pagination="false"
      row-key="rowKey"
      :scroll="{ x: 1220 }"
      :row-selection="
        props.readonly
          ? undefined
          : {
              selectedRowKeys,
              onChange: (keys: any[]) => (selectedRowKeys = keys as string[]),
            }
      "
      bordered
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'paySide'">
          <Select
            :value="record.paySide"
            :disabled="props.readonly"
            size="small"
            class="w-full"
            :options="PAY_SIDE_OPTIONS"
            @change="(v: any) => handlePaySideChange(asRow(record), Number(v))"
          />
        </template>
        <template v-else-if="column.dataIndex === 'feeCodeId'">
          <FeeCodeSelect
            v-model="record.feeCodeId"
            :disabled="props.readonly"
            size="small"
            :selected-items="feeCodeSelectedItems(asRow(record))"
            @change="
              (v: any, option: any) =>
                handleFeeCodeChange(asRow(record), v, option)
            "
          />
        </template>
        <template v-else-if="column.dataIndex === 'industryCategory'">
          <IndustryCategorySelect
            v-model="record.industryCategory"
            :disabled="props.readonly"
            size="small"
            @update:model-value="
              (v: any) =>
                handleIndustryCategoryChange(
                  asRow(record),
                  v == null || v === '' ? undefined : Number(v),
                )
            "
          />
        </template>
        <template v-else-if="column.dataIndex === 'settlementId'">
          <ClientSelect
            :key="`${asRow(record).rowKey}-stl-${asRow(record).settlementUiKey ?? 0}-${asRow(record).industryCategory ?? ''}-${asRow(record).settlementId ?? ''}`"
            v-model="record.settlementId"
            :disabled="props.readonly"
            size="small"
            :industry-category="
              industryKeyToLetter(asRow(record).industryCategory)
            "
            :selected-items="settlementSelectedItems(asRow(record))"
            @change="
              (v: any, option: any) =>
                handleSettlementChange(asRow(record), v, option)
            "
          />
        </template>
        <template v-else-if="column.dataIndex === 'currencyId'">
          <CurrencySelect
            v-model="record.currencyId"
            :disabled="props.readonly"
            size="small"
            :selected-items="currencySelectedItems(asRow(record))"
            @update:model-value="
              (v: any) => handleCurrencyChange(asRow(record), v)
            "
          />
        </template>
        <template v-else-if="column.dataIndex === 'exchangeRate'">
          <Tooltip
            :title="
              record.__isLocalCurrency === true ? '本位币汇率固定为 1' : ''
            "
          >
            <InputNumber
              v-model:value="record.exchangeRate"
              :disabled="props.readonly || record.__isLocalCurrency === true"
              size="small"
              class="w-full"
              :min="0"
              :precision="6"
            />
          </Tooltip>
        </template>
        <template v-else-if="column.dataIndex === 'unit'">
          <Select
            :value="record.unit"
            :disabled="props.readonly"
            size="small"
            class="w-full"
            show-search
            :options="unitOptions"
            @change="(v: any) => handleUnitChange(asRow(record), String(v))"
          />
        </template>
        <template v-else-if="column.dataIndex === 'quantity'">
          <Tooltip title="数量按单位自动计算，不可手工修改">
            <InputNumber
              v-model:value="record.quantity"
              :disabled="true"
              size="small"
              class="w-full"
              :precision="2"
            />
          </Tooltip>
        </template>
        <template v-else-if="column.dataIndex === 'unitPrice'">
          <InputNumber
            v-model:value="record.unitPrice"
            :disabled="props.readonly"
            size="small"
            class="w-full"
            :min="0"
            :precision="2"
            @change="
              () => {
                recalcAmount(asRow(record));
                touchDataSource();
              }
            "
          />
        </template>
        <template v-else-if="column.dataIndex === 'taxRate'">
          <InputNumber
            v-model:value="record.taxRate"
            :disabled="props.readonly"
            size="small"
            class="w-full"
            :min="0"
            :precision="2"
            @change="
              () => {
                recalcAmount(asRow(record));
                touchDataSource();
              }
            "
          />
        </template>
        <template v-else-if="column.dataIndex === 'noTaxUnitPrice'">
          <InputNumber
            v-model:value="record.noTaxUnitPrice"
            :disabled="true"
            size="small"
            class="w-full"
            :precision="4"
          />
        </template>
        <template v-else-if="column.dataIndex === 'amount'">
          <InputNumber
            v-model:value="record.amount"
            :disabled="true"
            size="small"
            class="w-full"
            :precision="2"
          />
        </template>
        <template v-else-if="column.dataIndex === 'invoiceBlocked'">
          <Checkbox
            v-model:checked="record.invoiceBlocked"
            :disabled="props.readonly"
          />
        </template>
        <template v-else-if="column.dataIndex === 'isConfidential'">
          <Checkbox
            v-model:checked="record.isConfidential"
            :disabled="props.readonly"
          />
        </template>
        <template v-else-if="column.dataIndex === 'remark'">
          <Input
            v-model:value="record.remark"
            :disabled="props.readonly"
            size="small"
            :maxlength="4096"
          />
        </template>
      </template>
    </Table>
    <div class="mt-2 flex justify-end gap-6 text-sm">
      <span>应收合计：{{ totals.receive.toFixed(2) }}</span>
      <span>应付合计：{{ totals.pay.toFixed(2) }}</span>
    </div>
  </div>
</template>
