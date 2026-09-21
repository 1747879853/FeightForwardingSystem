import type {
  BillAction,
  BillOfLading,
  BillTaskItem,
} from '#/api/bill-of-lading';

export const billStatusOptions = [
  '待签入',
  '已签入',
  '已驳回',
  '签出审核中',
  '可签出',
  '已签出',
  '已扣单',
].map((label, value) => ({ label, value }));
export const signOutOptions = ['快递', '自提', '外派', '邮件', '电子提单'].map(
  (label, value) => ({ label, value }),
);
export const actionLabels: Record<BillAction, string> = {
  SignIn: '签入',
  CancelSignIn: '取消签入',
  Swap: '换签',
  CancelSwap: '取消换签',
  Deduct: '扣单',
  CancelDeduct: '取消扣单',
  SignOut: '签出',
  CancelSignOut: '取消签出',
  Submit: '提交签出审核',
  UnSubmit: '撤销提交',
};
export const actionPermission = (action: BillAction) =>
  `Admin.BillOfLading.${action === 'UnSubmit' ? 'Submit' : action.replace('Cancel', '')}`;
export const billNumber = (bill: BillOfLading) =>
  (bill.isSeparate
    ? bill.seaExportSeparate?.blNum
    : bill.seaExport.transportOrder.mblNum) || '未填提单号';
export function canAct(bill: BillOfLading, action: BillAction): boolean {
  const ready = bill.status === 1 || bill.status === 2;
  switch (action) {
    case 'SignIn':
      return bill.status === 0 && bill.isOriginal;
    case 'CancelSignIn':
      return ready && bill.isOriginal && !!bill.signIn && !bill.swap;
    case 'Swap':
      return ready && bill.isOriginal;
    case 'CancelSwap':
      return ready && !!bill.swap;
    case 'Deduct':
      return ![3, 6].includes(bill.status);
    case 'CancelDeduct':
      return bill.status === 6;
    case 'Submit':
      return ready;
    case 'UnSubmit':
      return bill.status === 3 && !!bill.taskBaseId;
    case 'SignOut':
      return bill.status === 4;
    case 'CancelSignOut':
      return bill.status === 5;
  }
}
export function selectionError(
  rows: BillOfLading[],
  action: BillAction,
): string | undefined {
  if (!rows.length) return '请先勾选提单';
  if (
    [
      'SignIn',
      'CancelSignIn',
      'CancelSwap',
      'CancelDeduct',
      'CancelSignOut',
      'UnSubmit',
    ].includes(action) &&
    rows.length !== 1
  )
    return '此操作请只选择一张提单';
  if (rows.some((row) => !canAct(row, action)))
    return `所选提单的状态不允许${actionLabels[action]}，请刷新后重新选择`;
  if (
    action === 'Submit' &&
    (rows.some((row) => !row.settlement?.id) ||
      new Set(rows.map((row) => row.settlement?.id)).size !== 1)
  )
    return '同一批次必须选择相同结算对象的提单，请先补齐分单结算对象';
}
export function canAudit(item: BillTaskItem, success: boolean): boolean {
  if (
    item.billOfLading.status === 3 &&
    item.taskStatus === 0 &&
    item.myTaskStatus === 0
  )
    return true;
  return (
    !success &&
    item.billOfLading.status === 4 &&
    item.taskStatus === 2 &&
    item.myTaskStatus === 2
  );
}
