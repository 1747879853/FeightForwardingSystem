import { describe, expect, it } from 'vitest';

import {
  AIR_EXPORT_LIST_DEFAULT_COLUMN_SETTING,
  applyAirExportListDefaultColumns,
} from './list-column-defaults';

describe('air export list default columns', () => {
  it('orders visible columns like the sea export ledger and keeps hidden columns', () => {
    const columns: Array<{
      field?: string;
      fixed?: string;
      type?: string;
      visible?: boolean;
      width?: number;
    }> = [
      { field: 'creationTime' },
      { field: 'transportOrder.accountDate' },
      { field: 'transportOrder.commissionNum' },
      { type: 'checkbox' },
      { field: 'yundangTrackStatus' },
    ];

    const result = applyAirExportListDefaultColumns(columns);

    expect(result.map((column) => column.field ?? column.type)).toEqual([
      'checkbox',
      'yundangTrackStatus',
      'transportOrder.commissionNum',
      'creationTime',
      'transportOrder.accountDate',
    ]);
    expect(result.at(-1)?.visible).toBe(false);
  });

  it('uses real object paths for persisted object-valued columns', () => {
    expect(AIR_EXPORT_LIST_DEFAULT_COLUMN_SETTING.visibleColumnKeys).toContain(
      'field:transportOrder.client.name',
    );
    expect(
      AIR_EXPORT_LIST_DEFAULT_COLUMN_SETTING.visibleColumnKeys,
    ).not.toContain('field:transportOrder.clientName');
  });
});
