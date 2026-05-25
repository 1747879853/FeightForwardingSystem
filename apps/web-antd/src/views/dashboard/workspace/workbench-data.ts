export interface ServiceTab {
  key: string;
  label: string;
}

export interface PortTab {
  key: string;
  label: string;
  count: number;
}

export interface ProcessingTab {
  key: string;
  label: string;
  icon: 'check' | 'processing';
}

export interface FilterModel {
  etd: string;
  customer: string;
  shippingCompany: string;
  blNo: string;
}

export interface EmergencyTask {
  id: string;
  category: string;
  countdown: string;
  title: string;
  soNo: string;
}

export interface StageStep {
  key: string;
  label: string;
  count: number;
  /** 左侧副标题，默认 `{label}控制节点` */
  subLabel?: string;
  active?: boolean;
}

export interface BusinessRow {
  id: string;
  bookingNo: string;
  vesselVoyage: string;
  route: string;
  containerInfo: string;
  etd: string;
  status: 'pending' | 'urgent' | 'supplement';
}

export interface ExceptionSummary {
  title: string;
  countText: string;
  orderNo: string;
  badge: string;
  relativeTime: string;
  pol: string;
  pod: string;
  issueTitle: string;
  issueDescription: string;
  tipText: string;
  actionText: string;
}

export const serviceTabs: ServiceTab[] = [
  { key: 'sea-export', label: '海运出口服务' },
  { key: 'other', label: '其他业务' },
];

export const portTabs: PortTab[] = [
  { key: 'shanghai', label: '上海港', count: 12 },
  { key: 'ningbo', label: '宁波港', count: 3 },
  { key: 'shenzhen', label: '深圳港', count: 0 },
];

export const processingTabs: ProcessingTab[] = [
  { key: 'processing', label: '处理中', icon: 'processing' },
  { key: 'processed', label: '已处理', icon: 'check' },
];

export const filterModelDefaults: FilterModel = {
  blNo: '',
  customer: '',
  etd: '',
  shippingCompany: '',
};

export const emergencyTasks: EmergencyTask[] = [
  {
    category: '订舱告警',
    countdown: '00:12:45',
    id: 'em-1',
    soNo: 'COSU19283741',
    title: '订舱超时未确认 - 沃尔玛(中国) - CNSHA to USLAX',
  },
  {
    category: '舱位预警',
    countdown: '00:24:10',
    id: 'em-2',
    soNo: 'COSU19283741',
    title: '船东舱位紧急释放申请 - MSC VOY902',
  },
  {
    category: '运输异常',
    countdown: '00:45:00',
    id: 'em-3',
    soNo: 'COSU19283741',
    title: '派车单被司机驳回 - 车牌 沪A-B1234',
  },
];

export const stageSteps: StageStep[] = [
  { count: 15, key: 'booking', label: '订舱' },
  { active: true, count: 8, key: 'release', label: '放舱' },
  { count: 22, key: 'dispatch', label: '派车' },
  { count: 5, key: 'close', label: '结单' },
  { count: 3, key: 'manifest', label: '舱单' },
];

export const businessRows: BusinessRow[] = [
  {
    bookingNo: 'SHEXP20231001',
    containerInfo: '2*40HQ',
    etd: '2023-10-25',
    id: 'row-1',
    route: 'CNSHA / USLAX',
    status: 'pending',
    vesselVoyage: 'COSCO PEGASUS / 012E',
  },
  {
    bookingNo: 'SHEXP20231002',
    containerInfo: '1*20GP',
    etd: '2023-10-26',
    id: 'row-2',
    route: 'CNSHA / DEHAM',
    status: 'pending',
    vesselVoyage: 'MAERSK ALABAMA / 902N',
  },
  {
    bookingNo: 'SHEXP20231003',
    containerInfo: '5*40HQ',
    etd: '2023-10-27',
    id: 'row-3',
    route: 'CNSHA / SGSIN',
    status: 'supplement',
    vesselVoyage: 'MSC OSCAR / 881W',
  },
  {
    bookingNo: 'SHEXP20231004',
    containerInfo: '3*40HQ',
    etd: '2023-10-28',
    id: 'row-4',
    route: 'CNSHA / NLRTM',
    status: 'pending',
    vesselVoyage: 'ONE MINATO / 009E',
  },
  {
    bookingNo: 'SHEXP20231005',
    containerInfo: '2*20GP',
    etd: '2023-10-29',
    id: 'row-5',
    route: 'CNSHA / FRLEH',
    status: 'urgent',
    vesselVoyage: 'HMM ROTTERDAM / 001S',
  },
];

export const exceptionSummary: ExceptionSummary = {
  actionText: '一键通知客户经理',
  badge: '异常待处理',
  countText: '8 New',
  issueDescription:
    '装箱单(Packing List)第4项货物毛重(450kg)与预录入数据(480kg)不符，请核实实际重量并重新提交资料。',
  issueTitle: '报关单据异常',
  orderNo: 'SHEXP2300091',
  pod: 'ROTTERDAM',
  pol: 'SHANGHAI',
  relativeTime: '10分钟前',
  tipText:
    '系统检测到当前有2项高风险异常可能导致扣箱，建议优先处理 SHEXP2300091。',
  title: '异常业务 (Exceptions)',
};
