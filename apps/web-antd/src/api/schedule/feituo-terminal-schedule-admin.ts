import { requestClient } from '#/api/request';

export namespace FeituoTerminalScheduleAdminApi {
  /** 码头船舶计划同步入参 */
  export interface SyncTerminalScheduleInputDto {
    /** 业务单Id（海运出口/海运进口的Id，与业务表Id同值） */
    transportOrderId: string;
    /**
     * 上一次返回 needSelect=true 时，用户选中那条的 key 原样回传。
     * 首次查询不传。
     */
    selectedKey?: string;
  }

  /**
   * 一条码头船舶计划。
   * 除 key 由后端生成外均为飞驼原样字段；所有时间为 yyyy-MM-dd HH:mm:ss 字符串。
   */
  export interface TerminalScheduleItemDto {
    /** 条目定位键，多条待选时原样回传给 selectedKey */
    key?: string;
    /** 船期状态（仅上海港提供）：预报 / 确报 / 在港 / 离港 / 取消 */
    status?: null | string;
    /** 船舶英文名 */
    vesselNameEn?: null | string;
    /** 船舶中文名 */
    vesselNameCn?: null | string;
    /** 船公司代码 */
    shipCode?: null | string;
    /** 船公司中文名 */
    shipName?: null | string;
    /** 船代代码 */
    agentCode?: null | string;
    /** 船代名称 */
    agentName?: null | string;
    /** 航线代码 */
    lineCode?: null | string;
    /** 码头 */
    terminal?: null | string;
    /** 挂靠港英文，以 + 分隔 */
    portsEn?: null | string;
    /** 挂靠港中文，以 + 分隔 */
    portsCn?: null | string;
    /** 计划抵达(抵锚)——抵达起运港，非预抵目的港 */
    eta?: null | string;
    /** 实际抵达(抵锚) */
    ata?: null | string;
    /** 计划靠泊 */
    etb?: null | string;
    /** 实际靠泊 */
    atb?: null | string;
    /** 计划离港 → 回填开船日期 */
    etd?: null | string;
    /** 实际离港 → 回填实际开船日期 */
    atd?: null | string;
    /** 开港时间 */
    cyOpen?: null | string;
    /** 截港时间 → 回填截港日期（仅出口） */
    cyClosing?: null | string;
    /** 截单时间 → 回填截单日期（仅出口） */
    portCloseDate?: null | string;
    /** 截关时间 → 回填截关日期（仅出口，对应 CloseManifestTime） */
    customsCloseDate?: null | string;
    /** 进口航次 → 进口回填航次 */
    ivoyage?: null | string;
    /** 出口航次 → 出口回填航次 */
    evoyage?: null | string;
    /** 更新时间 */
    updateTime?: null | string;
  }

  /** 回填改动明细 */
  export interface TerminalScheduleFilledFieldDto {
    /** 字段所在表的中文名：业务表 / 海运出口 / 海运进口 */
    tableName?: string;
    /** 字段属性名，如 ETD、ClosingTime */
    fieldName?: string;
    /** 字段中文名，如 开船日期、截港日期 */
    fieldLabel?: string;
    /** 回填前的值，null 表示原本没值 */
    oldValue?: null | string;
    /** 回填后的值 */
    newValue?: null | string;
  }

  /** 码头船舶计划同步返回 */
  export interface SyncTerminalScheduleResultDto {
    /** 业务单Id */
    transportOrderId?: string;
    /** 业务类型：0 海运出口、1 海运进口 */
    bizType?: number;
    /** 本次查询用的船名（后端从业务单取） */
    vessel?: null | string;
    /** 本次查询用的港口代码（起运港EDI代码，已转大写） */
    portCode?: null | string;
    /** 本次查询用的起运港名称 */
    portName?: null | string;
    /** 本次查询用的航次；业务单没填航次时为 null，表示按船名+港口查了全部 */
    voyage?: null | string;
    /** 进出口标识：E 出口、I 进口 */
    isExport?: null | string;
    /** 飞驼返回的全部条目 */
    items?: TerminalScheduleItemDto[];
    /** true = 飞驼返回多条且本次未回填，需用户选一条后带 key 再调一次 */
    needSelect?: boolean;
    /** true = 已回填业务单 */
    applied?: boolean;
    /** 实际用于回填的那一条；未回填时为 null */
    appliedItem?: null | TerminalScheduleItemDto;
    /** 本次回填改动的字段明细 */
    filledFields?: TerminalScheduleFilledFieldDto[];
    /** 提示信息，可直接展示给用户 */
    message?: null | string;
  }
}

const API_PREFIX = '/services/app/FeituoAdmin';

/**
 * 同步飞驼码头船舶计划（会写库，成功后需刷新单据）
 * POST /services/app/FeituoAdmin/SyncTerminalScheduleAsync
 *
 * 船名、航次、起运港代码、进出口标识全部由后端从业务单取，前端不传。
 * 仅支持海运出口与海运进口。
 */
export function syncTerminalScheduleAsync(
  params: FeituoTerminalScheduleAdminApi.SyncTerminalScheduleInputDto,
) {
  return requestClient.post<FeituoTerminalScheduleAdminApi.SyncTerminalScheduleResultDto>(
    `${API_PREFIX}/SyncTerminalScheduleAsync`,
    params,
  );
}
