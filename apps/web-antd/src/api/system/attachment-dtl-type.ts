import { requestClient } from '#/api/request';

export namespace AttachmentDtlTypeApi {
  export interface AttachmentDtlTypeSimpleDto {
    id: number;
    name?: string | null;
  }

  export interface AttachmentDtlTypeByModuleQueryDto {
    moduleTypes?: number[] | null;
  }

  export interface AttachmentDtlTypeByModuleDto {
    moduleType: number;
    attachmentDtlTypes?: AttachmentDtlTypeSimpleDto[] | null;
  }
}

const API_PREFIX = '/services/app/AttachmentDtlType';

/** 获取全部附件类型（不带子表，需登录无需权限） */
export const getAttachmentDtlTypeList = () => {
  return requestClient.get<AttachmentDtlTypeApi.AttachmentDtlTypeSimpleDto[]>(
    `${API_PREFIX}/GetListAsync`,
  );
};

/** 按模块类型返回默认展示的附件类型集合 */
export const getAttachmentDtlTypesByModuleTypes = (
  data: AttachmentDtlTypeApi.AttachmentDtlTypeByModuleQueryDto = {},
) => {
  return requestClient.post<
    AttachmentDtlTypeApi.AttachmentDtlTypeByModuleDto[]
  >(`${API_PREFIX}/GetListByModuleTypesAsync`, data);
};
