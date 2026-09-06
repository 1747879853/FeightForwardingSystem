<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import type {
  GeminiBillFeeOrderFeeDto,
  GeminiBillFeeTransportOrderDto,
} from '#/api/sea-export/gemini-admin';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message, Table, Tag } from 'ant-design-vue';

import { CurrencySelect, FeeCodeSelect } from '#/adapter/component/biz-select';

import {
  getIndustryCategoryOptions,
  resolveSettlementByIndustryCategory,
} from '../data';
import { useOrderFeeAdapter } from '../use-adapter';

/**
 * AI 识别账单费用 - 结果确认弹窗（仅用于费用页应付表）
 *
 * 职责：
 * 1. 顶部展示识别匹配到的业务（委托编号 / 主提单号 / 业务类型），供用户确认对上哪一票；
 * 2. 表格展示识别出的费用行（paySide 均为应付），默认勾选已匹配的行；
 * 3. feeCodeId / currencyId 为 -1（未匹配）的行标红、禁用勾选，改成系统费用代码 / 币别后才可勾选；
 * 4. 勾选后提交到 OrderFeeAdmin/BatchEditAsync（id 为空表示新增），成功后通知父表刷新。
 *
 * 注意：本弹窗只在费用页（OrderFeePage provide 树内）使用，可安全注入 adapter。
 */
defineOptions({
  name: 'AiBillFeeResultModal',
});

/** 表格行：AI 费用 + 前端行主键 */
type BillFeeRow = GeminiBillFeeOrderFeeDto & { _rowKey: string };

const BIZ_TYPE_TEXT: Record<number, string> = {
  0: '海运出口',
  1: '海运进口',
  2: '空运出口',
};

const adapter = useOrderFeeAdapter();

const emit = defineEmits(['confirm']);

const transportOrder = ref<GeminiBillFeeTransportOrderDto | null>(null);
const recognizedMblNum = ref('');
const dataSource = ref<BillFeeRow[]>([]);
const selectedRowKeys = ref<string[]>([]);

/**
 * 订单详情缓存（按 transportOrderId）：一次识别出的费用行同属一票业务，
 * 逐行改费用代码带结算对象时复用同一份详情，避免重复请求 getDetail。
 */
const orderDetailCache = new Map<string, any>();
const orderDetailLoading = new Map<string, Promise<any>>();

/** 未匹配行：费用代码或币别为 -1，需用户修正后才能勾选提交 */
function isInvalidRow(row: BillFeeRow) {
  return Number(row.feeCodeId) === -1 || Number(row.currencyId) === -1;
}

const invalidCount = computed(
  () => dataSource.value.filter((row) => isInvalidRow(row)).length,
);

const bizTypeText = computed(() => {
  const bizType = transportOrder.value?.bizType;
  return bizType === undefined || bizType === null
    ? '-'
    : (BIZ_TYPE_TEXT[bizType] ?? String(bizType));
});

const [Modal, modalApi] = useVbenModal({
  title: 'AI识别账单费用 · 确认添加',
  confirmText: '确认添加',
  cancelText: '取消',
  // 注意：不要在这里设 class。弹窗宽度写在模板 <Modal class="..."> 上，
  // 因为 usePriorityValues 对 class 只按 attrs > state 取其一、不会合并，
  // 模板上的 class 会覆盖此处的 class，导致宽度失效。
  confirmLoading: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = modalApi.getData<{
        mblNum?: string;
        orderFees: GeminiBillFeeOrderFeeDto[];
        transportOrder: GeminiBillFeeTransportOrderDto;
        transportOrderId: string;
      }>();
      transportOrder.value = data?.transportOrder ?? null;
      recognizedMblNum.value =
        data?.mblNum || data?.transportOrder?.mblNum || '';
      const fees = data?.orderFees ?? [];
      dataSource.value = fees.map((fee, index) => ({
        ...fee,
        _rowKey: `ai-bill-fee-${index}`,
      }));
      // 默认勾选所有已匹配（非 -1）的行，未匹配的行需修正后手动/自动勾选
      selectedRowKeys.value = dataSource.value
        .filter((row) => !isInvalidRow(row))
        .map((row) => row._rowKey);
    } else {
      dataSource.value = [];
      selectedRowKeys.value = [];
      transportOrder.value = null;
      recognizedMblNum.value = '';
      // 关闭时清空订单详情缓存，避免跨票业务复用旧详情
      orderDetailCache.clear();
      orderDetailLoading.clear();
    }
  },
  onConfirm: async () => {
    await handleSubmit();
  },
  onCancel: () => {
    modalApi.close();
  },
});

/** 不含税单价 = 含税单价 / (1 + 税率/100)，保留 4 位（与费用表联动一致） */
function calcNoTaxUnitPrice(unitPrice: number, taxRate: number) {
  return Number((unitPrice / (1 + taxRate / 100)).toFixed(4));
}

/** 修正后若整行已匹配，自动纳入勾选 */
function autoSelectIfValid(row: BillFeeRow) {
  if (!isInvalidRow(row) && !selectedRowKeys.value.includes(row._rowKey)) {
    selectedRowKeys.value = [...selectedRowKeys.value, row._rowKey];
  }
}

/** 加载订单详情（带缓存 + 并发去重），供按行业类别带出结算对象 */
async function loadOrderDetail(transportOrderId: string) {
  if (!transportOrderId) return null;
  if (orderDetailCache.has(transportOrderId)) {
    return orderDetailCache.get(transportOrderId);
  }
  if (orderDetailLoading.has(transportOrderId)) {
    return await orderDetailLoading.get(transportOrderId);
  }
  const loading = adapter.api
    .getDetail(transportOrderId)
    .then((detail) => {
      if (detail) orderDetailCache.set(transportOrderId, detail);
      orderDetailLoading.delete(transportOrderId);
      return detail ?? null;
    })
    .catch((error) => {
      orderDetailLoading.delete(transportOrderId);
      console.error('[AiBillFeeResultModal] 加载订单详情失败:', error);
      return null;
    });
  orderDetailLoading.set(transportOrderId, loading);
  return await loading;
}

/**
 * 参考费用录入联动：账单费用均为应付(paySide=1)，取费用代码的「付费客户类型」
 * defaultCreditName 作为行业类别字母码，回填 industryCategory，并从订单详情带出
 * 对应往来单位作为结算对象（settlementId + settlement 展示对象）。
 */
async function applySettlementByFeeCode(row: any, feeCodeRaw: any) {
  try {
    const categoryLetter = feeCodeRaw?.defaultCreditName;
    if (!categoryLetter) return;

    // 行业类别（数值 key）——与费用录入保持一致，供提交/展示
    const categoryOption = getIndustryCategoryOptions().find(
      (opt) => opt.value === categoryLetter,
    );
    if (categoryOption) {
      row.industryCategory = categoryOption.key;
    }

    // 结算对象：从订单详情按行业类别带出对应往来单位
    const transportOrderId = String(
      row.transportOrderId || transportOrder.value?.id || '',
    );
    const orderDetail = await loadOrderDetail(transportOrderId);
    if (!orderDetail) return;
    const settlement = resolveSettlementByIndustryCategory(
      orderDetail,
      categoryLetter,
    );
    if (!settlement) return;
    row.settlementId = settlement.id;
    // 结算列展示读取 settlement.name
    row.settlement = { id: settlement.id, name: settlement.name };
  } catch (error) {
    console.error('[AiBillFeeResultModal] 带出结算对象失败:', error);
  }
}

/**
 * 修正费用代码（-1 → 系统费用代码）：
 * 带出默认税率 / 禁开发票 / 机密，并按公式重算不含税单价与金额
 *（后端 BatchEdit 直接存储前端传入的不含税值，故须前端算好）；
 * 同时参考费用录入，按费用代码带出行业类别与结算对象。
 */
async function handleFeeCodeChange(row: any, value: any, option: any) {
  row.feeCodeId = Number(value);
  const raw = option?.raw;
  if (raw) {
    // 同步展示对象，修正后文本列显示新选中的费用代码（而非账单原文）
    row.feeCode = {
      id: raw.id,
      code: raw.code,
      cnName: raw.cnName,
      enName: raw.enName,
    };
    if (raw.taxRate !== undefined && raw.taxRate !== null) {
      row.taxRate = Number(raw.taxRate);
    }
    row.invoiceBlocked = !!raw.isInvoiceProhibit;
    row.isConfidential = !!raw.isConfidential;
    const unitPrice = Number(row.unitPrice) || 0;
    const quantity = Number(row.quantity) || 0;
    row.noTaxUnitPrice = calcNoTaxUnitPrice(
      unitPrice,
      Number(row.taxRate) || 0,
    );
    row.noTaxAmount = Number((row.noTaxUnitPrice * quantity).toFixed(2));
    // ✅ 参考费用录入：按费用代码的付费客户类型带出行业类别与结算对象
    await applySettlementByFeeCode(row, raw);
  }
  autoSelectIfValid(row);
}

/** 修正币别（-1 → 系统币别） */
function handleCurrencyChange(row: any, value: any, option: any) {
  row.currencyId = Number(value);
  const raw = option?.raw;
  if (raw) {
    // 同步展示对象，修正后文本列显示新选中的币别
    row.currency = {
      code: raw.code,
      cnName: raw.cnName,
      enName: raw.enName,
    };
  }
  autoSelectIfValid(row);
}

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: (number | string)[]) => {
    selectedRowKeys.value = keys as string[];
  },
  getCheckboxProps: (record: BillFeeRow) => ({
    disabled: isInvalidRow(record),
  }),
}));

function rowClassName(record: BillFeeRow) {
  return isInvalidRow(record) ? 'ai-bill-fee-row-invalid' : '';
}

const columns: TableColumnsType = [
  { title: '费用代码', key: 'feeCode', width: 220, fixed: 'left' },
  { title: '币别', key: 'currency', width: 130 },
  { title: '结算对象', key: 'settlement', width: 140 },
  { title: '单位', dataIndex: 'unit', key: 'unit', width: 70, align: 'center' },
  {
    title: '数量',
    dataIndex: 'quantity',
    key: 'quantity',
    width: 70,
    align: 'right',
  },
  {
    title: '含税单价',
    dataIndex: 'unitPrice',
    key: 'unitPrice',
    width: 100,
    align: 'right',
  },
  {
    title: '含税金额',
    dataIndex: 'amount',
    key: 'amount',
    width: 110,
    align: 'right',
  },
  {
    title: '税率(%)',
    dataIndex: 'taxRate',
    key: 'taxRate',
    width: 80,
    align: 'right',
  },
  {
    title: '不含税单价',
    dataIndex: 'noTaxUnitPrice',
    key: 'noTaxUnitPrice',
    width: 110,
    align: 'right',
  },
  {
    title: '不含税金额',
    dataIndex: 'noTaxAmount',
    key: 'noTaxAmount',
    width: 110,
    align: 'right',
  },
  {
    title: '汇率',
    dataIndex: 'exchangeRate',
    key: 'exchangeRate',
    width: 80,
    align: 'right',
  },
  { title: '备注', dataIndex: 'remark', key: 'remark', width: 160 },
];

/** 费用代码展示文本：code-cnName */
function feeCodeText(row: any) {
  const fc = row.feeCode;
  if (!fc) return '-';
  const code = fc.code || '';
  const name = fc.cnName || fc.enName || '';
  const text = [code, name].filter(Boolean).join('-');
  return text || '-';
}

/** 币别展示文本：优先代码，其次中文名 */
function currencyText(row: any) {
  const cur = row.currency;
  if (!cur) return '-';
  return cur.code || cur.cnName || cur.enName || '-';
}

async function handleSubmit() {
  if (selectedRowKeys.value.length === 0) {
    message.warning('请至少勾选一条费用');
    return;
  }
  const selectedRows = dataSource.value.filter((row) =>
    selectedRowKeys.value.includes(row._rowKey),
  );
  // 双保险：勾选行里若仍有未匹配项（理论上 checkbox 已禁用），拦截提交
  if (selectedRows.some((row) => isInvalidRow(row))) {
    message.warning('存在未匹配的费用代码或币别，请先修正后再提交');
    return;
  }

  const fallbackOrderId = transportOrder.value?.id ?? '';
  const payload = selectedRows.map((row) => ({
    id: '',
    transportOrderId: row.transportOrderId || fallbackOrderId,
    paySide: 1,
    feeStatus: 0,
    invoiceStatus: 0,
    feeCodeId: Number(row.feeCodeId),
    settlementId: row.settlementId || '',
    currencyId: Number(row.currencyId),
    exchangeRate: Number(row.exchangeRate) || 0,
    unitPrice: Number(row.unitPrice) || 0,
    amount: Number(row.amount) || 0,
    unit: row.unit || '',
    quantity: Number(row.quantity) || 0,
    taxRate: Number(row.taxRate) || 0,
    noTaxUnitPrice: Number(row.noTaxUnitPrice) || 0,
    noTaxAmount: Number(row.noTaxAmount) || 0,
    rqstPaymentAmount: 0,
    invoicedAmount: 0,
    orderInvoiceAmount: 0,
    settledAmount: 0,
    invoiceBlocked: !!row.invoiceBlocked,
    isConfidential: !!row.isConfidential,
    dataEntryMethod: 0,
    remark: row.remark || '',
    industryCategory: row.industryCategory ?? undefined,
  }));

  modalApi.setState({ confirmLoading: true });
  try {
    await adapter.api.batchEditOrderFee(payload);
    message.success(`成功添加 ${payload.length} 条应付费用`);
    emit('confirm');
    modalApi.close();
  } catch (error) {
    // 后端错误文案已由全局请求拦截器统一提示，此处仅记录，避免重复弹窗
    console.error('[AiBillFeeResultModal] 添加费用失败:', error);
  } finally {
    modalApi.setState({ confirmLoading: false });
  }
}

defineExpose({
  modalApi,
});
</script>

<template>
  <!-- 宽度必须写在这里：模板 class 优先级高于 useVbenModal 选项里的 class，二者不合并 -->
  <Modal class="ai-bill-fee-result-modal w-[1200px]">
    <div class="ai-bill-fee-result">
      <!-- 业务确认信息 -->
      <div class="ai-bill-fee-order">
        <div class="order-item">
          <span class="order-label">委托编号</span>
          <span class="order-value">
            {{ transportOrder?.commissionNum || '-' }}
          </span>
        </div>
        <div class="order-item">
          <span class="order-label">主提单号</span>
          <span class="order-value">
            {{ transportOrder?.mblNum || recognizedMblNum || '-' }}
          </span>
        </div>
        <div class="order-item">
          <span class="order-label">业务类型</span>
          <span class="order-value">{{ bizTypeText }}</span>
        </div>
        <div class="order-item">
          <span class="order-label">识别费用</span>
          <span class="order-value">{{ dataSource.length }} 条</span>
        </div>
      </div>

      <!-- 未匹配提示 -->
      <div v-if="invalidCount > 0" class="ai-bill-fee-tip">
        <Tag color="red">待修正 {{ invalidCount }} 条</Tag>
        <span>
          标红行的费用代码或币别未匹配到系统数据，请在下拉中改选后再勾选提交。
        </span>
      </div>

      <!-- 费用明细 -->
      <Table
        :columns="columns"
        :data-source="dataSource"
        :row-selection="rowSelection"
        :row-class-name="rowClassName"
        :pagination="false"
        :scroll="{ x: 'max-content', y: 420 }"
        row-key="_rowKey"
        size="small"
        bordered
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'feeCode'">
            <FeeCodeSelect
              v-if="Number(record.feeCodeId) === -1"
              :model-value="undefined"
              placeholder="请选择费用代码"
              style="width: 100%"
              @change="
                (val: any, opt: any) => handleFeeCodeChange(record, val, opt)
              "
            />
            <span v-else>{{ feeCodeText(record) }}</span>
          </template>
          <template v-else-if="column.key === 'currency'">
            <CurrencySelect
              v-if="Number(record.currencyId) === -1"
              :model-value="undefined"
              placeholder="请选择币别"
              style="width: 100%"
              @change="
                (val: any, opt: any) => handleCurrencyChange(record, val, opt)
              "
            />
            <span v-else>{{ currencyText(record) }}</span>
          </template>
          <template v-else-if="column.key === 'settlement'">
            {{ record.settlement?.name || '-' }}
          </template>
        </template>
      </Table>
    </div>
  </Modal>
</template>

<style scoped>
.ai-bill-fee-result {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ai-bill-fee-order {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 32px;
  padding: 12px 16px;
  background: hsl(var(--primary) / 4%);
  border: 1px solid hsl(var(--primary) / 15%);
  border-radius: 8px;
}

.ai-bill-fee-order .order-item {
  display: flex;
  gap: 8px;
  align-items: center;
}

.ai-bill-fee-order .order-label {
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.ai-bill-fee-order .order-value {
  font-size: 14px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.ai-bill-fee-tip {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

/* 未匹配行标红 */
.ai-bill-fee-result :deep(.ai-bill-fee-row-invalid) > td {
  background-color: #fff1f0 !important;
}
</style>
