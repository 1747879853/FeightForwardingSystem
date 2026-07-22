import type { UserInfo } from '@vben/types';

import type { SystemOrganizationUnitApi } from '#/api/system/organization-unit';

import { requestClient } from '#/api/request';

/** 修改我的密码 */
export interface MyPasswordInputDto {
  confirmPassword?: string;
  password: string;
}

/**
 * 我的组织路径 DTO（GetMy 返回）
 * oneOrganizationPath：一条组织路径，从最高级组织（公司）到该组织，
 * 公司节点含本位币与公司银行账户 orgBankAccounts。
 */
export interface MyUserOrganizationPathDto {
  /** 是否默认组织 */
  default: boolean;
  /** 组织路径（从顶到底，节点为完整的组织机构 DTO） */
  oneOrganizationPath: SystemOrganizationUnitApi.OrganizationUnitDto[];
}

/** 获取我的信息 */
export interface UserAdminMyDto {
  avatar?: null | string;
  emailAddress?: null | string;
  emailPwd?: null | string;
  employeeID?: null | string;
  enName?: null | string;
  gender?: null | number;
  idNumber?: null | string;
  nickName?: null | string;
  officeTel?: null | string;
  /** 我所属的全部组织（含默认组织，节点为完整组织 DTO） */
  organizations?: MyUserOrganizationPathDto[] | null;
  phoneNumber?: null | string;
  qq?: null | string;
  userName?: null | string;
}

/** 修改我的信息 */
export interface UpdateMyInfoDto {
  avatar?: null | string;
  emailAddress?: null | string;
  emailPwd?: null | string;
  enName?: null | string;
  gender?: null | number;
  idNumber?: null | string;
  officeTel?: null | string;
  phoneNumber?: null | string;
  qq?: null | string;
}

/** 修改我的头像 */
export interface UpdateMyAvatarDto {
  avatar: string;
}

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
  user: null | {
    avatar: null | string;

    id: number;
    nickName: string;

    tenantId: number;
  };
}

/**
 * 适配器函数：将后端返回的数据转换为前端 UserInfo 类型
 */
function adaptUserInfo(
  backendData: BackendUserResponse,
  myInfo?: null | UserAdminMyDto,
): UserInfo {
  const user = backendData?.user ?? {
    avatar: '',
    id: 0,
    nickName: '',
    tenantId: 0,
  };
  const safeMyInfo = myInfo ?? {};
  const nickName = safeMyInfo.nickName || user.nickName;
  const userName = safeMyInfo.userName || nickName;
  const avatar = safeMyInfo.avatar || user.avatar || '';
  const emailAddress = safeMyInfo.emailAddress || '';

  return {
    // 基础用户信息
    userId: String(user.id),

    roles: [], // 根据实际情况填充角色信息，可能需要从其他接口获取

    // 扩展信息
    desc: '暂无描述', // 使用组织单位作为描述
    homePath: '/dashboard/sea-freight-globe', // 默认首页路径，可根据需要调整
    token: '', // token 通常从登录接口获取，这里返回空字符串

    // GetMyAsync 全量字段同步至 userStore.userInfo
    ...safeMyInfo,
    avatar,
    emailAddress,
    //nickName: safeMyInfo.nickName ?? nickName,
    //userName: safeMyInfo.userName ?? userName,
    username: userName,
    realName: nickName,
  };
}

/**
 * 获取用户信息
 */
export async function getUserInfoApi() {
  const [response, myInfoResponse] = await Promise.allSettled([
    requestClient.get<BackendUserResponse>(
      '/services/app/Session/GetCurrentLoginInformations',
    ),
    getMyInfoApi(),
  ]);

  if (response.status !== 'fulfilled') {
    throw response.reason;
  }

  return adaptUserInfo(
    response.value,
    myInfoResponse.status === 'fulfilled' ? myInfoResponse.value : null,
  );
}

/**
 * 修改当前登录用户密码
 */
export async function changeMyPasswordApi(data: MyPasswordInputDto) {
  return requestClient.post('/services/app/User/ChangeMyPasswordAsync', data);
}

/**
 * 获取当前登录用户个人信息
 */
export async function getMyInfoApi() {
  return requestClient.get<UserAdminMyDto>(
    '/services/app/UserAdmin/GetMyAsync',
  );
}

/**
 * 修改当前登录用户个人信息
 */
export async function updateMyInfoApi(data: UpdateMyInfoDto) {
  return requestClient.put('/services/app/UserAdmin/UpdateMyInfoAsync', data);
}

/**
 * 修改当前登录用户头像
 */
export async function updateMyAvatarApi(data: UpdateMyAvatarDto) {
  return requestClient.put('/services/app/UserAdmin/UpdateMyAvatarAsync', data);
}
