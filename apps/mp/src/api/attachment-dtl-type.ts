import { request } from './request';

/** 监装箱型附件 ModuleType，与后端 OrderCtnLoading 一致 */
export const ORDER_CTN_LOADING_MODULE_TYPE = 160_100;

export interface AttachmentDtlTypeSimpleDto {
  id: number | string;
  name?: null | string;
  sortId?: number;
}

export interface AttachmentDtlTypeByModuleDto {
  attachmentDtlTypes?: AttachmentDtlTypeSimpleDto[] | null;
  moduleType: number;
}

const PREFIX = '/services/app/AttachmentDtlType';

/** 按模块返回默认展示的附件类型。登录即可，无需权限。 */
export function getAttachmentDtlTypesByModuleTypes(moduleTypes: number[]) {
  return request<AttachmentDtlTypeByModuleDto[]>({
    url: `${PREFIX}/GetListByModuleTypesAsync`,
    method: 'POST',
    data: { moduleTypes },
  });
}

export async function getOrderCtnLoadingAttachmentTypes() {
  const result = await getAttachmentDtlTypesByModuleTypes([
    ORDER_CTN_LOADING_MODULE_TYPE,
  ]);
  return (result[0]?.attachmentDtlTypes ?? []).filter(
    (type) => type.id != null && type.id !== '',
  );
}
