import type { BankStatementAdminApi } from '#/api/settlement-management/bank-statement-admin';
import type { ReceiveSettlementAdminApi } from '#/api/settlement-management/receive-settlement-admin';

import { getUser } from '#/api/system/user-admin';

/** 编辑页操作人行 */
export interface BankStatementOperatorRow {
  _key: string;
  operationId?: number;
  operationName?: string;
  remark?: string;
}

/** 收费结算详情费用项 → 只读表格行 */
export function mapReceiveSettlementDetailItem(
  item: ReceiveSettlementAdminApi.ReceiveSettlementItemDetailDto,
) {
  const orderFee = item.orderFee;
  const order = item.transportOrder;
  return {
    id: item.id,
    commissionNum: order?.commissionNum,
    mblNum: order?.mblNum,
    feeCodeName: orderFee?.feeCodeName,
    currencyCode: orderFee?.currencyCode,
    amount: orderFee?.amount ?? 0,
    remainingAmount: orderFee?.remainingAmount ?? 0,
    settlementName: orderFee?.settlementName,
    settledAmount: item.settledAmount,
    remark: item.remark || '',
  };
}

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
): Promise<BankStatementOperatorRow[]> {
  return Promise.all(
    (users || []).map(async (u) => ({
      _key: makeRowKey(),
      operationId: u.operationId,
      operationName: await resolveOperatorName(u.operationId, u.operationName),
      remark: u.remark,
    })),
  );
}
