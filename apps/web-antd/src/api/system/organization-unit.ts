import { requestClient } from '#/api/request';

export namespace SystemOrganizationUnitApi {
  /** 组织单元树节点DTO */
  export interface OrganizationUnitTreeDto {
    id: number;
    parentId?: number;
    code: string;
    displayName: string;
    children?: OrganizationUnitTreeDto[];
  }

  /** 组织单元列表项DTO（带层级） */
  export interface OrganizationUnitWithLevelDto {
    id: number;
    parentId?: number;
    code: string;
    displayName: string;
    level: number;
  }
}

/**
 * 获取组织单元树
 */
async function getOrganizationUnitTree(): Promise<
  SystemOrganizationUnitApi.OrganizationUnitTreeDto[]
> {
  return requestClient.get(
    '/services/app/OrganizationUnit/GetOrganizationUnitsTreeAsync',
  );
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

export { getOrganizationUnitTree, getOrganizationUnitsWithLevel };
