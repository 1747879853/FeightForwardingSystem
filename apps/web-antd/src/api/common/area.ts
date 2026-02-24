import { requestClient } from '#/api/request';

export namespace AreaApi {
  /** Area 实体（GetProvinces 返回） */
  export interface Area {
    /** 地区编码 */
    id?: string;
    /** 父级地区Id */
    parentId?: string;
    /** 地区名称 */
    displayName?: string;
    /** 邮政编码 */
    postCode?: string;
  }

  /** AreaDto（GetAreaAndParents 返回） */
  export interface AreaDto {
    /** 地区Id */
    id?: string;
    /** 父级地区Id */
    parentId?: string;
    /** 地区名称 */
    displayName?: string;
    /** 是否是叶子节点 */
    isLeaf?: boolean;
  }
}

const API_PREFIX = '/services/app/Area';

/**
 * 获取省级行政单位或下级地区
 * @param parentId 父级地区ID，为空时获取省级
 */
export const getProvinces = (parentId?: string) => {
  return requestClient.get<AreaApi.Area[]>(`${API_PREFIX}/GetProvinces`, {
    params: { ParentId: parentId },
  });
};

/**
 * 获取地区以及它的父级们（用于编辑回显）
 * @param id 地区Id
 */
export const getAreaAndParents = (id: string) => {
  return requestClient.get<AreaApi.AreaDto[]>(
    `${API_PREFIX}/GetAreaAndParents`,
    { params: { id } },
  );
};
