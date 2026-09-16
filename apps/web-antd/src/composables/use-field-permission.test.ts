import { effectScope, nextTick } from 'vue';
import { afterEach, expect, it, vi } from 'vitest';

vi.mock('#/api/system/permission', () => ({
  getCurrentUserMaskedFields: vi.fn().mockResolvedValue([]),
}));
vi.mock('#/adapter/form', () => ({
  useVbenForm: (options: any) => {
    const state = { ...options };
    return [
      {},
      { state, setState: (patch: any) => Object.assign(state, patch) },
    ];
  },
}));
vi.mock('#/adapter/vxe-table', () => ({
  renderOriginalPermissionCell: vi.fn(() => '原渲染器'),
  useVbenVxeGrid: (options: any) => {
    const state = {
      ...options.gridOptions,
      formOptions: options.formOptions,
    };
    return [
      {},
      {
        state,
        setGridOptions: (patch: any) => Object.assign(state, patch),
        setState: (patch: any) => Object.assign(state, patch),
        // 与真实 VxeGridApi 一致：挂载前 formApi 是空对象
        formApi: {},
      },
    ];
  },
}));

import { getCurrentUserMaskedFields } from '#/api/system/permission';
import { loadMaskedFields, resetMaskedFields } from './use-masked-fields';
import { useFieldPermission } from './use-field-permission';

const scopes: ReturnType<typeof effectScope>[] = [];
function setup() {
  const scope = effectScope();
  scopes.push(scope);
  return scope.run(() => useFieldPermission({ module: 0 }))!;
}
afterEach(() => {
  scopes.splice(0).forEach((scope) => scope.stop());
  resetMaskedFields();
});
async function mask(alwaysMasked: boolean) {
  await loadMaskedFields();
  vi.mocked(getCurrentUserMaskedFields).mockResolvedValue([
    { frightModule: 0, fields: [{ propName: 'Vessel', alwaysMasked }] },
  ] as any);
  await loadMaskedFields(true);
  await nextTick();
}

it('隐藏必填字段并在切换到可见记录时恢复原 schema', async () => {
  const permission = setup();
  const schema = [
    { fieldName: 'vessel', rules: 'required' },
    { fieldName: 'remark' },
  ];
  const [, api] = permission.usePermissionForm({ schema } as any);
  await mask(false);
  permission.rawDetail.value = {};
  expect((api as any).state.schema.map((item: any) => item.fieldName)).toEqual([
    'remark',
  ]);
  permission.rawDetail.value = { vessel: null };
  expect((api as any).state.schema).toEqual(schema);
});

it('动态替换列仍受权限约束，解除规则后恢复列', async () => {
  const permission = setup();
  const [, api] = permission.usePermissionGrid({
    gridOptions: {
      columns: [{ field: 'vessel' }, { field: 'remark' }],
    },
  });
  await mask(true);
  expect((api as any).state.columns.map((item: any) => item.field)).toEqual([
    'remark',
  ]);
  api.setGridOptions({
    columns: [{ field: 'vessel' }, { field: 'contractNo' }],
  });
  expect((api as any).state.columns.map((item: any) => item.field)).toEqual([
    'contractNo',
  ]);
  vi.mocked(getCurrentUserMaskedFields).mockResolvedValue([]);
  await loadMaskedFields(true);
  await nextTick();
  expect((api as any).state.columns.map((item: any) => item.field)).toEqual([
    'vessel',
    'contractNo',
  ]);
});

it('后补动态列保留具名插槽并可渲染（运价箱型列）', async () => {
  const permission = setup();
  const [Grid, api] = permission.usePermissionGrid({
    gridOptions: {
      columns: [{ field: 'remark' }],
    },
  });
  const originalSlot = vi.fn(() => '箱型价');
  const render = (Grid as any).setup(
    {},
    { attrs: {}, slots: { ctnEditableCell: originalSlot } },
  );

  api.setGridOptions({
    columns: [
      { field: 'remark' },
      {
        field: 'ctn_20GP',
        slots: { default: 'ctnEditableCell' },
        params: { ctnName: '20GP' },
      },
    ],
  });

  // 不应改成 permission_ctn_*（否则 VXE 可能在插槽挂上前渲染出空白）
  expect(render().children.permission_ctn_20GP).toBeUndefined();
  const slot = render().children.ctnEditableCell;
  expect(slot).toBeTypeOf('function');
  expect(
    slot({
      column: { field: 'ctn_20GP', params: { ctnName: '20GP' } },
      row: {
        seFreiPriceCtns: [{ cost: 100, ctnCode: { ctnName: '20GP' } }],
      },
    }),
  ).toBe('箱型价');
  expect(originalSlot).toHaveBeenCalled();
  expect(
    (api as any).state.columns.find((c: any) => c.field === 'ctn_20GP')?.slots
      ?.default,
  ).toBe('ctnEditableCell');
});

it('条件屏蔽保留列，受限格子优先于业务插槽', async () => {
  const permission = setup();
  const [Grid] = permission.usePermissionGrid({
    gridOptions: {
      columns: [{ field: 'vessel', slots: { default: 'vesselSlot' } }],
    },
  });
  await mask(false);
  const originalSlot = vi.fn(() => '船名原插槽');
  const render = (Grid as any).setup(
    {},
    { attrs: {}, slots: { vesselSlot: originalSlot } },
  );
  // 具名插槽保持原名，由包装层拦截
  const slot = render().children.vesselSlot;
  expect(slot({ row: {}, column: { field: 'vessel' } })[0].children).toBe(
    '***',
  );
  expect(originalSlot).not.toHaveBeenCalled();
  expect(slot({ row: { vessel: 'A' }, column: { field: 'vessel' } })).toBe(
    '船名原插槽',
  );
});

it('列表筛选在表格未挂载时不抛错，规则到位后写入 schema', async () => {
  const permission = setup();
  const [, api] = permission.usePermissionGrid({
    formOptions: {
      schema: [{ fieldName: 'vessel' }, { fieldName: 'remark' }],
    } as any,
    gridOptions: {
      columns: [{ field: 'vessel' }, { field: 'remark' }],
    },
  });
  expect((api as any).formApi.setState).toBeUndefined();
  await mask(true);
  expect(
    (api as any).state.formOptions.schema.map((item: any) => item.fieldName),
  ).toEqual(['remark']);
});
