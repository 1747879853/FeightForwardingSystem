/**
 * 海运出口台账默认列配置（无用户列配置时生效）。
 *
 * 格式与用户设置 `table_config_SeaExportList` 的 `setting` 相同：
 * `visibleColumnKeys` / `columnVisibility` / `columnFixed` / `columnWidths`。
 *
 * 维护方式：
 * 1. 在列表里调好列（顺序、显隐、固定、列宽）
 * 2. 从用户设置里复制 `table_config_SeaExportList` 的 `setting` JSON
 * 3. 去掉 `_debug` 后整段替换本文件的对象
 * 4. 键必须是 `field:xxx` / `type:checkbox`，与列持久化一致
 *
 * 用户一旦保存过列设置，以用户设置为准；列设置里「恢复默认」才回到本文件。
 */

export type SeaExportListColumnPersistConfig = {
  visibleColumnKeys: string[];
  columnVisibility: Record<string, boolean>;
  columnFixed: Record<string, '' | 'left' | 'right'>;
  columnWidths?: Record<string, number>;
};

/** 与 UserSetting.name 对齐，load 无命中时回退本配置，且不带 id（不会写成用户设置） */
export const SEA_EXPORT_LIST_COLUMN_SETTING_NAME = 'table_config_SeaExportList';

export const SEA_EXPORT_LIST_DEFAULT_COLUMN_SETTING: SeaExportListColumnPersistConfig =
  {
    visibleColumnKeys: [
      'type:checkbox',
      'field:businessStatus',
      'field:yundangTrackStatus',
      'field:receiveFeeStatus',
      'field:payFeeStatus',
      'field:transportOrder.commissionNum',
      'field:transportOrder.mblNum',
      'field:transportOrder.etd',
      'field:transportOrder.clientName',
      'field:bookingAgentName',
      'field:carrierCode',
      'field:yardName',
      'field:polName',
      'field:podName',
      'field:vessel',
      'field:innerVoyno',
      'field:transportOrder.totalCtn',
      'field:operationUserName',
      'field:saleUserName',
      'field:orgs',
      'field:codeIssueTypeName',
      'field:transportOrder.shipperName',
      'field:transportOrder.consigneeName',
      'field:transportOrder.notifierName',
      'field:transportOrder.pkgs',
      'field:transportOrder.codePackageName',
      'field:transportOrder.kgs',
      'field:transportOrder.cbm',
      'field:transportOrder.marks',
      'field:transportOrder.goodsDes',
      'field:transportOrder.internalRemark',
      'field:transportOrder.remark',
      'field:closeDocTime',
      'field:blType',
      'field:billType',
      'field:creatorUserNickName',
      'field:creationTime',
      'field:laneName',
      'field:transportOrder.goodsCompleteTime',
      'field:transportOrder.atd',
      'field:transportOrder.eta',
      'field:closeVgmTime',
      'field:closingTime',
      'field:transportOrder.codeSourceName',
      'field:transportOrder.codeFrtName',
    ],
    columnVisibility: {
      'type:checkbox': true,
      'field:transportOrder.commissionNum': true,
      'field:transportOrder.mblNum': true,
      'field:transportOrder.contractNum': false,
      'field:transportOrder.etd': true,
      'field:transportOrder.goodsCompleteTime': true,
      'field:transportOrder.atd': true,
      'field:transportOrder.eta': true,
      'field:closeVgmTime': true,
      'field:closingTime': true,
      'field:transportOrder.clientName': true,
      'field:carrierCode': true,
      'field:bookingAgentName': true,
      'field:yardName': true,
      'field:receivePortName': false,
      'field:polName': true,
      'field:poT1Name': false,
      'field:poT2Name': false,
      'field:podName': true,
      'field:deliverPortName': false,
      'field:vessel': true,
      'field:innerVoyno': true,
      'field:laneName': true,
      'field:transportOrder.codeSourceName': true,
      'field:transportOrder.codeFrtName': true,
      'field:transportOrder.totalCtn': true,
      'field:transportOrder.teu': false,
      'field:operationUserName': true,
      'field:saleUserName': true,
      'field:customerServiceUserName': false,
      'field:documentationUserName': false,
      'field:businessUserName': false,
      'field:orgs': true,
      'field:transportOrder.accountDate': false,
      'field:transportOrder.shipperName': true,
      'field:transportOrder.consigneeName': true,
      'field:transportOrder.notifierName': true,
      'field:transportOrder.pkgs': true,
      'field:transportOrder.codePackageName': true,
      'field:transportOrder.kgs': true,
      'field:transportOrder.cbm': true,
      'field:transportOrder.marks': true,
      'field:transportOrder.goodsDes': true,
      'field:transportOrder.internalRemark': true,
      'field:transportOrder.remark': true,
      'field:codeIssueTypeName': true,
      'field:closeDocTime': true,
      'field:blType': true,
      'field:billType': true,
      'field:transportOrder.feeLocked': false,
      'field:transportOrder.isBusinessLocking': false,
      'field:transportOrder.isUnfinished': false,
      'field:businessStatus': true,
      'field:receiveFeeStatus': true,
      'field:payFeeStatus': true,
      'field:yundangTrackStatus': true,
      'field:creatorUserNickName': true,
      'field:creationTime': true,
    },
    columnFixed: {
      'type:checkbox': 'left',
      'field:transportOrder.commissionNum': '',
      'field:transportOrder.mblNum': '',
      'field:transportOrder.contractNum': '',
      'field:transportOrder.etd': '',
      'field:transportOrder.goodsCompleteTime': '',
      'field:transportOrder.atd': '',
      'field:transportOrder.eta': '',
      'field:closeVgmTime': '',
      'field:closingTime': '',
      'field:transportOrder.clientName': '',
      'field:carrierCode': '',
      'field:bookingAgentName': '',
      'field:yardName': '',
      'field:receivePortName': '',
      'field:polName': '',
      'field:poT1Name': '',
      'field:poT2Name': '',
      'field:podName': '',
      'field:deliverPortName': '',
      'field:vessel': '',
      'field:innerVoyno': '',
      'field:laneName': '',
      'field:transportOrder.codeSourceName': '',
      'field:transportOrder.codeFrtName': '',
      'field:transportOrder.totalCtn': '',
      'field:transportOrder.teu': '',
      'field:operationUserName': '',
      'field:saleUserName': '',
      'field:customerServiceUserName': '',
      'field:documentationUserName': '',
      'field:businessUserName': '',
      'field:orgs': '',
      'field:transportOrder.accountDate': '',
      'field:transportOrder.shipperName': '',
      'field:transportOrder.consigneeName': '',
      'field:transportOrder.notifierName': '',
      'field:transportOrder.pkgs': '',
      'field:transportOrder.codePackageName': '',
      'field:transportOrder.kgs': '',
      'field:transportOrder.cbm': '',
      'field:transportOrder.marks': '',
      'field:transportOrder.goodsDes': '',
      'field:transportOrder.internalRemark': '',
      'field:transportOrder.remark': '',
      'field:codeIssueTypeName': '',
      'field:closeDocTime': '',
      'field:blType': '',
      'field:billType': '',
      'field:transportOrder.feeLocked': '',
      'field:transportOrder.isBusinessLocking': '',
      'field:transportOrder.isUnfinished': '',
      'field:businessStatus': '',
      'field:receiveFeeStatus': '',
      'field:payFeeStatus': '',
      'field:yundangTrackStatus': '',
      'field:creatorUserNickName': '',
      'field:creationTime': '',
    },
    columnWidths: {
      'field:transportOrder.commissionNum': 84,
      'field:transportOrder.mblNum': 137,
      'field:transportOrder.etd': 87,
      'field:transportOrder.clientName': 126,
      'field:bookingAgentName': 91,
      'field:yardName': 70,
      'field:polName': 111,
      'field:podName': 134,
      'field:vessel': 82,
      'field:innerVoyno': 59,
      'field:transportOrder.totalCtn': 65,
      'field:operationUserName': 72,
      'field:saleUserName': 66,
      'field:orgs': 120,
      'field:codeIssueTypeName': 85,
      'field:closeDocTime': 134,
      'field:businessStatus': 76,
      'field:receiveFeeStatus': 102,
      'field:payFeeStatus': 76,
      'field:yundangTrackStatus': 77,
    },
  };

export function stringifySeaExportListDefaultColumnSetting(): string {
  return JSON.stringify(SEA_EXPORT_LIST_DEFAULT_COLUMN_SETTING);
}

type ColumnLike = {
  field?: string;
  type?: string;
  visible?: boolean;
  fixed?: string;
  width?: number;
};

/** 与 vxe 列持久化稳定键一致：优先 field，其次 type */
function persistKeyOf(column: ColumnLike): string {
  const field = String(column.field ?? '').trim();
  if (field) {
    return `field:${field}`;
  }
  const type = String(column.type ?? '').trim();
  if (type) {
    return `type:${type}`;
  }
  return '';
}

/**
 * 把默认 JSON 套到 `useColumns` 上，避免 persist 异步回来前先闪全列。
 * 配置里没有的列（以后新加）保持原定义，不会被默认隐藏。
 */
export function applySeaExportListDefaultColumns<T extends ColumnLike>(
  columns: T[],
): T[] {
  const config = SEA_EXPORT_LIST_DEFAULT_COLUMN_SETTING;
  const byKey = new Map<string, T>();

  for (const column of columns) {
    const key = persistKeyOf(column);
    if (!key) {
      continue;
    }
    byKey.set(key, column);
    if (Object.prototype.hasOwnProperty.call(config.columnVisibility, key)) {
      column.visible = config.columnVisibility[key];
    }
    if (Object.prototype.hasOwnProperty.call(config.columnFixed, key)) {
      const fixed = config.columnFixed[key];
      column.fixed = fixed || undefined;
    }
    const width = config.columnWidths?.[key];
    if (typeof width === 'number' && width > 0) {
      column.width = width;
    }
  }

  const orderedVisible: T[] = [];
  const used = new Set<T>();
  for (const key of config.visibleColumnKeys) {
    const column = byKey.get(key);
    if (column && column.visible !== false && !used.has(column)) {
      orderedVisible.push(column);
      used.add(column);
    }
  }

  const appendedVisible = columns.filter(
    (column) => column.visible !== false && !used.has(column),
  );
  const hidden = columns.filter((column) => column.visible === false);

  return [...orderedVisible, ...appendedVisible, ...hidden];
}
