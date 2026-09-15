import { beforeEach, describe, expect, it, vi } from 'vitest';

const { ruleState } = vi.hoisted(() => ({
  ruleState: {
    loaded: true,
    fields: new Map<string, { alwaysMasked: boolean }>(),
  },
}));

vi.mock('#/composables/use-masked-fields', () => ({
  isMaskedFieldsLoaded: () => ruleState.loaded,
  hasMaskRule: (module: number, propName: string) =>
    ruleState.fields.has(`${module}:${propName.toLowerCase()}`),
  isAlwaysMasked: (module: number, propName: string) =>
    ruleState.fields.get(`${module}:${propName.toLowerCase()}`)
      ?.alwaysMasked === true,
}));

vi.mock('#/api/system/permission', () => ({
  FrightModule: {
    SeaExport: 0,
    TransportOrder: 2,
  },
}));

vi.mock('@vben/utils', () => ({
  formatDate: (value: unknown) => String(value ?? ''),
  formatDateTime: (value: unknown) => String(value ?? ''),
}));

import { FrightModule } from '#/api/system/permission';

import {
  applySeaExportListColumnFormatters,
  applySeaExportListRowMasks,
  getAlwaysMaskedListColumnFields,
  getAlwaysMaskedSearchFieldNames,
  isSeaExportListCellMasked,
  isSeaExportListColumnAlwaysMasked,
  MASKED_TEXT,
  omitMaskedFormValues,
  resolveMaskedFormFields,
} from './field-permission';

function setRule(module: number, propName: string, alwaysMasked: boolean) {
  ruleState.fields.set(`${module}:${propName.toLowerCase()}`, {
    alwaysMasked,
  });
}

describe('sea-export field-permission', () => {
  beforeEach(() => {
    ruleState.loaded = true;
    ruleState.fields.clear();
  });

  it('未加载规则时不隐藏、不打码', () => {
    ruleState.loaded = false;
    setRule(FrightModule.SeaExport, 'Vessel', true);
    expect(isSeaExportListColumnAlwaysMasked('vessel')).toBe(false);
    expect(isSeaExportListCellMasked({ vessel: 'MSC' }, 'vessel')).toBe(false);
    expect(resolveMaskedFormFields({ vessel: 'MSC' } as any).size).toBe(0);
  });

  it('非条件屏蔽：列表整列隐藏，表单打码', () => {
    setRule(FrightModule.SeaExport, 'Vessel', true);
    expect(isSeaExportListColumnAlwaysMasked('vessel')).toBe(true);
    expect(getAlwaysMaskedListColumnFields()).toContain('vessel');
    expect(isSeaExportListCellMasked({ vessel: 'MSC' }, 'vessel')).toBe(false);
    expect(resolveMaskedFormFields(null).has('vessel')).toBe(true);
    expect(resolveMaskedFormFields({} as any).has('vessel')).toBe(true);
  });

  it('条件屏蔽：key 被剔除时列表/表单显示 ***，不整列隐藏', () => {
    setRule(FrightModule.SeaExport, 'Vessel', false);
    expect(isSeaExportListColumnAlwaysMasked('vessel')).toBe(false);
    expect(isSeaExportListCellMasked({ remark: 'x' }, 'vessel')).toBe(true);
    expect(isSeaExportListCellMasked({ vessel: 'MSC' }, 'vessel')).toBe(false);
    expect(isSeaExportListCellMasked({ vessel: null }, 'vessel')).toBe(false);
    expect(resolveMaskedFormFields({ remark: 'x' } as any).has('vessel')).toBe(
      true,
    );
    expect(
      resolveMaskedFormFields({ vessel: 'MSC' } as any).has('vessel'),
    ).toBe(false);
  });

  it('运输单嵌套字段按 transportOrder 上的 key 判定', () => {
    setRule(FrightModule.TransportOrder, 'CommissionNum', false);
    expect(
      isSeaExportListCellMasked(
        { transportOrder: { mblNum: 'A' } },
        'transportOrder.commissionNum',
      ),
    ).toBe(true);
    expect(
      isSeaExportListCellMasked(
        { transportOrder: { commissionNum: 'SE001' } },
        'transportOrder.commissionNum',
      ),
    ).toBe(false);
    expect(
      resolveMaskedFormFields({
        transportOrder: { mblNum: 'A' },
      } as any).has('commissionNum'),
    ).toBe(true);
  });

  it('非条件屏蔽搜索项可隐藏', () => {
    setRule(FrightModule.SeaExport, 'Vessel', true);
    setRule(FrightModule.SeaExport, 'BLType', false);
    expect(getAlwaysMaskedSearchFieldNames()).toEqual(['Vessel']);
  });

  it('行打码只改条件屏蔽字段，且不新建缺失的嵌套对象', () => {
    setRule(FrightModule.SeaExport, 'Vessel', false);
    setRule(FrightModule.TransportOrder, 'CommissionNum', false);
    const row = applySeaExportListRowMasks({
      blType: 0,
      transportOrder: { mblNum: 'A' },
    });
    expect(row.vessel).toBe(MASKED_TEXT);
    expect(row.transportOrder.commissionNum).toBe(MASKED_TEXT);
    expect(row.transportOrder.mblNum).toBe('A');
    expect(isSeaExportListCellMasked(row, 'vessel')).toBe(true);
    expect(isSeaExportListCellMasked(row, 'transportOrder.commissionNum')).toBe(
      true,
    );
  });

  it('行打码后费用锁槽位仍按 *** 显示，不会把占位值当成已锁定', () => {
    setRule(FrightModule.TransportOrder, 'FeeLocked', false);
    const row = applySeaExportListRowMasks({
      transportOrder: { mblNum: 'A' },
    });
    expect(row.transportOrder.feeLocked).toBe(MASKED_TEXT);
    expect(isSeaExportListCellMasked(row, 'transportOrder.feeLocked')).toBe(
      true,
    );
  });

  it('列 formatter 在条件屏蔽时返回 ***', () => {
    setRule(FrightModule.SeaExport, 'Vessel', false);
    const [column] = applySeaExportListColumnFormatters([
      {
        field: 'vessel',
        formatter: () => 'MSC',
      },
    ]);
    expect(
      (column as any).formatter({ row: { remark: 'x' }, cellValue: 'MSC' }),
    ).toBe(MASKED_TEXT);
    expect(
      (column as any).formatter({ row: { vessel: 'MSC' }, cellValue: 'MSC' }),
    ).toBe('MSC');
  });

  it('提交时剔除已打码表单值，避免把 *** 写回后端', () => {
    expect(
      omitMaskedFormValues({ vessel: MASKED_TEXT, blType: 0 }, ['vessel']),
    ).toEqual({ blType: 0 });
  });
});
