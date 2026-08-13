/**
 * 业务联系单详情 → 各业务下拉 selectedItems 的映射。
 *
 * 详情接口已把外键对象（船公司/付费方式/运输条款/包装/品名/用户等）一并返回，
 * 这里按各 biz-select 的 mapItemToOption 口径拼好回显项，组件命中后就不再打 DetailAsync。
 * 详情没给名称时一律返回空数组，让组件回落到自带的详情兜底，避免回显成空白。
 */
import type { PreOrderAdminApi } from '#/api/pre-order/pre-order-admin';
import type { CarrierAdminApi } from '#/api/system/base-data/carrier-admin';

/** 回显项缺 enable 会被 mapItemToOption 判成禁用项（多选下连标签都删不掉），统一按可用处理 */
const ENABLED = { enable: true } as const;

const firstText = (...values: unknown[]) => {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text !== '') return text;
  }
  return '';
};

/** 船公司：CarrierSelect 用 cnShortName + code 组标签，logo 取详情根节点的 carrierLogo */
export function toCarrierSelectedItems(
  carrierId: PreOrderAdminApi.PreOrderDto['carrierId'],
  carrier?: null | PreOrderAdminApi.CarrierSimpleDto,
  logo?: CarrierAdminApi.AttachmentItemDto | null,
): CarrierAdminApi.CarrierDto[] {
  if (carrierId == null) return [];
  const cnShortName = firstText(carrier?.cnShortName, carrier?.cnName);
  if (!cnShortName && !carrier?.enName && !carrier?.code) return [];
  return [
    {
      id: carrierId,
      cnName: carrier?.cnName,
      cnShortName,
      enName: carrier?.enName,
      code: carrier?.code,
      ediCode: carrier?.ediCode,
      logo: logo ?? null,
    },
  ];
}

/** 付费方式 / 运输条款：labelKey 为 cnName，缺中文名时回落英文名 / EDI 代码 */
export function toCodeNamedSelectedItems(
  id: unknown,
  item?: null | PreOrderAdminApi.SimpleNamedDto,
): any[] {
  const label = firstText(item?.cnName, item?.enName, item?.ediCode);
  if (id == null || !label) return [];
  return [
    {
      ...ENABLED,
      id,
      cnName: item?.cnName ?? '',
      enName: item?.enName,
      ediCode: item?.ediCode,
    },
  ];
}

/** 包装：CodePackageSelect labelKey 为 name */
export function toCodePackageSelectedItems(
  id: unknown,
  item?: null | PreOrderAdminApi.SimpleNamedDto,
): any[] {
  const name = firstText(item?.name, item?.cnName);
  if (id == null || !name) return [];
  return [{ ...ENABLED, id, name, description: item?.enName }];
}

/** 品名（多选）：CodeGoodsSelect labelKey 为 name */
export function toCodeGoodsSelectedItems(
  items?: null | PreOrderAdminApi.PreOrderCodeGoodsDto[],
): any[] {
  return (items ?? [])
    .filter((item) => item.codeGoodsId != null && item.codeGoods)
    .map((item) => ({
      ...ENABLED,
      id: item.codeGoodsId,
      name: firstText(item.codeGoods?.name, item.codeGoods?.cnName),
      code: item.codeGoods?.code,
      enName: item.codeGoods?.enName,
    }))
    .filter((item) => item.name !== '');
}

/** 干系人：UserSelect labelKey 为 nickName，详情缺 user 对象时回落 userNickName */
export function toUserSelectedItems(
  row: Pick<
    PreOrderAdminApi.PreOrderUserDto,
    'user' | 'userId' | 'userNickName'
  >,
): any[] {
  const nickName = firstText(row.user?.nickName, row.userNickName);
  if (row.userId == null || !nickName) return [];
  return [{ id: row.userId, nickName }];
}
