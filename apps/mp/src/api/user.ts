import { request } from './request';

/** UserAdmin/GetMyAsync 的精简取值，个人中心只展示身份 */
export interface MyProfile {
  avatar?: null | string;
  employeeID?: null | string;
  enName?: null | string;
  nickName?: null | string;
  phoneNumber?: null | string;
  userName?: null | string;
}

export function getMyProfile() {
  return request<MyProfile>({
    url: '/services/app/UserAdmin/GetMyAsync',
  });
}

export function logout() {
  return request<unknown>({ url: '/TokenAuth/LogOut' });
}
