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
      width: 100,
      type: 'text',
      className: '',
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

        td.innerHTML = `<div style="display: flex; align-items: left; justify-content: center; gap: 8px;">
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

        // ✅ 录入方式列宽增加30px
        if (col.field === 'dataEntryMethod') {
          hotCol.width = (col.width || 100) + 50;
        }

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

            // ✅ 获取当前行数据，判断是否为新增未保存的行
            const actualDataSource = Array.isArray(dataSource)
              ? dataSource
              : dataSource.value;
            const rowData = actualDataSource[row] as any;
            const isNewRow = !rowData?.id || rowData.id === '';

            // ✅ 关键修改：只显示"-"后面的字符串（费用名称）
            let displayName = '';
            if (value && typeof value === 'string') {
              const parts = value.split('-');
              // 如果有"-"，取后面的部分；否则使用原值
              displayName = parts.length > 1 ? parts.slice(1).join('-') : value;
            }

            // ✅ 修复：直接设置单元格样式和内容，不使用额外的 div 容器
            td.style.position = 'relative';

            // ✅ 如果是未保存的新增行，添加小标签
            if (isNewRow) {
              const labelSpan = document.createElement('span');
              labelSpan.textContent = '新';
              labelSpan.style.cssText =
                'position: absolute; top: 2px; right: 4px; background: #ff4d4f; color: white; font-size: 10px; padding: 1px 4px; border-radius: 2px; line-height: 1.2; z-index: 1; pointer-events: none;';
              td.appendChild(labelSpan);
            }

            // ✅ 添加费用名称文本
            const textSpan = document.createElement('span');
            textSpan.textContent = displayName || '请选择';
            textSpan.style.cssText = `color: ${displayName ? '#262626' : '#999'}; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;`;
            td.appendChild(textSpan);

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
            // ✅ 新增：添加省略号样式
            td.innerHTML = `<span style="color: ${label ? '#262626' : '#999'}; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${label || '请选择'}</span>`;
            return td;
          };
        } else if (col.field === 'settlementId') {
          hotCol.type = 'autocomplete';
          hotCol.strict = true;
          hotCol.allowInvalid = false;
          hotCol.width = 120;
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
            // ✅ 关键修改：只显示"-"后面的字符串（客户名称）
            let displayName = '';
            if (value && typeof value === 'string') {
              const parts = value.split('-');
              // 如果有"-"，取后面的部分；否则使用原值
              displayName = parts.length > 1 ? parts.slice(1).join('-') : value;
            }
            // ✅ 新增：添加省略号样式
            td.innerHTML = `<span style="color: ${displayName ? '#262626' : '#999'}; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${displayName || '请选择'}</span>`;
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
            // ✅ 新增：添加省略号样式
            td.innerHTML = `<span style="color: ${label ? '#262626' : '#999'}; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${label || '请选择'}</span>`;
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
            // ✅ 新增：添加省略号样式
            td.innerHTML = `<span style="color: ${label ? '#262626' : '#999'}; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${label || '请选择'}</span>`;
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

            // ✅ 新增：格式化数值，添加千位逗号分隔符
            let displayValue = '0.00';
            if (value !== null && value !== undefined && value !== '') {
              const numValue = parseFloat(value);
              if (!isNaN(numValue)) {
                displayValue = numValue.toLocaleString('zh-CN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });
              }
            }

            // ✅ 新增：右对齐样式 + 省略号
            td.innerHTML = `<span style="color: ${displayValue ? '#262626' : '#999'}; cursor: pointer; text-align: right; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${displayValue}</span>`;
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
            // ✅ 新增：添加省略号样式
            td.innerHTML = `<span style="color: ${label ? '#262626' : '#999'}; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${label || '0'}</span>`;
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

            // ✅ 新增：格式化数值，添加千位逗号分隔符
            let displayValue = '0.00';
            if (value !== null && value !== undefined && value !== '') {
              const numValue = parseFloat(value);
              if (!isNaN(numValue)) {
                displayValue = numValue.toLocaleString('zh-CN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });
              }
            }

            // ✅ 新增：右对齐样式 + 省略号
            td.innerHTML = `<span style="color: ${displayValue ? '#262626' : '#999'}; cursor: pointer; text-align: right; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${displayValue}</span>`;
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
            // ✅ 新增：添加省略号样式
            td.innerHTML = `<span style="color: ${label ? '#262626' : '#999'}; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${label || '0.00%'}</span>`;
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
            // ✅ 新增：添加省略号样式
            td.innerHTML = `<span style="color: ${value ? '#262626' : '#999'}; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${value || '0.00'}</span>`;
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
            // ✅ 新增：添加省略号样式
            td.innerHTML = `<span style="color: ${value ? '#262626' : '#999'}; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${value || '0.00'}</span>`;
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
            // ✅ 新增：添加省略号样式
            td.innerHTML = `<span style="color: ${value ? '#262626' : '#999'}; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${value || ''}</span>`;
            return td;
          };
        } else if (
          col.field === 'combinedFeeStatus' ||
          col.field === 'feeStatus'
        ) {
          hotCol.type = 'text';
          hotCol.width = 100;
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
              //td.style.display = 'inline-flex';
              td.style.alignItems = 'center';
              td.style.cursor = 'pointer';
              td.title = `双击查看审核历史(共 ${modificationCount} 次修改)`;

              const statusSpan = document.createElement('span');
              statusSpan.textContent = label || '';
              statusSpan.style.color = '#262626';
              statusSpan.style.marginRight = '0';
              // ✅ 新增：添加省略号样式
              statusSpan.style.whiteSpace = 'nowrap';
              statusSpan.style.overflow = 'hidden';
              statusSpan.style.textOverflow = 'ellipsis';
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
              // ✅ 新增：添加省略号样式
              td.innerHTML = `<span style="color: #262626; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;" title="双击查看审核历史">${label || ''}</span>`;
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
            // ✅ 新增：添加省略号样式
            td.innerHTML = `<span style="color: #262626; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${formattedDate}</span>`;
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
            // ✅ 新增：添加省略号样式
            td.innerHTML = `<span style="color: #262626; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${label || ''}</span>`;
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

            // ✅ 新增：添加省略号样式
            td.innerHTML = `<span style="color: ${displayValue ? '#262626' : '#999'}; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${displayValue || '0'}</span>`;
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
        } else if (col.field === 'statementNum') {
          // 对账单号列 - 只读文本，不可编辑
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
            td.innerHTML = '';
            // 从 statement 对象中获取 statementNum
            const rowData = actualDataSource[row] as any;
            const statementNum = rowData?.statement?.statementNum || '';
            // ✅ 新增：添加省略号样式
            td.innerHTML = `<span style="color: ${statementNum ? '#262626' : '#999'}; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${statementNum}</span>`;
            return td;
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
