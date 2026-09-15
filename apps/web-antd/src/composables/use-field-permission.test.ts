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
    const state = { ...options.gridOptions };
    return [
      {},
      {
        state,
        setGridOptions: (patch: any) => Object.assign(state, patch),
        formApi: { setState: vi.fn() },
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
  const slot = render().children.permission_vessel;
  expect(slot({ row: {} })[0].children).toBe('***');
  expect(originalSlot).not.toHaveBeenCalled();
  expect(slot({ row: { vessel: 'A' } })).toBe('船名原插槽');
});
