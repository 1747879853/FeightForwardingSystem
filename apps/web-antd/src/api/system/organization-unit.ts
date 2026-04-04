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
  }

  /** 更新组织单元输入DTO */
  export interface UpdateOrganizationUnitInputDto {
    id: number;
    displayName: string;
  }

  /** 移动组织单元输入DTO */
  export interface MoveOrganizationUnitInputDto {
    id: number;
    newParentId?: number | null;
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

export {
  createOrganizationUnit,
  deleteOrganizationUnit,
  getOrganizationUnit,
  getOrganizationUnits,
  getOrganizationUnitTree,
  getOrganizationUnitsWithLevel,
  moveOrganizationUnit,
  updateOrganizationUnit,
};
