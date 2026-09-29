import { afterEach, expect, it, vi } from 'vitest';

vi.mock('#/api/system/user-admin', () => ({
  getAllUserOrganizations: vi.fn(),
}));

import { getAllUserOrganizations } from '#/api/system/user-admin';

import {
  formatCompanyPathLabel,
  formatOrgNodeLabel,
  formatOrgPathLabel,
  formatUserDefaultCompanyDeptLabel,
  loadAllUserOrganizations,
  resetAllUserOrganizations,
  useAllUserOrg,
} from './use-all-user-org';

afterEach(() => {
  resetAllUserOrganizations();
  vi.mocked(getAllUserOrganizations).mockReset();
});

it('登录 reset 后会重新请求，旧会话的迟到响应不能写回', async () => {
  let resolveFirst!: (value: any[]) => void;
  vi.mocked(getAllUserOrganizations).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveFirst = resolve;
      }),
  );
  vi.mocked(getAllUserOrganizations).mockResolvedValueOnce([
    {
      userId: 2,
      organizations: [{ default: true, oneOrganizationPath: [{ id: 20 }] }],
    },
  ] as any);

  const first = loadAllUserOrganizations();
  resetAllUserOrganizations();
  await loadAllUserOrganizations(true);
  resolveFirst([
    {
      userId: 1,
      organizations: [{ default: true, oneOrganizationPath: [{ id: 10 }] }],
    },
  ]);
  await first;

  expect(useAllUserOrg().allUserOrgMap.value.has(2)).toBe(true);
  expect(useAllUserOrg().allUserOrgMap.value.has(1)).toBe(false);
  expect(getAllUserOrganizations).toHaveBeenCalledTimes(2);
});

it('已有快照时再次 load 会静默刷新并覆盖 map', async () => {
  vi.mocked(getAllUserOrganizations).mockResolvedValueOnce([
    {
      userId: 1,
      organizations: [{ default: true, oneOrganizationPath: [{ id: 10 }] }],
    },
  ] as any);
  vi.mocked(getAllUserOrganizations).mockResolvedValueOnce([
    {
      userId: 1,
      organizations: [{ default: true, oneOrganizationPath: [{ id: 11 }] }],
    },
  ] as any);

  await loadAllUserOrganizations();
  expect(useAllUserOrg().getUserDefaultOrgId(1)).toBe(10);

  loadAllUserOrganizations();
  await vi.waitFor(() => {
    expect(useAllUserOrg().getUserDefaultOrgId(1)).toBe(11);
  });
  expect(getAllUserOrganizations).toHaveBeenCalledTimes(2);
});

it('组织展示名优先简称，缺省回退全称', () => {
  expect(
    formatOrgNodeLabel({
      shortName: '青岛海运',
      displayName: '青岛海运有限公司',
    }),
  ).toBe('青岛海运');
  expect(formatOrgNodeLabel({ displayName: '青岛海运有限公司' })).toBe(
    '青岛海运有限公司',
  );
  expect(
    formatCompanyPathLabel([
      { shortName: 'HH', displayName: '海和' },
      { displayName: '操作部' },
    ]),
  ).toBe('HH');
  expect(
    formatOrgPathLabel([
      { shortName: 'HH', displayName: '海和公司' },
      { displayName: '操作部' },
    ]),
  ).toBe('HH/操作部');
});

it('默认组织展示公司与部门，忽略非默认路径', async () => {
  vi.mocked(getAllUserOrganizations).mockResolvedValueOnce([
    {
      userId: 1,
      organizations: [
        {
          default: false,
          oneOrganizationPath: [
            { id: 1, isCompany: true, shortName: '非默认公司' },
            { id: 2, isCompany: false, displayName: '非默认部门' },
          ],
        },
        {
          default: true,
          oneOrganizationPath: [
            { id: 10, isCompany: true, shortName: '佳越' },
            { id: 11, isCompany: false, shortName: '操作部' },
          ],
        },
      ],
    },
  ] as any);

  await loadAllUserOrganizations();
  expect(formatUserDefaultCompanyDeptLabel(1)).toBe('佳越 / 操作部');
  expect(formatUserDefaultCompanyDeptLabel('1')).toBe('佳越 / 操作部');
});

it('默认组织直接挂在公司上时只显示公司', async () => {
  vi.mocked(getAllUserOrganizations).mockResolvedValueOnce([
    {
      userId: 1,
      organizations: [
        {
          default: true,
          oneOrganizationPath: [
            { id: 10, isCompany: true, displayName: '佳越测试' },
          ],
        },
      ],
    },
  ] as any);

  await loadAllUserOrganizations();
  expect(formatUserDefaultCompanyDeptLabel(1)).toBe('佳越测试');
});

it('没有组织时公司部门文案为空', () => {
  expect(formatUserDefaultCompanyDeptLabel(99)).toBe('');
});
