/**
 * 海运进口「干系人（orderUsers）」面板逻辑。
 *
 * 封装干系人行的状态、角色增删、用户展示信息批量加载、头像/状态展示与保存校验，
 * 从 form.vue 抽出以收敛该域的认知负担；模板面板仍在 form.vue 中通过返回值渲染。
 */
import type { ComputedRef } from 'vue';

import { computed, ref, watch } from 'vue';

import { preferences } from '@vben/preferences';

import { message } from 'ant-design-vue';

import type { ClientAppApi } from '#/api/common/client';
import type { SeaImportAdminApi } from '#/api/sea-import/sea-import-admin';
import type { SystemUserAdminApi } from '#/api/system/user-admin';

import { getUserListByIds, UserAttribute } from '#/api/system/user-admin';
import { formatOrgPathLabel } from '#/composables/use-all-user-org';
import {
  syncOrderUserRows,
  useOrderUserRoles,
} from '#/composables/use-order-user-roles';
import {
  formatDeletedUserFallback,
  resolveUserDisplayName,
} from '#/utils/user-display';

import { hasValidUserId, toOptionalNumber } from './sea-import-detail-mapper';

type OrderUserEditorRow = SeaImportAdminApi.OrderUserAddDto & {
  _rowKey: string;
  userName?: string;
};

type OrderUsersFormApi = {
  setValues: (values: Record<string, any>) => Promise<void> | void;
};

export type UseOrderUsersDeps = {
  partyInfoFormApi: OrderUsersFormApi;
  currentUserId: ComputedRef<number | undefined>;
};

export function useOrderUsers(deps: UseOrderUsersDeps) {
  const { partyInfoFormApi, currentUserId } = deps;

  /** 必选且不可删除的角色（枚举未配置时也固定展示） */
  const requiredOrderUserRoles: number[] = [
    UserAttribute.Sales,
    UserAttribute.Operation,
  ];
  const {
    roleLabelOf,
    roleOptions: orderUserRoleOptions,
    whenRolesReady: whenOrderUserRolesReady,
  } = useOrderUserRoles({ fixedRoles: requiredOrderUserRoles });
  /** 新建态默认带入当前登录用户的角色集合 */
  const defaultCurrentUserRoleSet = new Set([
    UserAttribute.Operation,
    UserAttribute.CustomerService,
    UserAttribute.Documentation,
  ]);

  const orderUserRows = ref<OrderUserEditorRow[]>([]);
  const orderUserNameMap = ref<Record<number, string>>({});
  const orderUserDetailMap = ref<
    Record<number, SystemUserAdminApi.UserInfoDto>
  >({});
  const orderUserDetailLoadingMap = ref<Record<number, boolean>>({});
  /** 已确认批量接口未命中（真删/错 id）的用户，才展示「已删除」兜底 */
  const orderUserLoadFailedSet = ref(new Set<number>());
  let orderUserRowKeyCounter = 0;
  /** 面板未初始化前不响应角色配置变化，避免抢在详情回填之前铺行 */
  let orderUsersPanelInitialized = false;
  const makeOrderUserRowKey = () =>
    `order_user_${++orderUserRowKeyCounter}_${Date.now()}`;

  const orderUserRoleModalOpen = ref(false);
  const orderUserRoleModalSelected = ref<number | undefined>();
  const selectedOrderUserRoleSet = computed(
    () =>
      new Set(
        orderUserRows.value
          .map((row) => row.userAttribute)
          .filter((item): item is number => item != null),
      ),
  );
  /** 当前干系人中「销售」角色绑定的用户 id（无有效人员时为 undefined） */
  const salesUserId = computed<number | undefined>(() => {
    const row = orderUserRows.value.find(
      (item) => item.userAttribute === UserAttribute.Sales,
    );
    return hasValidUserId(row?.userId) ? Number(row?.userId) : undefined;
  });
  const availableOrderUserRoleOptions = computed(() =>
    orderUserRoleOptions.value.filter(
      (option) => !selectedOrderUserRoleSet.value.has(option.value),
    ),
  );
  const getOrderUserRoleLabel = (userAttribute?: number) =>
    roleLabelOf(userAttribute);
  const getOrderUserResolvedName = (row: OrderUserEditorRow) => {
    if (!row.userId) return row.userName || '';
    const mappedName = orderUserNameMap.value[row.userId];
    if (mappedName) return mappedName;
    if (row.userName && row.userName !== String(row.userId))
      return row.userName;
    return '';
  };
  const getOrderUserDisplayName = (row: OrderUserEditorRow) => {
    const resolved = getOrderUserResolvedName(row);
    if (resolved) return resolved;
    if (!row.userId) return '';
    if (
      isOrderUserDetailLoading(row.userId) ||
      !orderUserLoadFailedSet.value.has(row.userId)
    ) {
      return '';
    }
    return formatDeletedUserFallback(row.userId);
  };
  const getOrderUserSelectedItems = (row: OrderUserEditorRow) => {
    if (!row.userId) return [];
    const nickName = getOrderUserResolvedName(row);
    if (!nickName) return [];
    return [{ id: row.userId, nickName }];
  };
  const getOrderUserAvatarSrc = (userId?: number) => {
    // UserInfoDto 不含头像，统一用默认头像
    void userId;
    return preferences.app.defaultAvatar;
  };
  const getOrderUserAvatarText = (row: OrderUserEditorRow) => {
    const displayName =
      getOrderUserDisplayName(row) || getOrderUserDetail(row.userId)?.nickName;
    const normalized = displayName?.trim();
    if (normalized) return normalized.slice(0, 1);
    return '?';
  };
  const getOrderUserDetail = (userId?: number) =>
    userId ? orderUserDetailMap.value[userId] : undefined;
  const isOrderUserDetailLoading = (userId?: number) =>
    !!(userId && orderUserDetailLoadingMap.value[userId]);
  const getOrderUserDetailText = (value?: string) => value?.trim() || '-';
  const getOrderUserOrgText = (userId?: number) => {
    const orgs = getOrderUserDetail(userId)?.organizations;
    if (!orgs?.length) return '';
    const preferred = orgs.find((item) => item.default) ?? orgs[0];
    return formatOrgPathLabel(preferred?.oneOrganizationPath);
  };
  const getOrderUserStatusText = (detail?: SystemUserAdminApi.UserInfoDto) => {
    if (!detail) return '未知';
    return detail.enable === false ? '禁用' : '启用';
  };
  const getOrderUserStatusClass = (detail?: SystemUserAdminApi.UserInfoDto) => {
    if (!detail || detail.enable === false) {
      return 'order-user-detail-card__status--inactive';
    }
    return 'order-user-detail-card__status--active';
  };
  const syncOrderUserName = (userId: number, userName: string) => {
    orderUserNameMap.value = { ...orderUserNameMap.value, [userId]: userName };
  };
  const syncOrderUserDetail = (detail: SystemUserAdminApi.UserInfoDto) => {
    orderUserDetailMap.value = {
      ...orderUserDetailMap.value,
      [detail.id]: detail,
    };
    const displayName = detail.nickName?.trim() || String(detail.id);
    syncOrderUserName(detail.id, displayName);
  };
  const setOrderUserNameForRow = (
    rowKey: string | undefined,
    userId: number,
    userName: string,
  ) => {
    if (!rowKey) return;
    orderUserRows.value = orderUserRows.value.map((row) => {
      if (row._rowKey !== rowKey || row.userId !== userId) return row;
      return { ...row, userName };
    });
    syncOrderUsersToForm();
  };
  const markOrderUserLoadFailed = (userId: number) => {
    orderUserLoadFailedSet.value = new Set([
      ...orderUserLoadFailedSet.value,
      userId,
    ]);
  };
  const clearOrderUserLoadFailed = (userId: number) => {
    if (!orderUserLoadFailedSet.value.has(userId)) return;
    const next = new Set(orderUserLoadFailedSet.value);
    next.delete(userId);
    orderUserLoadFailedSet.value = next;
  };
  const applyOrderUserDetailToRows = (
    userId: number,
    displayName: string,
    rowKeys?: string[],
  ) => {
    const targets =
      rowKeys ??
      orderUserRows.value
        .filter((row) => row.userId === userId)
        .map((row) => row._rowKey);
    for (const rowKey of targets) {
      setOrderUserNameForRow(rowKey, userId, displayName);
    }
  };
  /**
   * 按 id 批量拉取干系人展示信息（一次请求），写入 detail/name 缓存。
   * 不存在的 id 静默记为失败并走「已删除」兜底，不抛错以免拖垮整页。
   */
  const loadOrderUserDetailsByIds = async (
    userIds: number[],
    rowKeyByUserId?: Map<number, string[]>,
  ) => {
    const uniqueIds = [...new Set(userIds.filter((id) => id > 0))];
    const toLoad = uniqueIds.filter(
      (id) =>
        !orderUserDetailMap.value[id] && !orderUserDetailLoadingMap.value[id],
    );
    const applyCached = (id: number) => {
      const cached = orderUserDetailMap.value[id];
      if (!cached) return;
      applyOrderUserDetailToRows(
        id,
        resolveUserDisplayName(id, undefined, cached),
        rowKeyByUserId?.get(id),
      );
    };
    for (const id of uniqueIds) {
      if (!toLoad.includes(id)) applyCached(id);
    }
    if (!toLoad.length) return;

    const loadingPatch: Record<number, boolean> = {};
    for (const id of toLoad) loadingPatch[id] = true;
    orderUserDetailLoadingMap.value = {
      ...orderUserDetailLoadingMap.value,
      ...loadingPatch,
    };

    try {
      const list = await getUserListByIds(toLoad, { silent: true });
      const foundIds = new Set(list.map((item) => item.id));
      for (const detail of list) {
        clearOrderUserLoadFailed(detail.id);
        syncOrderUserDetail(detail);
        applyOrderUserDetailToRows(
          detail.id,
          resolveUserDisplayName(detail.id, undefined, detail),
          rowKeyByUserId?.get(detail.id),
        );
      }
      for (const id of toLoad) {
        if (foundIds.has(id)) continue;
        const rowKey = rowKeyByUserId?.get(id)?.[0];
        const row = rowKey
          ? orderUserRows.value.find((item) => item._rowKey === rowKey)
          : orderUserRows.value.find((item) => item.userId === id);
        const fallback = resolveUserDisplayName(id, row?.userName);
        markOrderUserLoadFailed(id);
        syncOrderUserName(id, fallback);
        applyOrderUserDetailToRows(id, fallback, rowKeyByUserId?.get(id));
      }
    } catch {
      for (const id of toLoad) {
        const rowKey = rowKeyByUserId?.get(id)?.[0];
        const row = rowKey
          ? orderUserRows.value.find((item) => item._rowKey === rowKey)
          : orderUserRows.value.find((item) => item.userId === id);
        const fallback = resolveUserDisplayName(id, row?.userName);
        markOrderUserLoadFailed(id);
        syncOrderUserName(id, fallback);
        applyOrderUserDetailToRows(id, fallback, rowKeyByUserId?.get(id));
      }
    } finally {
      const donePatch: Record<number, boolean> = {};
      for (const id of toLoad) donePatch[id] = false;
      orderUserDetailLoadingMap.value = {
        ...orderUserDetailLoadingMap.value,
        ...donePatch,
      };
    }
  };
  const loadOrderUserDetail = async (
    userId: number | undefined,
    rowKey?: string,
  ) => {
    if (!userId) return;
    const rowKeyByUserId = rowKey
      ? new Map<number, string[]>([[userId, [rowKey]]])
      : undefined;
    await loadOrderUserDetailsByIds([userId], rowKeyByUserId);
  };
  const withOrderUserSortId = (rows: OrderUserEditorRow[]) => {
    const total = rows.length;
    return rows.map((row, index) => ({
      ...row,
      sortId: total - index,
    }));
  };
  const normalizeOrderUserItem = (item: SeaImportAdminApi.OrderUserAddDto) => ({
    ...item,
    userId: toOptionalNumber(item.userId),
    userAttribute: toOptionalNumber(item.userAttribute),
    sortId: toOptionalNumber(item.sortId),
  });
  const cloneOrderUsersForForm = (rows: OrderUserEditorRow[]) =>
    withOrderUserSortId(rows).map(({ _rowKey: _k, userName: _n, ...rest }) => ({
      ...rest,
    }));
  const makeEmptyOrderUserRow = (
    userAttribute: number,
  ): OrderUserEditorRow => ({
    _rowKey: makeOrderUserRowKey(),
    userAttribute,
  });
  /** 按当前角色配置补齐默认展示行并排序（枚举外的角色保留在末尾） */
  const alignOrderUserRowsWithRoles = (rows: OrderUserEditorRow[]) =>
    syncOrderUserRows({
      createRow: makeEmptyOrderUserRow,
      getUserAttribute: (row) => row.userAttribute ?? undefined,
      roles: orderUserRoleOptions.value,
      rows,
    });
  const isDefaultVisibleRole = (userAttribute?: number) =>
    orderUserRoleOptions.value.some(
      (role) => role.value === userAttribute && role.defaultVisible,
    );
  const createOrderUserRows = (
    items: SeaImportAdminApi.OrderUserAddDto[] | undefined,
    options?: { fillCurrentUser?: boolean },
  ) => {
    if (!items?.length) {
      const rows = alignOrderUserRowsWithRoles([]);
      if (!options?.fillCurrentUser || currentUserId.value == null) return rows;
      return rows.map((row) =>
        row.userAttribute != null &&
        defaultCurrentUserRoleSet.has(row.userAttribute)
          ? { ...row, userId: currentUserId.value }
          : row,
      );
    }
    const mappedRows = items
      .map((item) => {
        const nickName = (item as any).userNickName as string | undefined;
        return {
          ...normalizeOrderUserItem(item),
          userName: nickName || undefined,
          _rowKey: makeOrderUserRowKey(),
        };
      })
      // 非默认展示的角色（如海外客服）仅在已分配人员时展示
      .filter(
        (row) =>
          isDefaultVisibleRole(row.userAttribute) || hasValidUserId(row.userId),
      );
    // 默认展示角色始终占位：编辑态若订单未保存某角色，补一张空卡
    // （保存时无人员会被过滤，不会写库）。
    return alignOrderUserRowsWithRoles(mappedRows);
  };
  const syncOrderUsersToForm = () => {
    partyInfoFormApi.setValues({
      orderUsers: cloneOrderUsersForForm(orderUserRows.value),
    });
  };
  const fillOrderUserNames = async (rows: OrderUserEditorRow[]) => {
    const rowKeyByUserId = new Map<number, string[]>();
    for (const row of rows) {
      if (row.userId == null || row.userId <= 0) continue;
      const keys = rowKeyByUserId.get(row.userId) ?? [];
      keys.push(row._rowKey);
      rowKeyByUserId.set(row.userId, keys);
    }
    await loadOrderUserDetailsByIds([...rowKeyByUserId.keys()], rowKeyByUserId);
  };
  /**
   * @param items 已保存的干系人；为空表示仅铺角色配置里的默认展示行
   * @param options.fillCurrentUser 空数据时操作/客服/单证兜底当前登录账号
   */
  const initializeOrderUsersPanel = (
    items?: SeaImportAdminApi.OrderUserAddDto[],
    options?: { fillCurrentUser?: boolean },
  ) => {
    orderUsersPanelInitialized = true;
    orderUserRows.value = createOrderUserRows(items, options);
    for (const row of orderUserRows.value) {
      if (row.userId && row.userName) {
        orderUserNameMap.value = {
          ...orderUserNameMap.value,
          [row.userId]: row.userName,
        };
      }
    }
    syncOrderUsersToForm();
    void fillOrderUserNames(orderUserRows.value);
  };
  // 角色枚举是异步拉取的，面板可能先于配置渲染：配置到位后补齐默认展示行
  watch(orderUserRoleOptions, () => {
    if (!orderUsersPanelInitialized) return;
    orderUserRows.value = alignOrderUserRowsWithRoles(orderUserRows.value);
    syncOrderUsersToForm();
  });
  /** 委托单位干系人角色 → 干系人面板角色（客户仅维护销售/客服/操作/单证四类） */
  const pickDefaultClientStakeholder = (
    list?: ClientAppApi.ClientStakeholderDto[] | null,
  ) => {
    if (!list?.length) return undefined;
    return list.find((item) => item.isDefault) ?? list[0];
  };
  /**
   * 依据委托单位（clientId）已绑定的干系人默认回填面板：
   * - 销售/客服/操作/单证：取客户「默认」干系人（无默认取第一个）
   * - 操作/单证/客服：客户未绑定时，兜底填当前登录账号
   * - 其余角色（商务/海外客服等）不在客户维度维护，保持原值不动
   * 仅在用户主动切换委托单位时调用，不改动商务等未绑定角色。
   * 数据来自 Client/GetDishonestStakeholdersAsync（登录即可，非 Admin）。
   */
  const applyClientDefaultOrderUsers = (
    client?: ClientAppApi.ClientDishonestStakeholderDto,
  ) => {
    const roleAssignment = new Map<
      number,
      { userId: number; userName?: string }
    >();
    const assignFromClient = (
      role: number,
      list?: ClientAppApi.ClientStakeholderDto[] | null,
    ) => {
      const picked = pickDefaultClientStakeholder(list);
      if (picked?.userId) {
        roleAssignment.set(role, {
          userId: picked.userId,
          userName: picked.userNickName || undefined,
        });
      }
    };
    assignFromClient(UserAttribute.Sales, client?.sales);
    assignFromClient(UserAttribute.CustomerService, client?.customerServices);
    assignFromClient(UserAttribute.Operation, client?.operations);
    assignFromClient(UserAttribute.Documentation, client?.documentations);
    // 委托单位未绑定操作/单证/客服时，默认展示当前登录账号
    if (currentUserId.value != null) {
      for (const role of [
        UserAttribute.Operation,
        UserAttribute.Documentation,
        UserAttribute.CustomerService,
      ]) {
        if (!roleAssignment.has(role)) {
          roleAssignment.set(role, { userId: currentUserId.value });
        }
      }
    }
    if (!roleAssignment.size) return;
    orderUserRows.value = orderUserRows.value.map((row) => {
      if (row.userAttribute == null) return row;
      const target = roleAssignment.get(row.userAttribute);
      if (!target) return row;
      return { ...row, userId: target.userId, userName: target.userName };
    });
    syncOrderUsersToForm();
    void fillOrderUserNames(orderUserRows.value);
  };
  const openOrderUserRoleModal = () => {
    if (!availableOrderUserRoleOptions.value.length) {
      message.warning('所有角色已添加，不可重复添加');
      return;
    }
    orderUserRoleModalSelected.value =
      availableOrderUserRoleOptions.value[0]?.value;
    orderUserRoleModalOpen.value = true;
  };
  const handleOrderUserRoleModalCancel = () => {
    orderUserRoleModalSelected.value = undefined;
    orderUserRoleModalOpen.value = false;
  };
  const handleOrderUserRoleModalConfirm = () => {
    const userAttribute = orderUserRoleModalSelected.value;
    if (userAttribute == null) {
      message.warning('请选择角色');
      return;
    }
    if (selectedOrderUserRoleSet.value.has(userAttribute)) {
      message.warning(`${getOrderUserRoleLabel(userAttribute)}角色已存在`);
      return;
    }
    orderUserRows.value = [
      ...orderUserRows.value,
      {
        _rowKey: makeOrderUserRowKey(),
        userAttribute,
        sortId: 0,
      },
    ];
    syncOrderUsersToForm();
    handleOrderUserRoleModalCancel();
  };
  const removeOrderUserRole = (rowKey: string) => {
    const row = orderUserRows.value.find((item) => item._rowKey === rowKey);
    if (
      row?.userAttribute != null &&
      requiredOrderUserRoles.includes(row.userAttribute)
    ) {
      message.warning(
        `${getOrderUserRoleLabel(row.userAttribute)}角色不可删除`,
      );
      return;
    }
    orderUserRows.value = orderUserRows.value.filter(
      (row) => row._rowKey !== rowKey,
    );
    syncOrderUsersToForm();
  };
  const updateOrderUser = (rowKey: string, userId: number | undefined) => {
    orderUserRows.value = orderUserRows.value.map((row) => {
      if (row._rowKey !== rowKey) return row;
      return {
        ...row,
        userId,
        userName: userId ? orderUserNameMap.value[userId] : undefined,
      };
    });
    syncOrderUsersToForm();
    if (!userId) return;
    void loadOrderUserDetail(userId, rowKey);
  };
  const validateSalesRoleCount = () => {
    const salesCount = orderUserRows.value.filter(
      (row) => row.userAttribute === UserAttribute.Sales,
    ).length;
    if (salesCount !== 1) {
      message.warning('干系人中必须且只能有一个销售角色');
      return false;
    }
    return true;
  };
  const validateRequiredOrderUserAssignee = () => {
    for (const role of requiredOrderUserRoles) {
      const row = orderUserRows.value.find(
        (item) => item.userAttribute === role,
      );
      if (!row) {
        message.warning(`请添加${getOrderUserRoleLabel(role)}角色`);
        return false;
      }
      if (!hasValidUserId(row.userId)) {
        message.warning(`${getOrderUserRoleLabel(role)}必须选择人员`);
        return false;
      }
    }
    return true;
  };
  return {
    orderUserRows,
    salesUserId,
    orderUserRoleModalOpen,
    orderUserRoleModalSelected,
    availableOrderUserRoleOptions,
    requiredOrderUserRoles,
    getOrderUserRoleLabel,
    getOrderUserDisplayName,
    getOrderUserSelectedItems,
    getOrderUserAvatarSrc,
    getOrderUserAvatarText,
    getOrderUserDetail,
    isOrderUserDetailLoading,
    getOrderUserDetailText,
    getOrderUserOrgText,
    getOrderUserStatusText,
    getOrderUserStatusClass,
    loadOrderUserDetail,
    initializeOrderUsersPanel,
    applyClientDefaultOrderUsers,
    openOrderUserRoleModal,
    handleOrderUserRoleModalCancel,
    handleOrderUserRoleModalConfirm,
    removeOrderUserRole,
    updateOrderUser,
    validateSalesRoleCount,
    validateRequiredOrderUserAssignee,
    whenOrderUserRolesReady,
  };
}
