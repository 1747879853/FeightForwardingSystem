import type {
  LoadingOrderCtnDto,
  LoadingOrderCtnEditItem,
} from '@/api/loading-order';

import { buildAttachmentUrl } from '@/api/request';

export interface EditablePhoto {
  attachmentId: number | string;
  url: string;
}

export interface EditableGroup {
  /** 没有配附件明细类型时为 null，后端接受空分组 */
  attachmentDtlTypeId: null | number | string;
  items: EditablePhoto[];
  typeName: string;
}

export interface EditableCtn {
  ctnCodeId: number | string;
  ctnName: string;
  ctnNo: string;
  groups: EditableGroup[];
  id: number | string;
  isLoadingCompleted: boolean;
  sealNo: string;
}

const DEFAULT_GROUP_NAME = '监装照片';

/** 详情返回的箱型转成页面可编辑模型；没有分组时补一个默认组供拍照 */
export function toEditableCtns(
  ctns?: LoadingOrderCtnDto[] | null,
): EditableCtn[] {
  return (ctns ?? []).map((ctn) => {
    const groups: EditableGroup[] = (ctn.attachmentGroups ?? []).map(
      (group) => ({
        attachmentDtlTypeId: group.attachmentDtlTypeId ?? null,
        typeName: group.attachmentDtlType?.typeName || DEFAULT_GROUP_NAME,
        items: (group.items ?? []).map((item) => ({
          attachmentId: item.attachmentId,
          url: buildAttachmentUrl(item.url),
        })),
      }),
    );

    if (groups.length === 0) {
      groups.push({
        attachmentDtlTypeId: null,
        typeName: DEFAULT_GROUP_NAME,
        items: [],
      });
    }

    return {
      id: ctn.id,
      ctnCodeId: ctn.ctnCodeId ?? '',
      ctnName: ctn.ctnCode?.ctnName || ctn.ctnCode?.name || '--',
      ctnNo: ctn.ctnNo ?? '',
      sealNo: ctn.sealNo ?? '',
      isLoadingCompleted: Boolean(ctn.isLoadingCompleted),
      groups,
    };
  });
}

/**
 * 转回提交结构。附件是按箱全量替换，所以每次都要把当前全部分组带上，
 * 漏传某个分组等于把该组照片删掉。
 */
export function toCtnEditPayload(
  ctns: EditableCtn[],
): LoadingOrderCtnEditItem[] {
  return ctns.map((ctn) => ({
    id: ctn.id,
    ctnCodeId: ctn.ctnCodeId,
    ctnNo: ctn.ctnNo || null,
    sealNo: ctn.sealNo || null,
    isLoadingCompleted: ctn.isLoadingCompleted,
    attachmentGroups: ctn.groups.map((group) => ({
      attachmentDtlTypeId: group.attachmentDtlTypeId,
      items: group.items.map((photo, index) => ({
        attachmentId: photo.attachmentId,
        attachmentDtlTypeId: group.attachmentDtlTypeId,
        displayOrder: index,
      })),
    })),
  }));
}

export function countPhotos(ctn: EditableCtn) {
  return ctn.groups.reduce((sum, group) => sum + group.items.length, 0);
}
