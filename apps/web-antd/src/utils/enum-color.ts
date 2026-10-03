/** 枚举子项 `remark` 存的十六进制颜色 */

const HEX_RE =
  /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{8})$/;

function expandHexChannel(value: string) {
  return value.length === 1 ? `${value}${value}` : value;
}

/** 合法色值规范成 `#RRGGBB`；非法返回 undefined */
export function parseHexColor(value?: null | string): string | undefined {
  const raw = value?.trim();
  if (!raw || !HEX_RE.test(raw)) return undefined;
  const body = raw.slice(1);
  if (body.length === 3 || body.length === 4) {
    const [r, g, b] = body;
    return `#${expandHexChannel(r!)}${expandHexChannel(g!)}${expandHexChannel(b!)}`.toLowerCase();
  }
  return `#${body.slice(0, 6)}`.toLowerCase();
}

function hexToRgb(hex: string) {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

function toHexChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, '0');
}

export function getContrastColor(hex: string): '#000000' | '#ffffff' {
  const parsed = parseHexColor(hex);
  if (!parsed) return '#000000';
  const { r, g, b } = hexToRgb(parsed);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128 ? '#000000' : '#ffffff';
}

export function hexToRgba(hex: string, alpha: number): string {
  const parsed = parseHexColor(hex);
  if (!parsed) return `rgba(0, 0, 0, ${alpha})`;
  const { r, g, b } = hexToRgb(parsed);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function darkenHex(hex: string, amount = 0.45): string {
  const parsed = parseHexColor(hex);
  if (!parsed) return '#000000';
  const { r, g, b } = hexToRgb(parsed);
  const mix = (channel: number) => channel * (1 - amount);
  return `#${toHexChannel(mix(r))}${toHexChannel(mix(g))}${toHexChannel(mix(b))}`;
}

export function isLightHex(hex: string): boolean {
  return getContrastColor(hex) === '#000000';
}

/** 列表色块：和枚举里颜色预览一样，用配置实色 */
export function toConfiguredStatusColors(hex: string): {
  background: string;
  color: string;
} {
  const parsed = parseHexColor(hex) ?? '#1677ff';
  return {
    color: getContrastColor(parsed),
    background: parsed,
  };
}

/** 「待」徽标用略深的同色，避免和色块糊成一块 */
export function toConfiguredPendingColors(hex: string): {
  background: string;
  color: string;
} {
  const parsed = parseHexColor(hex) ?? '#1677ff';
  const background = darkenHex(parsed, 0.18);
  return {
    color: getContrastColor(background),
    background,
  };
}
