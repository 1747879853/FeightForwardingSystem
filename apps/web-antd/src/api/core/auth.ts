import { baseRequestClient, requestClient } from '#/api/request';

export namespace AuthApi {
  /** 登录接口参数 */
  export interface LoginParams {
    password?: string;
    userNameOrEmailAddress?: string;
    tenantId?: number;
    tenancyName?: string;
  }

  /** 登录接口返回值 - ABP 标准响应格式 */
  export interface LoginResult {
    /** 访问令牌 */
    accessToken: string;
    /** 刷新令牌 */
    refreshToken: string;
    /** 加密的访问令牌 */
    encryptedAccessToken: string;
    /** 过期时间（秒） */
    expireInSeconds: number;
    /** 是否需要重置密码 */
    shouldResetPassword: boolean;
    /** 密码重置代码 */
    passwordResetCode: null | string;
    /** 用户ID */
    userId: number;
    /** 是否需要双因素验证 */
    requiresTwoFactorVerification: boolean;
    /** 双因素认证提供者 */
    twoFactorAuthProviders: null | string[];
    /** 双因素记住客户端令牌 */
    twoFactorRememberClientToken: null | string;
    /** 返回URL */
    returnUrl: null | string;
  }

  export interface RefreshTokenResult {
    data: string;
    status: number;
  }

  /** 权限DTO - 用于输出的权限信息 */
  export interface PermissionDto {
    /** 权限编码 */
    name: null | string;
    /** 父级权限编码 */
    parentName: null | string;
    /** 权限显示名 */
    displayName: null | string;
    /** 是否默认展开 */
    isOpen: boolean;
  }

  /** 用户配置接口返回值 */
  export interface UserConfigurationResult {
    auth: {
      allPermissions: Record<string, string>;
      grantedPermissions: Record<string, string>;
    };
    clock: {
      provider: string;
    };
    custom: Record<string, any>;
    features: {
      allFeatures: Record<string, any>;
    };
    localization: {
      currentCulture: {
        displayName: string;
        name: string;
      };
      currentLanguage: {
        displayName: string;
        icon: string;
        isDefault: boolean;
        isDisabled: boolean;
        isRightToLeft: boolean;
        name: string;
      };
      languages: Array<{
        displayName: string;
        icon: string;
        isDefault: boolean;
        isDisabled: boolean;
        isRightToLeft: boolean;
        name: string;
      }>;
      sources: Array<{
        name: string;
        type: string;
      }>;
      values: Record<string, Record<string, string>>;
    };
    multiTenancy: {
      ignoreFeatureCheckForHostUsers: boolean;
      isEnabled: boolean;
      sides: {
        host: number;
        tenant: number;
      };
    };
    nav: any;
    security: {
      antiForgery: {
        tokenCookieName: string;
        tokenHeaderName: string;
      };
    };
    session: {
      impersonatorTenantId: null | number;
      impersonatorUserId: null | number;
      multiTenancySide: number;
      tenantId: null | number;
      userId: number;
    };
    setting: {
      values: Record<string, string>;
    };
    timing: {
      timeZoneInfo: {
        iana: {
          timeZoneId: string;
        };
        windows: {
          baseUtcOffsetInMilliseconds: number;
          currentUtcOffsetInMilliseconds: number;
          isDaylightSavingTimeNow: boolean;
          timeZoneId: string;
        };
      };
    };
  }
}

/**
 * 登录
 */
export async function loginApi(data: AuthApi.LoginParams) {
  return requestClient.post<AuthApi.LoginResult>(
    '/TokenAuth/AuthenticateTenantLogin',
    data,
  );
}

/**
 * 刷新accessToken
 */
export async function refreshTokenApi() {
  return baseRequestClient.post<AuthApi.RefreshTokenResult>('/auth/refresh', {
    withCredentials: true,
  });
}

/**
 * 退出登录
 */
export async function logoutApi() {
  return requestClient.get('/TokenAuth/LogOut', {
    withCredentials: true,
  });
}

/**
 * 获取用户配置（包含权限信息）
 * 注意：此接口不添加 /api 前缀
 */
export async function getUserConfigurationApi() {
  return requestClient.get<AuthApi.UserConfigurationResult>(
    '/UserConfiguration/GetAll',
    {
      baseURL: '', // 不使用默认的 /api 前缀
    },
  );
}

/**
 * 获取用户权限码（从用户配置中提取）
 */
export async function getAccessCodesApi() {
  const config = await getUserConfigurationApi();
  // 从 grantedPermissions 对象中提取权限名称列表
  return Object.keys(config.auth.grantedPermissions);
}

/**
 * 获取所有权限
 */
export async function getAllPermissionsApi() {
  return requestClient.get<AuthApi.PermissionDto[]>(
    '/services/app/Permission/GetAllPermissions',
  );
}

/**
 * 获取用户的权限名称集合
 * @param userId 用户ID
 */
export async function getUserPermissionsApi(userId: number) {
  return requestClient.get<string[]>(
    '/services/app/UserAdmin/GetUserPermissionsAsync',
    {
      params: { Id: userId },
    },
  );
}

/**
 * 权限树节点 - 对应菜单格式
 */
export interface PermissionTreeNode {
  /** 菜单名称 */
  name: string;
  /** 父级ID */
  pid: string;
  /** 后端权限标识 */
  authCode: string;
  /** 菜单ID */
  id: string;
  /** 子级 */
  children?: PermissionTreeNode[];
}

/**
 * 将权限列表构建为树形结构
 * @param permissions 权限列表
 * @param t 翻译函数，用于翻译权限名称
 * @returns 权限树
 */
export function buildPermissionTree(
  permissions: AuthApi.PermissionDto[],
  t?: (key: string) => string,
): PermissionTreeNode[] {
  // 创建映射表
  const permissionMap = new Map<string, PermissionTreeNode>();
  const rootNodes: PermissionTreeNode[] = [];

  // 第一遍遍历：创建所有节点
  for (const permission of permissions) {
    if (!permission.name) continue;

    const node: PermissionTreeNode = {
      id: permission.name,
      name: t
        ? t(`auth.${permission.name.replaceAll('.', '_')}`)
        : permission.name.replaceAll('.', '_'),
      authCode: permission.name,
      pid: permission.parentName || '',
      children: [],
    };

    permissionMap.set(permission.name, node);
  }

  // 第二遍遍历：构建树形结构
  for (const permission of permissions) {
    if (!permission.name) continue;

    const currentNode = permissionMap.get(permission.name);
    if (!currentNode) continue;

    // 如果有父级，添加到父级的children中
    if (permission.parentName) {
      const parentNode = permissionMap.get(permission.parentName);
      if (parentNode) {
        if (!parentNode.children) {
          parentNode.children = [];
        }
        parentNode.children.push(currentNode);
      } else {
        // 父级不存在，视为根节点
        rootNodes.push(currentNode);
      }
    } else {
      // 没有父级，是根节点
      rootNodes.push(currentNode);
    }
  }

  // 清理空的children数组并更新父级的翻译键
  const cleanEmptyChildren = (nodes: PermissionTreeNode[]) => {
    for (const node of nodes) {
      if (node.children && node.children.length === 0) {
        delete node.children;
      } else if (node.children && node.children.length > 0) {
        cleanEmptyChildren(node.children);
      }
    }
  };

  cleanEmptyChildren(rootNodes);

  return rootNodes;
}

/**
 * 获取所有权限并构建为树形结构
 * @param t 翻译函数，用于翻译权限名称
 */
export async function getAllPermissionsTreeApi(t?: (key: string) => string) {
  const permissions = await getAllPermissionsApi();
  return buildPermissionTree(permissions, t);
}
