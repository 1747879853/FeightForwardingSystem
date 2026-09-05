import type { AttachmentDtlTypeSimpleDto } from '@/api/attachment-dtl-type';
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

function typeIdKey(id: null | number | string | undefined) {
  if (id == null || id === '') return 'null';
  return String(id);
}

function resolveExistingTypeName(
  group: NonNullable<LoadingOrderCtnDto['attachmentGroups']>[number],
) {
  return (
    group.attachmentDtlType?.name ||
    group.attachmentDtlType?.typeName ||
    DEFAULT_GROUP_NAME
  );
}

/**
 * 详情箱型转成可编辑模型。
 * 先铺维护的附件类型空槽，再把已有照片填进去；历史未分类组追加在后。
 */
export function toEditableCtns(
  ctns?: LoadingOrderCtnDto[] | null,
  configuredTypes: AttachmentDtlTypeSimpleDto[] = [],
): EditableCtn[] {
  const sortedTypes = [...configuredTypes].sort(
    (a, b) => (a.sortId ?? 0) - (b.sortId ?? 0),
  );

  return (ctns ?? []).map((ctn) => {
    const existing = ctn.attachmentGroups ?? [];
    const itemsByType = new Map<string, EditablePhoto[]>();

    for (const group of existing) {
      itemsByType.set(
        typeIdKey(group.attachmentDtlTypeId),
        (group.items ?? []).map((item) => ({
          attachmentId: item.attachmentId,
          url: buildAttachmentUrl(item.url),
        })),
      );
    }

    const groups: EditableGroup[] = [];
    const seen = new Set<string>();

    for (const type of sortedTypes) {
      const key = typeIdKey(type.id);
      seen.add(key);
      groups.push({
        attachmentDtlTypeId: type.id,
        typeName: type.name || String(type.id),
        items: itemsByType.get(key) ?? [],
      });
    }

    for (const group of existing) {
      const key = typeIdKey(group.attachmentDtlTypeId);
      if (seen.has(key)) continue;
      seen.add(key);
      groups.push({
        attachmentDtlTypeId: group.attachmentDtlTypeId ?? null,
        typeName: resolveExistingTypeName(group),
        items: itemsByType.get(key) ?? [],
      });
    }

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
 * 转回提交结构。附件是按箱全量替换，所以每次都要把当前有照片的分组带上，
 * 漏传某个分组等于把该组照片删掉。空组不必提交（后端也会跳过空 items）。
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
    attachmentGroups: ctn.groups
      .filter((group) => group.items.length > 0)
      .map((group) => ({
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
