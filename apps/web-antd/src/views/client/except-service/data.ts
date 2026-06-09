import type { ClientExceptServiceAdminApi } from '#/api/sea-export/client-except-service-admin';
import type { ServiceTypeOption } from '#/views/sea-export-admin/service-type';

import { $t } from '#/locales';
import { buildServiceTypeOptionsFromEnum } from '#/views/sea-export-admin/service-type';

export type SelectOption = ServiceTypeOption;

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

export function isDefaultPolConfig(polId?: number | string | null) {
  return polId === undefined || polId === null || polId === '';
}

export function getPortGroupKey(polId?: number | string | null) {
  return isDefaultPolConfig(polId) ? '__default_pol__' : String(polId);
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
  polId?: number | string | null,
): string {
  if (isDefaultPolConfig(polId)) {
    return $t('system.basicData.seServiceConfig.defaultPolConfig');
  }
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
    const polId = isDefaultPolConfig(group.polId)
      ? null
      : (normalizePolId(group.polId) ?? group.polId);
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
      const isDefault = isDefaultPolConfig(group.polId);
      const polId = isDefault ? null : normalizePolId(group.polId);
      if (!isDefault && !polId) return null;
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
