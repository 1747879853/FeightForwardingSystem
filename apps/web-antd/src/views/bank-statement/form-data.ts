import dayjs from 'dayjs';

/** 格式化金额，保留两位小数 */
export function formatAmount(value: number | undefined | null): string {
  if (value === undefined || value === null) return '-';
  return value.toFixed(2);
}

/** 格式化日期时间到分钟 */
export function formatDateTime(value: string | undefined | null): string {
  if (!value) return '-';
  return dayjs(value).format('YYYY-MM-DD HH:mm');
}

/** 收费结算状态归一化（接口可能返回字符串） */
export function normalizeReceiveSettlementStatus(
  status: number | string | undefined | null,
): number | undefined {
  if (status === undefined || status === null || status === '') {
    return undefined;
  }
  const normalized = Number(status);
  return Number.isFinite(normalized) ? normalized : undefined;
}

/** 收费结算状态文字 */
export function getReceiveSettlementStatusLabel(
  status: number | string | undefined | null,
): string {
  const map: Record<number, string> = {
    0: '录入中',
    1: '审核中',
    2: '已驳回',
    3: '审核通过',
    4: '部分结算',
    5: '已结算',
  };
  const normalized = normalizeReceiveSettlementStatus(status);
  if (normalized === undefined) return '-';
  return map[normalized] ?? '未知';
}

/** 收费结算状态 Tag 颜色 */
export function getReceiveSettlementStatusColor(
  status: number | string | undefined | null,
): string {
  const map: Record<number, string> = {
    0: 'default',
    1: 'processing',
    2: 'error',
    3: 'success',
    4: 'warning',
    5: 'success',
  };
  const normalized = normalizeReceiveSettlementStatus(status);
  if (normalized === undefined) return 'default';
  return map[normalized] ?? 'default';
}

/** 关联收费结算展开区：只读费用明细列 */
export function useReceiveSettlementItemReadonlyColumns() {
  return [
    {
      dataIndex: 'commissionNum',
      title: '委托编号',
      width: 150,
    },
    {
      dataIndex: 'mblNum',
      title: '主提单号',
      width: 150,
    },
    {
      dataIndex: 'feeCodeName',
      title: '费用名称',
      minWidth: 150,
    },
    {
      dataIndex: 'currencyCode',
      title: '币别',
      width: 90,
    },
    {
      dataIndex: 'amount',
      title: '费用总额',
      width: 120,
      align: 'right' as const,
      customRender: ({ text }: { text: number }) => formatAmount(text),
    },
    {
      dataIndex: 'remainingAmount',
      title: '剩余额度',
      width: 120,
      align: 'right' as const,
      customRender: ({ text }: { text: number }) => formatAmount(text),
    },
    {
      dataIndex: 'settledAmount',
      title: '本次结算金额',
      width: 130,
      align: 'right' as const,
      customRender: ({ text }: { text: number }) => formatAmount(text),
    },
    {
      dataIndex: 'settlementName',
      title: '结算对象',
      minWidth: 140,
    },
    {
      dataIndex: 'remark',
      title: '备注',
      minWidth: 160,
      ellipsis: true,
    },
  ];
}

/** 收费结算只读子表 ant Table 列配置 */
export function useReceiveSettlementColumns() {
  return [
    {
      dataIndex: 'settlementNo',
      title: '结算单号',
      width: 170,
      fixed: 'left' as const,
    },
    {
      dataIndex: 'status',
      title: '结算状态',
      width: 110,
      slots: { customRender: 'status' },
    },
    {
      dataIndex: 'settlementTime',
      title: '结算时间',
      width: 150,
      customRender: ({ text }: { text: string }) => formatDateTime(text),
    },
    {
      dataIndex: 'totalSettledAmount',
      title: '明细总金额',
      width: 130,
      align: 'right' as const,
      customRender: ({ text }: { text: number }) => formatAmount(text),
    },
    {
      dataIndex: 'itemCount',
      title: '明细条数',
      width: 90,
      align: 'right' as const,
    },
    {
      dataIndex: 'locked',
      title: '锁定状态',
      width: 90,
      slots: { customRender: 'locked' },
    },
    {
      dataIndex: 'lockeTime',
      title: '锁定时间',
      width: 150,
      customRender: ({ text }: { text: string }) =>
        text ? formatDateTime(text) : '-',
    },
    {
      dataIndex: 'creatorUserName',
      title: '创建人',
      width: 90,
    },
    {
      dataIndex: 'creationTime',
      title: '创建时间',
      width: 150,
      customRender: ({ text }: { text: string }) => formatDateTime(text),
    },
    {
      dataIndex: 'remark',
      title: '备注',
      minWidth: 160,
      ellipsis: true,
    },
  ];
}
