import type { BasicUserInfo } from '@vben-core/typings';

/** 用户信息 */
interface UserInfo extends BasicUserInfo {
  /**
   * 用户描述
   */
  desc: string;
  /**
   * 首页地址
   */
  homePath: string;

  /**
   * accessToken
   */
  token: string;

  /** GetMyAsync 扩展字段 */
  companyId?: null | number;
  companyName?: null | string;
  departmentId?: null | number;
  departmentName?: null | string;
  emailAddress?: null | string;
  emailPwd?: null | string;
  employeeID?: null | string;
  enName?: null | string;
  gender?: null | number;
  idNumber?: null | string;
  nickName?: null | string;
  officeTel?: null | string;
  phoneNumber?: null | string;
  qq?: null | string;
  userName?: null | string;
}

export type { UserInfo };
