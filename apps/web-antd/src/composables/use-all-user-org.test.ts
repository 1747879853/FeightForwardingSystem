import { afterEach, expect, it, vi } from 'vitest';

vi.mock('#/api/system/user-admin', () => ({
  getAllUserOrganizations: vi.fn(),
}));

import { getAllUserOrganizations } from '#/api/system/user-admin';

import {
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
