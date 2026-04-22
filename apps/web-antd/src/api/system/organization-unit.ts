import { requestClient } from '#/api/request';

export namespace SystemOrganizationUnitApi {
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
    orgBankAccounts?: OrgBankAccountDto[] | null;
  }

  /** 组织单元列表项DTO（带层级） */
  export interface OrganizationUnitWithLevelDto {
    id: number;
    parentId?: number;
    code: string;
    displayName: string;
    level: number;
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
  }

  /** 移动组织单元输入DTO */
  export interface MoveOrganizationUnitInputDto {
    id: number;
    newParentId?: number | null;
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

/**
 * 获取组织单元列表
 * @param isCompany 是否是公司。true=公司，false=部门，undefined=全部
 */
async function getOrganizationUnits(
  isCompany?: boolean,
): Promise<SystemOrganizationUnitApi.OrganizationUnitDto[]> {
  return requestClient.get(
    '/services/app/OrganizationUnit/GetOrganizationUnitsAsync',
    {
      params: { IsCompany: isCompany },
    },
  );
}

/**
 * 获取组织单元树
 */
async function getOrganizationUnitTree(): Promise<
  SystemOrganizationUnitApi.OrganizationUnitTreeDto[]
> {
  const list = await getOrganizationUnits();
  return listToTree(list);
}

/**
 * 获取组织单元列表（含层级）
 */
async function getOrganizationUnitsWithLevel(): Promise<
  SystemOrganizationUnitApi.OrganizationUnitWithLevelDto[]
> {
  return requestClient.get(
    '/services/app/OrganizationUnit/GetOrganizationUnitsWithLevelAsync',
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

/** 组织成员搜索DTO */
export interface OrganizationUnitMemberDto {
  id: number;
  userName: string;
  nickName?: string;
  isActive: boolean;
  roleNames?: string;
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

/** 搜索可添加到组织的用户 */
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
  getOrgBankAccount,
  getOrgBankAccountList,
  getOrganizationUnit,
  getOrganizationUnits,
  getOrganizationUnitTree,
  getOrganizationUnitsWithLevel,
  getOrganizationUnitUsers,
  moveOrganizationUnit,
  removeUserFromOrganizationUnit,
  updateOrgBankAccount,
  updateOrganizationUnit,
};
