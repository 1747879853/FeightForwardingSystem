import { createFieldPermission } from '#/composables/field-permission';
import { freightRateFieldPermission } from '#/composables/field-permission-profiles';
import {
  isAlwaysMasked,
  loadMaskedFields,
} from '#/composables/use-masked-fields';
import { FrightModule } from '#/api/system/permission';
import Handsontable from 'handsontable';
import { computed } from 'vue';

/** 有效日期 / 截止日期：列配置中绑定成对，避免拆开 */
export const VALID_TIME_COLUMN_PAIR = [
  'validTimeStart',
  'validTimeEnd',
] as const;

function formatPriceDelta(delta: number): string {
  const abs = Math.abs(delta);
  const text = Number.isInteger(abs) ? String(abs) : abs.toFixed(2);
  return delta > 0 ? `↑${text}` : `↓${text}`;
}

/** 箱型价：最多约 5 位数字 + 涨跌徽标，不加千分位 */
function createCtnPriceRenderer(role: 'cost' | 'sug') {
  return function ctnPriceRenderer(
    this: any,
    instance: Handsontable.Core,
    td: HTMLTableCellElement,
    row: number,
    _col: number,
    _prop: string | number,
    value: any,
    cellProperties: Handsontable.CellProperties,
  ) {
    Handsontable.renderers.NumericRenderer.apply(this, [
      instance,
      td,
      row,
      _col,
      _prop,
      value,
      cellProperties,
    ] as any);

    td.querySelectorAll('.ht-price-delta').forEach((el) => el.remove());

    const ctnName = (cellProperties as any).ctnName as string | undefined;
    if (!ctnName) return;

    const rowData = instance.getSourceDataAtRow(row) as Record<
      string,
      any
    > | null;
    const change = rowData?._priceChange?.[ctnName];
    const delta = role === 'cost' ? change?.costDelta : change?.sugDelta;
    if (delta === undefined || delta === 0) return;

    const badge = document.createElement('span');
    badge.className = `ht-price-delta ${
      delta > 0 ? 'ht-price-delta--up' : 'ht-price-delta--down'
    }`;
    badge.textContent = formatPriceDelta(delta);
    badge.title =
      role === 'cost'
        ? `成本较上期 ${formatPriceDelta(delta)}`
        : `指导价较上期 ${formatPriceDelta(delta)}`;
    td.classList.add('ht-ctn-price--delta');
    td.appendChild(badge);
  };
}

/** 直达列：是=绿、否=红 */
function isDirectRenderer(
  this: any,
  instance: Handsontable.Core,
  td: HTMLTableCellElement,
  row: number,
  col: number,
  prop: string | number,
  value: any,
  cellProperties: Handsontable.CellProperties,
) {
  const baseRenderer =
    Handsontable.renderers.getRenderer('dropdown') ||
    Handsontable.renderers.AutocompleteRenderer ||
    Handsontable.renderers.TextRenderer;
  baseRenderer.call(this, instance, td, row, col, prop, value, cellProperties);

  td.classList.remove('ht-is-direct--yes', 'ht-is-direct--no');
  if (value === '是' || value === true) {
    td.classList.add('ht-is-direct--yes');
  } else if (value === '否' || value === false) {
    td.classList.add('ht-is-direct--no');
  }
}

/**
 * 批量新增运价 - Handsontable 列配置 Composable
 */
export function useBatchAddColumns(
  addedCtnTypes: any,
  dropdownSources: any,
  dataSource: any,
  selectedRowKeys: any,
  sortableFieldsSet: Set<string>,
  sortState: any,
  getSortIcon: (field: string) => string,
  currentOptionsCache: any,
  dropdownSourceCache: any,
  labelToIdMap: any,
  getColumnIndex: (field: string) => number,
  handleOpenDropdown: (
    rowIndex: number,
    colIndex: number,
    field: string,
    source: string[],
  ) => void,
  linkage: any,
  /** 港口远程搜索 source；不传则回退到全量 ports（不推荐） */
  portSource?: (query: string, process: (items: string[]) => void) => void,
  /** 船公司远程搜索 source */
  carrierSource?: (query: string, process: (items: string[]) => void) => void,
  /** 订舱代理远程搜索 source */
  bookingAgentSource?: (
    query: string,
    process: (items: string[]) => void,
  ) => void,
) {
  /**
   * 构建动态列配置
   */
  void loadMaskedFields();
  const fieldPermission = createFieldPermission(freightRateFieldPermission);
  const hotColumns = computed(() => {
    const columns: any[] = [
      // {
      //   data: '_checkbox',
      //   type: 'checkbox',
      //   width: 50,
      //   className: 'htCenter',
      // },
      {
        data: 'carrierId',
        title: '船公司',
        width: 180,
        type: 'autocomplete',
        strict: false,
        allowInvalid: true,
        filter: false,
        sortByRelevance: true,
        filteringCaseSensitive: false,
        trimDropdown: false,
        visibleRows: 10,
        source:
          carrierSource ||
          ((query: string, process: (items: string[]) => void) => {
            const carriers = dropdownSourceCache.value.carriers || [];
            const keyword = (query ?? '').toString().trim().toLowerCase();
            process(
              keyword
                ? carriers.filter((p: string) =>
                    p.toLowerCase().includes(keyword),
                  )
                : carriers,
            );
          }),
      },
      {
        data: 'polId',
        title: '起运港',
        width: 200,
        type: 'autocomplete',
        strict: false,
        allowInvalid: true,
        // 远程分页：关掉本地二次过滤/重排，保留接口顺序，便于滚动加载
        filter: false,
        sortByRelevance: true,
        filteringCaseSensitive: false,
        trimDropdown: false,
        visibleRows: 10,
        source:
          portSource ||
          ((query: string, process: (items: string[]) => void) => {
            const ports = dropdownSourceCache.value.ports || [];
            const keyword = (query ?? '').toString().trim().toLowerCase();
            process(
              keyword
                ? ports.filter((p: string) => p.toLowerCase().includes(keyword))
                : ports,
            );
          }),
      },
      {
        data: 'podId',
        title: '目的港',
        width: 200,
        type: 'autocomplete',
        strict: false,
        allowInvalid: true,
        filter: false,
        sortByRelevance: true,
        filteringCaseSensitive: false,
        trimDropdown: false,
        visibleRows: 10,
        source:
          portSource ||
          ((query: string, process: (items: string[]) => void) => {
            const ports = dropdownSourceCache.value.ports || [];
            const keyword = (query ?? '').toString().trim().toLowerCase();
            process(
              keyword
                ? ports.filter((p: string) => p.toLowerCase().includes(keyword))
                : ports,
            );
          }),
      },
      {
        data: 'currencyId',
        title: '币别',
        width: 100,
        type: 'autocomplete',
        strict: false,
        allowInvalid: true,
        visibleRows: 10,
        source: dropdownSourceCache.value.currencies || [],
      },
      {
        data: 'bookingAgentId',
        title: '订舱代理',
        width: 200,
        type: 'autocomplete',
        strict: false,
        allowInvalid: true,
        filter: false,
        sortByRelevance: true,
        filteringCaseSensitive: false,
        trimDropdown: false,
        visibleRows: 10,
        source:
          bookingAgentSource ||
          ((query: string, process: (items: string[]) => void) => {
            const clients = dropdownSourceCache.value.clients || [];
            const keyword = (query ?? '').toString().trim().toLowerCase();
            process(
              keyword
                ? clients.filter((p: string) =>
                    p.toLowerCase().includes(keyword),
                  )
                : clients,
            );
          }),
      },
      {
        data: 'isDirect',
        title: '直达',
        width: 72,
        type: 'dropdown',
        source: ['是', '否'],
        className: 'htCenter',
        renderer: isDirectRenderer,

        afterChange: function (this: any, changes: any, source: string) {
          if (source === 'edit' && changes) {
            changes.forEach(([row, prop, oldValue, newValue]: any) => {
              if (prop === 'isDirect') {
                const hotInstance = this;

                // ⚠️ 关键修复：将用户选择的"是"/"否"转换为布尔值
                let booleanValue: boolean | undefined;
                if (newValue === '是') {
                  booleanValue = true;
                } else if (newValue === '否') {
                  booleanValue = false;
                } else {
                  booleanValue = undefined;
                }

                // 更新单元格值为布尔值
                //hotInstance.setDataAtCell(row, getColumnIndex('isDirect'), booleanValue);

                // 如果设置为直达（true），清空中转港
                if (booleanValue === true) {
                  hotInstance.setDataAtCell(
                    row,
                    getColumnIndex('poT1Id'),
                    undefined,
                  );
                  hotInstance.setDataAtCell(
                    row,
                    getColumnIndex('poT2Id'),
                    undefined,
                  );
                }
              }
            });
          }
        },
      },
      {
        data: 'poT1Id',
        title: '中转港1',
        width: 200,
        type: 'autocomplete',
        strict: false,
        allowInvalid: true,
        filter: false,
        sortByRelevance: true,
        filteringCaseSensitive: false,
        trimDropdown: false,
        visibleRows: 10,
        source:
          portSource ||
          ((query: string, process: (items: string[]) => void) => {
            const ports = dropdownSourceCache.value.ports || [];
            const keyword = (query ?? '').toString().trim().toLowerCase();
            process(
              keyword
                ? ports.filter((p: string) => p.toLowerCase().includes(keyword))
                : ports,
            );
          }),
      },
      {
        data: 'poT2Id',
        title: '中转港2',
        width: 200,
        type: 'autocomplete',
        strict: false,
        allowInvalid: true,
        filter: false,
        sortByRelevance: true,
        filteringCaseSensitive: false,
        trimDropdown: false,
        visibleRows: 10,
        source:
          portSource ||
          ((query: string, process: (items: string[]) => void) => {
            const ports = dropdownSourceCache.value.ports || [];
            const keyword = (query ?? '').toString().trim().toLowerCase();
            process(
              keyword
                ? ports.filter((p: string) => p.toLowerCase().includes(keyword))
                : ports,
            );
          }),
      },
      {
        data: 'polFreeDays',
        title: '起运港免用箱',
        width: 120,
        type: 'numeric',
        numericFormat: {
          pattern: '0',
          culture: 'zh-CN',
        },
        className: 'htRight',
      },
      {
        data: 'poddem',
        title: 'DEM',
        width: 80,
        type: 'numeric',
        numericFormat: {
          pattern: '0',
          culture: 'zh-CN',
        },
        className: 'htRight',
      },
      {
        data: 'podFreeDays',
        title: 'DET',
        width: 80,
        type: 'numeric',
        numericFormat: {
          pattern: '0',
          culture: 'zh-CN',
        },
        className: 'htRight',
      },
      {
        data: 'poddet',
        title: '免箱使期',
        width: 100,
        type: 'numeric',
        numericFormat: {
          pattern: '0',
          culture: 'zh-CN',
        },
        className: 'htRight',
        // DEM / DET / 免箱使期相互独立，可分别录入
      },
      {
        data: 'voyage',
        title: '航程',
        width: 80,
        type: 'text',
      },
      {
        data: 'vesselVoyage',
        title: '船名航次',
        width: 140,
        type: 'text',
      },
      {
        data: 'contractNo',
        title: '约号',
        width: 150,
        type: 'text',
      },
      {
        data: 'etd',
        title: '开船日期',
        width: 110,
        type: 'date',
        dateFormat: 'YYYY-MM-DD',
        correctFormat: true,
        defaultDate: undefined,
      },
      {
        data: 'etdDayOfWeek',
        title: '开船星期',
        width: 100,
        type: 'dropdown',
        source: [
          '星期一',
          '星期二',
          '星期三',
          '星期四',
          '星期五',
          '星期六',
          '星期日',
        ],
      },
      {
        data: 'closeDocTime',
        title: '截单时间',
        width: 150,
        type: 'date',
        dateFormat: 'YYYY-MM-DD HH:mm',
        correctFormat: true,
      },
      {
        data: 'closeDocDayOfWeek',
        title: '截单星期',
        width: 100,
        type: 'dropdown',
        source: [
          '星期一',
          '星期二',
          '星期三',
          '星期四',
          '星期五',
          '星期六',
          '星期日',
        ],
      },
      {
        data: 'closeDocDayTime',
        title: '截单时间点',
        width: 120,
        type: 'time',
        timeFormat: 'HH:mm',
        correctFormat: true,
      },
      {
        data: 'closingTime',
        title: '截关时间',
        width: 150,
        type: 'date',
        dateFormat: 'YYYY-MM-DD HH:mm',
        correctFormat: true,
      },
      {
        data: 'closingDayOfWeek',
        title: '截关星期',
        width: 100,
        type: 'dropdown',
        source: [
          '星期一',
          '星期二',
          '星期三',
          '星期四',
          '星期五',
          '星期六',
          '星期日',
        ],
      },
      {
        data: 'closingDayTime',
        title: '截关时间点',
        width: 120,
        type: 'time',
        timeFormat: 'HH:mm',
        correctFormat: true,
      },
      {
        data: 'validTimeStart',
        title: '有效日期',
        width: 110,
        type: 'date',
        dateFormat: 'YYYY-MM-DD',
        correctFormat: true,
      },
      {
        data: 'validTimeEnd',
        title: '截止日期',
        width: 110,
        type: 'date',
        dateFormat: 'YYYY-MM-DD',
        correctFormat: true,
      },
      {
        data: 'remark',
        title: '备注',
        width: 300,
        type: 'text',
      },
    ];

    // 箱型：成本 / 指导两列可各自编辑；表头用 nestedHeaders 合并为箱型名
    const ctnModule = FrightModule.SeFreiPriceCtn;
    addedCtnTypes.value.forEach((ctn: any) => {
      const ctnId = String(ctn.ctnCodeId);
      const costProp = `ctn_${ctnId}`;
      const sugProp = `ctnSug_${ctnId}`;
      const ctnName = ctn.ctnName;

      if (!isAlwaysMasked(ctnModule, 'Cost')) {
        columns.push({
          data: costProp,
          // 列配置弹窗区分成本/指导；表格表头由 nestedHeaders 合并为箱型名
          title: `${ctnName}·成本`,
          ctnName,
          ctnPriceRole: 'cost',
          // 约 5 位数字 + 涨跌徽标，不加千分位
          width: 78,
          type: 'numeric',
          numericFormat: {
            pattern: '0',
          },
          className: 'htRight htCtnCost',
          renderer: createCtnPriceRenderer('cost'),
        });
      }

      if (!isAlwaysMasked(ctnModule, 'SugPrice')) {
        columns.push({
          data: sugProp,
          title: `${ctnName}·指导`,
          ctnName,
          ctnPriceRole: 'sug',
          width: 78,
          type: 'numeric',
          numericFormat: {
            pattern: '0',
          },
          className: 'htRight htCtnSug',
          renderer: createCtnPriceRenderer('sug'),
        });
      }
    });

    return columns.filter((column) => {
      const data = String(column.data ?? '');
      if (data.startsWith('ctnSug_') || data.startsWith('ctn_')) return true;
      return !fieldPermission.always(data);
    });
  });

  /** 成本+指导价相邻时合并表头为箱型名称 */
  const nestedHeaders = computed(() => buildCtnNestedHeaders(hotColumns.value));

  return {
    hotColumns,
    nestedHeaders,
    buildCtnNestedHeaders,
  };
}

/**
 * 保证「有效日期 / 截止日期」相邻且同显隐、同固定（列配置不可拆开）。
 */
export function ensureValidTimeAdjacent(cols: any[]): any[] {
  if (!cols?.length) return cols;

  const startIdx = cols.findIndex((c) => c?.data === 'validTimeStart');
  const endIdx = cols.findIndex((c) => c?.data === 'validTimeEnd');
  if (startIdx < 0 || endIdx < 0) return cols;

  const start = cols[startIdx];
  const end = cols[endIdx];
  const without = cols.filter(
    (c) => c?.data !== 'validTimeStart' && c?.data !== 'validTimeEnd',
  );
  const insertAt = Math.min(startIdx, endIdx);
  without.splice(insertAt, 0, start, end);
  return without;
}

/** 列配置保存前：有效日期对同 visible / fixed，且截止日期紧跟有效日期 */
export function normalizeValidTimePairConfig<
  T extends {
    data: string;
    visible?: boolean;
    fixed?: 'left' | 'right' | false;
    order?: number;
  },
>(columns: T[]): T[] {
  const start = columns.find((c) => c.data === 'validTimeStart');
  const end = columns.find((c) => c.data === 'validTimeEnd');
  if (!start || !end) return columns;

  end.visible = start.visible;
  end.fixed = start.fixed;

  const rest = columns.filter(
    (c) => c.data !== 'validTimeStart' && c.data !== 'validTimeEnd',
  );
  const ordered = [...columns].sort(
    (a, b) => (a.order ?? 999) - (b.order ?? 999),
  );
  const startOrder = ordered.findIndex((c) => c.data === 'validTimeStart');
  const endOrder = ordered.findIndex((c) => c.data === 'validTimeEnd');
  const insertAt = Math.min(
    startOrder >= 0 ? startOrder : 0,
    endOrder >= 0 ? endOrder : 0,
  );

  const result: T[] = [];
  let inserted = false;
  let cursor = 0;
  for (const col of rest) {
    if (!inserted && cursor === insertAt) {
      result.push(start, end);
      inserted = true;
    }
    result.push(col);
    cursor += 1;
  }
  if (!inserted) result.push(start, end);

  result.forEach((col, index) => {
    col.order = index;
  });
  return result;
}

/**
 * 保证同一箱型的「成本 / 指导」列相邻（指导紧跟成本）。
 * 列配置持久化若只含旧的成本列 order，补登记的 ctnSug_* 会与后续成本列抢序，
 * 导致仅第一对能合并表头；此处在渲染前纠偏。
 */
export function ensureCtnCostSugAdjacent(cols: any[]): any[] {
  if (!cols?.length) return cols;

  const sugById = new Map<string, any>();
  for (const col of cols) {
    const data = String(col?.data ?? '');
    if (data.startsWith('ctnSug_')) {
      sugById.set(data.slice('ctnSug_'.length), col);
    }
  }

  const result: any[] = [];
  const placedSug = new Set<any>();

  for (const col of cols) {
    const data = String(col?.data ?? '');
    if (data.startsWith('ctnSug_')) {
      continue;
    }
    result.push(col);
    if (data.startsWith('ctn_')) {
      const sug = sugById.get(data.slice(4));
      if (sug) {
        result.push(sug);
        placedSug.add(sug);
      }
    }
  }

  for (const col of cols) {
    const data = String(col?.data ?? '');
    if (data.startsWith('ctnSug_') && !placedSug.has(col)) {
      result.push(col);
    }
  }

  return result;
}

/** 按列顺序生成 Handsontable nestedHeaders（成本+指导相邻则 colspan=2） */
export function buildCtnNestedHeaders(cols: any[]) {
  const row: Array<string | { label: string; colspan: number }> = [];
  let i = 0;
  while (i < cols.length) {
    const col = cols[i] as any;
    const data = String(col?.data ?? '');
    const ctnName = col?.ctnName as string | undefined;

    if (data.startsWith('ctn_') && !data.startsWith('ctnSug_') && ctnName) {
      const ctnId = data.slice(4);
      const next = cols[i + 1] as any;
      if (String(next?.data ?? '') === `ctnSug_${ctnId}`) {
        row.push({ label: ctnName, colspan: 2 });
        i += 2;
        continue;
      }
      row.push(ctnName);
      i += 1;
      continue;
    }

    if (data.startsWith('ctnSug_') && ctnName) {
      row.push(ctnName);
      i += 1;
      continue;
    }

    const title =
      typeof col?.title === 'function' ? col.title() : (col?.title ?? '');
    row.push(String(title));
    i += 1;
  }
  return [row];
}
