import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';
import type { SeServiceTaskAdminApi } from '#/api/sea-export/se-service-task-admin';

import dayjs from 'dayjs';

import { getEnumItems } from '#/utils/init-enum';

import type { BusinessRow } from '../workbench-data';

export interface SeServiceShowColumn {
  getValue: (row: BusinessRow) => string;
  key: number;
  label: string;
}

type PropValueResolver = (seaExport?: SeaExportAdminApi.SeaExportDto) => string;

function formatText(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '--';
  }
  return String(value);
}

function formatDate(value: unknown): string {
  if (!value) {
    return '--';
  }
  const parsed = dayjs(value as string | Date);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : '--';
}

function formatId(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '--';
  }
  return String(value);
}

const PROP_VALUE_RESOLVERS: Record<number, PropValueResolver> = {
  1: (seaExport) => formatId(seaExport?.carrierId),
  2: (seaExport) => formatId(seaExport?.polId),
  3: (seaExport) => formatId(seaExport?.podId),
  4: (seaExport) => formatText(seaExport?.vessel),
  5: (seaExport) => formatText(seaExport?.innerVoyno),
  6: (seaExport) => formatDate(seaExport?.closingTime),
  7: (seaExport) => formatDate(seaExport?.closeDocTime),
  8: (seaExport) => formatDate(seaExport?.closeVgmTime),
  9: (seaExport) => formatDate(seaExport?.closeManifestTime),
  10: (seaExport) => formatId(seaExport?.bookingAgentId),
  11: (seaExport) => formatId(seaExport?.shipAgentId),
  12: (seaExport) => formatId(seaExport?.yardId),
  13: (seaExport) =>
    formatId(seaExport?.codeIssueTypeId ?? seaExport?.issueType),
  14: (seaExport) => formatText(seaExport?.transportOrder?.mblNum),
  15: (seaExport) => formatText(seaExport?.transportOrder?.bookingNum),
  16: (seaExport) => formatDate(seaExport?.transportOrder?.etd),
  17: (seaExport) => formatId(seaExport?.transportOrder?.clientId),
  1001: (seaExport) =>
    formatText(seaExport?.carrier?.cnShortName || seaExport?.carrier?.cnName),
  1002: (seaExport) => formatText(seaExport?.polName),
  1003: (seaExport) => formatText(seaExport?.podName),
  1010: (seaExport) => formatText(seaExport?.bookingAgent?.name),
  1011: (seaExport) => formatText(seaExport?.shipAgent?.name),
  1012: (seaExport) => formatText(seaExport?.yard?.name),
  1013: (seaExport) => formatText(seaExport?.codeIssueTypeName),
  1017: (seaExport) => formatText(seaExport?.transportOrder?.client?.name),
};

function resolveRowValue(row: BusinessRow, propEnum: number): string {
  const resolver = PROP_VALUE_RESOLVERS[propEnum];
  if (!resolver) {
    return '--';
  }
  return resolver(row.seaExport);
}

export function buildDynamicColumns(
  shows: SeServiceTaskAdminApi.SeServiceShowDto[] | undefined,
  enumLabelMap: Map<number, string>,
): SeServiceShowColumn[] {
  const columns: SeServiceShowColumn[] = [];
  const seen = new Set<number>();

  for (const item of shows ?? []) {
    const propEnum = Number(item.seaExportPropEnum);
    if (Number.isNaN(propEnum) || seen.has(propEnum)) {
      continue;
    }
    if (!PROP_VALUE_RESOLVERS[propEnum]) {
      continue;
    }
    seen.add(propEnum);
    columns.push({
      getValue: (row) => resolveRowValue(row, propEnum),
      key: propEnum,
      label: enumLabelMap.get(propEnum) ?? String(propEnum),
    });
  }

  return columns;
}

export async function loadSeaExportPropLabelMap(): Promise<
  Map<number, string>
> {
  const items = await getEnumItems('SeaExportPropEnum');
  const map = new Map<number, string>();
  for (const item of items ?? []) {
    const value = Number(item.value);
    if (Number.isNaN(value)) {
      continue;
    }
    map.set(value, item.displayName || String(value));
  }
  return map;
}
