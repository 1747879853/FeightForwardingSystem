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
      key: 'commissionNum',
      dataIndex: 'commissionNum',
      title: '委托编号',
      ellipsis: true,
    },
    {
      key: 'mblNum',
      dataIndex: 'mblNum',
      title: '主提单号',
      ellipsis: true,
    },
    {
      key: 'feeCodeName',
      dataIndex: 'feeCodeName',
      title: '费用名称',
      ellipsis: true,
    },
    {
      key: 'currencyCode',
      dataIndex: 'currencyCode',
      title: '币别',
      width: 72,
    },
    {
      key: 'amount',
      dataIndex: 'amount',
      title: '费用总额',
      width: 96,
      align: 'right' as const,
      customRender: ({ text }: { text: number }) => formatAmount(text),
    },
    {
      key: 'remainingAmount',
      dataIndex: 'remainingAmount',
      title: '剩余额度',
      width: 96,
      align: 'right' as const,
      customRender: ({ text }: { text: number }) => formatAmount(text),
    },
    {
      key: 'settledAmount',
      dataIndex: 'settledAmount',
      title: '本次结算',
      width: 96,
      align: 'right' as const,
      customRender: ({ text }: { text: number }) => formatAmount(text),
    },
    {
      key: 'settlementName',
      dataIndex: 'settlementName',
      title: '结算对象',
      ellipsis: true,
    },
    {
      key: 'remark',
      dataIndex: 'remark',
      title: '备注',
      ellipsis: true,
    },
  ];
}

/** 收费结算锁定状态归一化 */
export function isReceiveSettlementLocked(locked: unknown): boolean {
  return locked === true || locked === 1 || locked === '1' || locked === 'true';
}

/** 收费结算只读子表 ant Table 列配置 */
export function useReceiveSettlementColumns() {
  return [
    {
      key: 'settlementNo',
      dataIndex: 'settlementNo',
      title: '结算单号',
      ellipsis: true,
    },
    {
      key: 'status',
      dataIndex: 'status',
      title: '结算状态',
      width: 88,
    },
    {
      key: 'settlementTime',
      dataIndex: 'settlementTime',
      title: '结算时间',
      width: 132,
      customRender: ({ text }: { text: string }) => formatDateTime(text),
    },
    {
      key: 'totalSettledAmount',
      dataIndex: 'totalSettledAmount',
      title: '明细总金额',
      width: 100,
      align: 'right' as const,
      customRender: ({ text }: { text: number }) => formatAmount(text),
    },
    {
      key: 'itemCount',
      dataIndex: 'itemCount',
      title: '明细条数',
      width: 88,
      align: 'right' as const,
    },
    {
      key: 'locked',
      dataIndex: 'locked',
      title: '锁定状态',
      width: 80,
    },
    {
      key: 'lockeTime',
      dataIndex: 'lockeTime',
      title: '锁定时间',
      width: 132,
      customRender: ({ text }: { text: string }) =>
        text ? formatDateTime(text) : '-',
    },
    {
      key: 'creatorUserName',
      dataIndex: 'creatorUserName',
      title: '创建人',
      width: 80,
      ellipsis: true,
    },
    {
      key: 'creationTime',
      dataIndex: 'creationTime',
      title: '创建时间',
      width: 132,
      customRender: ({ text }: { text: string }) => formatDateTime(text),
    },
    {
      key: 'remark',
      dataIndex: 'remark',
      title: '备注',
      ellipsis: true,
    },
  ];
}
