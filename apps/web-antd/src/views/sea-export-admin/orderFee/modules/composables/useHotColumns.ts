import { computed, type Ref } from 'vue';
import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';
import { useOrderFeeColumns } from '../../data';
import {
  getInvoiceStatusLabel,
  getFeeStatusLabel,
  getDataEntryMethodLabel,
  formatDateTime,
} from '../utils/helpers';

/**
 * Handsontable 列配置生成器
 */
export function useHotColumns(
  props: { type: number },
  dropdownSources: any,
  dataSource: Ref<any[]> | any[],
  selectedRowKeys: (string | number)[] | Ref<(string | number)[]>,
  sortableFieldsSet: any,
  sortState: any,
  getSortIcon: (field: string) => string,
  currentOptionsCache: any,
) {
  const hotColumns = computed(() => {
    const vxeColumns = useOrderFeeColumns(props.type);

    if (!vxeColumns || !Array.isArray(vxeColumns)) {
      return [];
    }

    // 解构 Ref 获取实际值
    const actualDataSource = Array.isArray(dataSource)
      ? dataSource
      : dataSource.value;
    const actualSelectedRowKeys = Array.isArray(selectedRowKeys)
      ? selectedRowKeys
      : selectedRowKeys.value;

    // ✅ 新增:在第一列添加复选框列
    const checkboxColumn: any = {
      data: '_isSelected',
      title: '',
      width: 50,
      type: 'text',
      className: 'htCenter htMiddle',
      readOnly: true,
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
        // ✅ 关键修复：在渲染器执行时动态获取最新的 selectedRowKeys，确保响应式更新
        const currentDataSource = Array.isArray(dataSource)
          ? dataSource
          : dataSource.value;
        const currentSelectedRowKeys = Array.isArray(selectedRowKeys)
          ? selectedRowKeys
          : selectedRowKeys.value;

        const rowData = currentDataSource[row];
        const rowKey = (rowData as any)?._rowKey;
        const isSelected = rowKey && currentSelectedRowKeys.includes(rowKey);

        td.innerHTML = '';
        td.style.textAlign = 'center';
        td.style.verticalAlign = 'middle';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = !!isSelected;
        checkbox.style.width = '16px';
        checkbox.style.height = '16px';
        checkbox.style.cursor = 'pointer';
        checkbox.style.pointerEvents = 'none';

        td.appendChild(checkbox);
        return td;
      },
    };

    // ✅ 新增:在第二列添加序号+开票状态合并列
    const indexColumn: any = {
      data: null,
      title: '开票状态',
      width: 120,
      type: 'text',
      className: 'htCenter htMiddle',
      readOnly: true,
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
        // ✅ 在 renderer 执行时动态获取 dataSource，确保数据是最新的
        const currentDataSource = Array.isArray(dataSource)
          ? dataSource
          : dataSource.value;
        const rowData = currentDataSource[row];

        if (!rowData) {
          td.innerHTML = `<div style="display: flex; align-items: center; justify-content: center;">
            <span style="color: #262626; font-size: 13px;">${row + 1}</span>
          </div>`;
          return td;
        }

        const invoiceStatus = (rowData as any)?.invoiceStatus;
        const statusLabel = getInvoiceStatusLabel(invoiceStatus);

        let statusColor = '#262626';
        if (invoiceStatus === 1) {
          statusColor = '#faad14';
        } else if (invoiceStatus === 2) {
          statusColor = '#52c41a';
        }

        td.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
          <span style="color: #262626; font-size: 13px;">${row + 1}</span>
          <span style="color: ${statusColor}; font-weight: bold; font-size: 12px;">${statusLabel || ''}</span>
        </div>`;
        return td;
      },
    };

    const columns = [checkboxColumn, indexColumn];

    const mappedColumns = vxeColumns
      .filter((col) => col.field !== 'invoiceStatus')
      .map((col) => {
        const hotCol: any = {
          data: col.field,
          title: col.title,
          width: col.width || col.minWidth || 100,
        };

        if (col.field === 'feeCodeId') {
          hotCol.type = 'autocomplete';
          hotCol.source = function (
            query: string,
            process: (items: string[]) => void,
          ) {
            const allOptions = dropdownSources.value.feeCodeList.map(
              (item: any) => item.label,
            );
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
          };
          hotCol.strict = true;
          hotCol.allowInvalid = false;
          hotCol.filteringCaseSensitive = false;
          hotCol.trimDropdown = false;
          hotCol.visibleRows = 10;
          hotCol.renderer = function (
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
            const label = value || '';
            td.innerHTML = `<span style="color: ${label ? '#262626' : '#999'}; cursor: pointer;">${label || '请选择'}</span>`;
            return td;
          };
        } else if (col.field === 'industryCategory') {
          hotCol.type = 'autocomplete';
          hotCol.source = function (
            query: string,
            process: (items: string[]) => void,
          ) {
            const allOptions = dropdownSources.value.industryCategoryList.map(
              (item: any) => item.label,
            );
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
          };
          hotCol.strict = true;
          hotCol.allowInvalid = false;
          hotCol.filteringCaseSensitive = false;
          hotCol.trimDropdown = false;
          hotCol.visibleRows = 10;
          hotCol.renderer = function (
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
            const label = value || '';
            td.innerHTML = `<span style="color: ${label ? '#262626' : '#999'}; cursor: pointer;">${label || '请选择'}</span>`;
            return td;
          };
        } else if (col.field === 'settlementId') {
          hotCol.type = 'autocomplete';
          hotCol.strict = true;
          hotCol.allowInvalid = false;
          hotCol.filteringCaseSensitive = false;
          hotCol.trimDropdown = false;
          hotCol.visibleRows = 10;
          hotCol.renderer = function (
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
            const label = value || '';
            td.innerHTML = `<span style="color: ${label ? '#262626' : '#999'}; cursor: pointer;">${label || '请选择'}</span>`;
            return td;
          };
        } else if (col.field === 'currencyId') {
          hotCol.type = 'autocomplete';
          hotCol.source = function (
            query: string,
            process: (items: string[]) => void,
          ) {
            const allOptions = dropdownSources.value.currencyList.map(
              (item: any) => item.label,
            );
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
          };
          hotCol.strict = true;
          hotCol.allowInvalid = false;
          hotCol.filteringCaseSensitive = false;
          hotCol.trimDropdown = false;
          hotCol.visibleRows = 10;
          hotCol.renderer = function (
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
            const label = value || '';
            td.innerHTML = `<span style="color: ${label ? '#262626' : '#999'}; cursor: pointer;">${label || '请选择'}</span>`;
            return td;
          };
        } else if (col.field === 'unit') {
          hotCol.type = 'autocomplete';
          hotCol.source = [];
          hotCol.strict = true;
          hotCol.allowInvalid = false;
          hotCol.filteringCaseSensitive = false;
          hotCol.trimDropdown = false;
          hotCol.visibleRows = 10;
          hotCol.renderer = function (
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
            const label = value || '';
            td.innerHTML = `<span style="color: ${label ? '#262626' : '#999'}; cursor: pointer;">${label || '请选择'}</span>`;
            return td;
          };
        } else if (col.field === 'unitPrice') {
          hotCol.type = 'numeric';
          hotCol.format = '0,0.00';
          hotCol.allowInvalid = false;
          hotCol.renderer = function (
            this: any,
            instance: any,
            td: HTMLTableCellElement,
            row: number,
            col: number,
            prop: string,
            value: any,
            cellProperties: any,
          ) {
            // ✅ 关键修复：先清空单元格内容，防止与编辑器残留内容重叠
            td.innerHTML = '';
            const label = value || '';
            td.innerHTML = `<span style="color: ${label ? '#262626' : '#999'}; cursor: pointer;">${label || '0.00'}</span>`;
            return td;
          };
        } else if (col.field === 'quantity') {
          hotCol.type = 'numeric';
          hotCol.format = '0,0';
          hotCol.allowInvalid = false;
          hotCol.renderer = function (
            this: any,
            instance: any,
            td: HTMLTableCellElement,
            row: number,
            col: number,
            prop: string,
            value: any,
            cellProperties: any,
          ) {
            // ✅ 关键修复：先清空单元格内容，防止与编辑器残留内容重叠
            td.innerHTML = '';
            const label = value || '';
            td.innerHTML = `<span style="color: ${label ? '#262626' : '#999'}; cursor: pointer;">${label || '0'}</span>`;
            return td;
          };
        } else if (col.field === 'amount') {
          hotCol.type = 'numeric';
          hotCol.format = '0,0.00';
          hotCol.allowInvalid = false;
          hotCol.renderer = function (
            this: any,
            instance: any,
            td: HTMLTableCellElement,
            row: number,
            col: number,
            prop: string,
            value: any,
            cellProperties: any,
          ) {
            // ✅ 关键修复：先清空单元格内容，防止与编辑器残留内容重叠
            td.innerHTML = '';
            const label = value || '';
            td.innerHTML = `<span style="color: ${label ? '#262626' : '#999'}; cursor: pointer;">${label || '0.00'}</span>`;
            return td;
          };
        } else if (col.field === 'taxRate') {
          hotCol.type = 'numeric';
          hotCol.format = '0.00%';
          hotCol.allowInvalid = false;
          hotCol.renderer = function (
            this: any,
            instance: any,
            td: HTMLTableCellElement,
            row: number,
            col: number,
            prop: string,
            value: any,
            cellProperties: any,
          ) {
            // ✅ 关键修复：先清空单元格内容，防止与编辑器残留内容重叠
            td.innerHTML = '';
            const label = value || '';
            td.innerHTML = `<span style="color: ${label ? '#262626' : '#999'}; cursor: pointer;">${label || '0.00%'}</span>`;
            return td;
          };
        } else if (col.field === 'taxAmount') {
          hotCol.type = 'numeric';
          hotCol.format = '0,0.00';
          hotCol.allowInvalid = false;
          hotCol.renderer = function (
            this: any,
            instance: any,
            td: HTMLTableCellElement,
            row: number,
            col: number,
            prop: string,
            value: any,
            cellProperties: any,
          ) {
            const label = value || '';
            td.innerHTML = `<span style="color: ${label ? '#262626' : '#999'}; cursor: pointer;">${label || '0.00'}</span>`;
            return td;
          };
        } else if (col.field === 'totalAmount') {
          hotCol.type = 'numeric';
          hotCol.format = '0,0.00';
          hotCol.allowInvalid = false;
          hotCol.renderer = function (
            this: any,
            instance: any,
            td: HTMLTableCellElement,
            row: number,
            col: number,
            prop: string,
            value: any,
            cellProperties: any,
          ) {
            const label = value || '';
            td.innerHTML = `<span style="color: ${label ? '#262626' : '#999'}; cursor: pointer;">${label || '0.00'}</span>`;
            return td;
          };
        } else if (col.field === 'remark') {
          hotCol.type = 'text';
          hotCol.renderer = function (
            this: any,
            instance: any,
            td: HTMLTableCellElement,
            row: number,
            col: number,
            prop: string,
            value: any,
            cellProperties: any,
          ) {
            // ✅ 关键修复：先清空单元格内容，防止与编辑器残留内容重叠
            td.innerHTML = '';
            td.innerHTML = `<span style="color: ${value ? '#262626' : '#999'}; cursor: pointer;">${value || '请选择'}</span>`;
            return td;
          };
          hotCol.editor = 'dropdown';
        } else if (
          col.field === 'combinedFeeStatus' ||
          col.field === 'feeStatus'
        ) {
          hotCol.type = 'text';
          hotCol.readOnly = true;
          hotCol.renderer = function (
            this: any,
            instance: any,
            td: HTMLTableCellElement,
            row: number,
            col: number,
            prop: string,
            value: any,
            cellProperties: any,
          ) {
            const rowData = actualDataSource[row] as any;
            const label = getFeeStatusLabel(value);

            const modificationCount =
              rowData?.ModificationCount ??
              rowData?.modificationCount ??
              rowData?.MODIFICATIONCOUNT ??
              0;

            if (modificationCount && modificationCount > 0) {
              td.innerHTML = '';
              td.style.display = 'inline-flex';
              td.style.alignItems = 'center';
              td.style.cursor = 'pointer';
              td.title = `双击查看审核历史(共 ${modificationCount} 次修改)`;

              const statusSpan = document.createElement('span');
              statusSpan.textContent = label || '';
              statusSpan.style.color = '#262626';
              statusSpan.style.marginRight = '0';
              td.appendChild(statusSpan);

              const countSpan = document.createElement('span');
              countSpan.textContent = `+${modificationCount}`;
              countSpan.style.color = '#ff4d4f';
              countSpan.style.fontWeight = 'bold';
              countSpan.style.marginLeft = '4px';
              countSpan.style.cursor = 'pointer';
              countSpan.title = `点击查看 ${modificationCount} 次修改记录`;
              td.appendChild(countSpan);
            } else {
              td.innerHTML = `<span style="color: #262626; cursor: pointer;" title="双击查看审核历史">${label || ''}</span>`;
            }

            return td;
          };
        } else if (
          col.field === 'creationTime' ||
          col.field === 'task.auditTime'
        ) {
          hotCol.type = 'text';
          hotCol.readOnly = true;
          hotCol.renderer = function (
            this: any,
            instance: any,
            td: HTMLTableCellElement,
            row: number,
            col: number,
            prop: string,
            value: any,
            cellProperties: any,
          ) {
            const formattedDate = formatDateTime(value);
            td.innerHTML = `<span style="color: #262626;">${formattedDate}</span>`;
            return td;
          };
        } else if (col.field === 'dataEntryMethod') {
          hotCol.type = 'text';
          hotCol.readOnly = true;
          hotCol.renderer = function (
            this: any,
            instance: any,
            td: HTMLTableCellElement,
            row: number,
            col: number,
            prop: string,
            value: any,
            cellProperties: any,
          ) {
            const label = getDataEntryMethodLabel(value);
            td.innerHTML = `<span style="color: #262626;">${label || ''}</span>`;
            return td;
          };
        } else if (
          [
            'exchangeRate',
            'unitPrice',
            'amount',
            'quantity',
            'taxRate',
          ].includes(col.field || '')
        ) {
          hotCol.type = 'numeric';
          hotCol.numericFormat = {
            pattern: '0.00',
            culture: 'en-US',
          };
          // ✅ 关键修复：添加自定义 renderer，先清空单元格内容
          hotCol.renderer = function (
            this: any,
            instance: any,
            td: HTMLTableCellElement,
            row: number,
            col: number,
            prop: string,
            value: any,
            cellProperties: any,
          ) {
            // 先清空单元格内容，防止与编辑器残留内容重叠
            td.innerHTML = '';

            // 根据字段类型格式化显示值
            let displayValue = '';
            if (value !== null && value !== undefined && value !== '') {
              const numValue = parseFloat(value);
              if (!isNaN(numValue)) {
                if (
                  prop === 'exchangeRate' ||
                  prop === 'unitPrice' ||
                  prop === 'amount'
                ) {
                  displayValue = numValue.toLocaleString('zh-CN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  });
                } else if (prop === 'quantity') {
                  displayValue = numValue.toLocaleString('zh-CN', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  });
                } else if (prop === 'taxRate') {
                  displayValue = (numValue * 100).toFixed(2) + '%';
                } else {
                  displayValue = value.toString();
                }
              }
            }

            td.innerHTML = `<span style="color: ${displayValue ? '#262626' : '#999'}; cursor: pointer;">${displayValue || '0'}</span>`;
            return td;
          };
        } else if (
          col.field === 'invoiceBlocked' ||
          col.field === 'isConfidential'
        ) {
          hotCol.type = 'checkbox';
        } else if (
          [
            'noTaxUnitPrice',
            'noTaxAmount',
            'rqstPaymentAmount',
            'invoicedAmount',
            'orderInvoiceAmount',
            'settledAmount',
          ].includes(col.field || '')
        ) {
          hotCol.type = 'numeric';
          hotCol.readOnly = true;
          hotCol.numericFormat = {
            pattern: '0.00',
            culture: 'en-US',
          };
        } else if (col.field === 'creatorUserName') {
          hotCol.type = 'text';
          hotCol.readOnly = true;
        } else {
          hotCol.type = 'text';
        }

        return hotCol;
      });

    return columns.concat(mappedColumns);
  });

  return {
    hotColumns,
  };
}
