import { requestClient } from '#/api/request';

export namespace AttachmentApi {
  /** 批量修改附件关联(AttachmentItem)客户是否可见 单条入参 */
  export interface UpdateAttachmentItemClientVisibleDto {
    /** 附件关联(AttachmentItem)Id（<=0 忽略；同一 id 多次传入取最后一条） */
    id: number;
    /** 目标客户是否可见 */
    clientVisible?: boolean;
  }
}

const API_PREFIX = '/services/app/Attachment';

/**
 * 批量修改附件关联(AttachmentItem)的客户是否可见，每条独立指定目标值。
 * 空集合或全部 id 无效时后端直接返回，不报错。
 */
export const updateAttachmentItemsClientVisible = (
  data: AttachmentApi.UpdateAttachmentItemClientVisibleDto[],
) => {
  return requestClient.put<void>(
    `${API_PREFIX}/UpdateAttachmentItemsClientVisibleAsync`,
    data,
  );
};
