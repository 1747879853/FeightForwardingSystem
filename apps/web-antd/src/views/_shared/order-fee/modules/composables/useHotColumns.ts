import { createFieldPermission } from '#/composables/field-permission';
import { orderFeeFieldPermission } from '#/composables/field-permission-profiles';
import { loadMaskedFields } from '#/composables/use-masked-fields';
import { computed, type Ref } from 'vue';
import {
  ORDER_FEE_EDIT_COLUMN_META,
  resolveHotColumnWidth,
} from '../../order-fee-column-meta';
import { getStatementNumsText, resolveOrderFeeColumnTitle } from '../../data';
import { formatWeightVolumeLocale } from '#/utils/weight-volume-precision';

import {
  buildSettlementAutofillValueSet,
  getInvoiceStatusLabel,
  getFeeStatusLabel,
  getDataEntryMethodLabel,
  formatDateTime,
  isOrderFeeRejectedStatus,
  lookupDropdownLabel,
  resolveLatestOrderFeeRejectRemark,
  resolveSettlementDisplayLabel,
} from '../utils/helpers';
import {
  NEW_ROW_CLASS,
  formatMoney2,
  paintCheckboxCell,
  paintEllipsisCell,
} from '../utils/hot-cell-render';
import { visualRowToSourceIndex } from '../utils/hot-refresh';
import { getFeeInvoiceStatusTextColor } from '#/views/settlement-management/invoice-issue/invoice-status';

const FEE_REJECT_TIP_CLASS = 'fee-reject-help-floating-tip';

function hideFeeRejectHelpTip() {
  document.querySelectorAll(`.${FEE_REJECT_TIP_CLASS}`).forEach((el) => {
    el.remove();
  });
}

function showFeeRejectHelpTip(anchor: HTMLElement, reason: string) {
  hideFeeRejectHelpTip();
  const tip = document.createElement('div');
  tip.className = FEE_REJECT_TIP_CLASS;
  const tipHint = document.createElement('div');
  tipHint.textContent = '双击“驳回”字样查看审核流程';
  const tipReason = document.createElement('div');
  tipReason.textContent = `驳回原因：${reason || '无'}`;
  tip.append(tipHint, tipReason);
  document.body.appendChild(tip);
  const rect = anchor.getBoundingClientRect();
  const tipRect = tip.getBoundingClientRect();
  let left = rect.left + rect.width / 2 - tipRect.width / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - tipRect.width - 8));
  let top = rect.top - tipRect.height - 8;
  if (top < 8) {
    top = rect.bottom + 8;
  }
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}

/**
 * Handsontable 列配置生成器
 */
export function useHotColumns(
  _props: { type: number },
  dropdownSources: any,
  dataSource: Ref<any[]> | any[],
  selectedRowKeys: (string | number)[] | Ref<(string | number)[]>,
  sortableFieldsSet: any,
  sortState: any,
  getSortIcon: (field: string) => string,
  currentOptionsCache: any,
  allClientsByIndustry?: Ref<Record<string, any[]>>,
  querySettlementClients?: (
    industryCategory: string,
    keyword: string,
    done: (items: Array<{ label: string; value: any }>) => void,
  ) => void,
  getSettlementIndustryCategory?: (
    industryCategory?: number,
  ) => string | undefined,
) {
  // ✅ 合法取值集合：含客户 id / label / name，以及表内已填结算对象。
  // 结算对象列是 strict + allowInvalid:false 的 autocomplete；选中后 data 存客户 id，
  // 拖拽填充柄(autofill)/粘贴复制的是 id，且不会打开编辑器填充 currentOptionsCache。
  // 旧逻辑只把 label/name 当合法值，strict 会把 id 判无效并取消填充。
  const allClientValueSet = computed<Set<string>>(() => {
    const rows = Array.isArray(dataSource) ? dataSource : dataSource.value;
    return buildSettlementAutofillValueSet(
      allClientsByIndustry?.value || {},
      rows,
    );
  });

  void loadMaskedFields();
  const fieldPermission = createFieldPermission(orderFeeFieldPermission);
  const hotColumns = computed(() => {
    // 勿在此读取 dataSource / selectedRowKeys：会在勾选、单元格编辑时整列重建并 updateSettings。
    // 勾选态与行数据仅在 renderer 内按需读取。

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
      ) {
        const currentDataSource = Array.isArray(dataSource)
          ? dataSource
          : dataSource.value;
        const currentSelectedRowKeys = Array.isArray(selectedRowKeys)
          ? selectedRowKeys
          : selectedRowKeys.value;

        const rowData =
          currentDataSource[visualRowToSourceIndex(instance, row)];
        const rowKey = (rowData as any)?._rowKey;
        const isSelected = !!(
          rowKey && currentSelectedRowKeys.includes(rowKey)
        );
        return paintCheckboxCell(td, isSelected);
      },
    };

    // 序号独立一列，不与开票状态混排
    const indexColumn: any = {
      data: '_rowIndex',
      title: '序号',
      width: 50,
      type: 'text',
      className: 'htCenter htMiddle',
      readOnly: true,
      renderer: function (
        this: any,
        instance: any,
        td: HTMLTableCellElement,
        row: number,
      ) {
        td.innerHTML = '';
        td.style.textAlign = 'center';
        td.style.verticalAlign = 'middle';
        td.textContent = String(row + 1);
        return td;
      },
    };

    const columns = [checkboxColumn, indexColumn];

    const mappedColumns = ORDER_FEE_EDIT_COLUMN_META.map((meta) => {
      const hotCol: any = {
        data: meta.field,
        title: resolveOrderFeeColumnTitle(meta),
        width: resolveHotColumnWidth(meta),
      };

      if (meta.field === 'invoiceStatus') {
        hotCol.type = 'text';
        hotCol.readOnly = true;
        hotCol.renderer = function (
          this: any,
          instance: any,
          td: HTMLTableCellElement,
          row: number,
        ) {
          const currentDataSource = Array.isArray(dataSource)
            ? dataSource
            : dataSource.value;
          const rowData =
            currentDataSource[visualRowToSourceIndex(instance, row)];
          const invoiceStatus = (rowData as any)?.invoiceStatus;
          const statusLabel = getInvoiceStatusLabel(invoiceStatus);
          const statusColor = getFeeInvoiceStatusTextColor(invoiceStatus);
          paintEllipsisCell(td, statusLabel || '', { align: 'center' });
          td.style.color = statusColor;
          td.style.fontWeight = 'bold';
          td.style.fontSize = '12px';
          return td;
        };
      } else if (meta.field === 'feeCodeId') {
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
        ) {
          const actualDataSource = Array.isArray(dataSource)
            ? dataSource
            : dataSource.value;
          const rowData = actualDataSource[
            visualRowToSourceIndex(instance, row)
          ] as any;
          const isNewRow = !rowData?.id || rowData.id === '';
          const rawId = rowData?.feeCodeId_value ?? value;
          const fullLabel =
            lookupDropdownLabel(dropdownSources.value.feeCodeList, rawId) ||
            (typeof value === 'string' ? value : '');
          const parts = fullLabel.split('-');
          const displayName =
            parts.length > 1 ? parts.slice(1).join('-') : fullLabel;

          return paintEllipsisCell(td, displayName, {
            placeholder: '请选择',
            extraClass: isNewRow ? NEW_ROW_CLASS : undefined,
          });
        };
      } else if (meta.field === 'industryCategory') {
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
        // 允许清空：strict 下默认空串会被判无效，显式放行 null/空
        hotCol.validator = function (
          value: any,
          callback: (valid: boolean) => void,
        ) {
          if (value === null || value === undefined || value === '') {
            callback(true);
            return;
          }
          const labels = dropdownSources.value.industryCategoryList.map(
            (item: any) => item.label,
          );
          callback(labels.includes(value));
        };
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
        ) {
          const actualDataSource = Array.isArray(dataSource)
            ? dataSource
            : dataSource.value;
          const rowData = actualDataSource[
            visualRowToSourceIndex(instance, row)
          ] as any;
          const rawId = rowData?.industryCategory_value ?? value;
          const label =
            lookupDropdownLabel(
              dropdownSources.value.industryCategoryList,
              rawId,
            ) || (typeof value === 'string' ? value : '');
          return paintEllipsisCell(td, label || '', { placeholder: '请选择' });
        };
      } else if (meta.field === 'settlementId') {
        hotCol.type = 'autocomplete';
        // 与基础信息客户下拉一致：按行业分页，关键字交给服务端。
        // sortByRelevance 关闭字母排序，filter 关闭本地二次过滤，避免全称命中被丢掉。
        hotCol.sortByRelevance = true;
        hotCol.filter = false;
        hotCol.source = function (
          this: any,
          query: string,
          process: (items: string[]) => void,
        ) {
          const rows = Array.isArray(dataSource)
            ? dataSource
            : dataSource.value;
          const sourceIndex = visualRowToSourceIndex(this.instance, this.row);
          const rowData = rows?.[sourceIndex] as any;
          const industry = getSettlementIndustryCategory?.(
            rowData?.industryCategory_value ?? rowData?.industryCategory,
          );
          const category = typeof industry === 'string' ? industry : '';

          const publish = (options: Array<{ label: string; value: any }>) => {
            currentOptionsCache.value = options;
            const labels = options.map((item) => item.label);
            if (
              query &&
              !labels.includes(query) &&
              allClientValueSet.value.has(query)
            ) {
              labels.push(query);
            }
            process(labels);
          };

          if (!querySettlementClients) {
            publish(currentOptionsCache.value || []);
            return;
          }
          querySettlementClients(category, query || '', publish);
        };
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
        ) {
          const actualDataSource = Array.isArray(dataSource)
            ? dataSource
            : dataSource.value;
          const rowData = actualDataSource[
            visualRowToSourceIndex(instance, row)
          ] as any;
          const rawId = rowData?.settlementId_value ?? value;
          const cachedOptions = currentOptionsCache.value || [];
          const fromCache = resolveSettlementDisplayLabel(
            rawId,
            rowData,
            cachedOptions,
          );
          let displayName = fromCache;
          if (!displayName && allClientValueSet.value.size) {
            displayName = resolveSettlementDisplayLabel(rawId, rowData);
          }
          return paintEllipsisCell(td, displayName, { placeholder: '请选择' });
        };
      } else if (meta.field === 'currencyId') {
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
        ) {
          const actualDataSource = Array.isArray(dataSource)
            ? dataSource
            : dataSource.value;
          const rowData = actualDataSource[
            visualRowToSourceIndex(instance, row)
          ] as any;
          const rawId = rowData?.currencyId_value ?? value;
          const label =
            lookupDropdownLabel(dropdownSources.value.currencyList, rawId) ||
            (typeof value === 'string' ? value : '');
          return paintEllipsisCell(td, label || '', { placeholder: '请选择' });
        };
      } else if (meta.field === 'unit') {
        hotCol.type = 'autocomplete';
        // ✅ 关键修复：将空数组改为动态 source 函数
        hotCol.source = function (
          query: string,
          process: (items: string[]) => void,
        ) {
          // 从 dropdownSources 获取最新的单位列表
          const allUnits = dropdownSources.value.unitList || [];
          const allLabels = allUnits.map((item: any) => item.label);

          if (!query) {
            process(allLabels);
            return;
          }

          // 支持搜索过滤
          const searchLower = query.toLowerCase();
          const filtered = allLabels.filter((label: string) => {
            return label.toLowerCase().includes(searchLower);
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
        ) {
          const actualDataSource = Array.isArray(dataSource)
            ? dataSource
            : dataSource.value;
          const rowData = actualDataSource[
            visualRowToSourceIndex(instance, row)
          ] as any;
          const raw = rowData?.unit_value ?? value;
          const label =
            lookupDropdownLabel(dropdownSources.value.unitList, raw) ||
            String(raw ?? '');
          return paintEllipsisCell(td, label || '', { placeholder: '请选择' });
        };
      } else if (meta.field === 'unitPrice') {
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
        ) {
          return paintEllipsisCell(td, formatMoney2(value) || '0.00', {
            align: 'right',
          });
        };
      } else if (meta.field === 'quantity') {
        hotCol.type = 'numeric';
        hotCol.format = '0,0.[0000]';
        hotCol.allowInvalid = false;
        hotCol.renderer = function (
          this: any,
          instance: any,
          td: HTMLTableCellElement,
          row: number,
          col: number,
          prop: string,
          value: any,
        ) {
          let displayValue = '0';
          if (value !== null && value !== undefined && value !== '') {
            const numValue = Number.parseFloat(value);
            if (!Number.isNaN(numValue)) {
              displayValue = formatWeightVolumeLocale(numValue) || '0';
            }
          }
          return paintEllipsisCell(td, displayValue, { align: 'right' });
        };
      } else if (meta.field === 'amount') {
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
        ) {
          return paintEllipsisCell(td, formatMoney2(value) || '0.00', {
            align: 'right',
          });
        };
      } else if (meta.field === 'taxRate') {
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
        ) {
          return paintEllipsisCell(td, value || '', {
            placeholder: '0.00%',
          });
        };
      } else if (meta.field === 'taxAmount') {
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
        ) {
          return paintEllipsisCell(td, value || '', { placeholder: '0.00' });
        };
      } else if (meta.field === 'totalAmount') {
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
        ) {
          return paintEllipsisCell(td, value || '', { placeholder: '0.00' });
        };
      } else if (meta.field === 'remark') {
        hotCol.type = 'text';
        hotCol.renderer = function (
          this: any,
          instance: any,
          td: HTMLTableCellElement,
          row: number,
          col: number,
          prop: string,
          value: any,
        ) {
          return paintEllipsisCell(td, value || '');
        };
      } else if (
        meta.field === 'combinedFeeStatus' ||
        meta.field === 'feeStatus'
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
        ) {
          const currentDataSource = Array.isArray(dataSource)
            ? dataSource
            : dataSource.value;
          const rowData = currentDataSource[
            visualRowToSourceIndex(instance, row)
          ] as any;
          const statusValue =
            value ?? rowData?.combinedFeeStatus ?? rowData?.feeStatus;
          const label = getFeeStatusLabel(statusValue);
          const modificationCount =
            rowData?.ModificationCount ??
            rowData?.modificationCount ??
            rowData?.MODIFICATIONCOUNT ??
            0;
          const rejected = isOrderFeeRejectedStatus(statusValue);
          const reason = rejected
            ? resolveLatestOrderFeeRejectRemark(rowData)
            : '';
          const sig = `${statusValue}|${modificationCount}|${rejected ? 1 : 0}|${reason}`;

          td.style.cursor = 'pointer';
          td.style.textAlign = 'center';
          td.style.verticalAlign = 'middle';
          td.style.overflow = 'hidden';

          // 内容未变则复用 DOM，避免滚动时反复拆装与重复绑监听
          if (td.dataset.feeStatusSig === sig && td.childElementCount > 0) {
            return td;
          }
          td.dataset.feeStatusSig = sig;
          td.replaceChildren();

          const wrap = document.createElement('span');
          wrap.className = 'fee-status-cell';

          const statusSpan = document.createElement('span');
          statusSpan.className = 'fee-status-label';
          statusSpan.textContent = label || '';
          if (!rejected) {
            statusSpan.title = modificationCount
              ? `双击查看审核历史(共 ${modificationCount} 次修改)`
              : '双击查看审核历史';
          }
          wrap.appendChild(statusSpan);

          if (rejected) {
            const help = document.createElement('span');
            help.className = 'fee-reject-help';
            help.setAttribute('aria-label', '查看驳回原因');
            help.textContent = '?';
            // 属性赋值覆盖旧 handler，避免 addEventListener 累积
            help.onmouseenter = () => showFeeRejectHelpTip(help, reason);
            help.onmouseleave = () => hideFeeRejectHelpTip();
            wrap.appendChild(help);
          }

          if (modificationCount && modificationCount > 0) {
            const countSpan = document.createElement('span');
            countSpan.className = 'fee-status-mod-count';
            countSpan.textContent = `+${modificationCount}`;
            countSpan.title = `点击查看 ${modificationCount} 次修改记录`;
            wrap.appendChild(countSpan);
          }

          td.appendChild(wrap);
          return td;
        };
      } else if (
        meta.field === 'creationTime' ||
        meta.field === 'task.auditTime'
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
        ) {
          return paintEllipsisCell(td, formatDateTime(value));
        };
      } else if (meta.field === 'dataEntryMethod') {
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
        ) {
          return paintEllipsisCell(td, getDataEntryMethodLabel(value) || '');
        };
      } else if (
        ['exchangeRate', 'unitPrice', 'amount', 'quantity', 'taxRate'].includes(
          meta.field || '',
        )
      ) {
        hotCol.type = 'numeric';
        // 显示由自定义 renderer 负责；勿再配 pattern/culture（新版 HOT 不支持会报错）
        // ✅ 关键修复：添加自定义 renderer，先清空单元格内容
        hotCol.renderer = function (
          this: any,
          instance: any,
          td: HTMLTableCellElement,
          row: number,
          col: number,
          prop: string,
          value: any,
        ) {
          let displayValue = '';
          if (value !== null && value !== undefined && value !== '') {
            const numValue = Number.parseFloat(value);
            if (!Number.isNaN(numValue)) {
              if (
                prop === 'exchangeRate' ||
                prop === 'unitPrice' ||
                prop === 'amount'
              ) {
                displayValue = formatMoney2(numValue);
              } else if (prop === 'quantity') {
                displayValue = formatWeightVolumeLocale(numValue) || '0';
              } else if (prop === 'taxRate') {
                displayValue = `${(numValue * 100).toFixed(2)}%`;
              } else {
                displayValue = String(value);
              }
            }
          }
          return paintEllipsisCell(td, displayValue || '0', { align: 'right' });
        };
      } else if (
        meta.field === 'invoiceBlocked' ||
        meta.field === 'isConfidential'
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
        ].includes(meta.field || '')
      ) {
        hotCol.type = 'numeric';
        hotCol.readOnly = true;
        // Handsontable 新版只认 Intl.NumberFormat 选项，不再支持 pattern/culture
        hotCol.numericFormat = {
          style: 'decimal',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        };
      } else if (meta.field === 'statementNum') {
        // 对账单列 - 只读文本，不可编辑；多个对账单号用“，”分割展示
        hotCol.type = 'text';
        hotCol.readOnly = true;
        hotCol.renderer = function (
          this: any,
          instance: any,
          td: HTMLTableCellElement,
          row: number,
        ) {
          const currentDataSource = Array.isArray(dataSource)
            ? dataSource
            : dataSource.value;
          const rowData = currentDataSource[
            visualRowToSourceIndex(instance, row)
          ] as any;
          const statementNum = getStatementNumsText(rowData);
          return paintEllipsisCell(td, statementNum, {
            align: 'center',
            title: statementNum,
          });
        };
      } else if (meta.field === 'creatorUserName') {
        hotCol.type = 'text';
        hotCol.readOnly = true;
      } else {
        hotCol.type = 'text';
      }

      return hotCol;
    });

    return columns
      .concat(mappedColumns)
      .filter((column) => !fieldPermission.always(String(column.data ?? '')));
  });

  return {
    hotColumns,
  };
}
