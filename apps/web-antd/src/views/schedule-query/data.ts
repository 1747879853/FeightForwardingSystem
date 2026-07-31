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
 * 船舶 AIS 定位 Iframe 配置（读自 VITE_GLOB_FREIGHTOWER_AIS_* 环境变量）
 */
export const AIS_IFRAME_CONFIG = {
  /** Iframe 基础地址（hash 路由） */
  baseUrl:
    (import.meta.env.VITE_GLOB_FREIGHTOWER_AIS_URL as string) ||
    'https://i.saas.freightower.com/#/ais/vessel',
  /** 客户账号 */
  clientId:
    (import.meta.env.VITE_GLOB_FREIGHTOWER_AIS_CLIENT_ID as string) || '',
  /** 密钥 */
  key: (import.meta.env.VITE_GLOB_FREIGHTOWER_AIS_KEY as string) || '',
};

/**
 * 构建船舶 AIS 定位 Iframe 地址
 * @param mmsiOrVessel MMSI 号或船名（支持多条，用英文逗号隔开）
 */
export function buildAisIframeUrl(mmsiOrVessel?: string): string {
  const { baseUrl, clientId, key } = AIS_IFRAME_CONFIG;
  const params = new URLSearchParams();
  if (key) params.set('key', key);
  params.set('clientId', clientId);
  params.set('mmsi', (mmsiOrVessel ?? '').trim());
  params.set('lang', 'zh');
  return `${baseUrl}?${params.toString()}`;
}

/**
 * 表格搜索表单配置
 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'PortSelect',
      fieldName: 'polCode',
      label: '起始港',
      rules: 'selectRequired',
      componentProps: {
        placeholder: '请选择起始港',
        // 查询接口以五字码（EDI 代码）为准，故 value 取 ediCode
        valueKey: 'ediCode',
        // 选中回显：CNTAO/QINGDAO,CHINA（仍用 ediCode 作 value）
        labelKey: 'ediPortCountry',
        allowClear: true,
      },
    },
    {
      component: 'PortSelect',
      fieldName: 'podCode',
      label: '目的港',
      rules: 'selectRequired',
      componentProps: {
        placeholder: '请选择目的港',
        valueKey: 'ediCode',
        labelKey: 'ediPortCountry',
        allowClear: true,
      },
    },
    {
      component: 'DatePicker',
      fieldName: 'etd',
      label: '预计离港',
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
      component: 'DatePicker',
      fieldName: 'eta',
      label: '预计到港',
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

/** 通用文本兜底：空值统一显示 - */
function text(value?: null | number | string): string {
  return value === null || value === undefined || value === ''
    ? '-'
    : String(value);
}

/** 共舱结果集摘要文本 */
function formatShareCabins(
  shareCabins?: FeituoScheduleAdminApi.FeituoShareCabinDto[],
): string {
  if (!shareCabins || shareCabins.length === 0) return '-';
  return shareCabins
    .map((c) => [c.carrier, c.scac].filter(Boolean).join('/'))
    .filter(Boolean)
    .join('、');
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
      field: 'scac',
      title: '船公司SCAC',
      width: 110,
      align: 'left',
      formatter: ({ row }) => text(row.scac),
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
      field: 'imoNumber',
      title: 'IMO号',
      width: 110,
      align: 'left',
      formatter: ({ row }) => text(row.imoNumber),
    },
    {
      field: 'mmsi',
      title: 'MMSI号',
      width: 110,
      align: 'left',
      formatter: ({ row }) => text(row.mmsi),
    },
    {
      field: 'callSign',
      title: '呼号',
      width: 100,
      align: 'left',
      formatter: ({ row }) => text(row.callSign),
    },
    {
      field: 'shipManager',
      title: '母船简称',
      width: 120,
      align: 'left',
      formatter: ({ row }) => text(row.shipManager),
    },
    {
      field: 'shipManagerEn',
      title: '母船全称',
      width: 160,
      align: 'left',
      formatter: ({ row }) => text(row.shipManagerEn),
    },
    {
      field: 'polName',
      title: '起运港',
      minWidth: 200,
      align: 'left',
      slots: { default: 'pol' },
    },
    {
      field: 'pol',
      title: '起运港(原始英文)',
      width: 160,
      align: 'left',
      formatter: ({ row }) => text(row.pol),
    },
    {
      field: 'polCountry',
      title: '起运港国家',
      width: 110,
      align: 'left',
      formatter: ({ row }) => text(row.polCountry),
    },
    {
      field: 'polTerminal',
      title: '起运港码头(原始)',
      width: 160,
      align: 'left',
      formatter: ({ row }) => text(row.polTerminal),
    },
    {
      field: 'polTerminalCn',
      title: '起运港码头(标准)',
      width: 160,
      align: 'left',
      formatter: ({ row }) => text(row.polTerminalCn),
    },
    {
      field: 'polUnCode',
      title: '起运港UNCODE',
      width: 120,
      align: 'left',
      formatter: ({ row }) => text(row.polUnCode),
    },
    {
      field: 'polUnName',
      title: '起运港UN名',
      width: 150,
      align: 'left',
      formatter: ({ row }) => text(row.polUnName),
    },
    {
      field: 'polTimeZone',
      title: '起运港时区',
      width: 110,
      align: 'left',
      formatter: ({ row }) => text(row.polTimeZone),
    },
    {
      field: 'podName',
      title: '目的港',
      minWidth: 200,
      align: 'left',
      slots: { default: 'pod' },
    },
    {
      field: 'pod',
      title: '目的港(原始英文)',
      width: 160,
      align: 'left',
      formatter: ({ row }) => text(row.pod),
    },
    {
      field: 'podCountry',
      title: '目的港国家',
      width: 110,
      align: 'left',
      formatter: ({ row }) => text(row.podCountry),
    },
    {
      field: 'podTerminal',
      title: '目的港码头(原始)',
      width: 160,
      align: 'left',
      formatter: ({ row }) => text(row.podTerminal),
    },
    {
      field: 'podTerminalCn',
      title: '目的港码头(标准)',
      width: 160,
      align: 'left',
      formatter: ({ row }) => text(row.podTerminalCn),
    },
    {
      field: 'podUnCode',
      title: '目的港UNCODE',
      width: 120,
      align: 'left',
      formatter: ({ row }) => text(row.podUnCode),
    },
    {
      field: 'podUnName',
      title: '目的港UN名',
      width: 150,
      align: 'left',
      formatter: ({ row }) => text(row.podUnName),
    },
    {
      field: 'podTimeZone',
      title: '目的港时区',
      width: 110,
      align: 'left',
      formatter: ({ row }) => text(row.podTimeZone),
    },
    {
      field: 'transits',
      title: '中转港',
      minWidth: 200,
      align: 'left',
      slots: { default: 'transits' },
    },
    {
      field: 'routeEtd',
      title: '计划离港班期',
      width: 120,
      align: 'center',
      formatter: ({ row }) => text(row.routeEtd),
    },
    {
      field: 'routeEta',
      title: '计划到港班期',
      width: 120,
      align: 'center',
      formatter: ({ row }) => text(row.routeEta),
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
      field: 'staticEtd',
      title: '计划离港',
      width: 120,
      align: 'center',
      formatter: ({ row }) => formatDate(row.staticEtd),
    },
    {
      field: 'staticEtdWeekOfYear',
      title: '业务周次',
      width: 90,
      align: 'center',
      formatter: ({ row }) => text(row.staticEtdWeekOfYear),
    },
    {
      field: 'staticEta',
      title: '计划到港',
      width: 120,
      align: 'center',
      formatter: ({ row }) => formatDate(row.staticEta),
    },
    {
      field: 'atd',
      title: '实际离港',
      width: 120,
      align: 'center',
      formatter: ({ row }) => text(row.atd),
    },
    {
      field: 'ata',
      title: '实际到港',
      width: 120,
      align: 'center',
      formatter: ({ row }) => text(row.ata),
    },
    {
      field: 'totalDuration',
      title: '预计航程(天)',
      width: 110,
      align: 'center',
      formatter: ({ row }) => text(row.totalDuration),
    },
    {
      field: 'transitTime',
      title: '计划航程(天)',
      width: 110,
      align: 'center',
      formatter: ({ row }) => text(row.transitTime),
    },
    {
      field: 'routeCode',
      title: '航线代码',
      width: 120,
      align: 'left',
      formatter: ({ row }) => text(row.routeCode),
    },
    {
      field: 'displayName',
      title: '标准航线代码',
      width: 130,
      align: 'left',
      formatter: ({ row }) => text(row.displayName),
    },
    {
      field: 'shareCabins',
      title: '共舱',
      minWidth: 160,
      align: 'left',
      formatter: ({ row }) => formatShareCabins(row.shareCabins),
    },
    {
      field: 'cyCutoff',
      title: '截关时间',
      width: 150,
      align: 'center',
      formatter: ({ row }) => text(row.cyCutoff),
    },
    {
      field: 'siCutoff',
      title: '截单时间',
      width: 150,
      align: 'center',
      formatter: ({ row }) => text(row.siCutoff),
    },
    {
      field: 'vgmCutoff',
      title: '截VGM时间',
      width: 150,
      align: 'center',
      formatter: ({ row }) => text(row.vgmCutoff),
    },
    {
      field: 'bookingCutoff',
      title: '截订舱时间',
      width: 150,
      align: 'center',
      formatter: ({ row }) => text(row.bookingCutoff),
    },
    {
      field: 'inlandCutoff',
      title: '截港时间',
      width: 150,
      align: 'center',
      formatter: ({ row }) => text(row.inlandCutoff),
    },
    {
      field: 'manifestCutoff',
      title: '截海外舱单时间',
      width: 150,
      align: 'center',
      formatter: ({ row }) => text(row.manifestCutoff),
    },
    {
      field: 'cvCutoff',
      title: '截放行条时间',
      width: 150,
      align: 'center',
      formatter: ({ row }) => text(row.cvCutoff),
    },
    {
      field: 'pathCode',
      title: '路径ID',
      width: 120,
      align: 'left',
      visible: false,
      formatter: ({ row }) => text(row.pathCode),
    },
    {
      field: 'pathDescription',
      title: '路径描述',
      minWidth: 160,
      align: 'left',
      visible: false,
      formatter: ({ row }) => text(row.pathDescription),
    },
    {
      field: 'solutionDescription',
      title: '数据描述',
      minWidth: 160,
      align: 'left',
      visible: false,
      formatter: ({ row }) => text(row.solutionDescription),
    },
    {
      field: 'solutionCode',
      title: '数据唯一ID',
      width: 160,
      align: 'left',
      visible: false,
      formatter: ({ row }) => text(row.solutionCode),
    },
    {
      field: 'updateTime',
      title: '最后更新时间',
      width: 160,
      align: 'center',
      formatter: ({ row }) => text(row.updateTime),
    },
  ];
}
