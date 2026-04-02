import type { UserInfo } from '@vben/types';

import { requestClient } from '#/api/request';

/** 后端返回的用户信息结构 */
interface BackendUserResponse {
  application: {
    releaseDate: string;
    version: string;
  };
  tenant: {
    id: number;
    name: string;
    tenancyName: string;
  };
  user: {
    avatar: null | string;

    id: number;
    nickName: string;

    tenantId: number;
  };
}

/**
 * 适配器函数：将后端返回的数据转换为前端 UserInfo 类型
 */
function adaptUserInfo(backendData: BackendUserResponse): UserInfo {
  const { user } = backendData;

  return {
    // 基础用户信息
    userId: String(user.id),
    username: user.nickName, // 使用邮箱前缀作为用户名
    realName: user.nickName,
    avatar: user.avatar || '', // 如果没有头像则使用空字符串
    roles: [], // 根据实际情况填充角色信息，可能需要从其他接口获取

    // 扩展信息
    desc: '暂无描述', // 使用组织单位作为描述
    homePath: '/dashboard/sea-freight-globe', // 默认首页路径，可根据需要调整
    token: '', // token 通常从登录接口获取，这里返回空字符串
  };
}

/**
 * 获取用户信息
 */
export async function getUserInfoApi() {
  const response = await requestClient.get<BackendUserResponse>(
    '/services/app/Session/GetCurrentLoginInformations',
  );

  // 使用适配器转换数据
  return adaptUserInfo(response);
}
