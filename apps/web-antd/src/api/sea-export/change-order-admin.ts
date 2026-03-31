import { requestClient } from '#/api/request';
import type { ExpenseSubmissionAdminApi } from '#/api/audit-approval/expense-admin';
import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';

const API_PREFIX = '/services/app/ChangeOrderAdmin';

export namespace ChangeOrderAdminApi {
  export interface ChangeOrderEditDto {
    // 主键id
    id?: number;
    // 业务id
    transportOrderId: number;
    //会计期间
    accountDate: string;
    //reason
    reason: string;
    //排序id
    sortId?: number;
    //备注
    remark?: string;
    //费用列表
    orderFees: OrderFeeAdminApi.OrderFeeEditDto[];
  }

  /** 分页查询参数 */
  export interface GetPagedListParams {
    /** 关键字 模糊匹配 */
    Keyword?: string;
    /** 业务 id */
    TransportOrderId?: number;
    /** 是否费用锁定 */
    FeeLocked?: boolean;
    /** 排序 默认是Id */
    Sorting?: string;
    /** 当前页码 */
    PageIndex?: number;
    /** 每页显示记录数 */
    PageSize?: number;
  }

  export interface PagedListOfChangeOrderDto {
    skipCount?: number;
    maxResultCount?: number;
    items: ChangeOrderDto[];
    totalCount: number;
    currentPage?: number;
    totalPages?: number;
  }

  export interface ChangeOrderDto {
    /** 业务id */
    transportOrderId: number;
    /** 会计期间 只取月的部分 根据开船日期生成 若没有开船日期 则根据创建日期生成 */
    accountDate: string; // 或 Date，根据前后端序列化约定
    /** 更改原因 */
    reason?: string | null;
    /** 是否费用锁定 */
    feeLocked: boolean;
    /** 费用锁定人 */
    feeLockedUserId?: number | null;
    /** 费用锁定时间 */
    feeLockedTime?: string | null; // 或 Date
    /** 费用锁定解锁人 */
    feeUnLockedUserId?: number | null;
    /** 费用锁定解锁时间 */
    feeUnLockedTime?: string | null; // 或 Date
    /** 排序id */
    sortId: number;
    /** 备注 */
    remark?: string | null;
    /** 费用锁定人姓名 */
    feeLockedUserName?: string | null;
    /** 费用锁定解锁人姓名 */
    feeUnLockedUserName?: string | null;
    /** 费用项列表 */
    orderFees: OrderFeeAdminApi.OrderFeeDto[]; // 替换为具体的 IOrderFee[] 以获得更好的类型提示
    /** 软删除标记 */
    isDeleted: boolean;
    /** 删除人Id */
    deleterUserId?: number | null;
    /** 删除时间 */
    deletionTime?: string | null; // 或 Date
    /** 最后修改时间 */
    lastModificationTime?: string | null; // 或 Date
    /** 最后修改人Id */
    lastModifierUserId?: number | null;
    /** 创建时间 */
    creationTime?: string | null; // 或 Date
    /** 创建人Id */
    creatorUserId?: number | null;
    /** 主键Id */
    id: number;
  }
}

//编辑/新增更改单 带着费用
export const EditAsync = (data: ChangeOrderAdminApi.ChangeOrderEditDto) => {
  return requestClient.put(`${API_PREFIX}/EditAsync`, data, {
    responseType: 'json',
  });
};

//更改单列表 无费用
export const GetPagedList = (
  params: ChangeOrderAdminApi.GetPagedListParams,
) => {
  return requestClient.get<ChangeOrderAdminApi.PagedListOfChangeOrderDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    {
      params,
    },
  );
};

//更改单详情 带着费用
export const GetDetail = (id: number) => {
  return requestClient.get<ChangeOrderAdminApi.ChangeOrderDto>(
    `${API_PREFIX}/DetailAsync`,
    {
      params: {
        id,
      },
    },
  );
};

//删除更改单
export const DeleteAsync = (ids: number[]) => {
  return requestClient.delete(`${API_PREFIX}/DeleteAsync`, {
    data: {
      ids,
    },
  });
};
