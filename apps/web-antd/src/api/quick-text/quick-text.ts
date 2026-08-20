import { requestClient } from '#/api/request';
import { QuickTextBizType } from './quick-text-admin';

export namespace QuickTextApi {
  /** 业务面板列表项 DTO */
  export interface QuickTextListItemDto {
    /** 主键 id */
    id: string;
    /** 业务类型。0海运出口 1海运进口 2空运出口 */
    bizType: QuickTextBizType;
    /** 是否默认。默认项已被后端排在数组第一位 */
    default: boolean;
    /** 标题，可能为 null */
    title: string | null;
    /** 快捷文本正文，占位符由前端替换 */
    text: string;
    /** 备注，可能为 null */
    remark: string | null;
    /** 排序值 */
    sortId: number;
  }
}

const API_PREFIX = '/services/app/QuickText';

/**
 * 获取业务面板列表（按业务类型全量）
 * 供各业务模块输入框旁的快捷文本面板使用。不分页，一次性返回该业务类型下的全部记录。
 * @param bizType 业务类型。0海运出口 1海运进口 2空运出口
 * @returns 快捷文本列表，已按排序规则排好序
 */
export const getQuickTextList = (bizType: QuickTextBizType) => {
  return requestClient.get<QuickTextApi.QuickTextListItemDto[]>(
    `${API_PREFIX}/GetListAsync`,
    { params: { bizType } },
  );
};
