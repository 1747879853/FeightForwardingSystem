const SMALL = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
] as const;

const TENS = [
  '',
  '',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',
] as const;

function belowHundred(n: number): string {
  if (n < 20) return SMALL[n] ?? '';
  const ten = Math.floor(n / 10);
  const one = n % 10;
  const tenWord = TENS[ten] ?? '';
  if (one === 0) return tenWord;
  return `${tenWord}-${SMALL[one]}`;
}

function belowThousand(n: number): string {
  if (n < 100) return belowHundred(n);
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  const head = `${SMALL[hundred]} hundred`;
  return rest === 0 ? head : `${head} and ${belowHundred(rest)}`;
}

/** 非负整数转英式英文（hundred 后带 and，21–99 用连字符） */
export function integerToBritishEn(n: number): string {
  if (!Number.isInteger(n) || n < 0) return '';
  if (n === 0) return 'zero';

  const parts: string[] = [];
  let rest = n;

  const billions = Math.floor(rest / 1_000_000_000);
  rest %= 1_000_000_000;
  const millions = Math.floor(rest / 1_000_000);
  rest %= 1_000_000;
  const thousands = Math.floor(rest / 1000);
  rest %= 1000;

  if (billions) parts.push(`${belowThousand(billions)} billion`);
  if (millions) parts.push(`${belowThousand(millions)} million`);
  if (thousands) parts.push(`${belowThousand(thousands)} thousand`);
  if (rest) {
    const last = belowThousand(rest);
    parts.push(parts.length > 0 && rest < 100 ? `and ${last}` : last);
  }

  return parts.join(' ');
}

function normalizePkgs(
  pkgs: null | number | string | undefined,
): null | number {
  if (pkgs === null || pkgs === undefined || pkgs === '') return null;
  const n = typeof pkgs === 'number' ? pkgs : Number(pkgs);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.trunc(n);
}

/**
 * 分单货物区件数大写。
 * 有内容：`SAY:{EN_QTY} {PACKAGE} ONLY.`（SAY: 后无空格）
 * 件数与包装都空：`SAY: ONLY.`
 */
export function formatPkgsSay(
  pkgs?: null | number | string,
  packageName?: null | string,
): string {
  const qty = normalizePkgs(pkgs);
  const words = qty === null ? '' : integerToBritishEn(qty).toUpperCase();
  const pkg = String(packageName ?? '')
    .trim()
    .toUpperCase();
  const middle = [words, pkg].filter(Boolean).join(' ');
  if (!middle) return 'SAY: ONLY.';
  return `SAY:${middle} ONLY.`;
}
