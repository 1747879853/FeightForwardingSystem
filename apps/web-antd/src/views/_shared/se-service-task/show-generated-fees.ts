import type { TableColumnsType } from 'ant-design-vue';

import type { SeServiceTaskAdminApi } from '#/api/sea-export/se-service-task-admin';

import { h } from 'vue';

import { Modal, Table, Tag } from 'ant-design-vue';

import './show-generated-fees.css';

type CompleteResult = SeServiceTaskAdminApi.SeServiceTaskCompleteResultDto;
type GeneratedFee = SeServiceTaskAdminApi.SeServiceTaskGeneratedFeeDto;
type CompleteOutcome = boolean | CompleteResult | null | undefined;

function formatDecimal(value: unknown, digits: number) {
  if (value === null || value === undefined || value === '') return '-';
  const num = Number(value);
  if (Number.isNaN(num)) return '-';
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatQuantity(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';
  const num = Number(value);
  if (Number.isNaN(num)) return '-';
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

function formatPaySide(paySide: number | undefined) {
  if (paySide === 0) return '收';
  if (paySide === 1) return '付';
  return '-';
}

function formatFeeName(row: GeneratedFee) {
  return row.feeCode?.cnName || row.feeCode?.code || '-';
}

function formatSettlement(row: GeneratedFee) {
  return row.settlement?.name || row.settlement?.fullName || '-';
}

function formatCurrency(row: GeneratedFee) {
  return row.currency?.code || row.currency?.cnName || '-';
}

const columns: TableColumnsType<GeneratedFee> = [
  {
    title: '费用名称',
    dataIndex: ['feeCode', 'cnName'],
    key: 'feeName',
    width: 140,
    ellipsis: true,
    customRender: ({ record }) => formatFeeName(record),
  },
  {
    title: '结算对象',
    dataIndex: ['settlement', 'name'],
    key: 'settlement',
    width: 160,
    ellipsis: true,
    customRender: ({ record }) => formatSettlement(record),
  },
  {
    title: '币别',
    dataIndex: ['currency', 'code'],
    key: 'currency',
    width: 72,
    customRender: ({ record }) => formatCurrency(record),
  },
  {
    title: '汇率',
    dataIndex: 'exchangeRate',
    key: 'exchangeRate',
    width: 88,
    align: 'right',
    customRender: ({ text }) => formatDecimal(text, 4),
  },
  {
    title: '含税单价',
    dataIndex: 'unitPrice',
    key: 'unitPrice',
    width: 110,
    align: 'right',
    customRender: ({ text }) => formatDecimal(text, 4),
  },
  {
    title: '含税金额',
    dataIndex: 'amount',
    key: 'amount',
    width: 110,
    align: 'right',
    customRender: ({ text }) => formatDecimal(text, 2),
  },
  {
    title: '单位',
    dataIndex: 'unit',
    key: 'unit',
    width: 80,
    ellipsis: true,
    customRender: ({ text }) => text || '-',
  },
  {
    title: '数量',
    dataIndex: 'quantity',
    key: 'quantity',
    width: 80,
    align: 'right',
    customRender: ({ text }) => formatQuantity(text),
  },
  {
    title: '税率',
    dataIndex: 'taxRate',
    key: 'taxRate',
    width: 72,
    align: 'right',
    customRender: ({ text }) => {
      if (text === null || text === undefined || text === '') return '-';
      const num = Number(text);
      if (Number.isNaN(num)) return '-';
      return `${formatQuantity(num)}%`;
    },
  },
  {
    title: '收付类型',
    dataIndex: 'paySide',
    key: 'paySide',
    width: 88,
    customRender: ({ text }) => {
      const label = formatPaySide(text);
      if (label === '-') return '-';
      return h(
        Tag,
        { color: text === 1 ? 'orange' : 'green', bordered: false },
        () => label,
      );
    },
  },
];

/** 仅当 generatedFeeCount > 0 时收集本次自动生成的费用 */
export function collectGeneratedFees(
  results: CompleteOutcome[],
): GeneratedFee[] {
  const fees: GeneratedFee[] = [];
  for (const result of results) {
    if (!result || typeof result !== 'object') continue;
    const count = Number(result.generatedFeeCount ?? 0);
    if (count <= 0) continue;
    fees.push(...(result.generatedFees ?? []));
  }
  return fees;
}

/** 完成任务后：条数大于 0 则弹窗展示自动生成的费用 */
export function showGeneratedFeesIfAny(
  input: CompleteOutcome | CompleteOutcome[],
) {
  const fees = collectGeneratedFees(Array.isArray(input) ? input : [input]);
  if (fees.length <= 0) return;

  Modal.success({
    title: `已自动生成 ${fees.length} 条费用`,
    width: 1200,
    centered: true,
    icon: null,
    okText: '知道了',
    wrapClassName: 'se-service-generated-fees-modal',
    content: () =>
      h('div', { class: 'se-service-generated-fees' }, [
        h(
          'p',
          {
            style: {
              color: 'hsl(var(--muted-foreground))',
              fontSize: '13px',
              margin: '0 0 12px',
            },
          },
          '以下费用已按自动费用模板写入本票应收应付，可到费用页核对。',
        ),
        h(Table, {
          columns,
          dataSource: fees,
          pagination: false,
          rowKey: (row: GeneratedFee) => String(row.id),
          scroll: { x: 1040 },
          size: 'small',
        }),
      ]),
  });
}
