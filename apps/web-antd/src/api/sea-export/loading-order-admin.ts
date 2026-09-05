import { requestClient } from '#/api/request';

/** 监装工单状态 */
export enum LoadingOrderStatus {
  /** 未提交，只有该状态能编辑/删除/提交 */
  Unsubmitted = 0,
  /** 待认领（公共池），只有该状态能撤回 */
  Pending = 1,
  /** 已认领，管理端工单主表不可再改（箱型附件分组除外） */
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

/** 监装箱型附件 ModuleType，与后端 OrderCtnLoading 一致 */
export const ORDER_CTN_LOADING_MODULE_TYPE = 160_100;

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

  /** 箱型（监装口径；箱型/箱号/封号/是否完成只读，附件分组可单独改） */
  export interface LoadingOrderCtnDto {
    id: number | string;
    ctnCodeId?: number | string;
    ctnCode?: null | { id: number | string; name?: string; ctnName?: string };
    ctnNo?: null | string;
    sealNo?: null | string;
    isLoadingCompleted?: boolean;
    attachmentGroups?:
      | {
          attachmentDtlTypeId?: null | number | string;
          attachmentDtlType?: null | {
            id: number | string;
            name?: string;
            sortId?: number;
            typeName?: string;
          };
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

  /** 单条附件（提交用） */
  export interface LoadingOrderCtnAttachmentItemInput {
    attachmentId: number | string;
    attachmentDtlTypeId?: null | number | string;
    clientVisible?: boolean;
    displayOrder?: number;
  }

  /** 分组附件（提交用）；漏传某组等于删掉该组照片 */
  export interface LoadingOrderCtnAttachmentGroupInput {
    attachmentDtlTypeId?: null | number | string;
    items: LoadingOrderCtnAttachmentItemInput[];
  }

  /**
   * 管理端按箱型 id 改监装附件。
   * `id` 是 OrderCtn.Id，不是工单 id；不要塞箱号/封号/是否完成。
   */
  export interface LoadingOrderCtnAttachmentGroupEditDto {
    id: number | string;
    /** 全量替换该箱监装附件；`[]` 表示清空 */
    attachmentGroups?: LoadingOrderCtnAttachmentGroupInput[];
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
 * 按箱型 id 单独改该箱监装附件分组。
 * 只改附件，不改箱型/箱号/封号/是否完成，也不走工单状态机；任意状态可调。
 * attachmentGroups 对该箱全量替换，漏传的分组会被删掉；传 `[]` 表示清空。
 */
export const editOrderCtnAttachmentGroups = (
  data: LoadingOrderAdminApi.LoadingOrderCtnAttachmentGroupEditDto,
) => {
  return requestClient.put<boolean>(
    `${ADMIN_PREFIX}/EditOrderCtnAttachmentGroupsAsync`,
    {
      id: String(data.id),
      attachmentGroups: data.attachmentGroups ?? [],
    },
  );
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

const PUBLIC_PREFIX = '/services/app/LoadingOrder';

/** 客户免登录公开详情页路径（主提单号 + 监装工单号当口令） */
export const LOADING_ORDER_SHARE_PATH = '/loading-order-share';

/**
 * 免登录公开详情。不要带登录 token（skipAuth），也不弹全局错误 toast。
 * 对不上时后端统一报「主提单号或监装工单号错误」。
 */
export const getLoadingOrderPublicDetail = (params: {
  loadingOrderNum: string;
  mblNum: string;
}) => {
  return requestClient.get<LoadingOrderAdminApi.LoadingOrderDetailDto>(
    `${PUBLIC_PREFIX}/DetailByMblAndLoadingOrderNumAsync`,
    {
      params: {
        mblNum: params.mblNum,
        loadingOrderNum: params.loadingOrderNum,
      },
      skipAuth: true,
      skipErrorMessage: true,
    },
  );
};
