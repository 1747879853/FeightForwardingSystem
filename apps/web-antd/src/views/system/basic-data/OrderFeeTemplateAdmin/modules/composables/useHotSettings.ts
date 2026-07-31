import { computed, shallowRef } from 'vue';
import Handsontable from 'handsontable';
import type { OrderFeeTemplateAdminApi } from '#/api/sea-export/order-fee-template-admin';
import { getIndustryCategoryOptions  } from '#/views/sea-export-admin/orderFee/data';
import { message } from 'ant-design-vue';

/**
 * 费用模板表格 Handsontable 配置
 */
export function useHotSettings(
  dataSource: any,
  dropdownSources: any,
  linkage: any,
  serviceTypeOptions: Array<{ label: string; value: number }>, // ✅ 新增：服务项选项参数
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
        // ✅ 关键修复：使用服务项枚举数据作为下拉选项
        const allOptions = serviceTypeOptions.map((item) => item.label);
        
        console.log('🔍 [服务项下拉] 当前选项数量:', allOptions.length);
        
        if (!query) {
          process(allOptions);
          return;
        }
        
        const searchLower = query.toLowerCase();
        const filtered = allOptions.filter((option: string) => {
          const optionLower = typeof option === 'string' ? option.toLowerCase() : '';
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
      // ✅ 新增：自定义渲染器，将数值枚举值转换为 Label 显示
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
        
        // ✅ 关键修复：如果值是数值类型（枚举值），转换为 Label 显示
        let displayValue = value;
        if (value !== null && value !== undefined && value !== '') {
          // 尝试将数值转换为 Label
          const serviceTypeItem = serviceTypeOptions.find(
            (opt: { label: string; value: number }) => opt.value === value || opt.value === Number(value)
          );
          if (serviceTypeItem) {
            displayValue = serviceTypeItem.label;
          } else if (typeof value === 'string') {
            // 如果已经是字符串，直接使用
            displayValue = value;
          }
        }
        
        td.innerHTML = `<span style="color: ${displayValue ? '#262626' : '#999'}; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${displayValue || '请选择'}</span>`;
        return td;
      },
      // ✅ 新增：afterSelect 钩子，将选中的 Label 转换为数值枚举值存储
      afterSelect: function (this: any, row: number, col: number, prop: string) {
        const hotInstance = this as any;
        const selectedValue = hotInstance.getDataAtCell(row, col);
        
        if (selectedValue && typeof selectedValue === 'string') {
          // 将 Label 转换为数值枚举值
          const serviceTypeItem = serviceTypeOptions.find(
            (opt: { label: string; value: number }) => opt.label === selectedValue
          );
          
          if (serviceTypeItem) {
            console.log('✅ [serviceType afterSelect] Label → 枚举值:', selectedValue, '→', serviceTypeItem.value);
            // ✅ 关键修复：存储数值枚举值而不是字符串 Label
            hotInstance.setDataAtCell(row, col, serviceTypeItem.value);
          }
        }
      },
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
        // ✅ 关键修复：source 返回 Label 数组供下拉选择
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
      // ✅ 新增：自定义渲染器，将数值枚举值转换为 Label 显示
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
        
        // ✅ 关键修复：如果值是数值类型（枚举值），转换为 Label 显示
        let displayValue = value;
        if (value !== null && value !== undefined && value !== '') {
          // 尝试将数值转换为 Label
          const industryItem = industryOptions.find(
            (opt) => opt.value === value || opt.value === String(value)
          );
          if (industryItem) {
            displayValue = industryItem.label;
          } else if (typeof value === 'string') {
            // 如果已经是字符串，直接使用
            displayValue = value;
          }
        }
        
        td.innerHTML = `<span style="color: ${displayValue ? '#262626' : '#999'}; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${displayValue || '请选择'}</span>`;
        return td;
      },
      // ✅ 新增：afterSelect 钩子，将选中的 Label 转换为数值枚举值存储
      afterSelect: function (this: any, row: number, col: number, prop: string) {
        const hotInstance = this as any;
        const selectedValue = hotInstance.getDataAtCell(row, col);
        
        if (selectedValue && typeof selectedValue === 'string') {
          // 将 Label 转换为数值枚举值
          const industryItem = industryOptions.find(
            (opt) => opt.label === selectedValue
          );
          
          if (industryItem) {
            console.log('✅ [industryCategory afterSelect] Label → 枚举值:', selectedValue, '→', industryItem.value);
            // ✅ 关键修复：存储数值枚举值而不是字符串 Label
            hotInstance.setDataAtCell(row, col, industryItem.value);
          }
        }
      },
    },
    {
      data: 'settlementId',
      title: '结算对象',
      type: 'autocomplete',
      source: function (query: string, process: (items: string[]) => void) {
        console.log('🔍 [settlementId source] 被调用，query:', query);
        
        // ✅ 关键修复：使用缓存的客户数据动态加载
        const hotInstance = this as any;
        
        // ✅ 调试：检查数据源是否已加载
        console.log('📊 [settlementId source] allClientsByIndustry keys:', Object.keys(dropdownSources.allClientsByIndustry.value));
        console.log('📊 [settlementId source] allClientsByIndustry 是否为空:', Object.keys(dropdownSources.allClientsByIndustry.value).length === 0);
        
        if (Object.keys(dropdownSources.allClientsByIndustry.value).length === 0) {
          console.warn('⚠️ [settlementId source] 客户数据尚未加载，返回空列表');
          message.warning('客户数据加载中，请稍后重试');
          process([]);
          return;
        }
        
        // ✅ 修复：尝试多种方式获取当前行索引
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
        console.log('📊 [settlementId source] 客户缓存大小:', Object.keys(dropdownSources.allClientsByIndustry.value).length);
        
        if (currentRow === undefined || currentRow === null || currentRow < 0) {
          console.warn('⚠️ [settlementId source] 无法获取当前行，返回空列表');
          // ✅ 关键修复：即使无法获取当前行，也返回所有客户，让用户可以选择
          let allClients: Array<{ label: string; value: any }> = [];
          Object.values(dropdownSources.allClientsByIndustry.value).forEach((clients: any) => {
            if (Array.isArray(clients)) {
              allClients = [...allClients, ...clients];
            }
          });
          // 去重
          const uniqueMap = new Map();
          allClients.forEach((client) => {
            if (!uniqueMap.has(client.value)) {
              uniqueMap.set(client.value, client);
            }
          });
          allClients = Array.from(uniqueMap.values());
          
          const allOptions = allClients.map((item: any) => item.label);
          console.log('📊 [settlementId source] 返回全部客户数量:', allOptions.length);
          console.log('📋 [settlementId source] 前3个选项示例:', allOptions.slice(0, 3));
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
          console.log('🏷 [settlementId source] 行业类别:', industryCategoryValue, '->', industryValue);
        }

        // ✅ 从缓存中获取客户列表
        const clientList = dropdownSources.allClientsByIndustry.value[industryValue] || [];
        
        // 如果没有指定行业类别，合并所有行业类别的客户
        let allClients: Array<{ label: string; value: any }> = [];
        if (!industryValue || industryValue.trim() === '') {
          console.log('🔄 [settlementId source] 未指定行业类别，加载全部客户');
          Object.values(dropdownSources.allClientsByIndustry.value).forEach((clients: any) => {
            if (Array.isArray(clients)) {
              allClients = [...allClients, ...clients];
            }
          });
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
        console.log('📊 [settlementId source] 下拉选项数量:', allOptions.length);
        console.log('📋 [settlementId source] 前3个选项示例:', allOptions.slice(0, 3));

        if (!query) {
          process(allOptions);
          return;
        }

        // 根据输入关键词过滤
        const searchLower = query.toLowerCase();
        const filtered = allOptions.filter((option: string) => {
          const optionLower = typeof option === 'string' ? option.toLowerCase() : '';
          return optionLower.includes(searchLower);
        });
        console.log('📊 [settlementId source] 过滤后选项数量:', filtered.length);
        process(filtered);
      },
      strict: true,
      allowInvalid: false,
      filteringCaseSensitive: false,
      trimDropdown: false,
      visibleRows: 10,
      width: 200,
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
      },
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
      readOnly: true, // ✅ 关键修复：设置为只读，用户不能手动编辑
    },
    {
      data: 'unit',
      title: '单位',
      type: 'autocomplete',
      source: function (query: string, process: (items: string[]) => void) {
        // ✅ 关键修复：使用订单箱型动态生成单位列表
        // 这里需要从父组件获取订单箱型数据，暂时使用固定列表
        const fixedUnits = [
          '票',
          'TEU',
          '尺码',
          '毛重',
          '件数',
        ];
        
        // TODO: 如果需要支持订单箱型作为单位，需要从父组件传递orderCtnList
        // const ctnUnits = orderCtnList?.value?.map((ctn: any) => ctn.ctnCodeName) || [];
        // const allUnits = [...fixedUnits, ...ctnUnits];
        // const uniqueUnits = Array.from(new Set(allUnits));
        
        const allOptions = fixedUnits;

        if (!query) {
          process(allOptions);
          return;
        }

        // 根据输入关键词过滤
        const searchLower = query.toLowerCase();
        const filtered = allOptions.filter((option: string) => {
          const optionLower = typeof option === 'string' ? option.toLowerCase() : '';
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
    height: 300,
    licenseKey: 'non-commercial-and-evaluation',
    contextMenu: ['row_above', 'row_below', 'remove_row'],
    minSpareRows: 0,  // ✅ 修改为0，删除后不会自动新增行
    autoWrapRow: true,
    autoWrapCol: true,
    
    // ✅ 关键修复：启用多选模式，支持框选和Ctrl+点击多选
    selectionMode: 'multiple' as const,

    // 单元格编辑前的回调
    afterBeginEditing(row: number, col: number) {
      const hotInstance = this as any;
      const cellMeta = hotInstance.getCellMeta(row, col);
      const field = cellMeta.data;

      // ✅ 关键修复：如果是结算对象字段，根据行业类别动态更新下拉选项
      if (field === 'settlementId') {
        console.log('🔧 [afterBeginEditing] 结算对象单元格开始编辑');
        
        // ✅ 调试：检查数据源是否已加载
        console.log('📊 [afterBeginEditing] allClientsByIndustry keys:', Object.keys(dropdownSources.allClientsByIndustry.value));
        console.log('📊 [afterBeginEditing] allClientsByIndustry 是否为空:', Object.keys(dropdownSources.allClientsByIndustry.value).length === 0);
        
        if (Object.keys(dropdownSources.allClientsByIndustry.value).length === 0) {
          console.warn('⚠️ [afterBeginEditing] 客户数据尚未加载');
          message.warning('客户数据加载中，请稍后重试');
          return;
        }
        
        // 获取当前行的行业类别
        const industryCategoryValue = hotInstance.getDataAtCell(row, 'industryCategory');
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
        console.log('📊 [afterBeginEditing] 客户缓存大小:', Object.keys(dropdownSources.allClientsByIndustry.value).length);
        
        // ✅ 从缓存中获取客户列表
        const clientList = dropdownSources.allClientsByIndustry.value[industryValue] || [];
        
        // 如果没有指定行业类别，合并所有行业类别的客户
        let allClients: Array<{ label: string; value: any }> = [];
        if (!industryValue || industryValue.trim() === '') {
          console.log('🔄 [afterBeginEditing] 未指定行业类别，加载全部客户');
          Object.values(dropdownSources.allClientsByIndustry.value).forEach((clients: any) => {
            if (Array.isArray(clients)) {
              allClients = [...allClients, ...clients];
            }
          });
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
          console.log(`✅ [afterBeginEditing] 从缓存获取行业类别 ${industryValue} 的客户，共 ${allClients.length} 个`);
        }
        
        const source = allClients.map((item: any) => item.label);
        console.log('📊 [afterBeginEditing] 设置下拉选项数量:', source.length);
        console.log('📋 [afterBeginEditing] 前3个选项示例:', source.slice(0, 3));
        
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

        // 费用代码变更联动
        if (prop === 'feeCodeId') {
          const feeCodeItem = dropdownSources.feeCodeList.value.find(
            (item: any) => item.label === newValue,
          );
          if (feeCodeItem) {
            linkage.onFeeCodeChange(row, feeCodeItem.value, hotInstance);
          }
        }

        // ✅ 新增：结算对象变更联动 - 根据所选客户自动设置行业类别
        if (prop === 'settlementId' && newValue) {
          console.log('🔗 [afterChange] 结算对象变更:', newValue);
          
          // 在所有客户中查找该客户，获取其行业类别
          let foundClient: any = null;
          Object.values(dropdownSources.allClientsByIndustry.value).forEach((clients: any) => {
            if (Array.isArray(clients)) {
              const client = clients.find((c: any) => c.label === newValue);
              if (client) {
                foundClient = client;
              }
            }
          });
          
          if (foundClient) {
            console.log('✅ [afterChange] 找到客户:', foundClient);
            
            // 从客户ID反查行业类别
            let industryValue = '';
            for (const [category, clients] of Object.entries(dropdownSources.allClientsByIndustry.value)) {
              if (Array.isArray(clients)) {
                const client = clients.find((c: any) => c.value === foundClient.value);
                if (client) {
                  industryValue = category;
                  break;
                }
              }
            }
            
            // if (industryValue) {
            //   // 将枚举值转换为Label
            //   const industryItem = industryOptions.find(
            //     (opt) => opt.value === industryValue,
            //   );
              
            //   if (industryItem) {
            //     console.log('✅ [afterChange] 自动设置行业类别:', industryItem.label);
            //     hotInstance.setDataAtRowProp(row, 'industryCategory', industryItem.label);
            //   }
            // }
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

        // ✅ 关键修复：含税单价变更联动 - 重新计算不含税单价
        if (prop === 'unitPrice') {
          const taxRateValue = hotInstance.getDataAtCell(row, 'taxRate');
          if (taxRateValue !== null && taxRateValue !== undefined && taxRateValue !== '') {
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
          if (unitPriceValue !== null && unitPriceValue !== undefined && unitPriceValue !== '' && 
              newValue !== null && newValue !== undefined && newValue !== '') {
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
