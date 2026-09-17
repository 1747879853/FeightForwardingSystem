/** 空运出口台账默认列配置（无用户列配置时生效）。 */

export type AirExportListColumnPersistConfig = {
  visibleColumnKeys: string[];
  columnVisibility: Record<string, boolean>;
  columnFixed: Record<string, '' | 'left' | 'right'>;
  columnWidths?: Record<string, number>;
};

export const AIR_EXPORT_LIST_DEFAULT_COLUMN_SETTING: AirExportListColumnPersistConfig =
  {
    visibleColumnKeys: [
      'type:checkbox',
      'field:yundangTrackStatus',
      'field:receiveFeeStatus',
      'field:payFeeStatus',
      'field:transportOrder.commissionNum',
      'field:transportOrder.mblNum',
      'field:transportOrder.etd',
      'field:transportOrder.client.name',
      'field:bookingAgent.name',
      'field:pol.iataCode',
      'field:pod.iataCode',
      'field:flightNo',
      'field:transportOrder.pkgs',
      'field:transportOrder.codePackage.name',
      'field:transportOrder.kgs',
      'field:transportOrder.cbm',
      'field:operationUserName',
      'field:saleUserName',
      'field:orgs',
      'field:transportOrder.shipper.name',
      'field:transportOrder.consignee.name',
      'field:transportOrder.notifier.name',
      'field:transportOrder.marks',
      'field:transportOrder.goodsDes',
      'field:transportOrder.internalRemark',
      'field:transportOrder.remark',
      'field:creatorUserNickName',
      'field:creationTime',
      'field:transportOrder.atd',
      'field:transportOrder.eta',
      'field:transportOrder.goodsCompleteTime',
      'field:transportOrder.codeSource.cnName',
      'field:transportOrder.codeService.cnName',
    ],
    columnVisibility: {
      'type:checkbox': true,
      'field:transportOrder.commissionNum': true,
      'field:transportOrder.inputType': false,
      'field:transportOrder.mblNum': true,
      'field:flightNo': true,
      'field:transportOrder.etd': true,
      'field:transportOrder.atd': true,
      'field:transportOrder.eta': true,
      'field:transportOrder.client.name': true,
      'field:pol.iataCode': true,
      'field:pot.iataCode': false,
      'field:pod.iataCode': true,
      'field:bookingAgent.name': true,
      'field:transportOrder.contractNum': false,
      'field:transportOrder.invoiceNum': false,
      'field:transportOrder.codeSource.cnName': true,
      'field:transportOrder.codeService.cnName': true,
      'field:transportOrder.pkgs': true,
      'field:transportOrder.codePackage.name': true,
      'field:transportOrder.kgs': true,
      'field:transportOrder.cbm': true,
      'field:bubbleRatio': false,
      'field:volumeWeightTotal': false,
      'field:chargeWeightTotal': false,
      'field:customsDeclareDate': false,
      'field:deliveryWarehouseDate': false,
      'field:transportOrder.goodsCompleteTime': true,
      'field:saleUserName': true,
      'field:operationUserName': true,
      'field:customerServiceUserName': false,
      'field:documentationUserName': false,
      'field:businessUserName': false,
      'field:orgs': true,
      'field:transportOrder.accountDate': false,
      'field:transportOrder.settlementDate': false,
      'field:transportOrder.shipper.name': true,
      'field:transportOrder.consignee.name': true,
      'field:transportOrder.notifier.name': true,
      'field:transportOrder.marks': true,
      'field:transportOrder.goodsDes': true,
      'field:transportOrder.internalRemark': true,
      'field:transportOrder.remark': true,
      'field:transportOrder.feeLocked': false,
      'field:transportOrder.isBusinessLocking': false,
      'field:transportOrder.isUnfinished': false,
      'field:receiveFeeStatus': true,
      'field:payFeeStatus': true,
      'field:yundangTrackStatus': true,
      'field:creatorUserNickName': true,
      'field:creationTime': true,
    },
    columnFixed: {
      'type:checkbox': 'left',
    },
    columnWidths: {
      'field:transportOrder.commissionNum': 100,
      'field:transportOrder.mblNum': 140,
      'field:transportOrder.etd': 100,
      'field:transportOrder.client.name': 130,
      'field:bookingAgent.name': 110,
      'field:pol.iataCode': 110,
      'field:pod.iataCode': 110,
      'field:flightNo': 100,
      'field:operationUserName': 80,
      'field:saleUserName': 80,
      'field:orgs': 120,
      'field:receiveFeeStatus': 100,
      'field:payFeeStatus': 100,
      'field:yundangTrackStatus': 100,
    },
  };

export function stringifyAirExportListDefaultColumnSetting(): string {
  return JSON.stringify(AIR_EXPORT_LIST_DEFAULT_COLUMN_SETTING);
}

type ColumnLike = {
  field?: string;
  type?: string;
  visible?: boolean;
  fixed?: string;
  width?: number;
};

function persistKeyOf(column: ColumnLike): string {
  const field = String(column.field ?? '').trim();
  if (field) return `field:${field}`;
  const type = String(column.type ?? '').trim();
  if (type) return `type:${type}`;
  return '';
}

export function applyAirExportListDefaultColumns<T extends ColumnLike>(
  columns: T[],
): T[] {
  const config = AIR_EXPORT_LIST_DEFAULT_COLUMN_SETTING;
  const byKey = new Map<string, T>();

  for (const column of columns) {
    const key = persistKeyOf(column);
    if (!key) continue;
    byKey.set(key, column);
    if (Object.prototype.hasOwnProperty.call(config.columnVisibility, key)) {
      column.visible = config.columnVisibility[key];
    }
    const fixed = config.columnFixed[key];
    if (fixed !== undefined) column.fixed = fixed || undefined;
    const width = config.columnWidths?.[key];
    if (typeof width === 'number' && width > 0) column.width = width;
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
