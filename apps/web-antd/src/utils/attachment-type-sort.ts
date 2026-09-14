/**
 * 附件详细类型展示序：与管理列表默认 `SortId DESC` 一致。
 * 一律用类型原始 sortId，值越大越靠前；缺省按 0。
 */
export function compareAttachmentTypeSortIdDesc(
  a?: null | number,
  b?: null | number,
): number {
  return (b ?? 0) - (a ?? 0);
}
