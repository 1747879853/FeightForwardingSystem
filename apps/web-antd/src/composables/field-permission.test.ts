import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('#/api/system/permission', () => ({
  FrightModule: {
    SeaExport: 0,
    OrderFee: 1,
    TransportOrder: 2,
    SeaImport: 4,
    AirExport: 5,
    SeFreiPrice: 7,
  },
  getCurrentUserMaskedFields: vi.fn(),
}));

import { getCurrentUserMaskedFields } from '#/api/system/permission';
import {
  capturePermissionRow,
  createFieldPermission,
  rememberPermissionRow,
} from './field-permission';
import {
  orderFeeFieldPermission,
  seaExportFieldPermission,
} from './field-permission-profiles';
import {
  getMaskedField,
  loadMaskedFields,
  resetMaskedFields,
} from './use-masked-fields';

const query = vi.mocked(getCurrentUserMaskedFields);
const permission = createFieldPermission(seaExportFieldPermission);
async function rule(module: number, propName: string, alwaysMasked = false) {
  query.mockResolvedValue([
    { frightModule: module, fields: [{ propName, alwaysMasked }] },
  ] as any);
  await loadMaskedFields(true);
}

beforeEach(() => {
  resetMaskedFields();
  query.mockReset();
});

describe('DTO 字段权限', () => {
  it('未配规则的缺字段是业务空值', () => {
    expect(permission.masked('vessel', {})).toBe(false);
  });
  it('条件规则只屏蔽缺 key 的行，null、空串和零值都保留', async () => {
    await rule(0, 'Vessel');
    expect(permission.always('vessel')).toBe(false);
    expect(permission.masked('vessel', {})).toBe(true);
    for (const vessel of [null, '', 0, undefined]) {
      expect(permission.masked('vessel', { vessel })).toBe(false);
    }
  });
  it('委托编号属于嵌套业务表，模块不串用', async () => {
    await rule(0, 'CommissionNum', true);
    expect(permission.always('commissionNum')).toBe(false);
    await rule(2, 'CommissionNum', true);
    expect(permission.always('commissionNum')).toBe(true);
    expect(permission.always('transportOrder.commissionNum')).toBe(true);
  });
  it('主单容器屏蔽传递到子字段；正常 null 容器不误判', async () => {
    await rule(0, 'TransportOrder');
    expect(permission.masked('commissionNum', {})).toBe(true);
    expect(permission.masked('commissionNum', { transportOrder: null })).toBe(
      false,
    );
  });
  it('选择器同时守住对象和 ID，禁止通过 ID 重查名称', async () => {
    await rule(2, 'Client', true);
    expect(permission.always('clientId')).toBe(true);
    expect(permission.always('transportOrder.client.name')).toBe(true);
  });
  it('组合关键词必须所有来源无条件屏蔽才隐藏', async () => {
    await rule(2, 'CommissionNum', true);
    expect(permission.searchAlways('Keyword')).toBe(false);
    query.mockResolvedValue([
      {
        frightModule: 2,
        fields: [
          { propName: 'CommissionNum', alwaysMasked: true },
          { propName: 'MblNum', alwaysMasked: true },
        ],
      },
    ] as any);
    await loadMaskedFields(true);
    expect(permission.searchAlways('Keyword')).toBe(false);
    query.mockResolvedValue([
      {
        frightModule: 0,
        fields: ['Vessel', 'InnerVoyno'].map((propName) => ({
          propName,
          alwaysMasked: true,
        })),
      },
      {
        frightModule: 2,
        fields: [
          'Remark',
          'MblNum',
          'BookingNum',
          'ContractNum',
          'InvoiceNum',
          'CommissionNum',
        ].map((propName) => ({ propName, alwaysMasked: true })),
      },
    ] as any);
    await loadMaskedFields(true);
    expect(permission.searchAlways('Keyword')).toBe(true);
  });
  it('费用补显示默认值后仍根据原始响应判定，不把占位符写入数据', async () => {
    await rule(1, 'Amount');
    const row = { ...rememberPermissionRow({ id: 'fee' }), amount: 0 };
    expect(
      createFieldPermission(orderFeeFieldPermission).masked('amount', row),
    ).toBe(true);
    expect(row.amount).toBe(0);
    expect(JSON.stringify(row)).toBe('{"id":"fee","amount":0}');
  });
  it('费用共享对象屏蔽也约束编辑 ID', async () => {
    await rule(1, 'Settlement', true);
    expect(
      createFieldPermission(orderFeeFieldPermission).always('settlementId'),
    ).toBe(true);
  });
  it('原始键结构快照不随编辑模型补字段而变化', async () => {
    await rule(2, 'Client');
    const detail: any = { transportOrder: {} };
    const snapshot = capturePermissionRow(detail);
    detail.transportOrder.client = { name: '后续回填' };
    expect(permission.masked('clientId', snapshot)).toBe(true);
    expect(snapshot.transportOrder.client).toBeUndefined();
  });
  it('并发加载复用请求', async () => {
    query.mockResolvedValue([]);
    await Promise.all([loadMaskedFields(), loadMaskedFields()]);
    expect(query).toHaveBeenCalledTimes(1);
  });
  it('退出登录后旧请求不能污染新用户规则', async () => {
    let finish!: (value: any) => void;
    query.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const oldRequest = loadMaskedFields();
    resetMaskedFields();
    await rule(2, 'Client', true);
    finish([
      { frightModule: 0, fields: [{ propName: 'Vessel', alwaysMasked: true }] },
    ]);
    await oldRequest;
    expect(getMaskedField(0, 'Vessel')).toBeUndefined();
    expect(getMaskedField(2, 'Client')?.alwaysMasked).toBe(true);
  });
});
