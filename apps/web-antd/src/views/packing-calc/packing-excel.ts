import type { PackingAdminApi } from '#/api/packing/packing-admin';

import type { PackingCargoDraft, PackingDimUnit } from './packing-payload';

import { fromCm, toCm } from './packing-payload';

const TEMPLATE_HEADERS = [
  '行号',
  '品名',
  '长',
  '宽',
  '高',
  '单件毛重kg',
  '件数',
  '允许旋转',
  '分组',
  '可承重',
  '破损置顶',
  '膨胀长',
  '膨胀宽',
  '膨胀高',
] as const;

function parseBool(value: unknown, defaultValue: boolean): boolean {
  if (value === undefined || value === null || value === '')
    return defaultValue;
  const text = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', '是', '真'].includes(text)) return true;
  if (['0', 'false', 'no', 'n', '否', '假'].includes(text)) return false;
  return defaultValue;
}

function parseNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export async function downloadCargoTemplate(unit: PackingDimUnit = 'cm') {
  const XLSX = await import('xlsx');
  const sample = [...TEMPLATE_HEADERS];
  const example = [
    1,
    '纸箱A',
    unit === 'm' ? 0.75 : unit === 'mm' ? 750 : 75,
    unit === 'm' ? 0.65 : unit === 'mm' ? 650 : 65,
    unit === 'm' ? 0.44 : unit === 'mm' ? 440 : 44,
    12,
    10,
    '是',
    '',
    '是',
    '否',
    0,
    0,
    0,
  ];
  const ws = XLSX.utils.aoa_to_sheet([
    sample,
    example,
    ['单位说明', `长宽高当前模板按 ${unit}；导入页可切换单位`],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '货物清单');
  XLSX.writeFile(wb, `装箱试算货物模板_${unit}.xlsx`);
}

export interface CargoImportResult {
  rows: PackingCargoDraft[];
  errors: string[];
}

/** 解析 Excel/CSV 为货物草稿（尺寸按 unit 解释并换算为厘米） */
export async function parseCargoExcelFile(
  file: File,
  unit: PackingDimUnit,
  createKey: () => string,
): Promise<CargoImportResult> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { rows: [], errors: ['文件没有工作表'] };
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return { rows: [], errors: ['工作表为空'] };
  const matrix = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as unknown[][];

  const errors: string[] = [];
  const rows: PackingCargoDraft[] = [];
  let headerOffset = 0;
  if (matrix.length > 0) {
    const head = (matrix[0] ?? []).map((c) => String(c).trim());
    if (head.includes('品名') || head.includes('长')) headerOffset = 1;
  }

  for (let i = headerOffset; i < matrix.length; i++) {
    const cells = matrix[i] ?? [];
    const excelRow = i + 1;
    const name = String(cells[1] ?? '').trim();
    const lengthRaw = parseNumber(cells[2]);
    const widthRaw = parseNumber(cells[3]);
    const heightRaw = parseNumber(cells[4]);
    const weight = parseNumber(cells[5]);
    const quantity = parseNumber(cells[6]);
    const empty =
      !name &&
      lengthRaw === undefined &&
      widthRaw === undefined &&
      heightRaw === undefined &&
      weight === undefined &&
      quantity === undefined;
    if (empty) continue;
    if (
      lengthRaw === undefined ||
      widthRaw === undefined ||
      heightRaw === undefined ||
      weight === undefined ||
      quantity === undefined
    ) {
      errors.push(`第${excelRow}行：长宽高/毛重/件数不完整，已跳过`);
      continue;
    }
    rows.push({
      key: createKey(),
      lineNo: parseNumber(cells[0]),
      name,
      length: toCm(lengthRaw, unit),
      width: toCm(widthRaw, unit),
      height: toCm(heightRaw, unit),
      weight,
      quantity: Math.trunc(quantity),
      allowRotate: parseBool(cells[7], true),
      groupKey: String(cells[8] ?? '').trim() || undefined,
      supportLoad: parseBool(cells[9], true),
      damaged: parseBool(cells[10], false),
      expandLength: parseNumber(cells[11]) ?? 0,
      expandWidth: parseNumber(cells[12]) ?? 0,
      expandHeight: parseNumber(cells[13]) ?? 0,
    });
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push('未解析到有效货物行');
  }
  return { rows, errors };
}

/** 导出当前柜装载顺序 */
export async function exportLoadOrderExcel(
  result: PackingAdminApi.PackingCalculateResult,
  containerIndex: number,
  unit: PackingDimUnit = 'cm',
) {
  const XLSX = await import('xlsx');
  const box = result.containers[containerIndex];
  if (!box) return;
  const headers = [
    '柜序号',
    '装载顺序',
    '行号',
    '品名',
    '件序号',
    `X起点(${unit})`,
    `Y离地(${unit})`,
    `Z起点(${unit})`,
    `摆放长(${unit})`,
    `摆放宽(${unit})`,
    `摆放高(${unit})`,
    '毛重kg',
  ];
  const data: (string | number)[][] = [headers];
  for (const p of box.placements ?? []) {
    data.push([
      box.index,
      p.loadOrder,
      p.lineNo,
      p.name ?? '',
      p.pieceIndex,
      fromCm(p.x, unit),
      fromCm(p.y, unit),
      fromCm(p.z, unit),
      fromCm(p.length, unit),
      fromCm(p.width, unit),
      fromCm(p.height, unit),
      p.weight,
    ]);
  }
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `柜${box.index}`);
  XLSX.writeFile(wb, `装箱装载顺序_柜${box.index}.xlsx`);
}

/** 导出简易指导书（多柜汇总 + 各柜顺序） */
export async function exportPackingGuideExcel(
  result: PackingAdminApi.PackingCalculateResult,
  presetLabel?: string,
) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const summary = [
    ['装箱指导书'],
    ['柜型', presetLabel || '自定义'],
    ['柜内径cm', `${result.length}×${result.width}×${result.height}`],
    ['限重kg', result.limitWeight],
    ['开柜数', result.containerCount],
    ['已装/未装', `${result.placedQuantity}/${result.unplacedQuantity}`],
    ['已装体积m³', result.placedVolume],
    ['已装毛重kg', result.placedWeight],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), '汇总');

  for (const box of result.containers ?? []) {
    const rows: (string | number)[][] = [
      [
        '装载顺序',
        '行号',
        '品名',
        '件序号',
        'X',
        'Y',
        'Z',
        '长',
        '宽',
        '高',
        '毛重',
      ],
    ];
    for (const p of box.placements ?? []) {
      rows.push([
        p.loadOrder,
        p.lineNo,
        p.name ?? '',
        p.pieceIndex,
        p.x,
        p.y,
        p.z,
        p.length,
        p.width,
        p.height,
        p.weight,
      ]);
    }
    rows.push([]);
    rows.push(['容积率%', box.volumeRate]);
    rows.push(['载重率%', box.weightRate]);
    rows.push(['柜长重心偏移cm', box.gravityOffsetLength]);
    rows.push(['柜宽重心偏移cm', box.gravityOffsetWidth]);
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(rows),
      `柜${box.index}`.slice(0, 31),
    );
  }

  if (result.unplacedCargos?.length) {
    const unplaced: (string | number)[][] = [['行号', '品名', '件数', '原因']];
    for (const u of result.unplacedCargos) {
      unplaced.push([u.lineNo, u.name ?? '', u.quantity, u.reason]);
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(unplaced), '未装');
  }

  XLSX.writeFile(wb, `装箱指导书_${Date.now()}.xlsx`);
}
