import { requestClient } from '#/api/request';

export namespace SystemOrganizationUnitApi {
  /** 附件关联提交（创建/更新时传 logo） */
  export interface AttachmentItemForItemInputDto {
    attachmentId: number;
    displayOrder?: number;
  }

  /** 附件关联详情（详情/列表回显 logo） */
  export interface AttachmentItemDto {
    id: number;
    attachmentId: number;
    itemId?: string;
    moduleTypeId?: string;
    isFirstShow?: boolean;
    displayOrder?: number;
    url?: string;
    mediaType?: number;
    friendlyFileName?: string;
    fileLength?: null | number;
    creationTime?: null | string;
    creatorUserId?: null | number;
    creatorUserNickName?: string;
  }

  /** 组织单元树节点DTO */
  export interface OrganizationUnitTreeDto {
    id: number;
    parentId?: number | null;
    code?: string | null;
    displayName?: string | null;
    memberCount?: number;
    memberCountTotal?: number;
    isCompany?: boolean;
    children?: OrganizationUnitTreeDto[];
  }

  /** 组织单元DTO */
  export interface OrganizationUnitDto {
    id: number;
    parentId?: number | null;
    code?: string | null;
    displayName?: string | null;
    memberCount: number;
    memberCountTotal: number;
    isCompany: boolean;
    localCurrencyId?: number | null;
    /** 本位币代码（只读） */
    localCurrencyCode?: string | null;
    shortName?: string | null;
    enName?: string | null;
    chargeUserId?: number | null;
    /** 负责人名称（只读） */
    chargeUserNickName?: string | null;
    contactPhone?: string | null;
    email?: string | null;
    address?: string | null;
    webUrl?: string | null;
    enable: boolean;
    unifiedSocialCreditCode?: string | null;
    invoiceAddress?: string | null;
    invoiceTel?: string | null;
    /** 开票应用 appKey。仅获取单个组织 / 新建 / 更新返回，列表恒为 null */
    invoiceAppKey?: string | null;
    /** 开票应用 appSecret（机密）。返回范围同上 */
    invoiceAppSecret?: string | null;
    /** 开票令牌 accessToken（机密，固定值，系统不自动刷新）。返回范围同上 */
    invoiceAccessToken?: string | null;
    orgBankAccounts?: OrgBankAccountDto[] | null;
    /** 公司 Logo（附件模块 OrganizationUnitLogo） */
    logo?: AttachmentItemDto | null;
  }

  /** 公司简易返回模型（用于数据权限公司列表） */
  export interface OrganizationUnitSimpleDto {
    id: number;
    name: string;
    localCurrencyId?: number | null;
    /** 本位币代码（只读） */
    localCurrencyCode?: string | null;
    /** 是否公司节点 */
    isCompany?: boolean;
  }

  /** 组织单元列表项DTO（带层级） */
  export interface OrganizationUnitWithLevelDto {
    id: number;
    parentId?: number;
    code: string;
    displayName: string;
    level: number;
  }

  /** 组织单元查询DTO（用于搜索接口） */
  export interface OrganizationUnitQueryDto {
    isCompany?: boolean | null;
    isDisabled?: boolean | null;
  }

  /** 组织单元当前用户查询DTO（用于带用户ID的搜索接口） */
  export interface OrganizationUnitCurrentQueryDto {
    id: number;
    isCompany?: boolean | null;
    isDisabled?: boolean | null;
  }

  /** 创建组织单元输入DTO */
  export interface CreateOrganizationUnitInputDto {
    parentId?: number | null;
    displayName: string;
    isCompany?: boolean;
    localCurrencyId?: number | null;
    shortName?: string | null;
    enName?: string | null;
    chargeUserId?: number | null;
    contactPhone?: string | null;
    email?: string | null;
    address?: string | null;
    webUrl?: string | null;
    enable?: boolean;
    unifiedSocialCreditCode?: string | null;
    invoiceAddress?: string | null;
    invoiceTel?: string | null;
    invoiceAppKey?: string | null;
    invoiceAppSecret?: string | null;
    invoiceAccessToken?: string | null;
    /** 公司 Logo；无值传 null 可清空 */
    logo?: AttachmentItemForItemInputDto | null;
  }

  /** 更新组织单元输入DTO */
  export interface UpdateOrganizationUnitInputDto {
    id: number;
    displayName: string;
    isCompany?: boolean;
    localCurrencyId?: number | null;
    shortName?: string | null;
    enName?: string | null;
    chargeUserId?: number | null;
    contactPhone?: string | null;
    email?: string | null;
    address?: string | null;
    webUrl?: string | null;
    enable?: boolean;
    unifiedSocialCreditCode?: string | null;
    invoiceAddress?: string | null;
    invoiceTel?: string | null;
    invoiceAppKey?: string | null;
    invoiceAppSecret?: string | null;
    invoiceAccessToken?: string | null;
    /** 公司 Logo；无值传 null 可清空 */
    logo?: AttachmentItemForItemInputDto | null;
  }

  /** 移动组织单元输入DTO */
  export interface MoveOrganizationUnitInputDto {
    id: number;
    newParentId?: number | null;
  }

  /** 添加组织成员候选用户分页查询DTO */
  export interface UsersForOuPagingQueryDto {
    pageIndex?: number;
    pageSize?: number;
    keyWords?: string | null;
    /** 当前组织 Id，用于排除已在该组织的用户 */
    organizationUnitId?: number;
  }

  /** NameValue DTO（用于无组织用户列表） */
  export interface NameValueDto {
    name?: string | null;
    value?: string | null;
  }

  /** 银行账户DTO */
  export interface OrgBankAccountDto {
    id: string;
    organizationUnitId: number;
    currencyId: number;
    /** 币种代码（只读） */
    currencyCode?: string | null;
    accountName?: string | null;
    bankShortName?: string | null;
    bankName?: string | null;
    bankAddress?: string | null;
    bankAccount?: string | null;
    cnapsCode?: string | null;
    swiftCode?: string | null;
    default: boolean;
    enable: boolean;
    sortId: number;
    remark?: string | null;
  }

  /** 创建银行账户输入DTO */
  export interface CreateOrgBankAccountInputDto {
    organizationUnitId: number;
    currencyId: number;
    accountName?: string | null;
    bankShortName: string;
    bankName: string;
    bankAddress?: string | null;
    bankAccount: string;
    cnapsCode?: string | null;
    swiftCode?: string | null;
    default?: boolean;
    enable?: boolean;
    sortId?: number;
    remark?: string | null;
  }

  /** 更新银行账户输入DTO */
  export interface UpdateOrgBankAccountInputDto {
    id: string;
    organizationUnitId: number;
    currencyId: number;
    accountName?: string | null;
    bankShortName: string;
    bankName: string;
    bankAddress?: string | null;
    bankAccount: string;
    cnapsCode?: string | null;
    swiftCode?: string | null;
    default?: boolean;
    enable?: boolean;
    sortId?: number;
    remark?: string | null;
  }
}

/**
 * 将扁平列表转换为树形结构
 */
function listToTree<
  T extends { id: number; parentId?: number | null; children?: T[] },
>(list: T[]): T[] {
  const map = new Map<number, T>();
  const result: T[] = [];

  // 首先将所有节点放入map中，并初始化children
  for (const item of list) {
    map.set(item.id, { ...item, children: [] });
  }

  // 遍历所有节点，构建树
  for (const item of list) {
    const node = map.get(item.id)!;
    if (item.parentId === null || item.parentId === undefined) {
      result.push(node);
    } else {
      const parent = map.get(item.parentId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
      }
    }
  }

  return result;
}

type OrganizationTreeSelectableNode = {
  children?: OrganizationTreeSelectableNode[];
  disabled?: boolean;
  enable?: boolean;
};

/** 将组织树的 enable=false 映射为 TreeSelect 的 disabled */
function withOrganizationTreeDisabled<T extends OrganizationTreeSelectableNode>(
  nodes: T[],
): T[] {
  return nodes.map((node) => ({
    ...node,
    disabled: node.enable === false,
    ...(node.children?.length
      ? { children: withOrganizationTreeDisabled(node.children) }
      : {}),
  }));
}

type OrganizationTreeNode = SystemOrganizationUnitApi.OrganizationUnitTreeDto;

/** 扁平化组织树，便于按 id 向上查找公司节点 */
function flattenOrganizationTree(
  nodes: OrganizationTreeNode[],
  map = new Map<number, OrganizationTreeNode>(),
): Map<number, OrganizationTreeNode> {
  for (const node of nodes) {
    map.set(node.id, node);
    if (node.children?.length) {
      flattenOrganizationTree(node.children, map);
    }
  }
  return map;
}

/**
 * 根据组织节点 id 解析所属公司名称（向上查找 isCompany 节点）
 */
function resolveOrganizationCompanyName(
  tree: OrganizationTreeNode[],
  organizationId?: number | null,
): string {
  if (organizationId === undefined || organizationId === null) {
    return '';
  }

  const nodeMap = flattenOrganizationTree(tree);
  let current = nodeMap.get(organizationId);

  while (current) {
    if (current.isCompany) {
      return current.displayName?.trim() || '';
    }
    const parentId = current.parentId;
    current =
      parentId === undefined || parentId === null
        ? undefined
        : nodeMap.get(parentId);
  }

  return '';
}

/** 本位币解析结果（对齐后端单据上的 localCurrencyId / localCurrencyCode） */
export interface OrganizationLocalCurrency {
  localCurrencyCode: null | string;
  localCurrencyId: null | number;
}

/** 全量组织列表缓存，供本位币解析复用（组织配置在一次会话内基本不变） */
let allOrganizationUnitsPromise: null | Promise<
  SystemOrganizationUnitApi.OrganizationUnitDto[]
> = null;

/**
 * 解析某组织所属公司的本位币。
 *
 * 与后端 `SetDataPermissionPropsAsync` 同口径：沿组织串向上找**最近的公司节点**，
 * 取该公司配置的本位币。不能用「组织串上第一个有本位币的节点」——集团等上级节点
 * 历史上也可能配过本位币，那样会取到集团的。
 *
 * 单据返回体已直接带 `localCurrencyId` / `localCurrencyCode` 时优先读单据字段，
 * 本函数只用于表单里用户临时切换归属组织、还没有单据可读的场景。
 */
async function resolveOrganizationLocalCurrency(
  organizationId?: null | number | string,
): Promise<OrganizationLocalCurrency> {
  const empty: OrganizationLocalCurrency = {
    localCurrencyId: null,
    localCurrencyCode: null,
  };
  if (organizationId === undefined || organizationId === null) {
    return empty;
  }

  allOrganizationUnitsPromise ||= getOrganizationUnits().catch((error) => {
    allOrganizationUnitsPromise = null;
    throw error;
  });

  let list: SystemOrganizationUnitApi.OrganizationUnitDto[];
  try {
    list = await allOrganizationUnitsPromise;
  } catch {
    return empty;
  }

  const nodeMap = new Map(list.map((item) => [String(item.id), item]));
  let current = nodeMap.get(String(organizationId));
  const visited = new Set<string>();

  while (current && !visited.has(String(current.id))) {
    visited.add(String(current.id));
    if (current.isCompany) {
      return {
        localCurrencyId: current.localCurrencyId ?? null,
        localCurrencyCode: current.localCurrencyCode ?? null,
      };
    }
    current =
      current.parentId === undefined || current.parentId === null
        ? undefined
        : nodeMap.get(String(current.parentId));
  }

  return empty;
}

/**
 * 获取组织单元列表
 * @param params 查询参数，支持按公司/部门、启用/禁用状态筛选
 */
async function getOrganizationUnits(
  params?: SystemOrganizationUnitApi.OrganizationUnitQueryDto,
): Promise<SystemOrganizationUnitApi.OrganizationUnitDto[]> {
  return requestClient.get(
    '/services/app/OrganizationUnit/GetOrganizationUnitsAsync',
    {
      params: {
        IsCompany: params?.isCompany,
        IsDisabled: params?.isDisabled,
      },
    },
  );
}

/**
 * 获取组织单元树
 * @param params 查询参数，支持按公司/部门、启用/禁用状态筛选
 */
async function getOrganizationUnitTree(
  params?: SystemOrganizationUnitApi.OrganizationUnitQueryDto,
): Promise<SystemOrganizationUnitApi.OrganizationUnitTreeDto[]> {
  const list = await getOrganizationUnits(params);
  return listToTree(list);
}

/**
 * 获取组织单元列表（含层级）
 * @param params 查询参数，支持按公司/部门、启用/禁用状态筛选
 */
async function getOrganizationUnitsWithLevel(
  params?: SystemOrganizationUnitApi.OrganizationUnitQueryDto,
): Promise<SystemOrganizationUnitApi.OrganizationUnitWithLevelDto[]> {
  return requestClient.get(
    '/services/app/OrganizationUnit/GetOrganizationUnitsWithLevelAsync',
    {
      params: {
        IsCompany: params?.isCompany,
        IsDisabled: params?.isDisabled,
      },
    },
  );
}

/**
 * 获取单个组织单元
 */
async function getOrganizationUnit(
  id: number,
): Promise<SystemOrganizationUnitApi.OrganizationUnitDto> {
  return requestClient.get(
    '/services/app/OrganizationUnit/GetOrganizationUnitAsync',
    { params: { Id: id } },
  );
}

/**
 * 获取当前登录人有数据权限的公司列表
 * 按当前登录人的数据权限返回其拥有权限的分公司（公司）列表
 * 结果只包含公司（isCompany=true），不含部门
 */
async function getMyPermissionCompanies(): Promise<
  SystemOrganizationUnitApi.OrganizationUnitSimpleDto[]
> {
  return requestClient.get(
    '/services/app/OrganizationUnit/GetMyPermissionCompaniesAsync',
  );
}

/**
 * 创建组织单元
 */
async function createOrganizationUnit(
  data: SystemOrganizationUnitApi.CreateOrganizationUnitInputDto,
): Promise<SystemOrganizationUnitApi.OrganizationUnitDto> {
  return requestClient.post(
    '/services/app/OrganizationUnit/CreateOrganizationUnitAsync',
    data,
  );
}

/**
 * 更新组织单元
 */
async function updateOrganizationUnit(
  data: SystemOrganizationUnitApi.UpdateOrganizationUnitInputDto,
): Promise<SystemOrganizationUnitApi.OrganizationUnitDto> {
  return requestClient.put(
    '/services/app/OrganizationUnit/UpdateOrganizationUnitAsync',
    data,
  );
}

/**
 * 移动组织单元
 */
async function moveOrganizationUnit(
  data: SystemOrganizationUnitApi.MoveOrganizationUnitInputDto,
): Promise<SystemOrganizationUnitApi.OrganizationUnitDto> {
  return requestClient.post(
    '/services/app/OrganizationUnit/MoveOrganizationUnitAsync',
    data,
  );
}

/**
 * 删除组织单元
 */
async function deleteOrganizationUnit(id: number): Promise<void> {
  return requestClient.delete(
    '/services/app/OrganizationUnit/DeleteOrganizationUnitAsync',
    { params: { Id: id } },
  );
}

/** 组织单元用户列表项DTO */
export interface OrganizationUnitUserListDto {
  id: number;
  userName: string;
  nickName?: string;
  phoneNumber?: string;
  isActive: boolean;
  isBoss: boolean;
  addedTime: string;
}

/** 组织单元用户分页响应 */
export interface PagingListOfOrganizationUnitUserListDto {
  items: OrganizationUnitUserListDto[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

/** 组织成员搜索DTO（FindUserPagedListForOu 等） */
export interface OrganizationUnitMemberDto {
  id: number;
  userName: string;
  nickName?: string;
  isActive: boolean;
  roleNames?: string;
}

/** GetUserPagingListForOu 接口项（name/value） */
interface OrganizationUnitUserNameValueDto {
  name?: string | null;
  value?: string | null;
}

/** 添加组织成员候选用户（前端归一化） */
export interface OrganizationUnitUserOptionDto {
  id: number;
  /** 原始展示名，如 昵称(用户名) */
  label: string;
  nickName: string;
  userName: string;
}

/** 为添加组织成员查询用户的分页响应 */
export interface PagingListOfOrganizationUnitUserOptionDto {
  items: OrganizationUnitUserOptionDto[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  totalPages?: number;
}

function parseOrganizationUnitUserLabel(label: string) {
  const trimmed = label.trim();
  const match = trimmed.match(/^(.+)\(([^)]+)\)$/);
  if (!match) {
    return { label: trimmed, nickName: trimmed, userName: '' };
  }
  return {
    label: trimmed,
    nickName: match[1]?.trim() || trimmed,
    userName: match[2]?.trim() || '',
  };
}

function mapOrganizationUnitUserOption(
  item: OrganizationUnitUserNameValueDto,
): OrganizationUnitUserOptionDto | null {
  const id = Number(item.value);
  if (!Number.isFinite(id)) {
    return null;
  }
  return {
    id,
    ...parseOrganizationUnitUserLabel(item.name ?? ''),
  };
}

/** 获取组织下的用户分页列表 */
async function getOrganizationUnitUsers(params: {
  OrganizationUnitId: number;
  PageIndex?: number;
  PageSize?: number;
}): Promise<PagingListOfOrganizationUnitUserListDto> {
  return requestClient.get(
    '/services/app/OrganizationUnit/GetOrganizationUnitUserPagingListAsync',
    { params },
  );
}

/** 为添加组织成员查询用户（分页，排除已在指定组织的用户） */
async function getUserPagingListForOu(params: {
  keyWords?: string;
  organizationUnitId: number;
  pageIndex?: number;
  pageSize?: number;
}): Promise<PagingListOfOrganizationUnitUserOptionDto> {
  const queryParams = Object.fromEntries(
    Object.entries({
      KeyWords: params.keyWords,
      OrganizationUnitId: params.organizationUnitId,
      PageIndex: params.pageIndex ?? 1,
      PageSize: params.pageSize ?? 10,
    }).filter(([_, value]) => value !== undefined && value !== ''),
  );

  const response = await requestClient.get<{
    items?: SystemOrganizationUnitApi.NameValueDto[];
    pageIndex: number;
    pageSize: number;
    totalCount: number;
    totalPages?: number;
  }>('/services/app/OrganizationUnit/GetUserPagingListForOuAsync', {
    params: queryParams,
  });

  return {
    items: (response.items ?? [])
      .map(mapOrganizationUnitUserOption)
      .filter((item): item is OrganizationUnitUserOptionDto => item !== null),
    pageIndex: response.pageIndex,
    pageSize: response.pageSize,
    totalCount: response.totalCount,
    totalPages: response.totalPages,
  };
}

/** 搜索可添加到组织的用户（已废弃，请使用 getUserPagingListForOu） */
async function findUsersForOrganizationUnit(data: {
  keyWords?: string;
  organizationUnitId?: number;
  skipCount?: number;
  maxResultCount?: number;
}): Promise<{
  items: OrganizationUnitMemberDto[];
  totalCount: number;
}> {
  return requestClient.post(
    '/services/app/OrganizationUnit/FindUserPagedListForOuAsync',
    data,
  );
}

/** 批量添加用户到组织 */
async function addUsersToOrganizationUnit(data: {
  userIds: number[];
  organizationUnitId: number;
}): Promise<void> {
  return requestClient.post(
    '/services/app/OrganizationUnit/AddUsersToOrganizationUnitAsync',
    data,
  );
}

/** 从组织移除用户 */
async function removeUserFromOrganizationUnit(params: {
  UserId: number;
  OrganizationUnitId: number;
}): Promise<void> {
  return requestClient.delete(
    '/services/app/OrganizationUnit/RemoveUserFromOrganizationUnitAsync',
    { params },
  );
}

/** 获取组织的银行账户列表 */
async function getOrgBankAccountList(
  organizationUnitId: number,
): Promise<SystemOrganizationUnitApi.OrgBankAccountDto[]> {
  return requestClient.get(
    '/services/app/OrganizationUnit/GetOrgBankAccountListAsync',
    { params: { Id: organizationUnitId } },
  );
}

/** 获取单个银行账户 */
async function getOrgBankAccount(
  id: string,
): Promise<SystemOrganizationUnitApi.OrgBankAccountDto> {
  return requestClient.get(
    '/services/app/OrganizationUnit/GetOrgBankAccountAsync',
    { params: { Id: id } },
  );
}

/** 创建银行账户 */
async function createOrgBankAccount(
  data: SystemOrganizationUnitApi.CreateOrgBankAccountInputDto,
): Promise<SystemOrganizationUnitApi.OrgBankAccountDto> {
  return requestClient.post(
    '/services/app/OrganizationUnit/CreateOrgBankAccountAsync',
    data,
  );
}

/** 更新银行账户 */
async function updateOrgBankAccount(
  data: SystemOrganizationUnitApi.UpdateOrgBankAccountInputDto,
): Promise<SystemOrganizationUnitApi.OrgBankAccountDto> {
  return requestClient.put(
    '/services/app/OrganizationUnit/UpdateOrgBankAccountAsync',
    data,
  );
}

/** 删除银行账户 */
async function deleteOrgBankAccount(id: string): Promise<void> {
  return requestClient.delete(
    '/services/app/OrganizationUnit/DeleteOrgBankAccountAsync',
    { params: { Id: id } },
  );
}

export {
  addUsersToOrganizationUnit,
  createOrgBankAccount,
  createOrganizationUnit,
  deleteOrgBankAccount,
  deleteOrganizationUnit,
  findUsersForOrganizationUnit,
  getMyPermissionCompanies,
  getOrgBankAccount,
  getOrgBankAccountList,
  getOrganizationUnit,
  getOrganizationUnits,
  getOrganizationUnitTree,
  getOrganizationUnitsWithLevel,
  getOrganizationUnitUsers,
  getUserPagingListForOu,
  moveOrganizationUnit,
  removeUserFromOrganizationUnit,
  resolveOrganizationCompanyName,
  resolveOrganizationLocalCurrency,
  updateOrgBankAccount,
  updateOrganizationUnit,
  withOrganizationTreeDisabled,
};
