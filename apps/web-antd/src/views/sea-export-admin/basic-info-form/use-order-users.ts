/**
 * 海运出口「干系人（orderUsers）」面板逻辑。
 *
 * 封装干系人行的状态、角色增删、用户详情懒加载、头像/状态展示与三套保存校验，
 * 从 form.vue 抽出以收敛该域的认知负担；模板面板仍在 form.vue 中通过返回值渲染。
 */
import type { ComputedRef, Ref } from 'vue';

import { computed, ref } from 'vue';

import { preferences } from '@vben/preferences';

import { message } from 'ant-design-vue';

import type { ClientAdminApi } from '#/api/sea-export/client-admin';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';
import type { SystemUserAdminApi } from '#/api/system/user-admin';

import { getUser, UserAttribute } from '#/api/system/user-admin';
import { $t } from '#/locales';
import { buildAttachmentUrl } from '#/utils';
import {
  formatDeletedUserFallback,
  resolveUserDisplayName,
} from '#/utils/user-display';
import { parseSeaExportUserAttribute } from '#/views/system/user/data';

import { hasValidUserId, toOptionalNumber } from './sea-export-detail-mapper';
import type { ServiceTypeNode } from './service-type-nodes';

/**
 * 新建态默认干系人角色（含默认优先级 sortId）。
 * 海外客服不默认展示（仅编辑态有值时才显示），故不在此列表内。
 */
export const defaultOrderUsers: SeaExportAdminApi.OrderUserAddDto[] = [
  { userAttribute: UserAttribute.Sales, sortId: 6 },
  { userAttribute: UserAttribute.Business, sortId: 5 },
  { userAttribute: UserAttribute.Operation, sortId: 4 },
  { userAttribute: UserAttribute.CustomerService, sortId: 3 },
  { userAttribute: UserAttribute.Documentation, sortId: 2 },
];

type OrderUserEditorRow = SeaExportAdminApi.OrderUserAddDto & {
  _rowKey: string;
  userName?: string;
};

type OrderUsersFormApi = {
  setValues: (values: Record<string, any>) => Promise<void> | void;
};

export type UseOrderUsersDeps = {
  partyInfoFormApi: OrderUsersFormApi;
  currentUserId: ComputedRef<number | undefined>;
  isEdit: ComputedRef<boolean>;
  serviceTypeNodes: Ref<ServiceTypeNode[]>;
  serviceTypeSyncLoading: Ref<boolean>;
  polServiceConfigLoaded: Ref<boolean>;
  latestAvailableServiceTypes: Ref<SeaExportAdminApi.ServiceTypeByPolDto[]>;
};

export function useOrderUsers(deps: UseOrderUsersDeps) {
  const {
    partyInfoFormApi,
    currentUserId,
    isEdit,
    serviceTypeNodes,
    serviceTypeSyncLoading,
    polServiceConfigLoaded,
    latestAvailableServiceTypes,
  } = deps;

  /** 必选且不可删除的角色 */
  const requiredOrderUserRoles: number[] = [
    UserAttribute.Sales,
    UserAttribute.Operation,
  ];
  /** 新建态默认带入当前登录用户的角色集合 */
  const defaultCurrentUserRoleSet = new Set([
    UserAttribute.Operation,
    UserAttribute.CustomerService,
    UserAttribute.Documentation,
  ]);

  const orderUserRows = ref<OrderUserEditorRow[]>([]);
  const orderUserNameMap = ref<Record<number, string>>({});
  const orderUserDetailMap = ref<Record<number, SystemUserAdminApi.UserDto>>(
    {},
  );
  const orderUserDetailLoadingMap = ref<Record<number, boolean>>({});
  /** 已确认 getUser 失败的用户，才展示「已删除」兜底 */
  const orderUserLoadFailedSet = ref(new Set<number>());
  let orderUserRowKeyCounter = 0;
  const makeOrderUserRowKey = () =>
    `order_user_${++orderUserRowKeyCounter}_${Date.now()}`;

  const orderUserRoleOptions = computed(() => [
    {
      label: $t('system.user.userAttributeOptions.sales'),
      value: UserAttribute.Sales,
    },
    {
      label: $t('system.user.userAttributeOptions.business'),
      value: UserAttribute.Business,
    },
    {
      label: $t('system.user.userAttributeOptions.operation'),
      value: UserAttribute.Operation,
    },
    {
      label: $t('system.user.userAttributeOptions.customerService'),
      value: UserAttribute.CustomerService,
    },
    {
      label: $t('system.user.userAttributeOptions.documentation'),
      value: UserAttribute.Documentation,
    },
    {
      label: $t('system.user.userAttributeOptions.overseasCustomerService'),
      value: UserAttribute.OverseasCustomerService,
    },
  ]);
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
  const availableOrderUserRoleOptions = computed(() =>
    orderUserRoleOptions.value.filter(
      (option) => !selectedOrderUserRoleSet.value.has(option.value),
    ),
  );
  const getOrderUserRoleLabel = (userAttribute?: number) => {
    switch (userAttribute) {
      case UserAttribute.Sales:
        return $t('system.user.userAttributeOptions.sales');
      case UserAttribute.Business:
        return $t('system.user.userAttributeOptions.business');
      case UserAttribute.Operation:
        return $t('system.user.userAttributeOptions.operation');
      case UserAttribute.CustomerService:
        return $t('system.user.userAttributeOptions.customerService');
      case UserAttribute.Documentation:
        return $t('system.user.userAttributeOptions.documentation');
      case UserAttribute.OverseasCustomerService:
        return $t('system.user.userAttributeOptions.overseasCustomerService');
      default:
        return '-';
    }
  };
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
    const avatar = getOrderUserDetail(userId)?.avatar?.trim();
    if (avatar) return buildAttachmentUrl(avatar);
    return preferences.app.defaultAvatar;
  };
  const getOrderUserAvatarText = (row: OrderUserEditorRow) => {
    const displayName =
      getOrderUserDisplayName(row) ||
      getOrderUserDetail(row.userId)?.nickName ||
      getOrderUserDetail(row.userId)?.userName;
    const normalized = displayName?.trim();
    if (normalized) return normalized.slice(0, 1);
    return '?';
  };
  const getOrderUserDetail = (userId?: number) =>
    userId ? orderUserDetailMap.value[userId] : undefined;
  const isOrderUserDetailLoading = (userId?: number) =>
    !!(userId && orderUserDetailLoadingMap.value[userId]);
  const getOrderUserDetailText = (value?: string) => value?.trim() || '-';
  const getOrderUserStatusText = (detail?: SystemUserAdminApi.UserDto) => {
    if (!detail) return '未知';
    return detail.isActive ? '启用' : '禁用';
  };
  const getOrderUserStatusClass = (detail?: SystemUserAdminApi.UserDto) => {
    if (!detail?.isActive) return 'order-user-detail-card__status--inactive';
    return 'order-user-detail-card__status--active';
  };
  const syncOrderUserName = (userId: number, userName: string) => {
    orderUserNameMap.value = { ...orderUserNameMap.value, [userId]: userName };
  };
  const syncOrderUserDetail = (detail: SystemUserAdminApi.UserDto) => {
    orderUserDetailMap.value = {
      ...orderUserDetailMap.value,
      [detail.id]: detail,
    };
    const displayName = detail.nickName || detail.userName || String(detail.id);
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
  const loadOrderUserDetail = async (
    userId: number | undefined,
    rowKey?: string,
  ) => {
    if (!userId) return;
    const cachedDetail = orderUserDetailMap.value[userId];
    if (cachedDetail) {
      setOrderUserNameForRow(
        rowKey,
        userId,
        resolveUserDisplayName(userId, undefined, cachedDetail),
      );
      return;
    }
    if (orderUserDetailLoadingMap.value[userId]) return;
    orderUserDetailLoadingMap.value = {
      ...orderUserDetailLoadingMap.value,
      [userId]: true,
    };
    try {
      const detail = await getUser(userId, { silent: true });
      if (orderUserLoadFailedSet.value.has(userId)) {
        const next = new Set(orderUserLoadFailedSet.value);
        next.delete(userId);
        orderUserLoadFailedSet.value = next;
      }
      syncOrderUserDetail(detail);
      const displayName = resolveUserDisplayName(userId, undefined, detail);
      setOrderUserNameForRow(rowKey, userId, displayName);
    } catch {
      const row = rowKey
        ? orderUserRows.value.find((item) => item._rowKey === rowKey)
        : undefined;
      const fallback = resolveUserDisplayName(userId, row?.userName);
      orderUserLoadFailedSet.value = new Set([
        ...orderUserLoadFailedSet.value,
        userId,
      ]);
      syncOrderUserName(userId, fallback);
      setOrderUserNameForRow(rowKey, userId, fallback);
    } finally {
      orderUserDetailLoadingMap.value = {
        ...orderUserDetailLoadingMap.value,
        [userId]: false,
      };
    }
  };
  const withOrderUserSortId = (rows: OrderUserEditorRow[]) => {
    const total = rows.length;
    return rows.map((row, index) => ({
      ...row,
      sortId: total - index,
    }));
  };
  const normalizeOrderUserItem = (item: SeaExportAdminApi.OrderUserAddDto) => ({
    ...item,
    userId: toOptionalNumber(item.userId),
    userAttribute: toOptionalNumber(item.userAttribute),
    sortId: toOptionalNumber(item.sortId),
  });
  const cloneOrderUsersForForm = (rows: OrderUserEditorRow[]) =>
    withOrderUserSortId(rows).map(({ _rowKey: _k, userName: _n, ...rest }) => ({
      ...rest,
    }));
  const createOrderUserRows = (
    items: SeaExportAdminApi.OrderUserAddDto[] | undefined,
  ) => {
    if (!items?.length) {
      return defaultOrderUsers.map((item) => {
        const normalizedItem = normalizeOrderUserItem(item);
        const shouldDefaultCurrentUser =
          normalizedItem.userAttribute != null &&
          defaultCurrentUserRoleSet.has(normalizedItem.userAttribute) &&
          currentUserId.value != null;
        return {
          ...normalizedItem,
          userId: shouldDefaultCurrentUser
            ? currentUserId.value
            : normalizedItem.userId,
          _rowKey: makeOrderUserRowKey(),
        };
      });
    }
    return items
      .map((item) => {
        const nickName = (item as any).userNickName as string | undefined;
        return {
          ...normalizeOrderUserItem(item),
          userName: nickName || undefined,
          _rowKey: makeOrderUserRowKey(),
        };
      })
      .filter(
        (row) =>
          // 海外客服仅在已分配人员时展示，无值不显示
          row.userAttribute !== UserAttribute.OverseasCustomerService ||
          hasValidUserId(row.userId),
      );
  };
  const syncOrderUsersToForm = () => {
    partyInfoFormApi.setValues({
      orderUsers: cloneOrderUsersForForm(orderUserRows.value),
    });
  };
  const fillOrderUserNames = async (rows: OrderUserEditorRow[]) => {
    const toLoadRows = rows.filter(
      (row): row is OrderUserEditorRow & { userId: number } =>
        row.userId != null && row.userId > 0,
    );
    await Promise.all(
      toLoadRows.map((row) => loadOrderUserDetail(row.userId, row._rowKey)),
    );
  };
  const initializeOrderUsersPanel = (
    items: SeaExportAdminApi.OrderUserAddDto[] | undefined,
  ) => {
    orderUserRows.value = createOrderUserRows(items);
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
  /** 委托单位干系人角色 → 干系人面板角色（客户仅维护销售/客服/操作/单证四类） */
  const pickDefaultClientStakeholder = (
    list?: ClientAdminApi.ClientStakeholderDto[],
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
   */
  const applyClientDefaultOrderUsers = (client?: ClientAdminApi.ClientDto) => {
    const roleAssignment = new Map<
      number,
      { userId: number; userName?: string }
    >();
    const assignFromClient = (
      role: number,
      list?: ClientAdminApi.ClientStakeholderDto[],
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
  const formatBoundRoleOptionsLabel = (roles: number[]) =>
    roles.map((role) => getOrderUserRoleLabel(role)).join('或');
  const validateServiceBoundOrderUsers = () => {
    const checkedNodes = serviceTypeNodes.value.filter((node) => node.checked);
    if (!checkedNodes.length) {
      return true;
    }
    if (
      !isEdit.value &&
      (serviceTypeSyncLoading.value || !polServiceConfigLoaded.value)
    ) {
      message.warning('服务项目配置加载中，请稍后保存');
      return false;
    }
    const polConfigMap = new Map<
      number,
      SeaExportAdminApi.ServiceTypeByPolDto
    >();
    latestAvailableServiceTypes.value.forEach((item) => {
      const serviceType = Number(item.serviceType);
      if (!Number.isFinite(serviceType)) return;
      polConfigMap.set(serviceType, item);
    });
    for (const node of checkedNodes) {
      const boundRoles = parseSeaExportUserAttribute(
        polConfigMap.get(node.serviceType)?.userAttribute,
      );
      if (!boundRoles.length) continue;
      const isServiceSatisfied = boundRoles.some((role) => {
        const row = orderUserRows.value.find(
          (item) => item.userAttribute === role,
        );
        return hasValidUserId(row?.userId);
      });
      if (isServiceSatisfied) continue;
      const rolesWithRowNoUser = boundRoles.filter((role) => {
        const row = orderUserRows.value.find(
          (item) => item.userAttribute === role,
        );
        return row != null && !hasValidUserId(row.userId);
      });
      if (rolesWithRowNoUser.length > 0) {
        message.warning(
          `${getOrderUserRoleLabel(rolesWithRowNoUser[0])}必须选择人员（${node.label}）`,
        );
        return false;
      }
      if (boundRoles.length === 1) {
        message.warning(
          `请添加${getOrderUserRoleLabel(boundRoles[0])}角色（${node.label}）`,
        );
        return false;
      }
      message.warning(
        `${node.label}服务缺少责任人员，请添加${formatBoundRoleOptionsLabel(boundRoles)}角色`,
      );
      return false;
    }
    return true;
  };

  return {
    orderUserRows,
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
    validateServiceBoundOrderUsers,
  };
}
