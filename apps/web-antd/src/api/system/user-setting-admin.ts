import { requestClient } from '#/api/request';

export namespace UserSettingAdminApi {
  export interface UserSettingDto {
    id: number;
    name: string;
    setting: string;
    creationTime?: string;
    lastModificationTime?: string;
  }

  export interface GetPagedListParams {
    Keyword?: string;
    Sorting?: string;
    PageIndex?: number;
    PageSize?: number;
    CreatorUserId?: number | string;
  }

  export interface PagedListOfUserSettingDto {
    items: UserSettingDto[];
    totalCount: number;
  }

  export interface AddUserSettingDto {
    name: string;
    setting: string;
  }

  export interface EditUserSettingDto extends AddUserSettingDto {
    id: number;
  }
}

const API_PREFIX = '/services/app/UserSettingAdmin';

export const getUserSettingPagedList = (
  params: UserSettingAdminApi.GetPagedListParams,
) => {
  return requestClient.get<UserSettingAdminApi.PagedListOfUserSettingDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

export const getUserSettingDetail = (id: number) => {
  return requestClient.get<UserSettingAdminApi.UserSettingDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { id } },
  );
};

export const addUserSetting = (data: UserSettingAdminApi.AddUserSettingDto) => {
  return requestClient.post<number>(`${API_PREFIX}/AddAsync`, data);
};

export const editUserSetting = (
  data: UserSettingAdminApi.EditUserSettingDto,
) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

export const deleteUserSetting = (id: number) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { id },
  });
};
