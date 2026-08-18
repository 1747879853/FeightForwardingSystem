import { computed, shallowRef } from 'vue';
import Handsontable from 'handsontable';
import type { OrderFeeTemplateAdminApi } from '#/api/sea-export/order-fee-template-admin';
import { getIndustryCategoryOptions } from '#/views/sea-export-admin/orderFee/data';
import { message } from 'ant-design-vue';

/**
 * 费用模板表格 Handsontable 配置
 */
export function useHotSettings(
  dataSource: any,
  dropdownSources: any,
  linkage: any,
  serviceTypeOptions: Array<{ label: string; value: number }>, // ✅ 新增：服务项选项参数
  formApi?: any, // ✅ 新增：表单API，用于获取基础信息的收付类型
) {
  // 行业类别选项
  const industryOptions = getIndustryCategoryOptions();

  // 列配置
  const columns = computed(() => [
    {
      data: 'serviceType',
      title: '服务项',
      type: 'autocomplete',
      source: function (query: string, process: (items: string[]) => void) {
        // ✅ 使用服务项枚举数据作为下拉选项
        const allOptions = serviceTypeOptions.map((item) => item.label);

        console.log('🔍 [服务项下拉] 当前选项数量:', allOptions.length);

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
      width: 120,
      minWidth: 120, // ✅ 新增：设置最小宽度，防止显示不全
      className: 'htLeft', // ✅ 新增：普通列左对齐
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

        // ✅ 关键修复：如果值是数字（ID），需要从服务项选项中查找对应的Label
        let displayValue = '';

        if (value !== null && value !== undefined && value !== '') {
          // 如果值是数字或可以转换为数字，说明是ID，需要查找对应的Label
          const numericValue =
            typeof value === 'number' ? value : Number(value);

          if (!isNaN(numericValue)) {
            // 这是一个ID，需要在服务项选项中查找
            const serviceTypeItem = serviceTypeOptions.find(
              (item) => item.value === numericValue,
            );

            if (serviceTypeItem) {
              displayValue = serviceTypeItem.label;
            } else {
              displayValue = String(value);
            }
          } else if (typeof value === 'string') {
            // 值已经是字符串（Label），直接使用
            displayValue = value;
          }
        }

        td.innerHTML = `<span style="color: ${displayValue ? '#262626' : '#999'}; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${displayValue || '请选择'}</span>`;
        return td;
      },
      // ✅ 关键修复：移除 afterSelect 钩子，让 Handsontable 内部存储 Label
      // 转换逻辑在 syncDataToParent 中进行
    },
    {
      data: 'feeCodeId',
      title: '费用代码',
      type: 'autocomplete',
      source: function (query: string, process: (items: string[]) => void) {
        // 每次调用时都动态获取最新的下拉数据
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
      minWidth: 150, // ✅ 新增：设置最小宽度，防止显示不全
      className: 'htLeft', // ✅ 新增：普通列左对齐
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

        // ✅ 关键修复：如果值是数字（ID），需要从费用代码列表中查找对应的Label
        let displayName = '';

        if (value !== null && value !== undefined && value !== '') {
          // 如果值是数字或可以转换为数字，说明是ID，需要查找对应的Label
          const numericValue =
            typeof value === 'number' ? value : Number(value);

          if (!isNaN(numericValue)) {
            // 这是一个ID，需要在费用代码列表中查找
            const feeCodeItem = dropdownSources.feeCodeList.value.find(
              (item: any) => item.value === numericValue,
            );

            if (feeCodeItem) {
              // 找到了对应的费用代码，使用其Label
              const label = feeCodeItem.label;
              // 只显示"-"后面的字符串（费用名称）
              if (label && typeof label === 'string') {
                const parts = label.split('-');
                displayName =
                  parts.length > 1 ? parts.slice(1).join('-') : label;
              } else {
                displayName = label || '';
              }
            } else {
              // 没找到对应的费用代码，显示原始值
              displayName = String(value);
            }
          } else if (typeof value === 'string') {
            // 值已经是字符串（Label），直接处理
            const parts = value.split('-');
            // 如果有"-"，取后面的部分；否则使用原值
            displayName = parts.length > 1 ? parts.slice(1).join('-') : value;
          }
        }

        // 设置单元格样式和内容
        td.style.position = 'relative';

        // 添加费用名称文本
        const textSpan = document.createElement('span');
        textSpan.textContent = displayName || '请选择';
        textSpan.style.cssText = `color: ${displayName ? '#262626' : '#999'}; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;`;
        td.appendChild(textSpan);

        return td;
      },
    },
    {
      data: 'feeCodeId_value',
      title: '费用代码_value',
      type: 'numeric',
      width: 1,
      className: 'htDimmed htLeft', // ✅ 修改：隐藏列也使用左对齐
      readOnly: true,
      visible: false,
    },
    {
      data: 'industryCategory',
      title: '行业类别',
      type: 'autocomplete',
      source: function (query: string, process: (items: string[]) => void) {
        // source 返回 Label 数组供下拉选择
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
      minWidth: 100, // ✅ 新增：设置最小宽度，防止显示不全
      className: 'htLeft', // ✅ 新增：普通列左对齐
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

        // ✅ 关键修复：如果值是数字（ID），需要从行业类别选项中查找对应的Label
        let displayValue = '';

        if (value !== null && value !== undefined && value !== '') {
          // 如果值是数字或可以转换为数字，说明是ID，需要查找对应的Label
          const numericValue =
            typeof value === 'number' ? value : Number(value);

          if (!isNaN(numericValue)) {
            // 这是一个ID，需要在行业类别选项中查找
            const industryItem = industryOptions.find(
              (opt) => opt.key === numericValue,
            );

            if (industryItem) {
              displayValue = industryItem.label;
            } else {
              displayValue = String(value);
            }
          } else if (typeof value === 'string') {
            // 值已经是字符串（Label），直接使用
            displayValue = value;
          }
        }

        td.innerHTML = `<span style="color: ${displayValue ? '#262626' : '#999'}; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${displayValue || '请选择'}</span>`;
        return td;
      },
    },
    {
      data: 'industryCategory_value',
      title: '行业类别_value',
      type: 'text',
      width: 1,
      className: 'htDimmed htLeft', // ✅ 修改：隐藏列也使用左对齐
      readOnly: true,
      visible: false,
    },
    {
      data: 'settlementId',
      title: '结算对象',
      type: 'autocomplete',
      source: function (query: string, process: (items: string[]) => void) {
        console.log('🔍 [settlementId source] 被调用，query:', query);

        // 使用缓存的客户数据动态加载
        const hotInstance = this as any;

        if (
          Object.keys(dropdownSources.allClientsByIndustry.value).length === 0
        ) {
          console.warn('⚠️ [settlementId source] 客户数据尚未加载，返回空列表');
          message.warning('客户数据加载中，请稍后重试');
          process([]);
          return;
        }

        // 修复：尝试多种方式获取当前行索引
        let currentRow: number | undefined;

        // 方法1：通过 getSelectedRange
        const selectedRange = hotInstance.getSelectedRange();
        if (selectedRange && selectedRange.length > 0) {
          currentRow = selectedRange[0]?.from?.row;
        }

        // 方法2：如果方法1失败，尝试通过 getSelectedLast
        if (currentRow === undefined || currentRow === null) {
          const lastSelected = hotInstance.getSelectedLast();
          if (lastSelected && lastSelected.length > 0) {
            currentRow = lastSelected[0];
          }
        }

        // 方法3：如果还是失败，尝试通过 getSelected
        if (currentRow === undefined || currentRow === null) {
          const selected = hotInstance.getSelected();
          if (selected && selected.length >= 2) {
            currentRow = selected[0];
          }
        }

        console.log('🔍 [settlementId source] 当前行索引:', currentRow);
        console.log(
          '📊 [settlementId source] 客户缓存大小:',
          Object.keys(dropdownSources.allClientsByIndustry.value).length,
        );

        if (currentRow === undefined || currentRow === null || currentRow < 0) {
          console.warn('⚠️ [settlementId source] 无法获取当前行，返回空列表');
          // 即使无法获取当前行，也返回所有客户，让用户可以选择
          let allClients: Array<{ label: string; value: any }> = [];
          Object.values(dropdownSources.allClientsByIndustry.value).forEach(
            (clients: any) => {
              if (Array.isArray(clients)) {
                allClients = [...allClients, ...clients];
              }
            },
          );
          // 去重
          const uniqueMap = new Map();
          allClients.forEach((client) => {
            if (!uniqueMap.has(client.value)) {
              uniqueMap.set(client.value, client);
            }
          });
          allClients = Array.from(uniqueMap.values());

          const allOptions = allClients.map((item: any) => item.label);
          console.log(
            '📊 [settlementId source] 返回全部客户数量:',
            allOptions.length,
          );
          console.log(
            '📋 [settlementId source] 前3个选项示例:',
            allOptions.slice(0, 3),
          );
          process(allOptions);
          return;
        }

        // 获取当前行的行业类别
        const rowData = hotInstance.getSourceDataAtRow(currentRow);
        console.log('📋 [settlementId source] 当前行数据:', rowData);

        const industryCategoryValue = rowData?.industryCategory;

        // 将行业类别Label转换为枚举值
        let industryValue = '';
        if (industryCategoryValue) {
          const industryItem = industryOptions.find(
            (opt) => opt.label === industryCategoryValue,
          );
          industryValue = industryItem?.value || '';
          console.log(
            '🏷 [settlementId source] 行业类别:',
            industryCategoryValue,
            '->',
            industryValue,
          );
        }

        // 从缓存中获取客户列表
        const clientList =
          dropdownSources.allClientsByIndustry.value[industryValue] || [];

        // 如果没有指定行业类别，合并所有行业类别的客户
        let allClients: Array<{ label: string; value: any }> = [];
        if (!industryValue || industryValue.trim() === '') {
          console.log('🔄 [settlementId source] 未指定行业类别，加载全部客户');
          Object.values(dropdownSources.allClientsByIndustry.value).forEach(
            (clients: any) => {
              if (Array.isArray(clients)) {
                allClients = [...allClients, ...clients];
              }
            },
          );
          // 去重
          const uniqueMap = new Map();
          allClients.forEach((client) => {
            if (!uniqueMap.has(client.value)) {
              uniqueMap.set(client.value, client);
            }
          });
          allClients = Array.from(uniqueMap.values());
        } else {
          allClients = clientList;
          console.log(
            `✅ [settlementId source] 从缓存获取行业类别 ${industryValue} 的客户，共 ${allClients.length} 个`,
          );
        }

        const allOptions = allClients.map((item: any) => item.label);
        console.log(
          '📊 [settlementId source] 下拉选项数量:',
          allOptions.length,
        );
        console.log(
          '📋 [settlementId source] 前3个选项示例:',
          allOptions.slice(0, 3),
        );

        if (!query) {
          process(allOptions);
          return;
        }

        // 根据输入关键词过滤
        const searchLower = query.toLowerCase();
        const filtered = allOptions.filter((option: string) => {
          const optionLower =
            typeof option === 'string' ? option.toLowerCase() : '';
          return optionLower.includes(searchLower);
        });
        console.log(
          '📊 [settlementId source] 过滤后选项数量:',
          filtered.length,
        );
        process(filtered);
      },
      strict: true,
      allowInvalid: false,
      filteringCaseSensitive: false,
      trimDropdown: false,
      visibleRows: 10,
      width: 200,
      minWidth: 200, // ✅ 新增：设置最小宽度，防止显示不全
      className: 'htLeft', // ✅ 新增：普通列左对齐
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

        // ✅ 关键修复：如果值是数字（ID），需要从客户列表中查找对应的Label
        let displayName = '';

        if (value !== null && value !== undefined && value !== '') {
          // 如果值是数字或可以转换为数字，说明是ID，需要查找对应的Label
          const numericValue =
            typeof value === 'number' ? value : Number(value);

          if (!isNaN(numericValue)) {
            // 这是一个ID，需要在所有客户列表中查找对应的Label
            let foundClient: any = null;
            Object.values(dropdownSources.allClientsByIndustry.value).forEach(
              (clients: any) => {
                if (Array.isArray(clients) && !foundClient) {
                  const client = clients.find(
                    (c: any) => c.value === numericValue,
                  );
                  if (client) {
                    foundClient = client;
                  }
                }
              },
            );

            if (foundClient) {
              // 找到了对应的客户，使用其Label
              const label = foundClient.label;
              // 只显示"-"后面的字符串（客户名称）
              if (label && typeof label === 'string') {
                const parts = label.split('-');
                displayName =
                  parts.length > 1 ? parts.slice(1).join('-') : label;
              } else {
                displayName = label || '';
              }
            } else {
              // 没找到对应的客户，显示原始值
              displayName = String(value);
            }
          } else if (typeof value === 'string') {
            // 值已经是字符串（Label），直接处理
            const parts = value.split('-');
            console.log(
              '🔍 [settlementId source] 尝试从客户列表中查找 Label:',
              value,
            );
            // 如果有"-"，取后面的部分；否则使用原值
            displayName = parts.length > 1 ? parts.slice(1).join('-') : value;
          }
        }

        // 新增：添加省略号样式
        td.innerHTML = `<span style="color: ${displayName ? '#262626' : '#999'}; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${displayName || '请选择'}</span>`;
        return td;
      },
    },
    {
      data: 'settlementId_value',
      title: '结算对象_value',
      type: 'numeric',
      width: 1,
      className: 'htDimmed htLeft', // ✅ 修改：隐藏列也使用左对齐
      readOnly: true,
      visible: false,
    },
    {
      data: 'currencyId',
      title: '币别',
      type: 'dropdown',
      source: dropdownSources.currencyList.value.map((item: any) => item.label),
      width: 100,
      minWidth: 100, // ✅ 新增：设置最小宽度，防止显示不全
      className: 'htLeft', // ✅ 新增：普通列左对齐
      strict: true,
      // ✅ 新增：自定义renderer，确保正确显示Label而不是ID
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

        // ✅ 关键修复：如果值是数字（ID），需要从币别列表中查找对应的Label
        let displayValue = '';

        if (value !== null && value !== undefined && value !== '') {
          // 如果值是数字或可以转换为数字，说明是ID，需要查找对应的Label
          const numericValue =
            typeof value === 'number' ? value : Number(value);

          if (!isNaN(numericValue)) {
            // 这是一个ID，需要在币别列表中查找
            const currencyItem = dropdownSources.currencyList.value.find(
              (item: any) => item.value === numericValue,
            );

            if (currencyItem) {
              displayValue = currencyItem.label;
            } else {
              displayValue = String(value);
            }
          } else if (typeof value === 'string') {
            // 值已经是字符串（Label），直接使用
            displayValue = value;
          }
        }

        td.innerHTML = `<span style="color: ${displayValue ? '#262626' : '#999'}; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${displayValue || '请选择'}</span>`;
        return td;
      },
    },
    {
      data: 'currencyId_value',
      title: '币别_value',
      type: 'numeric',
      width: 1,
      className: 'htDimmed htLeft', // ✅ 修改：隐藏列也使用左对齐
      readOnly: true,
      visible: false,
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
      minWidth: 100, // ✅ 新增：设置最小宽度，防止显示不全
      className: 'htRight', // ✅ 确保数值列右对齐
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
      readOnly: true, // ✅ 关键修复：设置为只读，用户不能手动编辑
      className: 'htRight', // ✅ 确保数值列右对齐
    },
    {
      data: 'unit',
      title: '单位',
      type: 'autocomplete',
      source: function (query: string, process: (items: string[]) => void) {
        // ✅ 关键修复：使用固定单位 + 所有箱型代码动态生成单位列表
        const fixedUnits = ['票', 'TEU', '尺码', '毛重', '件数'];

        // ✅ 从 dropdownSources 获取所有箱型代码
        const ctnUnits = dropdownSources.ctnCodeList.value.map(
          (item: any) => item.value,
        );

        // 合并固定单位和箱型单位，并去重
        const allOptions = Array.from(new Set([...fixedUnits, ...ctnUnits]));

        console.log('📦 [单位下拉框] 当前选项:', {
          固定单位: fixedUnits.length,
          箱型单位: ctnUnits.length,
          总计: allOptions.length,
        });

        if (!query) {
          process(allOptions);
          return;
        }

        // 根据输入关键词过滤
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
      minWidth: 100, // ✅ 新增：设置最小宽度，防止显示不全
      className: 'htLeft', // ✅ 新增：普通列左对齐
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

        // ✅ 关键修复：如果值是数字（ID），需要从币别列表中查找对应的Label
        let displayValue = value;

        td.innerHTML = `<span style="color: ${displayValue ? '#262626' : '#999'}; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${displayValue || '请选择'}</span>`;
        return td;
      },
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
      minWidth: 80, // ✅ 新增：设置最小宽度，防止显示不全
      className: 'htRight', // ✅ 确保数值列右对齐
    },
    {
      data: 'sortId',
      title: '排序',
      type: 'numeric',
      width: 80,
      minWidth: 80, // ✅ 新增：设置最小宽度，防止显示不全
      className: 'htRight', // ✅ 确保数值列右对齐
    },
    {
      data: 'remark',
      title: '备注',
      type: 'text',
      width: 140,
      minWidth: 140, // ✅ 新增：设置最小宽度，防止显示不全
      className: 'htLeft', // ✅ 新增：普通列左对齐
    },
  ]);

  // Handsontable 配置
  const hotSettings = shallowRef({
    data: dataSource.value,
    columns: columns.value,
    rowHeaders: true,
    colHeaders: true,
    height: 300,
    rowHeights: 30, // ✅ 新增：设置固定的行高，避免行高异常
    licenseKey: 'non-commercial-and-evaluation',
    contextMenu: ['row_above', 'row_below', 'remove_row'],
    minSpareRows: 0, // ✅ 修改为0，删除后不会自动新增行
    autoWrapRow: true,
    autoWrapCol: true,

    // ✅ 关键修复：启用多选模式，支持框选和Ctrl+点击多选
    selectionMode: 'multiple' as const,

    // ✅ 修复滚动条导致的错行问题：使用 fixedRowsTop 和 fixedColumnsLeft
    fixedRowsTop: 0, // 固定表头
    fixedColumnsLeft: 0, // 固定左侧序号列（如果使用 rowHeaders）

    // 单元格编辑前的回调
    afterBeginEditing(row: number, col: number) {
      const hotInstance = this as any;
      const cellMeta = hotInstance.getCellMeta(row, col);
      const field = cellMeta.data;

      // ✅ 关键修复：如果是结算对象字段，根据行业类别动态更新下拉选项
      if (field === 'settlementId') {
        console.log('🔧 [afterBeginEditing] 结算对象单元格开始编辑');

        // ✅ 调试：检查数据源是否已加载
        console.log(
          '📊 [afterBeginEditing] allClientsByIndustry keys:',
          Object.keys(dropdownSources.allClientsByIndustry.value),
        );
        console.log(
          '📊 [afterBeginEditing] allClientsByIndustry 是否为空:',
          Object.keys(dropdownSources.allClientsByIndustry.value).length === 0,
        );

        if (
          Object.keys(dropdownSources.allClientsByIndustry.value).length === 0
        ) {
          console.warn('⚠️ [afterBeginEditing] 客户数据尚未加载');
          message.warning('客户数据加载中，请稍后重试');
          return;
        }

        // 获取当前行的行业类别
        const industryCategoryValue = hotInstance.getDataAtCell(
          row,
          'industryCategory',
        );
        console.log('📋 [afterBeginEditing] 行业类别:', industryCategoryValue);

        // 将行业类别Label转换为枚举值
        let industryValue = '';
        if (industryCategoryValue) {
          const industryItem = industryOptions.find(
            (opt) => opt.label === industryCategoryValue,
          );
          industryValue = industryItem?.value || '';
        }

        console.log('🏷 [afterBeginEditing] 行业类别枚举值:', industryValue);
        console.log(
          '📊 [afterBeginEditing] 客户缓存大小:',
          Object.keys(dropdownSources.allClientsByIndustry.value).length,
        );

        // ✅ 从缓存中获取客户列表
        const clientList =
          dropdownSources.allClientsByIndustry.value[industryValue] || [];

        // 如果没有指定行业类别，合并所有行业类别的客户
        let allClients: Array<{ label: string; value: any }> = [];
        if (!industryValue || industryValue.trim() === '') {
          console.log('🔄 [afterBeginEditing] 未指定行业类别，加载全部客户');
          Object.values(dropdownSources.allClientsByIndustry.value).forEach(
            (clients: any) => {
              if (Array.isArray(clients)) {
                allClients = [...allClients, ...clients];
              }
            },
          );
          // 去重
          const uniqueMap = new Map();
          allClients.forEach((client) => {
            if (!uniqueMap.has(client.value)) {
              uniqueMap.set(client.value, client);
            }
          });
          allClients = Array.from(uniqueMap.values());
        } else {
          allClients = clientList;
          console.log(
            `✅ [afterBeginEditing] 从缓存获取行业类别 ${industryValue} 的客户，共 ${allClients.length} 个`,
          );
        }

        const source = allClients.map((item: any) => item.label);
        console.log('📊 [afterBeginEditing] 设置下拉选项数量:', source.length);
        console.log(
          '📋 [afterBeginEditing] 前3个选项示例:',
          source.slice(0, 3),
        );

        // ✅ 关键修复：设置单元格的source属性
        hotInstance.setCellMeta(row, col, 'source', source);
      }
    },

    // 数据变更后的回调
    afterChange(changes: any, source: string) {
      if (!changes || source === 'loadData') return;

      const hotInstance = this as any;

      changes.forEach(([row, prop, oldValue, newValue]: any) => {
        if (!prop) return;

        // ✅ 关键修复：当用户选择 Label 时，同时保存 _value 字段
        // 费用代码
        if (prop === 'feeCodeId' && newValue) {
          const feeCodeItem = dropdownSources.feeCodeList.value.find(
            (item: any) => item.label === newValue,
          );
          if (feeCodeItem) {
            // ✅ 修复：使用 setDataAtRowProp 而不是 setDataAtCell
            hotInstance.setDataAtRowProp(
              row,
              'feeCodeId_value',
              feeCodeItem.value,
            );
            console.log(
              '✅ [afterChange] feeCodeId - Label:',
              newValue,
              ', Value:',
              feeCodeItem.value,
            );

            // ✅ 修复：传递 formApi 参数以获取基础信息的收付类型
            // 使用 IIFE 处理异步调用
            (async () => {
              await linkage.onFeeCodeChange(
                row,
                feeCodeItem.value,
                hotInstance,
                formApi,
              );
            })();
          }
        }

        // 行业类别
        if (prop === 'industryCategory' && newValue) {
          const industryItem = industryOptions.find(
            (opt) => opt.label === newValue,
          );
          if (industryItem) {
            // 保存原始枚举值到 _value 字段
            hotInstance.setDataAtRowProp(
              row,
              'industryCategory_value',
              industryItem.value,
            );
            console.log(
              '✅ [afterChange] industryCategory - Label:',
              newValue,
              ', Value:',
              industryItem.value,
            );

            // 执行联动逻辑
            linkage.onIndustryCategoryChange(
              row,
              industryItem.value,
              hotInstance,
            );
          }
        }

        // 结算对象
        if (prop === 'settlementId' && newValue) {
          // 在所有客户中查找该客户
          let foundClient: any = null;
          Object.values(dropdownSources.allClientsByIndustry.value).forEach(
            (clients: any) => {
              if (Array.isArray(clients)) {
                const client = clients.find((c: any) => c.label === newValue);
                if (client) {
                  foundClient = client;
                }
              }
            },
          );

          if (foundClient) {
            // 保存原始ID到 _value 字段
            hotInstance.setDataAtRowProp(
              row,
              'settlementId_value',
              foundClient.value,
            );
            console.log(
              '✅ [afterChange] settlementId - Label:',
              newValue,
              ', Value:',
              foundClient.value,
            );

            // ✅ 已移除：不再根据结算对象自动联动赋值行业类别
            // 原因：用户要求不需要联动行业类别赋值
          }
        }

        // 币别（由联动逻辑设置）
        if (prop === 'currencyId' && newValue) {
          const currencyItem = dropdownSources.currencyList.value.find(
            (item: any) => item.label === newValue,
          );
          if (currencyItem) {
            // 保存原始ID到 _value 字段
            hotInstance.setDataAtRowProp(
              row,
              'currencyId_value',
              currencyItem.value,
            );
            console.log(
              '✅ [afterChange] currencyId - Label:',
              newValue,
              ', Value:',
              currencyItem.value,
            );
          }
        }

        // ✅ 关键修复：含税单价变更联动 - 重新计算不含税单价
        if (prop === 'unitPrice') {
          const taxRateValue = hotInstance.getDataAtCell(row, 'taxRate');
          if (
            taxRateValue !== null &&
            taxRateValue !== undefined &&
            taxRateValue !== ''
          ) {
            linkage.onUnitPriceChange(
              row,
              parseFloat(newValue),
              parseFloat(taxRateValue),
              hotInstance,
            );
          }
        }

        // ✅ 新增：税率变更联动 - 重新计算不含税单价
        if (prop === 'taxRate') {
          const unitPriceValue = hotInstance.getDataAtCell(row, 'unitPrice');
          if (
            unitPriceValue !== null &&
            unitPriceValue !== undefined &&
            unitPriceValue !== '' &&
            newValue !== null &&
            newValue !== undefined &&
            newValue !== ''
          ) {
            linkage.onTaxRateChange(
              row,
              parseFloat(unitPriceValue),
              parseFloat(newValue),
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
