import { createFieldPermission } from '#/composables/field-permission';
import { freightRateFieldPermission } from '#/composables/field-permission-profiles';
import {
  isAlwaysMasked,
  loadMaskedFields,
} from '#/composables/use-masked-fields';
import { FrightModule } from '#/api/system/permission';
import { computed } from 'vue';

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
        title: '是否直达',
        width: 100,
        type: 'dropdown',
        source: ['是', '否'],

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
        width: 120,
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
        width: 120,
        type: 'date',
        dateFormat: 'YYYY-MM-DD',
        correctFormat: true,
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
        title: '有效起始日期',
        width: 130,
        type: 'date',
        dateFormat: 'YYYY-MM-DD',
        correctFormat: true,
      },
      {
        data: 'validTimeEnd',
        title: '有效截止日期',
        width: 130,
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
          width: 100,
          type: 'numeric',
          numericFormat: {
            pattern: '0',
            culture: 'zh-CN',
          },
          className: 'htRight htCtnCost',
        });
      }

      if (!isAlwaysMasked(ctnModule, 'SugPrice')) {
        columns.push({
          data: sugProp,
          title: `${ctnName}·指导`,
          ctnName,
          ctnPriceRole: 'sug',
          width: 100,
          type: 'numeric',
          numericFormat: {
            pattern: '0',
            culture: 'zh-CN',
          },
          className: 'htRight htCtnSug',
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
