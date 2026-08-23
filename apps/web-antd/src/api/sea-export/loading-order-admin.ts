import { requestClient } from '#/api/request';

/** 监装工单状态 */
export enum LoadingOrderStatus {
  /** 未提交，只有该状态能编辑/删除/提交 */
  Unsubmitted = 0,
  /** 待认领（公共池），只有该状态能撤回 */
  Pending = 1,
  /** 已认领，管理端不可再改 */
  Claimed = 2,
  /** 已完成 */
  Completed = 3,
}

export const LOADING_ORDER_STATUS_TEXT: Record<number, string> = {
  [LoadingOrderStatus.Unsubmitted]: '未提交',
  [LoadingOrderStatus.Pending]: '待认领',
  [LoadingOrderStatus.Claimed]: '已认领',
  [LoadingOrderStatus.Completed]: '已完成',
};

export namespace LoadingOrderAdminApi {
  export interface SimpleNamedDto {
    id: number | string;
    name?: string;
  }

  export interface CarrierYardSimpleDto {
    id: string;
    carrierId?: number | string;
    name?: string;
    address?: null | string;
  }

  export interface LoadingOrderUserDto {
    id: string;
    userId: number | string;
    user?: {
      id: number | string;
      nickName?: string;
      enName?: string;
      employeeID?: string;
      avatar?: null | string;
      userAttribute?: number;
    } | null;
    sortId?: number;
  }

  /** 海运出口简要（监装口径） */
  export interface LoadingOrderSeaExportSimpleDto {
    id: string;
    mblNum?: null | string;
    vessel?: null | string;
    innerVoyno?: null | string;
    codeGoodss?: SimpleNamedDto[] | null;
    carrier?: null | {
      id: number | string;
      cnName?: string;
      cnShortName?: string;
      code?: string;
      ediCode?: string;
      logo?: null | { url?: string };
    };
    kgs?: null | number;
    pkgs?: null | number;
    codePackage?: null | {
      id: number | string;
      name?: string;
      ediCode?: string;
    };
  }

  /** 箱型（监装口径，管理端只读） */
  export interface LoadingOrderCtnDto {
    id: number | string;
    ctnCodeId?: number | string;
    ctnCode?: null | { id: number | string; name?: string; ctnName?: string };
    ctnNo?: null | string;
    sealNo?: null | string;
    isLoadingCompleted?: boolean;
    attachmentGroups?:
      | {
          attachmentDtlTypeId?: null | number;
          attachmentDtlType?: null | { id: number; typeName?: string };
          items?: {
            id?: number;
            attachmentId?: number;
            url?: string;
            friendlyFileName?: string;
            displayOrder?: number;
            clientVisible?: boolean;
          }[];
        }[]
      | null;
  }

  /** 监装要求明细（带本工单是否勾选） */
  export interface LoadingOrderRequirementItemDto {
    id: string;
    loadingRequirementId?: string;
    name?: string;
    sortId?: number;
    remark?: null | string;
    isChecked?: boolean;
  }

  /** 监装要求（管理端返回全部要求，按 sortId 升序） */
  export interface LoadingOrderRequirementDto {
    id: string;
    name?: string;
    sortId?: number;
    loadingRequirementItems?: LoadingOrderRequirementItemDto[] | null;
  }

  /** 监装工单详情 */
  export interface LoadingOrderDetailDto {
    id: string;
    seaExportId: string;
    loadingOrderNum?: string;
    codePackageItemId?: null | string;
    codePackageItem?: null | SimpleNamedDto;
    pkgs?: null | number;
    estimatedArrivalTime?: null | string;
    carrierYardId?: null | string;
    carrierYard?: null | CarrierYardSimpleDto;
    status: number;
    submitUserId?: null | number;
    submitUserName?: null | string;
    submitTime?: null | string;
    claimTime?: null | string;
    completeTime?: null | string;
    rejectTime?: null | string;
    rejectReason?: null | string;
    creatorUserName?: null | string;
    lastModifierUserName?: null | string;
    creationTime?: string;
    lastModificationTime?: null | string;
    /** 管理端新建/编辑填写，不是拒接原因 */
    remark?: null | string;
    loadingOrderUsers?: LoadingOrderUserDto[] | null;
    /** 已勾选的监装要求明细 id，编辑时可原样回传 */
    loadingRequirementItemIds?: string[] | null;
    loadingRequirements?: LoadingOrderRequirementDto[] | null;
    seaExport?: null | LoadingOrderSeaExportSimpleDto;
    orderCtns?: LoadingOrderCtnDto[] | null;
  }

  /** 新增监装工单参数 */
  export interface LoadingOrderAddDto {
    seaExportId: string;
    codePackageItemId?: null | string;
    pkgs?: null | number;
    estimatedArrivalTime?: null | string;
    carrierYardId?: null | string;
    /** 用户属性必须含监装；数组顺序即监装顺序 */
    userIds?: (number | string)[];
    /** 全量提交，漏传等于清空 */
    loadingRequirementItemIds?: string[];
    /** 最长 1024；与拒接原因是两个独立字段 */
    remark?: null | string;
  }

  /** 编辑监装工单参数；海运出口不允许改 */
  export interface LoadingOrderEditDto extends Omit<
    LoadingOrderAddDto,
    'seaExportId'
  > {
    id: string;
  }

  /** 按到货日+船公司查已排师傅 */
  export interface LoadingOrderYardUserQueryDto {
    estimatedArrivalDate: string;
    carrierId: number | string;
  }

  /** 接口只回名称，回填 id 需前端对本地堆场 / 用户缓存 */
  export interface LoadingOrderYardUserDto {
    yardName?: null | string;
    userName?: null | string;
  }
}

const ADMIN_PREFIX = '/services/app/LoadingOrderAdmin';

/**
 * 按海运出口 id 查监装工单详情。
 * 注意：入参 id 是**海运出口 id**，不是工单 id；该票还没有工单时 result 为 null。
 */
export const getLoadingOrderBySeaExportId = (seaExportId: number | string) => {
  return requestClient.get<LoadingOrderAdminApi.LoadingOrderDetailDto | null>(
    `${ADMIN_PREFIX}/DetailBySeaExportIdAsync`,
    { params: { id: String(seaExportId) } },
  );
};

/** 新增监装工单，返回工单 id；工单号由后端按编号规则生成 */
export const addLoadingOrder = (
  data: LoadingOrderAdminApi.LoadingOrderAddDto,
) => {
  return requestClient.post<string>(`${ADMIN_PREFIX}/AddAsync`, data);
};

/** 编辑监装工单（仅未提交状态） */
export const editLoadingOrder = (
  data: LoadingOrderAdminApi.LoadingOrderEditDto,
) => {
  return requestClient.put<boolean>(`${ADMIN_PREFIX}/EditAsync`, data);
};

/** 删除监装工单（仅未提交状态） */
export const deleteLoadingOrder = (id: string) => {
  return requestClient.delete<boolean>(`${ADMIN_PREFIX}/DeleteAsync`, {
    data: { id: String(id) },
  });
};

/** 提交监装工单：有师傅 → 已认领；无师傅 → 待认领 */
export const submitLoadingOrder = (id: string) => {
  return requestClient.post<boolean>(`${ADMIN_PREFIX}/SubmitAsync`, {
    id: String(id),
  });
};

/** 撤回监装工单（仅待认领状态） */
export const withdrawLoadingOrder = (id: string) => {
  return requestClient.post<boolean>(`${ADMIN_PREFIX}/WithdrawAsync`, {
    id: String(id),
  });
};

/**
 * 按预计到货日（只取天）+ 船公司查已排师傅的堆场。
 * 出参只有堆场名 / 师傅昵称，按二者去重。
 */
export const getLoadingOrderYardUsers = (
  params: LoadingOrderAdminApi.LoadingOrderYardUserQueryDto,
) => {
  return requestClient.get<LoadingOrderAdminApi.LoadingOrderYardUserDto[]>(
    `${ADMIN_PREFIX}/GetYardUsersAsync`,
    {
      params: {
        estimatedArrivalDate: params.estimatedArrivalDate,
        carrierId: String(params.carrierId),
      },
    },
  );
};
