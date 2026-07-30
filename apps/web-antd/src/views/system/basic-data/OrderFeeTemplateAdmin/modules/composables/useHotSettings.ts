import { computed, shallowRef } from 'vue';
import Handsontable from 'handsontable';
import type { OrderFeeTemplateAdminApi } from '#/api/sea-export/order-fee-template-admin';

/**
 * 费用模板表格 Handsontable 配置
 */
export function useHotSettings(
  dataSource: any,
  dropdownSources: any,
  linkage: any,
) {
  // 行业类别选项
  const industryOptions = [
    { label: '发货人', value: 'b' },
    { label: '收货人', value: 'e' },
    { label: '通知人', value: 'h' },
    { label: '委托单位', value: 'p' },
  ];

  // 列配置
  const columns = computed(() => [
    {
      data: 'serviceType',
      title: '服务项',
      type: 'numeric',
      width: 80,
      allowEmpty: true,
    },
    {
      data: 'feeCodeId',
      title: '费用代码',
      type: 'autocomplete',
      source: function (query: string, process: (items: string[]) => void) {
        // ✅ 关键修复：每次调用时都动态获取最新的下拉数据
        const allOptions = dropdownSources.feeCodeList.value.map(
          (item: any) => item.label,
        );

        console.log('🔍 [费用代码下拉] 当前选项数量:', allOptions.length);

        if (!query) {
          process(allOptions);
          return;
        }
        const searchLower = query.toLowerCase();
        const filtered = allOptions.filter((option: string) => {
          const optionLower =
            typeof option === 'string' ? option.toLowerCase() : '';
          return optionLower.includes(searchLower);
        });
        process(filtered);
      },
      strict: true,
      allowInvalid: false,
      filteringCaseSensitive: false,
      trimDropdown: false,
      visibleRows: 10,
      width: 150,
      renderer: function (
        this: any,
        instance: any,
        td: HTMLTableCellElement,
        row: number,
        col: number,
        prop: string,
        value: any,
        cellProperties: any,
      ) {
        td.innerHTML = '';

        // ✅ 关键修改：只显示"-"后面的字符串（费用名称）
        let displayName = '';
        if (value && typeof value === 'string') {
          const parts = value.split('-');
          // 如果有"-"，取后面的部分；否则使用原值
          displayName = parts.length > 1 ? parts.slice(1).join('-') : value;
        }

        // ✅ 设置单元格样式和内容
        td.style.position = 'relative';

        // ✅ 添加费用名称文本
        const textSpan = document.createElement('span');
        textSpan.textContent = displayName || '请选择';
        textSpan.style.cssText = `color: ${displayName ? '#262626' : '#999'}; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;`;
        td.appendChild(textSpan);

        return td;
      },
    },
    {
      data: 'industryCategory',
      title: '行业类别',
      type: 'autocomplete',
      source: function (query: string, process: (items: string[]) => void) {
        const allOptions = industryOptions.map((item) => item.label);
        if (!query) {
          process(allOptions);
          return;
        }
        const searchLower = query.toLowerCase();
        const filtered = allOptions.filter((option: string) => {
          const optionLower =
            typeof option === 'string' ? option.toLowerCase() : '';
          return optionLower.includes(searchLower);
        });
        process(filtered);
      },
      strict: true,
      allowInvalid: false,
      filteringCaseSensitive: false,
      trimDropdown: false,
      visibleRows: 10,
      width: 100,
    },
    {
      data: 'settlementId',
      title: '结算对象',
      type: 'dropdown',
      source: [], // 动态更新
      width: 150,
      strict: false,
    },
    {
      data: 'currencyId',
      title: '币别',
      type: 'dropdown',
      source: dropdownSources.currencyList.value.map((item: any) => item.label),
      width: 100,
      strict: true,
    },
    {
      data: 'unitPrice',
      title: '含税单价',
      type: 'numeric',
      numericFormat: {
        pattern: '0.00',
        culture: 'en-US',
      },
      width: 100,
    },
    {
      data: 'noTaxUnitPrice',
      title: '不含税单价',
      type: 'numeric',
      numericFormat: {
        pattern: '0.00',
        culture: 'en-US',
      },
      width: 100,
    },
    {
      data: 'unit',
      title: '单位',
      type: 'text',
      width: 80,
    },
    {
      data: 'taxRate',
      title: '税率(%)',
      type: 'numeric',
      numericFormat: {
        pattern: '0.00',
        culture: 'en-US',
      },
      width: 80,
    },
    {
      data: 'sortId',
      title: '排序',
      type: 'numeric',
      width: 80,
    },
    {
      data: 'remark',
      title: '备注',
      type: 'text',
      width: 150,
    },
  ]);

  // Handsontable 配置
  const hotSettings = shallowRef({
    data: dataSource.value,
    columns: columns.value,
    rowHeaders: true,
    colHeaders: true,
    height: 'auto',
    licenseKey: 'non-commercial-and-evaluation',
    contextMenu: ['row_above', 'row_below', 'remove_row'],
    minSpareRows: 1,
    autoWrapRow: true,
    autoWrapCol: true,

    // 单元格编辑前的回调
    afterBeginEditing(row: number, col: number) {
      const hotInstance = this as any;
      const cellMeta = hotInstance.getCellMeta(row, col);
      const field = cellMeta.data;

      // 如果是结算对象字段，根据行业类别动态更新下拉选项
      if (field === 'settlementId') {
        const industryValue = hotInstance.getDataAtCell(
          row,
          'industryCategory',
        );
        const industryLabel = industryOptions.find(
          (opt) => opt.value === industryValue,
        )?.label;

        if (industryLabel) {
          const settlementList =
            dropdownSources.getSettlementList(industryValue);
          const source = settlementList.map((item: any) => item.label);
          hotInstance.setCellMeta(row, col, 'source', source);
        }
      }
    },

    // 数据变更后的回调
    afterChange(changes: any, source: string) {
      if (!changes || source === 'loadData') return;

      const hotInstance = this as any;

      changes.forEach(([row, prop, oldValue, newValue]: any) => {
        if (!prop) return;

        // 费用代码变更联动
        if (prop === 'feeCodeId') {
          const feeCodeItem = dropdownSources.feeCodeList.value.find(
            (item: any) => item.label === newValue,
          );
          if (feeCodeItem) {
            linkage.onFeeCodeChange(row, feeCodeItem.value, hotInstance);
          }
        }

        // 行业类别变更联动
        if (prop === 'industryCategory') {
          const industryItem = industryOptions.find(
            (item) => item.label === newValue,
          );
          if (industryItem) {
            linkage.onIndustryCategoryChange(
              row,
              industryItem.value,
              hotInstance,
            );
          }
        }

        // 含税单价变更联动
        if (prop === 'unitPrice') {
          const taxRateValue = hotInstance.getDataAtCell(row, 'taxRate');
          if (taxRateValue) {
            linkage.onUnitPriceChange(
              row,
              parseFloat(newValue),
              parseFloat(taxRateValue),
              hotInstance,
            );
          }
        }
      });
    },
  });

  return {
    hotSettings,
    columns,
  };
}
