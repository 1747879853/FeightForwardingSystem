/**
 * Handsontable 单元格轻量绘制：少 innerHTML / 少 createElement，滚动时复用 TD。
 */

const ELLIPSIS_CLASS = 'ht-fee-ellipsis';
const ALIGN_RIGHT_CLASS = 'ht-fee-align-right';
const ALIGN_CENTER_CLASS = 'ht-fee-align-center';
const EMPTY_CLASS = 'ht-fee-cell-empty';
const STATUS_BG_PREFIX = 'ht-fee-status-';
const WARNING_CLASS = 'ht-fee-warning-highlight';
const NEW_ROW_CLASS = 'ht-fee-new-row';

export { ELLIPSIS_CLASS, STATUS_BG_PREFIX, WARNING_CLASS, NEW_ROW_CLASS };

/** 费用状态 → 行底色 class（与 getFeeStatusOptions 色值 + 30 透明一致） */
export function feeStatusBgClass(status: null | number | undefined): string {
  if (status === null || status === undefined || Number.isNaN(Number(status))) {
    return '';
  }
  return `${STATUS_BG_PREFIX}${Number(status)}`;
}

/** 切换状态底色 / 预警高亮 class（不用内联 !important，减轻滚动重绘） */
export function applyHotCellChrome(
  td: HTMLTableCellElement,
  options: {
    warning?: boolean;
    statusValue?: null | number;
  },
) {
  const warning = !!options.warning;
  td.classList.toggle(WARNING_CLASS, warning);

  for (const name of [...td.classList]) {
    if (name.startsWith(STATUS_BG_PREFIX)) {
      td.classList.remove(name);
    }
  }
  // 预警优先：有预警时不挂状态底色 class
  if (!warning) {
    const bg = feeStatusBgClass(options.statusValue);
    if (bg) td.classList.add(bg);
  }

  // 清掉历史内联底色，避免与 class 叠加强制回流
  if (td.style.getPropertyValue('background-color')) {
    td.style.removeProperty('background-color');
  }
}

type EllipsisOptions = {
  placeholder?: string;
  align?: 'center' | 'left' | 'right';
  title?: string;
  /** 额外 class（如 ht-fee-new-row） */
  extraClass?: string;
};

/**
 * 文本/数值格：直接写 textContent + CSS class，避免每帧拆装 span。
 */
export function paintEllipsisCell(
  td: HTMLTableCellElement,
  text: null | number | string | undefined,
  options?: EllipsisOptions,
) {
  const raw = text === null || text === undefined ? '' : String(text);
  const empty = raw === '';
  const display = empty ? (options?.placeholder ?? '') : raw;

  td.classList.add(ELLIPSIS_CLASS);
  td.classList.toggle(ALIGN_RIGHT_CLASS, options?.align === 'right');
  td.classList.toggle(ALIGN_CENTER_CLASS, options?.align === 'center');
  td.classList.toggle(EMPTY_CLASS, empty);
  td.classList.toggle(NEW_ROW_CLASS, options?.extraClass === NEW_ROW_CLASS);

  if (options?.title !== undefined) {
    if (options.title) td.title = options.title;
    else td.removeAttribute('title');
  }

  // 已是纯文本节点时直接改 textContent，避免 innerHTML 解析
  if (td.childElementCount > 0) {
    td.replaceChildren();
  }
  td.textContent = display;
  return td;
}

/** 复选框列：复用已有 input，只改 checked */
export function paintCheckboxCell(td: HTMLTableCellElement, checked: boolean) {
  td.style.textAlign = 'center';
  td.style.verticalAlign = 'middle';
  let checkbox = td.querySelector(
    'input[type="checkbox"]',
  ) as HTMLInputElement | null;
  if (!checkbox) {
    td.replaceChildren();
    checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.style.width = '16px';
    checkbox.style.height = '16px';
    checkbox.style.cursor = 'pointer';
    checkbox.style.pointerEvents = 'none';
    td.appendChild(checkbox);
  }
  checkbox.checked = checked;
  return td;
}

/** 金额两位小数 */
export function formatMoney2(value: any): string {
  if (value === null || value === undefined || value === '') return '';
  const num = Number.parseFloat(value);
  if (Number.isNaN(num)) return '';
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
