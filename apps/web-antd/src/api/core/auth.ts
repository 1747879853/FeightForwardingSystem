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
