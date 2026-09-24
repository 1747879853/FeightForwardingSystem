import type {
  PortCodeDto,
  SeFreiPriceOutDto,
} from '#/api/sea-export/freight-rate-admin';

const EMPTY = '-';

function formatPort(port?: PortCodeDto | null): string {
  if (!port) return EMPTY;
  const code = port.portName || port.ediCode || '';
  const cn = port.cnName || '';
  if (code && cn) return `${code}-${cn}`;
  return code || cn || EMPTY;
}

function formatCarrier(row: SeFreiPriceOutDto): string {
  const carrier = row.carrier;
  if (!carrier) return EMPTY;
  return (
    carrier.cnName ||
    carrier.cnShortName ||
    carrier.enName ||
    carrier.code ||
    EMPTY
  );
}

function formatCountry(row: SeFreiPriceOutDto): string {
  const country = row.country || row.pod?.country;
  if (!country) return EMPTY;
  const cn = country.countryName || '';
  const en = country.countryEnName || '';
  if (cn && en) return `${cn}/${en}`;
  return cn || en || country.code || EMPTY;
}

function formatCurrencyLabel(row: SeFreiPriceOutDto): string {
  const currency = row.currency;
  if (!currency) return EMPTY;
  return currency.code || currency.name || EMPTY;
}

/** 展示用币别符号：有 symbol 用 symbol，否则用 code */
function formatCurrencySymbol(row: SeFreiPriceOutDto): string {
  const currency = row.currency;
  if (!currency) return '';
  const symbol = currency.symbol?.trim();
  if (symbol) return symbol;
  return currency.code || '';
}

function formatEtd(row: SeFreiPriceOutDto): string {
  if (row.seFreiPriceDays && row.seFreiPriceDays.length > 0) {
    const dates = row.seFreiPriceDays
      .map((day) => day.etd?.substring(0, 10))
      .filter(Boolean);
    if (dates.length > 0) return dates.join('、');
  }
  if (row.seFreiPriceWeekDays && row.seFreiPriceWeekDays.length > 0) {
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const days = row.seFreiPriceWeekDays
      .map((weekDay) => {
        if (
          weekDay.etdDayOfWeek === undefined ||
          weekDay.etdDayOfWeek === null
        ) {
          return null;
        }
        const dayTime = weekDay.etdDayTime
          ? ` ${weekDay.etdDayTime.substring(0, 5)}`
          : '';
        return `${weekDays[weekDay.etdDayOfWeek]}${dayTime}`;
      })
      .filter(Boolean);
    if (days.length > 0) return days.join('、');
  }
  return EMPTY;
}

function formatPodDet(row: SeFreiPriceOutDto): string {
  if (row.poddet === undefined || row.poddet === null) {
    return EMPTY;
  }
  return String(row.poddet);
}

function formatPriceWithSymbol(
  value: number | null | undefined,
  symbol: string,
): string {
  if (value === undefined || value === null) return EMPTY;
  return symbol ? `${symbol}${value}` : String(value);
}

function formatOceanFreight(row: SeFreiPriceOutDto): string {
  const ctns = row.seFreiPriceCtns ?? [];
  if (ctns.length === 0) return EMPTY;

  const symbol = formatCurrencySymbol(row);
  const parts = ctns.map((ctn) => {
    const name = ctn.ctnCode?.ctnName || `箱型${ctn.ctnCodeId}`;
    const price = formatPriceWithSymbol(ctn.sugPrice, symbol);
    return `${name} 指导价：${price}`;
  });
  return parts.join('  ');
}

/** 附加费取运价备注，不取附加费明细表 */
function formatSurcharge(row: SeFreiPriceOutDto): string {
  const remark = row.remark?.trim();
  return remark || EMPTY;
}

/** 报价字段（弹窗展示 + 复制文案共用） */
export type FreightQuoteField =
  | { type: 'sep' }
  | { type: 'item'; label: string; value: string };

export function buildFreightQuoteFields(
  row: SeFreiPriceOutDto,
): FreightQuoteField[] {
  return [
    { type: 'item', label: '船公司', value: formatCarrier(row) },
    { type: 'item', label: '起运港', value: formatPort(row.pol) },
    { type: 'item', label: '目的港', value: formatPort(row.pod) },
    { type: 'item', label: '国家', value: formatCountry(row) },
    { type: 'item', label: '是否直达', value: row.isDirect ? '是' : '否' },
    { type: 'item', label: '中转港1', value: formatPort(row.poT1) },
    { type: 'item', label: '中转港2', value: formatPort(row.poT2) },
    { type: 'item', label: '开船日期', value: formatEtd(row) },
    { type: 'item', label: '航程', value: row.voyage || EMPTY },
    { type: 'item', label: '目的港免箱期', value: formatPodDet(row) },
    { type: 'sep' },
    { type: 'item', label: '币别', value: formatCurrencyLabel(row) },
    { type: 'item', label: '海运费', value: formatOceanFreight(row) },
    { type: 'item', label: '附加费', value: formatSurcharge(row) },
  ];
}

/** 按运价行拼成默认可复制的报价文案 */
export function buildFreightQuoteText(row: SeFreiPriceOutDto): string {
  return buildFreightQuoteFields(row)
    .map((field) =>
      field.type === 'sep'
        ? '--------------------'
        : `${field.label}：${field.value}`,
    )
    .join('\n');
}
