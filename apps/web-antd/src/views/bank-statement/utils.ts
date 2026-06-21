import type { BankStatementAdminApi } from '#/api/settlement-management/bank-statement-admin';

import { getUser } from '#/api/system/user-admin';

/** 按 operationId 解析操作人显示名（接口未带 operationName 时调用 GetUserAsync） */
export async function resolveOperatorName(
  operationId: number,
  operationName?: string | null,
): Promise<string> {
  if (operationName) return operationName;
  try {
    const user = await getUser(operationId);
    return user.userName || user.nickName || '';
  } catch {
    return '';
  }
}

/** 批量补齐列表项中的操作人名称（同一页内去重请求） */
export async function enrichBankStatementListItems(
  items: BankStatementAdminApi.BankStatementListDto[],
): Promise<BankStatementAdminApi.BankStatementListDto[]> {
  const idsToResolve = new Set<number>();
  for (const item of items) {
    for (const u of item.bankStatementUsers || []) {
      if (u.operationId && !u.operationName) {
        idsToResolve.add(u.operationId);
      }
    }
  }

  if (idsToResolve.size === 0) return items;

  const nameMap = new Map<number, string>();
  await Promise.all(
    [...idsToResolve].map(async (id) => {
      nameMap.set(id, await resolveOperatorName(id, null));
    }),
  );

  return items.map((item) => ({
    ...item,
    bankStatementUsers: item.bankStatementUsers?.map((u) => ({
      ...u,
      operationName: u.operationName || nameMap.get(u.operationId) || '',
    })),
  }));
}

/** 构建编辑页操作人行（含异步补齐的 operationName） */
export async function buildOperatorRows(
  users: BankStatementAdminApi.BankStatementUserDto[] | undefined,
  makeRowKey: () => string,
) {
  return Promise.all(
    (users || []).map(async (u) => ({
      _key: makeRowKey(),
      operationId: u.operationId,
      operationName: await resolveOperatorName(u.operationId, u.operationName),
      remark: u.remark,
    })),
  );
}
