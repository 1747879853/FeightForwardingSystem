import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';
import { getPaymentApplicationStatusOptions } from '#/constants/application-status';
import { $t } from '#/locales';

const paymentApplicationStatusOptions = () =>
  getPaymentApplicationStatusOptions((key) => $t(key));

/** 动态「申请合计」子列字段前缀 */
const APPLIED_TOTAL_FIELD_PREFIX = 'appliedTotal_';

function appliedTotalFieldKey(currencyId: number): string {
  return `${APPLIED_TOTAL_FIELD_PREFIX}${currencyId}`;
}

/** 是否为「申请合计」下的币别子列（用于列配置面板隐藏子列，只保留分组开关） */
export function isAppliedTotalChildField(
  field: string | undefined | null,
): boolean {
  return !!field && field.startsWith(APPLIED_TOTAL_FIELD_PREFIX);
}

interface AppliedTotalCurrency {
  currencyId: number;
  currencyCode: string;
}

/** 从当前页数据收集出现的币别（按 currencyId 升序去重） */
function collectAppliedTotalCurrencies(
  rows: PaymentApplicationAdminApi.PaymentApplicationDto[],
): AppliedTotalCurrency[] {
  const map = new Map<number, AppliedTotalCurrency>();
  for (const row of rows) {
    for (const group of row.currencyGroup ?? []) {
      if (group.id != null && !map.has(group.id)) {
        map.set(group.id, {
          currencyId: group.id,
          currencyCode: group.code ?? '',
        });
      }
    }
  }
  return [...map.values()].sort((a, b) => a.currencyId - b.currencyId);
}

/** 计算某行某币别的申请合计（原币）= 收申请量 + 付申请量 */
function calcRowAppliedTotal(
  row: PaymentApplicationAdminApi.PaymentApplicationDto,
  currencyId: number,
): number | undefined {
  const group = row.currencyGroup?.find((g) => g.id === currencyId);
  if (!group) return undefined;
  return (group.payAmount ?? 0) + (group.receiveAmount ?? 0);
}

/** 按币别平铺生成申请合计列，一列一个币别（单行表头） */
function buildAppliedTotalColumns(
  currencies: AppliedTotalCurrency[],
  visible: boolean,
) {
  const suffix = $t('seaExport.export.paymentApplication.appliedTotal');
  return currencies.map((c) => ({
    field: appliedTotalFieldKey(c.currencyId),
    title: `${c.currencyCode || c.currencyId}${suffix}`,
    minWidth: 120,
    align: 'right' as const,
    sortable: false,
    visible,
    formatter: ({
      row,
    }: {
      row: PaymentApplicationAdminApi.PaymentApplicationDto;
    }) => {
      const val = calcRowAppliedTotal(row, c.currencyId);
      return val == null ? '' : val.toFixed(2);
    },
  }));
}

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'Keyword',
      label: $t('seaExport.export.number'),
      componentProps: {
        placeholder: $t(
          'seaExport.export.paymentApplication.keywordPlaceholder',
        ),
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'ApplicationNo',
      label: $t('seaExport.export.paymentApplication.applicationNo'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'Status',
      label: $t('seaExport.export.paymentApplication.status'),
      componentProps: {
        allowClear: true,
        options: paymentApplicationStatusOptions().map(({ label, value }) => ({
          label,
          value,
        })),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'ClientSelect',
      fieldName: 'SettlementId',
      label: $t('seaExport.export.paymentApplication.clientName'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'CurrencySelect',
      fieldName: 'CurrencyId',
      label: $t('seaExport.export.paymentApplication.currencyCode'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'SubmitTimeRange',
      label: $t('seaExport.export.paymentApplication.submitTime'),
      componentProps: {
        placeholder: [
          $t('seaExport.export.paymentApplication.submitTimeStart'),
          $t('seaExport.export.paymentApplication.submitTimeEnd'),
        ],
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'EndTimeRange',
      label: $t('seaExport.export.paymentApplication.endTime'),
      componentProps: {
        placeholder: [
          $t('seaExport.export.paymentApplication.endTimeStart'),
          $t('seaExport.export.paymentApplication.endTimeEnd'),
        ],
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'UserSelect',
      fieldName: 'CreatorUserId',
      label: $t('seaExport.export.paymentApplication.creatorUserName'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        class: 'w-full',
      },
    },
  ];
}

export function useColumns(
  rows: PaymentApplicationAdminApi.PaymentApplicationDto[] = [],
  appliedTotalVisible = true,
): VxeTableGridOptions<PaymentApplicationAdminApi.PaymentApplicationDto>['columns'] {
  // 按当前页币别平铺生成申请合计列（单行表头），
  // 其显隐由列配置面板的单个「申请合计」开关统一控制
  const appliedTotalColumns = buildAppliedTotalColumns(
    collectAppliedTotalCurrencies(rows),
    appliedTotalVisible,
  );

  return [
    { type: 'checkbox', width: 50, fixed: 'left' },
    { type: 'seq', width: 50, fixed: 'left' },
    {
      field: 'applicationNo',
      title: $t('seaExport.export.paymentApplication.applicationNo'),
      minWidth: 160,
      fixed: 'left',
    },
    {
      field: 'status',
      title: $t('seaExport.export.paymentApplication.status'),
      minWidth: 100,
      cellRender: {
        name: 'CellTag',
        options: paymentApplicationStatusOptions(),
      },
    },
    {
      field: 'clientName',
      title: $t('seaExport.export.paymentApplication.clientName'),
      minWidth: 160,
      showOverflow: true,
    },
    {
      field: 'currencyCode',
      title: $t('seaExport.export.paymentApplication.currencyCode'),
      minWidth: 80,
    },
    {
      field: 'totalPayPrice',
      title: $t('seaExport.export.paymentApplication.totalPayPrice'),
      minWidth: 120,
      align: 'right',
    },
    {
      field: 'totalReceivePrice',
      title: $t('seaExport.export.paymentApplication.totalReceivePrice'),
      minWidth: 120,
      align: 'right',
    },
    ...appliedTotalColumns,
    {
      field: 'creatorUserName',
      title: $t('seaExport.export.paymentApplication.creatorUserName'),
      minWidth: 100,
    },
    {
      field: 'require',
      title: $t('seaExport.export.paymentApplication.require'),
      minWidth: 140,
      showOverflow: true,
    },
    {
      field: 'remark',
      title: $t('seaExport.export.paymentApplication.remark'),
      minWidth: 140,
      showOverflow: true,
    },
    {
      field: 'submitTime',
      title: $t('seaExport.export.paymentApplication.submitTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      field: 'endTime',
      title: $t('seaExport.export.paymentApplication.endTime'),
      minWidth: 160,
      formatter: 'formatDate',
    },
    {
      field: 'creationTime',
      title: $t('seaExport.export.paymentApplication.creationTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
  ];
}
