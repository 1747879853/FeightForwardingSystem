import type { VbenFormSchema } from '#/adapter/form';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';
import type {
  AirTrackingRowLike,
  ContainerTrackingRowLike,
} from '#/components/tracking';
import type { YundangTrackRowInfo } from '#/views/sea-export-admin/use-yundang-ocean-track';

import {
  PreOrderAdminApi,
  PreOrderStatus,
} from '#/api/pre-order/pre-order-admin';
import { isVendorOceanExportTracking } from '#/utils/tracking-brand';
import { createClientSelectSchema } from '#/views/client/base/data';
import { getSeaExportBusinessStatusMeta } from '#/views/sea-export-admin/data';

/** 列配置持久化 key */
export const PRE_ORDER_LIST_TABLE_ID = 'PreOrderList';

/** 业务联系单表单路径（统一编辑页，按钮显隐由状态控制） */
export function getPreOrderFormPath(id: number | string) {
  return `/pre-order/${id}/edit`;
}

/** 业务联系单状态选项（列表筛选与列标签共用） */
export function getPreOrderStatusOptions() {
  return [
    { label: '录入状态', value: PreOrderStatus.Entering, color: 'default' },
    { label: '待审核', value: PreOrderStatus.Auditing, color: 'processing' },
    { label: '通过', value: PreOrderStatus.Passed, color: 'success' },
    { label: '驳回', value: PreOrderStatus.Rejected, color: 'error' },
  ];
}

/** 列表运踪走哪套：未生成业务 / 海出(新旧服务商) / 海进 / 空出 */
export type PreOrderTrackingKind =
  | 'air'
  | 'none'
  | 'ocean-legacy'
  | 'ocean-vendor';

export function getPreOrderTrackingKind(
  row: PreOrderAdminApi.PreOrderDto,
): PreOrderTrackingKind {
  const order = row.transportOrder;
  if (!order) return 'none';
  if (order.airExport) return 'air';
  if (order.seaImport) return 'ocean-vendor';
  if (order.seaExport) {
    return isVendorOceanExportTracking ? 'ocean-vendor' : 'ocean-legacy';
  }
  return 'none';
}

function toOrderLabelSource(row: PreOrderAdminApi.PreOrderDto) {
  return {
    commissionNum: row.transportOrder?.commissionNum,
    mblNum: row.transportOrder?.mblNum ?? row.mblNum,
  };
}

/** 业务状态只看海出服务项；海进/空出/未通过没有服务项，文案是 `-` */
export function getPreOrderBusinessStatusMeta(
  row: PreOrderAdminApi.PreOrderDto,
  labelMap?: Map<number, string>,
) {
  const services = row.transportOrder?.seaExport?.seaExportServices ?? [];
  return getSeaExportBusinessStatusMeta(
    { seaExportServices: services } as SeaExportAdminApi.SeaExportDto,
    labelMap,
  );
}

export function toPreOrderContainerTrackingRow(
  row: PreOrderAdminApi.PreOrderDto,
): ContainerTrackingRowLike | null {
  const sea =
    row.transportOrder?.seaExport ?? row.transportOrder?.seaImport ?? null;
  if (!sea) return null;
  return {
    id: sea.id,
    isFeituoSubscribed: sea.isFeituoSubscribed,
    isFeituoSubscribeSuccess: sea.isFeituoSubscribeSuccess,
    feituoTracking: sea.feituoTracking,
    transportOrder: toOrderLabelSource(row),
  };
}

export function toPreOrderAirTrackingRow(
  row: PreOrderAdminApi.PreOrderDto,
): AirTrackingRowLike | null {
  const air = row.transportOrder?.airExport;
  if (!air) return null;
  return {
    id: air.id,
    isFeituoSubscribed: air.isFeituoSubscribed,
    isFeituoSubscribeSuccess: air.isFeituoSubscribeSuccess,
    feituoTracking: air.feituoTracking,
    transportOrder: toOrderLabelSource(row),
  };
}

export function toPreOrderYundangTrackRow(
  row: PreOrderAdminApi.PreOrderDto,
): null | YundangTrackRowInfo {
  const sea = row.transportOrder?.seaExport;
  if (!sea) return null;
  return {
    id: String(sea.id),
    isYundangSubscribed: sea.isYundangSubscribed,
    isYundangSubscribeSuccess: sea.isYundangSubscribeSuccess,
    yundangShipmentOceanNode: sea.yundangShipmentOceanNode,
    commissionNum: row.transportOrder?.commissionNum,
    mblNum: row.transportOrder?.mblNum ?? row.mblNum,
    bookingNum: row.transportOrder?.bookingNum,
  };
}

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'Keyword',
      label: '关键字',
      componentProps: {
        placeholder: '业务编号 / 主提单号',
        allowClear: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'Status',
      label: '状态',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        options: getPreOrderStatusOptions().map(({ label, value }) => ({
          label,
          value,
        })),
      },
    },
    createClientSelectSchema({
      fieldName: 'ClientId',
      industryCategory: 'p',
      label: '委托单位',
    }),
    {
      component: 'PortSelect',
      fieldName: 'POLId',
      label: '起运港',
      componentProps: { allowClear: true, class: 'w-full' },
    },
    {
      component: 'PortSelect',
      fieldName: 'PODId',
      label: '目的港',
      componentProps: { allowClear: true, class: 'w-full' },
    },
    {
      component: 'RangePicker',
      fieldName: 'ETDRange',
      label: '开船日期',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        placeholder: ['开始日期', '结束日期'],
      },
    },
    {
      component: 'UserSelect',
      fieldName: 'SaleIds',
      label: '销售',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        mode: 'multiple',
        maxTagCount: 2,
        userAttribute: PreOrderAdminApi.UserAttribute.Sale,
      },
    },
    {
      component: 'UserSelect',
      fieldName: 'OperatorIds',
      label: '操作',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        mode: 'multiple',
        maxTagCount: 2,
        userAttribute: PreOrderAdminApi.UserAttribute.Operation,
      },
    },
    {
      component: 'UserSelect',
      fieldName: 'CreatorUserId',
      label: '创建人',
      componentProps: { allowClear: true, class: 'w-full' },
    },
    {
      component: 'Input',
      fieldName: 'Remark',
      label: '备注',
      componentProps: {
        placeholder: '备注关键字',
        allowClear: true,
      },
    },
  ];
}

export function buildColumns(): Array<Record<string, any>> {
  return [
    { type: 'checkbox', width: 50, fixed: 'left' },
    { type: 'seq', width: 50, fixed: 'left' },
    {
      field: 'preOrderNum',
      title: '业务编号',
      minWidth: 160,
      fixed: 'left',
    },
    {
      field: 'status',
      title: '状态',
      minWidth: 100,
      cellRender: { name: 'CellTag', options: getPreOrderStatusOptions() },
    },
    {
      field: 'businessStatus',
      title: '业务状态',
      minWidth: 130,
      sortable: false,
      showOverflow: true,
      slots: { default: 'businessStatus' },
    },
    {
      field: 'yundangTrackStatus',
      title: '运踪状态',
      minWidth: 120,
      sortable: false,
      slots: { default: 'yundangTrackStatus' },
    },
    {
      field: 'clientName',
      title: '委托单位',
      minWidth: 180,
      showOverflow: true,
      formatter: ({ row }) => row.client?.name ?? '',
    },
    { field: 'mblNum', title: '主提单号', minWidth: 140 },
    {
      field: 'polName',
      title: '起运港',
      minWidth: 140,
      showOverflow: true,
      formatter: ({ row }) => row.polRemark ?? '',
    },
    {
      field: 'podName',
      title: '目的港',
      minWidth: 140,
      showOverflow: true,
      formatter: ({ row }) => row.podRemark ?? '',
    },
    {
      field: 'carrierName',
      title: '船公司',
      minWidth: 120,
      slots: { default: 'carrierWithLogo' },
    },
    {
      field: 'etd',
      title: '开船日期',
      minWidth: 120,
      formatter: 'formatDate',
    },
    {
      field: 'goodsCompleteTime',
      title: '货好时间',
      minWidth: 120,
      formatter: 'formatDate',
    },
    {
      field: 'saleNames',
      title: '销售',
      minWidth: 100,
      showOverflow: true,
      formatter: ({ cellValue }) =>
        Array.isArray(cellValue) ? cellValue.join('、') : (cellValue ?? ''),
    },
    {
      field: 'operatorNames',
      title: '操作',
      minWidth: 100,
      showOverflow: true,
      formatter: ({ cellValue }) =>
        Array.isArray(cellValue) ? cellValue.join('、') : (cellValue ?? ''),
    },
    {
      field: 'remark',
      title: '备注',
      minWidth: 160,
      showOverflow: true,
    },
    { field: 'creatorUserName', title: '创建人', minWidth: 100 },
    {
      field: 'creationTime',
      title: '创建时间',
      minWidth: 160,
      formatter: 'formatDateTime',
    },
  ];
}
