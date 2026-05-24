import type { ClientExceptServiceAdminApi } from '#/api/sea-export/client-except-service-admin';

import {
  buildServiceTypeOptionsFromEnum,
  type SelectOption,
} from '#/views/system/basic-data/SeServiceConfigAdmin/data';

export type { SelectOption };

export { buildServiceTypeOptionsFromEnum };

/** 起运港 id 统一为字符串，避免大整数经 Number() 丢精度 */
export function normalizePolId(
  value: number | string | undefined | null,
): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return String(value);
}

/** 后端非委托单位校验错误（Get/Edit ClientExceptServices） */
export function isNotEntrustingUnitApiError(error: unknown): boolean {
  const responseData = (
    error as { response?: { data?: { error?: { message?: string } } } }
  )?.response?.data;
  const message =
    responseData?.error?.message ||
    (error as { message?: string })?.message ||
    '';
  return /非委托单位/.test(message);
}

export function formatPolLabel(
  pol?: ClientExceptServiceAdminApi.PortCodeDto,
  polId?: number | string,
): string {
  if (pol?.portName || pol?.cnName) {
    const en = pol.portName || '';
    const cn = pol.cnName || '';
    if (en && cn && en !== cn) return `${en} / ${cn}`;
    return en || cn;
  }
  const normalized = normalizePolId(polId);
  return normalized ?? '-';
}

export function normalizePortGroups(
  source: ClientExceptServiceAdminApi.ClientExceptServicePolGroupDto[],
): ClientExceptServiceAdminApi.ClientExceptServicePolGroupDto[] {
  return source.map((group) => {
    const polId = normalizePolId(group.polId) ?? group.polId;
    return {
      ...group,
      polId,
      pol: group.pol
        ? {
            ...group.pol,
            id: normalizePolId(group.pol.id) ?? group.pol.id,
          }
        : group.pol,
      items: (group.items || []).map((item) => ({ ...item })),
    };
  });
}

export function buildServiceTypeLabelMap(options: SelectOption[]) {
  return new Map(options.map((item) => [Number(item.value), item.label]));
}

export function buildEditPayload(
  clientId: string,
  groups: ClientExceptServiceAdminApi.ClientExceptServicePolGroupDto[],
): ClientExceptServiceAdminApi.EditClientExceptServicesDto {
  const poLs = groups
    .map((group) => {
      const polId = normalizePolId(group.polId);
      if (!polId) return null;
      const serviceTypes = (group.items || [])
        .filter((item) => item.isChecked === false)
        .map((item) => Number(item.serviceType))
        .filter((type) => !Number.isNaN(type));
      return { polId, serviceTypes };
    })
    .filter(
      (
        group,
      ): group is ClientExceptServiceAdminApi.ClientExceptServicePolEditDto =>
        group !== null && group.serviceTypes.length > 0,
    );

  return {
    clientId,
    poLs,
  };
}
