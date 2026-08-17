import { requestClient } from '#/api/request';

export namespace FeituoTerminalScheduleAdminApi {
  /** 码头船舶计划查询入参 */
  export interface QueryTerminalScheduleInputDto {
    /** 业务单Id（海运出口/海运进口的Id，与业务表Id同值） */
    transportOrderId: string;
  }

  /**
   * 一条码头船舶计划。
   * 全部为飞驼原样字段；所有时间为 yyyy-MM-dd HH:mm:ss 字符串。
   */
  export interface TerminalScheduleItemDto {
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
    /** 实际抵达(抵锚)——抵达起运港 */
    ata?: null | string;
    /** 计划靠泊 */
    etb?: null | string;
    /** 实际靠泊 */
    atb?: null | string;
    /** 计划离港。不要自动填开船日期 */
    etd?: null | string;
    /** 实际离港 → 回填实际开船日期 */
    atd?: null | string;
    /** 开港时间 */
    cyOpen?: null | string;
    /** 截港时间 → 回填截港日期（仅出口） */
    cyClosing?: null | string;
    /** 截单时间 → 回填截单日期（仅出口） */
    portCloseDate?: null | string;
    /** 截关时间 → 回填截关日期（仅出口） */
    customsCloseDate?: null | string;
    /** 进口航次 → 进口回填航次 */
    ivoyage?: null | string;
    /** 出口航次 → 出口回填航次 */
    evoyage?: null | string;
    /** 更新时间 */
    updateTime?: null | string;
  }

  /** 码头船舶计划查询返回（纯查询，不写库） */
  export interface QueryTerminalScheduleResultDto {
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
    /**
     * 进出口标识：E 出口、I 进口。跟着航次走，voyage 为空时也是 null。
     * 判业务类型请用 bizType，不要用这个字段。
     */
    isExport?: null | string;
    /** 飞驼返回的全部条目；无数据时为空数组 */
    items?: TerminalScheduleItemDto[];
    /** 提示信息，仅未查到时有值，正常有数据时为 null */
    message?: null | string;
  }
}

const API_PREFIX = '/services/app/FeituoAdmin';

/**
 * 查询飞驼码头船舶计划（纯查询，不写库）
 * POST /services/app/FeituoAdmin/QueryTerminalScheduleAsync
 *
 * 船名、航次、起运港代码、进出口标识全部由后端从业务单取，前端只传业务单 Id。
 * 仅支持海运出口与海运进口。选中条目后由前端回填表单并走原有编辑保存落库。
 */
export function queryTerminalScheduleAsync(
  params: FeituoTerminalScheduleAdminApi.QueryTerminalScheduleInputDto,
) {
  return requestClient.post<FeituoTerminalScheduleAdminApi.QueryTerminalScheduleResultDto>(
    `${API_PREFIX}/QueryTerminalScheduleAsync`,
    params,
  );
}
