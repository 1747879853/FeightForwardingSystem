import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { OrderFeeTemplateAdminApi } from '#/api/sea-export/order-fee-template-admin';
import { $t } from '#/locales';
import { createClientSelectSchema } from '../../../client/base/data';

/** 自动费用模板列表列配置持久化 key */
export const ORDER_FEE_TEMPLATE_LIST_TABLE_ID = 'OrderFeeTemplateList';

// 业务类型枚举选项（直接定义）
const bizTypeOptions: Array<{ label: string; value: number }> = [
  { label: '海运出口', value: 0 },
];

// 收付类型枚举选项（直接定义）
const paySideOptions: Array<{ label: string; value: number }> = [
  { label: '应收', value: 0 },
  { label: '应付', value: 1 },
];

// 贸易条款枚举选项
const tradeTermsTypeOptions: Array<{ label: string; value: number }> = [
  { label: 'CIF', value: 0 },
  { label: 'FOB', value: 1 },
  { label: 'EXW', value: 2 },
  { label: 'FCA', value: 3 },
  { label: 'DDP', value: 4 },
  { label: 'DDU', value: 5 },
  { label: 'DAP', value: 6 },
  { label: 'C&F', value: 7 },
];

// 货物类型枚举选项
const cargoTypeOptions: Array<{ label: string; value: number }> = [
  { label: '普通货', value: 0 },
  { label: '冻柜', value: 1 },
  { label: '危险品', value: 2 },
  { label: '超限箱', value: 3 },
];

// 装运方式枚举选项
const blTypeOptions: Array<{ label: string; value: number }> = [
  { label: '整柜', value: 0 },
  { label: '拼箱分票', value: 1 },
  { label: '拼箱主票', value: 2 },
];

// 服务项枚举选项
const serviceTypeOptions: Array<{ label: string; value: number }> = [
  { label: '订舱', value: 0 },
  { label: '拖车', value: 1 },
  { label: '报关', value: 2 },
  { label: '仓库', value: 3 },
  { label: '保险', value: 4 },
  { label: '代收支', value: 5 },
];

/**
 * 格式化业务类型显示
 */
function formatBizType(bizType?: number): string {
  const option = bizTypeOptions.find((opt) => opt.value === bizType);
  return option?.label || '-';
}

/**
 * 格式化收付类型显示
 */
function formatPaySide(paySide?: number): string {
  const option = paySideOptions.find((opt) => opt.value === paySide);
  return option?.label || '-';
}

/**
 * 格式化是否长期有效显示
 */
function formatEfficient(efficient?: boolean): string {
  return efficient ? '是' : '否';
}

/**
 * 格式化贸易条款显示
 */
function formatTradeTermsType(tradeTermsType?: number | null): string {
  if (tradeTermsType === null || tradeTermsType === undefined) return '-';
  const option = tradeTermsTypeOptions.find(
    (opt) => opt.value === tradeTermsType,
  );
  return option?.label || String(tradeTermsType);
}

/**
 * 格式化货物类型显示
 */
function formatCargoType(cargoId?: number | null): string {
  if (cargoId === null || cargoId === undefined) return '-';
  const option = cargoTypeOptions.find((opt) => opt.value === cargoId);
  return option?.label || String(cargoId);
}

/**
 * 格式化装运方式显示
 */
function formatBlType(blType?: number | null): string {
  if (blType === null || blType === undefined) return '-';
  const option = blTypeOptions.find((opt) => opt.value === blType);
  return option?.label || String(blType);
}

/**
 * 格式化服务项显示
 */
function formatServiceType(serviceType?: number | null): string {
  if (serviceType === null || serviceType === undefined) return '-';
  const option = serviceTypeOptions.find((opt) => opt.value === serviceType);
  return option?.label || String(serviceType);
}

/**
 * 获取表格列配置
 */
export function useColumns(
  onActionClick: OnActionClickFn<OrderFeeTemplateAdminApi.OrderFeeTemplateListDto>,
): VxeTableGridOptions<OrderFeeTemplateAdminApi.OrderFeeTemplateListDto>['columns'] {
  return [
    {
      type: 'checkbox',
      width: 50,
      fixed: 'left',
    },
    {
      field: 'name',
      title: '模板名称',
      minWidth: 150,
      fixed: 'left',
    },
    {
      field: 'bizType',
      title: '业务类型',
      width: 100,
      formatter: ({ row }) => formatBizType(row.bizType),
    },
    {
      field: 'paySide',
      title: '收付类型',
      width: 100,
      formatter: ({ row }) => formatPaySide(row.paySide),
    },
    {
      field: 'efficient',
      title: '长期有效',
      width: 100,
      formatter: ({ row }) => formatEfficient(row.efficient),
    },
    {
      field: 'enable',
      title: '启用状态',
      width: 100,
      slots: { default: 'enable' },
    },
    {
      field: 'startTime',
      title: '生效开始时间',
      width: 160,
      formatter: ({ row }) => row.startTime || '-',
    },
    {
      field: 'endTime',
      title: '生效结束时间',
      width: 160,
      formatter: ({ row }) => row.endTime || '-',
    },
    {
      field: 'client',
      title: '委托单位',
      minWidth: 150,
      formatter: ({ row }) => row.client?.name || '-',
    },
    {
      field: 'pol',
      title: '起运港',
      width: 120,
      formatter: ({ row }) => row.pol?.portName || row.pol?.cnName || '-',
    },
    {
      field: 'pod',
      title: '目的港',
      width: 120,
      formatter: ({ row }) => row.pod?.portName || row.pod?.cnName || '-',
    },
    {
      field: 'carrier',
      title: '船公司',
      width: 120,
      formatter: ({ row }) => row.carrier?.cnName || '-',
    },
    {
      field: 'bookingAgent',
      title: '订舱代理',
      width: 120,
      formatter: ({ row }) => row.bookingAgent?.name || '-',
    },
    {
      field: 'tradeTermsType',
      title: '贸易条款',
      width: 100,
      formatter: ({ row }) => formatTradeTermsType(row.tradeTermsType),
    },
    {
      field: 'cargoId',
      title: '货物类型',
      width: 100,
      formatter: ({ row }) => formatCargoType(row.cargoId),
    },
    {
      field: 'blType',
      title: '装运方式',
      width: 100,
      formatter: ({ row }) => formatBlType(row.blType),
    },
    {
      field: 'serviceType',
      title: '服务项',
      width: 100,
      formatter: ({ row }) => formatServiceType(row.serviceType),
    },
    {
      field: 'itemCount',
      title: '费用明细数',
      width: 100,
      align: 'right',
    },
    {
      field: 'creatorUserName',
      title: '创建人',
      width: 100,
    },
    {
      field: 'creationTime',
      title: '创建时间',
      width: 160,
    },
    {
      field: 'lastModifierUserName',
      title: '修改人',
      width: 100,
    },
    {
      field: 'lastModificationTime',
      title: '修改时间',
      width: 160,
    },
    {
      field: 'remark',
      title: '备注',
      minWidth: 200,
      showOverflow: true,
    },
  ];
}

/**
 * 获取查询表单 schema
 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'name',
      label: '模板名称',
      component: 'Input',
      componentProps: {
        placeholder: '请输入模板名称',
        allowClear: true,
      },
    },
    {
      fieldName: 'bizType',
      label: '业务类型',
      component: 'Select',
      componentProps: {
        placeholder: '请选择业务类型',
        options: bizTypeOptions,
        allowClear: true,
      },
    },
    {
      fieldName: 'paySide',
      label: '收付类型',
      component: 'Select',
      componentProps: {
        placeholder: '请选择收付类型',
        options: paySideOptions,
        allowClear: true,
      },
    },
    {
      fieldName: 'efficient',
      label: '长期有效',
      component: 'Select',
      componentProps: {
        placeholder: '请选择',
        options: [
          { label: '是', value: true },
          { label: '否', value: false },
        ],
        allowClear: true,
      },
    },
    createClientSelectSchema({
      fieldName: 'clientId',
      industryCategory: 'p',
      label: '委托单位',
    }),
    {
      component: 'CarrierSelect',
      fieldName: 'carrierId',
      label: '船公司',
      componentProps: {
        placeholder: '请选择船公司',
        allowClear: true,
      },
    },
    createClientSelectSchema({
      fieldName: 'bookingAgentId',
      industryCategory: 'o',
      label: '订舱代理',
    }),
    {
      fieldName: 'serviceType',
      label: '服务项',
      component: 'Input',
      componentProps: {
        placeholder: '请输入服务项',
        allowClear: true,
      },
    },
  ];
}
