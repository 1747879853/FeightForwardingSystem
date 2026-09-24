import type { SeFreiPriceOutDto } from '#/api/sea-export/freight-rate-admin';

import { getSeFreiPriceList } from '#/api/sea-export/freight-rate-admin';

import { formatSurchargeFees, useColumns } from '../../data';

const EXPORT_PAGE_SIZE = 200;
const EXPORT_MAX_PAGES = 100;

function formatPortLabel(
  port?: {
    country?: { countryEnName?: string };
    portName?: string;
  } | null,
) {
  if (!port?.portName) return '-';
  const country = String(port.country?.countryEnName ?? '').trim();
  return country ? `${port.portName},${country}` : port.portName;
}

function formatCarrierLabel(row: SeFreiPriceOutDto) {
  const carrier = row.carrier;
  if (!carrier) return '-';
  const name = carrier.cnShortName || carrier.cnName || carrier.enName || '';
  if (carrier.code) {
    return name ? `${carrier.code}(${name})` : carrier.code;
  }
  return name || '-';
}

function formatPodFreeDaysCombined(row: SeFreiPriceOutDto) {
  const parts: string[] = [];
  if (row.poddem != null) parts.push(`DEM:${row.poddem}`);
  if (row.poddet != null) parts.push(`DET:${row.poddet}`);
  if (row.podFreeDays != null) parts.push(`免用箱:${row.podFreeDays}`);
  return parts.length > 0 ? parts.join(' / ') : '-';
}

function resolveExportCellValue(
  field: string,
  row: SeFreiPriceOutDto,
  column: Record<string, any>,
): string {
  if (typeof column.exportMethod === 'function') {
    return String(column.exportMethod({ row }) ?? '');
  }

  switch (field) {
    case 'carrier.enName': {
      return formatCarrierLabel(row);
    }
    case 'pol.portName': {
      return formatPortLabel(row.pol);
    }
    case 'pod.portName': {
      return formatPortLabel(row.pod);
    }
    case 'bookingAgent.name': {
      return (
        row.bookingAgent?.name ||
        (row as SeFreiPriceOutDto & { bookingAgentName?: string })
          .bookingAgentName ||
        '-'
      );
    }
    case 'surchargeFees': {
      return formatSurchargeFees(row);
    }
    case 'isDirect': {
      return row.isDirect ? '直达' : '中转';
    }
    case 'podFreeDaysCombined': {
      return formatPodFreeDaysCombined(row);
    }
    default: {
      break;
    }
  }

  if (typeof column.formatter === 'function') {
    return String(
      column.formatter({
        row,
        cellValue: undefined,
        column,
      }) ?? '',
    );
  }

  const raw = field.includes('.')
    ? field.split('.').reduce<any>((acc, key) => acc?.[key], row)
    : (row as any)[field];
  if (raw === undefined || raw === null || raw === '') return '-';
  return String(raw);
}

/**
 * 按当前筛选条件分页拉全量运价，供 Excel 导出。
 */
export async function fetchAllSeFreiPriceForExport(
  queryParams: Record<string, any>,
): Promise<SeFreiPriceOutDto[]> {
  const all: SeFreiPriceOutDto[] = [];
  let pageIndex = 1;
  let totalCount = Number.POSITIVE_INFINITY;

  while (pageIndex <= EXPORT_MAX_PAGES && all.length < totalCount) {
    const res = await getSeFreiPriceList({
      ...queryParams,
      pageIndex,
      pageSize: EXPORT_PAGE_SIZE,
    });
    const items = res.items || [];
    totalCount =
      Number.isFinite(Number(res.totalCount)) && Number(res.totalCount) >= 0
        ? Number(res.totalCount)
        : items.length;
    all.push(...items);
    if (items.length === 0 || items.length < EXPORT_PAGE_SIZE) break;
    pageIndex += 1;
  }

  return all;
}

/**
 * 将运价列表写成 xlsx 并触发下载。
 */
export async function writeFreightRateExcelFile(
  rows: SeFreiPriceOutDto[],
  fileName?: string,
) {
  const XLSX = await import('xlsx');
  const columns = (useColumns(rows) || []).filter(
    (col) =>
      col &&
      col.type !== 'checkbox' &&
      col.field &&
      String(col.field).trim() !== '',
  );

  const headers = columns.map((col) => String(col!.title || col!.field));
  const fields = columns.map((col) => String(col!.field));

  const wsData: any[][] = [headers];
  for (const row of rows) {
    wsData.push(
      fields.map((field, index) =>
        resolveExportCellValue(
          field,
          row,
          columns[index] as Record<string, any>,
        ),
      ),
    );
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = headers.map((title, index) => {
    let maxWidth = Math.min(40, Math.max(10, String(title).length + 2));
    for (let i = 1; i < wsData.length; i += 1) {
      const cellLength = String(wsData[i]?.[index] ?? '').length;
      if (cellLength > maxWidth && cellLength <= 50) {
        maxWidth = cellLength + 2;
      }
    }
    return { wch: maxWidth };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '运价');

  const stamp =
    new Date().toLocaleDateString('zh-CN').replaceAll('/', '') +
    '_' +
    new Date()
      .toLocaleTimeString('zh-CN', { hour12: false })
      .replaceAll(':', '');
  XLSX.writeFile(wb, fileName || `运价列表_${stamp}.xlsx`);
}
