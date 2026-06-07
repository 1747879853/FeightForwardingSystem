import type { Dayjs } from 'dayjs';

import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';
import type { SeServiceTaskAdminApi } from '#/api/sea-export/se-service-task-admin';

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
  etdRange: [string, string] | [Dayjs, Dayjs] | null;
  clientId?: string;
  carrierId?: number;
  mblNum: string;
  podId?: number;
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
  seaExportId: string;
  bookingNo: string;
  vesselVoyage: string;
  route: string;
  containerInfo: string;
  etd: string;
  status: 'pending' | 'urgent' | 'supplement';
  assigneeUserId?: number | null;
  assigneeUserName?: string;
  taskUsersText: string;
  serviceTaskStatus: number;
  /** 海运出口原始数据，供 seServiceShows 动态列取值 */
  seaExport?: SeaExportAdminApi.SeaExportDto;
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
  { key: 'ar-ap-review', label: '应收应付审核' },
  { key: 'payment-review', label: '付费申请审核' },
];

export const portTabs: PortTab[] = [];

export const processingTabs: ProcessingTab[] = [
  { key: 'processing', label: '处理中', icon: 'processing' },
  { key: 'processed', label: '已处理', icon: 'check' },
];

export const filterModelDefaults: FilterModel = {
  carrierId: undefined,
  clientId: undefined,
  etdRange: null,
  mblNum: '',
  podId: undefined,
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

export const stageSteps: StageStep[] = [];

export const businessRows: BusinessRow[] = [];

export const DEFAULT_SERVICE_TYPE_TEXT_MAP = new Map<number, string>();

export function serviceTypeLabel(
  serviceType?: number | null,
  serviceTypeTextMap = DEFAULT_SERVICE_TYPE_TEXT_MAP,
): string {
  if (serviceType == null) {
    return '指派任务';
  }
  return serviceTypeTextMap.get(Number(serviceType)) ?? `服务项${serviceType}`;
}

export function toPortTab(
  group: SeServiceTaskAdminApi.SeServiceTaskConfigGroupDto,
): PortTab {
  return {
    count: group.taskCount ?? 0,
    key: String(group.polId ?? group.seServiceConfigId),
    label:
      group.pol?.portName ||
      group.pol?.cnName ||
      `POL:${String(group.polId ?? '-')}`,
  };
}

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
