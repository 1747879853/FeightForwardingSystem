import { rowTextColumn } from '#/utils/row-text-column';
import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { LoadingOrderAdminApi } from '#/api/sea-export/loading-order-admin';

import dayjs from 'dayjs';

import {
  LOADING_ORDER_STATUS_TEXT,
  LoadingOrderStatus,
} from '#/api/sea-export/loading-order-admin';
import { getCarrierDetail } from '#/api/system/base-data/carrier-admin';
import { UserAttribute } from '#/api/system/user-admin';
import { $t } from '#/locales';

const DATE_ONLY_PICKER_PROPS = {
  class: 'w-full',
  showTime: false,
  format: 'YYYY-MM-DD',
  valueFormat: 'YYYY-MM-DD',
};

const formatDateTime = (value?: null | string) => {
  if (!value) return '-';
  return dayjs(value).format('YYYY-MM-DD HH:mm');
};

const formatSupervisors = (
  users: LoadingOrderAdminApi.LoadingOrderUserDto[] | null | undefined,
) => {
  if (!users?.length) return '-';
  return (
    users
      .map((item) => item.user?.nickName || item.user?.enName)
      .filter(Boolean)
      .join(' / ') || '-'
  );
};

const formatGoods = (row: LoadingOrderAdminApi.LoadingOrderListDto) => {
  const names = (row.seaExport?.transportOrder?.orderCodeGoodss ?? [])
    .map((item) => item.codeGoods?.name)
    .filter(Boolean);
  return names.length > 0 ? names.join('、') : '-';
};

const formatVesselVoyage = (row: LoadingOrderAdminApi.LoadingOrderListDto) => {
  const vessel = row.seaExport?.vessel;
  const voyage = row.seaExport?.innerVoyno;
  const text = [vessel, voyage].filter(Boolean).join(' / ');
  return text || '-';
};

const formatCarrier = (row: LoadingOrderAdminApi.LoadingOrderListDto) => {
  const carrier = row.seaExport?.carrier;
  if (!carrier) return '-';
  return carrier.cnShortName || carrier.cnName || carrier.code || '-';
};

const getStatusOptions = () =>
  Object.entries(LOADING_ORDER_STATUS_TEXT).map(([value, label]) => ({
    label,
    value: Number(value),
  }));

/** 列 field → LoadingOrder.ApplySorting 路径（含 customPaths） */
export const LOADING_ORDER_SORT_FIELD_MAP: Record<string, string> = {
  'seaExport.transportOrder.mblNum': 'SeaExport.TransportOrder.MblNum',
  'seaExport.vessel': 'SeaExport.Vessel',
  'seaExport.carrier.cnShortName': 'SeaExport.Carrier.CnShortName',
  'seaExport.transportOrder.pkgs': 'SeaExport.TransportOrder.Pkgs',
  'carrierYard.name': 'CarrierYard.Name',
  loadingOrderUsers: 'LoadingOrderUsers.UserId',
};

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'loadingOrderNum',
      label: $t('seaExport.loadingOrder.list.loadingOrderNum'),
      componentProps: {
        allowClear: true,
        placeholder: $t('ui.placeholder.input'),
      },
    },
    {
      component: 'Select',
      fieldName: 'status',
      label: $t('seaExport.loadingOrder.list.status'),
      componentProps: {
        allowClear: true,
        options: getStatusOptions(),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'Input',
      fieldName: 'mblNum',
      label: $t('seaExport.loadingOrder.mblNum'),
      componentProps: {
        allowClear: true,
        placeholder: $t('ui.placeholder.input'),
      },
    },
    {
      component: 'Input',
      fieldName: 'commissionNum',
      label: $t('seaExport.export.commissionNum'),
      componentProps: {
        allowClear: true,
        placeholder: $t('ui.placeholder.input'),
      },
    },
    {
      component: 'CarrierSelect',
      fieldName: 'carrierId',
      label: $t('seaExport.loadingOrder.carrier'),
      componentProps: {
        allowClear: true,
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'Select',
      fieldName: 'carrierYardId',
      label: $t('seaExport.loadingOrder.carrierYard'),
      componentProps: {
        allowClear: true,
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
        options: [],
      },
      dependencies: {
        triggerFields: ['carrierId'],
        async componentProps(values, formApi) {
          const carrierId = values.carrierId;
          if (!carrierId) {
            if (values.carrierYardId != null) {
              await formApi.setFieldValue('carrierYardId', undefined);
            }
            return {
              allowClear: true,
              disabled: true,
              options: [],
              placeholder: $t('seaExport.loadingOrder.list.selectCarrierFirst'),
              class: 'w-full',
            };
          }
          const detail = await getCarrierDetail(carrierId);
          const options = (detail?.carrierYards ?? []).map((yard) => ({
            label: yard.name ?? String(yard.id),
            value: yard.id,
          }));
          return {
            allowClear: true,
            disabled: false,
            options,
            placeholder: $t('ui.placeholder.select'),
            class: 'w-full',
          };
        },
      },
    },
    {
      component: 'PortSelect',
      fieldName: 'polId',
      label: $t('seaExport.export.polId'),
      componentProps: {
        allowClear: true,
        placeholder: $t('ui.placeholder.select'),
        labelKey: 'ediCode',
      },
    },
    {
      component: 'Input',
      fieldName: 'vessel',
      label: $t('seaExport.export.vessel'),
      componentProps: {
        allowClear: true,
        placeholder: $t('ui.placeholder.input'),
      },
    },
    {
      component: 'Input',
      fieldName: 'innerVoyno',
      label: $t('seaExport.export.innerVoyno'),
      componentProps: {
        allowClear: true,
        placeholder: $t('ui.placeholder.input'),
      },
    },
    {
      component: 'CodeGoodsSelect',
      fieldName: 'codeGoodsId',
      label: $t('seaExport.loadingOrder.goods'),
      componentProps: {
        allowClear: true,
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'DatePicker',
      fieldName: 'estimatedArrivalDate',
      label: $t('seaExport.loadingOrder.list.estimatedArrivalDate'),
      componentProps: {
        ...DATE_ONLY_PICKER_PROPS,
        allowClear: true,
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'UserSelect',
      fieldName: 'userId',
      label: $t('seaExport.loadingOrder.supervisors'),
      componentProps: {
        allowClear: true,
        userAttribute: UserAttribute.LoadingSupervision,
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'OrganizationSelect',
      fieldName: 'orgId',
      label: $t('seaExport.export.organizationUnits'),
      componentProps: {
        allowClear: true,
        isCompany: true,
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'creationTimeRange',
      label: $t('seaExport.loadingOrder.list.creationTimeRange'),
      formItemClass: 'col-span-2',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        placeholder: [
          $t('seaExport.loadingOrder.list.creationTimeStart'),
          $t('seaExport.loadingOrder.list.creationTimeEnd'),
        ],
      },
    },
  ];
}

export function useColumns(): VxeTableGridOptions<LoadingOrderAdminApi.LoadingOrderListDto>['columns'] {
  return [
    {
      field: 'loadingOrderNum',
      title: $t('seaExport.loadingOrder.list.loadingOrderNum'),
      minWidth: 150,
      fixed: 'left',
      showOverflow: true,
      sortable: true,
    },
    {
      field: 'status',
      title: $t('seaExport.loadingOrder.list.status'),
      width: 110,
      slots: { default: 'status' },
      sortable: true,
    },
    {
      field: 'seaExport.transportOrder.mblNum',
      title: $t('seaExport.loadingOrder.mblNum'),
      minWidth: 140,
      showOverflow: true,
      sortable: true,
      sortField: 'SeaExport.TransportOrder.MblNum',
    },
    {
      field: 'seaExport.vessel',
      title: $t('seaExport.loadingOrder.vesselVoyage'),
      minWidth: 160,
      showOverflow: true,
      sortable: true,
      sortField: 'SeaExport.Vessel',
      ...rowTextColumn(({ row }) => formatVesselVoyage(row)),
    },
    {
      field: 'seaExport.carrier.cnShortName',
      title: $t('seaExport.loadingOrder.carrier'),
      minWidth: 120,
      showOverflow: true,
      sortable: true,
      sortField: 'SeaExport.Carrier.CnShortName',
      ...rowTextColumn(({ row }) => formatCarrier(row)),
    },
    {
      field: 'seaExport.transportOrder.orderCodeGoodss',
      title: $t('seaExport.loadingOrder.goods'),
      minWidth: 140,
      showOverflow: true,
      sortable: false,
      formatter: ({ row }) => formatGoods(row),
    },
    {
      field: 'seaExport.transportOrder.pkgs',
      title: $t('seaExport.loadingOrder.mainPkgs'),
      width: 90,
      align: 'right',
      sortable: true,
      sortField: 'SeaExport.TransportOrder.Pkgs',
      formatter: ({ row }) => {
        const pkgs = row.seaExport?.transportOrder?.pkgs;
        return pkgs == null ? '-' : String(pkgs);
      },
    },
    {
      field: 'estimatedArrivalTime',
      title: $t('seaExport.loadingOrder.estimatedArrivalTime'),
      width: 150,
      formatter: ({ cellValue }) => formatDateTime(cellValue),
      sortable: true,
    },
    {
      field: 'carrierYard.name',
      title: $t('seaExport.loadingOrder.carrierYard'),
      minWidth: 140,
      showOverflow: true,
      sortable: true,
      sortField: 'CarrierYard.Name',
    },
    {
      field: 'loadingOrderUsers',
      title: $t('seaExport.loadingOrder.supervisors'),
      minWidth: 120,
      showOverflow: true,
      sortable: true,
      // 一对多不能按集合路径反射；后端按先输入师傅的 UserId 排（SortId 最小）
      sortField: 'LoadingOrderUsers.UserId',
      formatter: ({ cellValue }) => formatSupervisors(cellValue),
    },
    {
      field: 'submitUserName',
      title: $t('seaExport.loadingOrder.list.submitUserName'),
      width: 100,
      showOverflow: true,
      formatter: ({ cellValue }) =>
        (typeof cellValue === 'string' ? cellValue.trim() : cellValue) || '-',
      sortable: false,
    },
    {
      field: 'submitTime',
      title: $t('seaExport.loadingOrder.list.submitTime'),
      width: 150,
      formatter: ({ cellValue }) => formatDateTime(cellValue),
      sortable: true,
    },
    {
      field: 'claimTime',
      title: $t('seaExport.loadingOrder.list.claimTime'),
      width: 150,
      formatter: ({ cellValue }) => formatDateTime(cellValue),
      sortable: true,
    },
    {
      field: 'completeTime',
      title: $t('seaExport.loadingOrder.list.completeTime'),
      width: 150,
      formatter: ({ cellValue }) => formatDateTime(cellValue),
      sortable: true,
    },
    {
      field: 'remark',
      title: $t('seaExport.loadingOrder.list.remark'),
      minWidth: 160,
      showOverflow: true,
      sortable: true,
    },
    {
      field: 'creationTime',
      title: $t('seaExport.loadingOrder.list.creationTime'),
      width: 150,
      formatter: ({ cellValue }) => formatDateTime(cellValue),
      sortable: true,
    },
  ];
}

export function getLoadingOrderStatusMeta(status?: null | number) {
  if (status == null) {
    return { label: '-', color: 'default' as const };
  }
  return {
    label: LOADING_ORDER_STATUS_TEXT[status] ?? String(status),
    color:
      status === LoadingOrderStatus.Unsubmitted
        ? 'default'
        : status === LoadingOrderStatus.Pending
          ? 'orange'
          : status === LoadingOrderStatus.Claimed
            ? 'processing'
            : status === LoadingOrderStatus.Completed
              ? 'success'
              : 'default',
  };
}
