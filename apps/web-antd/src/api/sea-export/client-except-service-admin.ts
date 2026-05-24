import { requestClient } from '#/api/request';

export namespace ClientExceptServiceAdminApi {
  export interface PortCodeDto {
    /** 起运港 id，超出 JS 安全整数时需用 string */
    id?: number | string;
    portName?: string;
    cnName?: string;
  }

  export interface ClientExceptServiceItemDto {
    id?: string;
    serviceType: number;
    userAttribute?: number;
    autoComplete?: boolean;
    manualAllowed?: boolean;
    reminder?: boolean;
    sortId?: number;
    remark?: string;
    isChecked: boolean;
  }

  export interface ClientExceptServicePolGroupDto {
    /** 起运港 id，超出 JS 安全整数时需用 string */
    polId: number | string;
    pol?: PortCodeDto;
    items: ClientExceptServiceItemDto[];
  }

  export interface ClientExceptServicePolEditDto {
    polId: number | string;
    serviceTypes?: number[];
  }

  export interface EditClientExceptServicesDto {
    clientId: string;
    poLs?: ClientExceptServicePolEditDto[];
  }
}

const API_PREFIX = '/services/app/ClientExceptServiceAdmin';

/** 获取某个客户的排除服务项目配置 */
export const getClientExceptServices = (id: string) => {
  return requestClient.get<
    ClientExceptServiceAdminApi.ClientExceptServicePolGroupDto[]
  >(`${API_PREFIX}/GetClientExceptServicesAsync`, {
    params: { id },
  });
};

/** 修改某个客户的排除服务项目 */
export const editClientExceptServices = (
  data: ClientExceptServiceAdminApi.EditClientExceptServicesDto,
) => {
  return requestClient.put<boolean>(
    `${API_PREFIX}/EditClientExceptServicesAsync`,
    data,
  );
};
