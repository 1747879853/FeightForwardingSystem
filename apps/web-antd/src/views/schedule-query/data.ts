import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { FeituoScheduleAdminApi } from '#/api/schedule/feituo-schedule-admin';

type FeituoScheduleItemDto = FeituoScheduleAdminApi.FeituoScheduleItemDto;

/** 范围(周)选项 1~8 */
const weeksOutOptions = Array.from({ length: 8 }, (_, index) => {
  const week = index + 1;
  return { label: `${week} 周（${week * 7} 天）`, value: week };
});

/** 运输方式中文映射 */
export const transportModeMap: Record<string, string> = {
  VESSEL: '大船',
  TRUCK: '卡车',
  RAIL: '铁路',
  FEEDER: '驳船',
  BARGE: '支线',
};

export function getTransportModeText(mode?: string): string {
  if (!mode) return '-';
  return transportModeMap[mode] || mode;
}

/**
 * 表格搜索表单配置
 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'polCode',
      label: '起始港五字码',
      rules: 'required',
      componentProps: {
        placeholder: '如 CNSHA',
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'podCode',
      label: '目的港五字码',
      rules: 'required',
      componentProps: {
        placeholder: '如 USLGB',
        allowClear: true,
      },
    },
    {
      component: 'DatePicker',
      fieldName: 'etd',
      label: '预计离港日期',
      rules: 'required',
      componentProps: {
        class: 'w-full',
        allowClear: true,
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
        placeholder: '请选择离港日期',
      },
    },
    {
      component: 'Select',
      fieldName: 'weeksOut',
      label: '范围(周)',
      rules: 'selectRequired',
      defaultValue: 8,
      componentProps: {
        placeholder: '请选择范围',
        allowClear: false,
        options: weeksOutOptions,
      },
    },
    {
      component: 'DatePicker',
      fieldName: 'eta',
      label: '预计到港日期',
      componentProps: {
        class: 'w-full',
        allowClear: true,
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
        placeholder: '选填，传入后范围(周)不生效',
      },
    },
    {
      component: 'CarrierSelect',
      fieldName: 'carrierCd',
      label: '船公司',
      componentProps: {
        placeholder: '选填',
        allowClear: true,
        // 取船公司代码作为查询值
        valueKey: 'code',
        labelKey: 'code',
      },
    },
    {
      component: 'Input',
      fieldName: 'routeCode',
      label: '头程航线代码',
      componentProps: {
        placeholder: '选填',
        allowClear: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'isTransit',
      label: '中转标识',
      componentProps: {
        placeholder: '不传返回全部',
        allowClear: true,
        options: [
          { label: '全部', value: null },
          { label: '直达', value: 0 },
          { label: '中转', value: 1 },
        ],
      },
    },
    {
      component: 'Input',
      fieldName: 'transitPortEn',
      label: '第1次中转港',
      componentProps: {
        placeholder: '选填，中转港口名',
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'vessel',
      label: '船名',
      componentProps: {
        placeholder: '选填',
        allowClear: true,
      },
    },
  ];
}

function formatDate(value?: string): string {
  if (!value) return '-';
  // 兼容 yyyy-MM-dd 与 ISO 时间串，仅展示日期部分
  const datePart = value.split('T')[0] ?? value;
  return datePart.length >= 10 ? datePart.slice(0, 10) : datePart;
}

/**
 * 表格列配置
 */
export function useColumns(): VxeTableGridOptions<FeituoScheduleItemDto>['columns'] {
  return [
    {
      type: 'seq',
      title: '#',
      width: 50,
      fixed: 'left',
      align: 'center',
    },
    {
      field: 'carrierCd',
      title: '船公司',
      width: 120,
      align: 'left',
      fixed: 'left',
      formatter: ({ row }) => {
        const scac = row.scac ? `(${row.scac})` : '';
        return row.carrierCd ? `${row.carrierCd}${scac}` : '-';
      },
    },
    {
      field: 'vessel',
      title: '船名/航次',
      minWidth: 180,
      align: 'left',
      fixed: 'left',
      slots: { default: 'vesselVoyage' },
    },
    {
      field: 'transportMode',
      title: '运输方式',
      width: 100,
      align: 'center',
      formatter: ({ row }) => getTransportModeText(row.transportMode),
    },
    {
      field: 'isTransit',
      title: '直达/中转',
      width: 100,
      align: 'center',
      slots: { default: 'isTransit' },
    },
    {
      field: 'pol',
      title: '起运港',
      minWidth: 200,
      align: 'left',
      slots: { default: 'pol' },
    },
    {
      field: 'pod',
      title: '目的港',
      minWidth: 200,
      align: 'left',
      slots: { default: 'pod' },
    },
    {
      field: 'etd',
      title: '预计离港',
      width: 120,
      align: 'center',
      formatter: ({ row }) => formatDate(row.etd),
    },
    {
      field: 'eta',
      title: '预计到港',
      width: 120,
      align: 'center',
      formatter: ({ row }) => formatDate(row.eta),
    },
    {
      field: 'totalDuration',
      title: '预计航程(天)',
      width: 110,
      align: 'center',
      formatter: ({ row }) =>
        row.totalDuration === null || row.totalDuration === undefined
          ? '-'
          : String(row.totalDuration),
    },
    {
      field: 'staticEtd',
      title: '计划离港',
      width: 120,
      align: 'center',
      formatter: ({ row }) => formatDate(row.staticEtd),
    },
    {
      field: 'staticEta',
      title: '计划到港',
      width: 120,
      align: 'center',
      formatter: ({ row }) => formatDate(row.staticEta),
    },
    {
      field: 'transitTime',
      title: '计划航程(天)',
      width: 110,
      align: 'center',
      formatter: ({ row }) =>
        row.transitTime === null || row.transitTime === undefined
          ? '-'
          : String(row.transitTime),
    },
    {
      field: 'transits',
      title: '中转港',
      minWidth: 200,
      align: 'left',
      slots: { default: 'transits' },
    },
    {
      field: 'routeCode',
      title: '航线代码',
      width: 120,
      align: 'left',
      formatter: ({ row }) => row.routeCode || '-',
    },
    {
      field: 'displayName',
      title: '标准航线代码',
      width: 130,
      align: 'left',
      formatter: ({ row }) => row.displayName || '-',
    },
    {
      field: 'shipManager',
      title: '母船简称',
      width: 120,
      align: 'left',
      formatter: ({ row }) => row.shipManager || '-',
    },
    {
      field: 'cyCutoff',
      title: '截关时间',
      width: 150,
      align: 'center',
      formatter: ({ row }) => row.cyCutoff || '-',
    },
    {
      field: 'siCutoff',
      title: '截单时间',
      width: 150,
      align: 'center',
      formatter: ({ row }) => row.siCutoff || '-',
    },
    {
      field: 'vgmCutoff',
      title: '截VGM时间',
      width: 150,
      align: 'center',
      formatter: ({ row }) => row.vgmCutoff || '-',
    },
    {
      field: 'bookingCutoff',
      title: '截订舱时间',
      width: 150,
      align: 'center',
      formatter: ({ row }) => row.bookingCutoff || '-',
    },
    {
      field: 'inlandCutoff',
      title: '截港时间',
      width: 150,
      align: 'center',
      formatter: ({ row }) => row.inlandCutoff || '-',
    },
    {
      field: 'updateTime',
      title: '最后更新时间',
      width: 160,
      align: 'center',
      formatter: ({ row }) => row.updateTime || '-',
    },
  ];
}
