import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';
import type { Recordable } from '@vben/types';

import type { ComponentType } from './component';

import { h, Fragment } from 'vue';
import { useRoute } from 'vue-router';

import { IconifyIcon } from '@vben/icons';
import { $te } from '@vben/locales';
import {
  setupVbenVxeTable,
  useVbenVxeGrid as useGrid,
} from '@vben/plugins/vxe-table';
import { get, isFunction, isString } from '@vben/utils';

import { getExchangeRateDetail } from '#/api/system/base-data/exchange-rate-admin';
import { getFeeCodeDetail } from '#/api/system/base-data/fee-code-admin';
import { getCtnCodeDetail } from '#/api/system/base-data/ctn-code-admin';
import { getSeaExportDetail } from '#/api/sea-export/sea-export-admin';
import { useTableConfigStore } from '#/store/table-config';
import { getIndustryCategoryOptions } from '#/views/sea-export-admin/orderFee/data';

import { objectOmit } from '@vueuse/core';
import {
  Button,
  Checkbox,
  Dropdown,
  Image,
  Input,
  Menu,
  Modal,
  Popconfirm,
  Select,
  Switch,
  Tag,
  message,
} from 'ant-design-vue';

import { $t } from '#/locales';
import { getSortSessionList } from '#/store/sort-session';
import {
  applyDefaultSortable,
  getEffectiveSortList,
  isPagedListQuery,
  isRemoteSortEnabled,
  parseAbpSorting,
  runWithSortContext,
  syncGridSortFromSession,
  toVxeDefaultSort,
} from '#/utils/paged-list-query';
import { buildAttachmentUrl } from '#/utils';

import { ref } from 'vue';

// 🔥 全局订单详情缓存（避免重复调用API）
const orderDetailCache = new Map<string, any>();
const orderDetailLoading = new Map<string, Promise<any>>();

// 🔥 全局集装箱详情缓存（避免重复调用API）
const ctnCodeCache = new Map<number, any>();
const ctnCodeLoading = new Map<number, Promise<any>>();

/**
 * 统一的订单详情加载函数（带缓存和防并发）
 */
async function loadOrderDetailCached(transportOrderId: string) {
  if (!transportOrderId) {
    console.warn('⚠️ [loadOrderDetailCached] 缺少运输订单ID');
    return null;
  }

  // 如果缓存中已有，直接返回
  if (orderDetailCache.has(transportOrderId)) {
    console.log('✅ [loadOrderDetailCached] 使用缓存数据:', transportOrderId);
    return orderDetailCache.get(transportOrderId);
  }

  // 如果正在加载中，等待完成
  if (orderDetailLoading.has(transportOrderId)) {
    console.log('⏳ [loadOrderDetailCached] 等待加载完成:', transportOrderId);
    return await orderDetailLoading.get(transportOrderId);
  }

  // 开始加载
  console.log('🔄 [loadOrderDetailCached] 开始加载:', transportOrderId);
  const loadingPromise = getSeaExportDetail(transportOrderId)
    .then((detail) => {
      if (detail) {
        orderDetailCache.set(transportOrderId, detail);
        console.log('✅ [loadOrderDetailCached] 加载成功并已缓存');
      }
      orderDetailLoading.delete(transportOrderId);
      return detail;
    })
    .catch((error) => {
      console.error('❌ [loadOrderDetailCached] 加载失败:', error);
      orderDetailLoading.delete(transportOrderId);
      throw error;
    });

  orderDetailLoading.set(transportOrderId, loadingPromise);
  return await loadingPromise;
}

/**
 * 统一的集装箱详情加载函数（带缓存和防并发）
 */
async function loadCtnCodeCached(ctnCodeId: number) {
  if (!ctnCodeId) {
    console.warn('⚠️ [loadCtnCodeCached] 缺少集装箱ID');
    return null;
  }

  // 如果缓存中已有，直接返回
  if (ctnCodeCache.has(ctnCodeId)) {
    console.log('✅ [loadCtnCodeCached] 使用缓存数据:', ctnCodeId);
    return ctnCodeCache.get(ctnCodeId);
  }

  // 如果正在加载中，等待完成
  if (ctnCodeLoading.has(ctnCodeId)) {
    console.log('⏳ [loadCtnCodeCached] 等待加载完成:', ctnCodeId);
    return await ctnCodeLoading.get(ctnCodeId);
  }

  // 开始加载
  console.log('🔄 [loadCtnCodeCached] 开始加载:', ctnCodeId);
  const loadingPromise = getCtnCodeDetail(ctnCodeId)
    .then((detail) => {
      if (detail) {
        ctnCodeCache.set(ctnCodeId, detail);
        console.log('✅ [loadCtnCodeCached] 加载成功并已缓存:', ctnCodeId);
      }
      ctnCodeLoading.delete(ctnCodeId);
      return detail;
    })
    .catch((error) => {
      console.error('❌ [loadCtnCodeCached] 加载失败:', ctnCodeId, error);
      ctnCodeLoading.delete(ctnCodeId);
      throw error;
    });

  ctnCodeLoading.set(ctnCodeId, loadingPromise);
  return await loadingPromise;
}

/** 操作列删除确认：按字段链回退展示名，避免名称为空时文案缺失 */
function resolveCellOperationRowName(
  row: Recordable,
  attrs?: Recordable,
): string {
  if (typeof attrs?.getRowName === 'function') {
    return attrs.getRowName(row);
  }
  const fields: string[] = [];
  if (attrs?.nameField) {
    fields.push(attrs.nameField);
  }
  if (Array.isArray(attrs?.nameFieldFallbacks)) {
    fields.push(...attrs.nameFieldFallbacks);
  }
  if (fields.length === 0) {
    fields.push('name', 'cnName', 'laneName', 'laneEnName', 'code', 'enName');
  }
  for (const field of fields) {
    const value = row[field];
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return String(value);
    }
  }
  if (row.id !== null && row.id !== undefined) {
    return String(row.id);
  }
  return '';
}

import { useVbenForm } from './form';
import ClientSelect from './component/biz-select/client-select.vue';
import FeeCodeSelect from './component/biz-select/fee-code-select.vue';
import CurrencySelect from '#/adapter/component/biz-select/currency-select.vue';
import ExchangeRateSelect from '#/adapter/component/biz-select/exchange-rate-select.vue';
import UnitSelect from '#/adapter/component/biz-select/unit-select.vue';
import IndustryCategorySelect from '#/adapter/component/biz-select/industry-category-select.vue';

setupVbenVxeTable({
  configVxeTable: (vxeUI) => {
    vxeUI.setConfig({
      grid: {
        align: 'center',
        border: false,
        columnConfig: {
          resizable: true,
        },
        resizableConfig: {
          minWidth: 0,
        },

        formConfig: {
          // 全局禁用vxe-table的表单配置，使用formOptions
          enabled: false,
        },
        minHeight: 180,
        proxyConfig: {
          autoLoad: true,
          response: {
            result: 'items',
            total: 'totalCount',
            list: '',
          },
          showActiveMsg: true,
          showResponseMsg: false,
        },
        round: true,
        showOverflow: true,
        size: 'small',
        stripe: true,
      } as VxeTableGridOptions,
      // 全局启用行 hover 高亮：各列表无需单独配置 rowConfig.isHover，
      // 页面自定义的 rowConfig（如 keyField）会与此默认值浅合并。
      table: {
        rowConfig: {
          isHover: true,
        },
      },
    });

    /**
     * 解决vxeTable在热更新时可能会出错的问题
     */
    vxeUI.renderer.forEach((_item, key) => {
      if (key.startsWith('Cell')) {
        vxeUI.renderer.delete(key);
      }
    });

    // 表格配置项可以用 cellRender: { name: 'CellImage' },
    vxeUI.renderer.add('CellImage', {
      renderTableDefault(renderOpts, params) {
        const { props } = renderOpts;
        const { column, row } = params;
        return h(Image, { src: row[column.field], ...props });
      },
    });

    vxeUI.renderer.add('CellAvatar', {
      renderTableDefault(renderOpts, params) {
        const { props } = renderOpts;
        const { column, row } = params;
        const src = buildAttachmentUrl(row[column.field]);
        if (!src) {
          return h('span', '-');
        }
        return h(Image, {
          src,
          width: 36,
          height: 36,
          style: { borderRadius: '50%', objectFit: 'cover' },
          ...props,
        });
      },
    });

    // 表格配置项可以用 cellRender: { name: 'CellLink' },
    vxeUI.renderer.add('CellLink', {
      renderTableDefault(renderOpts) {
        const { props } = renderOpts;
        return h(
          Button,
          { size: 'small', type: 'link' },
          { default: () => props?.text },
        );
      },
    });

    // 单元格渲染： Tag
    vxeUI.renderer.add('CellTag', {
      renderTableDefault({ options, props }, { column, row }) {
        const value = get(row, column.field);
        const tagOptions = options ?? [
          { color: 'success', label: $t('common.enabled'), value: 1 },
          { color: 'error', label: $t('common.disabled'), value: 0 },
        ];
        const tagItem = tagOptions.find((item) => item.value === value);

        return h(
          Tag,
          {
            ...props,
            ...objectOmit(tagItem ?? {}, ['label']),
          },
          { default: () => tagItem?.label ?? value },
        );
      },
    });

    vxeUI.renderer.add('CellFeeStatusTag', {
      renderTableDefault({ options, props }, { column, row }) {
        const value = get(row, column.field);
        const tagOptions = options ?? [
          { color: 'success', label: $t('common.enabled'), value: 1 },
          { color: 'error', label: $t('common.disabled'), value: 0 },
        ];

        // 获取费用状态标签
        let tagItem = tagOptions.find((item) => item.value === value);

        // 兼容多种大小写的 ModificationCount 字段名
        const modificationCount =
          row['ModificationCount'] ??
          row['modificationCount'] ??
          row['MODIFICATIONCOUNT'] ??
          0;

        // 如果有修改次数，显示 "状态 +N" 格式
        if (modificationCount && modificationCount > 0) {
          // 使用 div 包裹而不是 Fragment
          return h(
            'div',
            {
              style: {
                display: 'inline-flex',
                alignItems: 'center',
                cursor: 'pointer', // 添加鼠标指针样式，提示可点击
              },
              title: `双击查看审核历史（共 ${modificationCount} 次修改）`, // 添加提示文本
            },
            [
              h(
                Tag,
                {
                  ...props,
                  ...objectOmit(tagItem ?? {}, ['label']),
                  style: { marginRight: '0' }, // 去掉 Tag 的右边距
                },
                { default: () => tagItem?.label || value },
              ),
              h(
                'span',
                {
                  style: {
                    color: '#ff4d4f', // 红色
                    fontWeight: 'bold', // 加粗
                    marginLeft: '4px', // 左边距
                    cursor: 'pointer', // 添加鼠标指针样式
                  },
                  title: `点击查看 ${modificationCount} 次修改记录`, // 为 +N 标记添加单独的提示
                },
                `+${modificationCount}`,
              ),
            ],
          );
        }

        // 否则只显示状态标签
        return h(
          Tag,
          {
            ...props,
            ...objectOmit(tagItem ?? {}, ['label']),
            style: { cursor: 'pointer' }, // 添加鼠标指针样式
          },
          { default: () => tagItem?.label || value },
        );
      },
    });

    vxeUI.renderer.add('CellSwitch', {
      renderTableDefault({ attrs, props }, { column, row }) {
        const loadingKey = `__loading_${column.field}`;
        // 处理动态 disabled 属性
        const finallyProps: any = {
          checkedChildren: $t('common.enabled'),
          checkedValue: 1,
          unCheckedChildren: $t('common.disabled'),
          unCheckedValue: 0,
          ...props,
          checked: row[column.field],
          loading: row[loadingKey] ?? false,
          'onUpdate:checked': onChange,
        };

        // 如果 disabled 是函数，则调用它并传入 row
        if (typeof finallyProps.disabled === 'function') {
          finallyProps.disabled = finallyProps.disabled(row);
        }

        async function onChange(newVal: any) {
          row[loadingKey] = true;
          try {
            const result = await attrs?.beforeChange?.(newVal, row);
            if (result !== false) {
              row[column.field] = newVal;
            }
          } finally {
            row[loadingKey] = false;
          }
        }
        return h(Switch, finallyProps);
      },
    });

    // 单元格渲染：复选框（用于布尔值字段）
    vxeUI.renderer.add('CellCheckbox', {
      renderTableDefault({ attrs, props }, { column, row }) {
        // 处理动态 disabled 属性
        const finallyProps: any = {
          ...props,
          checked: row[column.field] === true,
          'onUpdate:checked': onChange,
        };

        // 如果 disabled 是函数，则调用它并传入 row
        if (typeof finallyProps.disabled === 'function') {
          finallyProps.disabled = finallyProps.disabled(row);
        }

        function onChange(newVal: boolean) {
          row[column.field] = newVal;
        }
        return h(Checkbox, finallyProps);
      },
    });
    vxeUI.renderer.add('CellFeeCodeSelect', {
      renderTableDefault({ attrs, props }, { column, row }) {
        // 处理动态 disabled 属性
        const finalProps: any = {
          ...attrs,
          ...props,
          modelValue: row[column.field],
          'onUpdate:modelValue': onChange,
          // 传递保存状态（id 为空表示未保存）
          isSaved: !!row.id,
        };

        // 如果 disabled 是函数，则调用它并传入 row
        if (typeof finalProps.disabled === 'function') {
          finalProps.disabled = finalProps.disabled(row);
        }

        async function onChange(newVal: any) {
          if (!newVal) {
            row[column.field] = newVal;
            return;
          }

          // 更新当前字段的值
          row[column.field] = newVal;

          try {
            // 获取费用代码详情
            const feeCodeDetail = await getFeeCodeDetail(newVal);
            if (!feeCodeDetail) {
              console.warn('未找到费用代码详情');
              return;
            }

            console.log('费用代码详情:', feeCodeDetail);

            // 1. 自动填充行业类别和结算对象
            const paySide = row['paySide']; // 0=应收, 1=应付

            if (paySide === 0) {
              // 应收费用：使用收费客户类型（defaultDebitName）
              const debitCategory = feeCodeDetail.defaultDebitName;
              if (debitCategory) {
                console.log(
                  '自动填充行业类别:',
                  debitCategory,
                  getCategoryNumber(debitCategory),
                );
                row['industryCategory'] = getCategoryNumber(debitCategory);
                row['industryCategories'] = debitCategory;

                // 根据行业类别从订单详情中获取对应的结算对象
                await fillSettlementIdByIndustryCategory(row, debitCategory);
              }
            } else if (paySide === 1) {
              // 应付费用：使用付费客户类型（defaultCreditName）
              const creditCategory = feeCodeDetail.defaultCreditName;
              if (creditCategory) {
                row['industryCategory'] = getCategoryNumber(creditCategory);
                row['industryCategories'] = creditCategory;

                // 根据行业类别从订单详情中获取对应的结算对象
                await fillSettlementIdByIndustryCategory(row, creditCategory);
              }
            }

            // 2. 自动填充币别
            if (feeCodeDetail.currencyId) {
              row['currencyId'] = feeCodeDetail.currencyId;

              //判断本位币逻辑

              // 同时获取汇率
              if (row['currencyId']) {
                try {
                  // 先获取汇率详情
                  const exchangeRateData = await getExchangeRateDetail(
                    row['currencyId'],
                  );

                  // 判断是否为本位币：需要查询订单所属公司的本位币
                  let isLocalCurrency = false;

                  // 从row中获取运输订单ID
                  const transportOrderId = row['transportOrderId'];

                  if (transportOrderId) {
                    try {
                      // 获取订单详情（使用缓存）
                      const orderDetail =
                        await loadOrderDetailCached(transportOrderId);

                      if (
                        orderDetail &&
                        orderDetail.companys &&
                        orderDetail.companys.length > 0
                      ) {
                        // 获取第一个所属公司（通常只有一个）
                        const company = orderDetail.companys[0];
                        //  console.log('所属公司:', company);
                        //  console.log('本位币:', company?.localCurrencyCode, newVal);

                        // 检查该公司的本位币是否与当前选择的币别一致
                        if (
                          company?.localCurrencyId === feeCodeDetail.currencyId
                        ) {
                          isLocalCurrency = true;
                        }
                      }
                    } catch (error) {
                      console.error('获取订单详情失败:', error);
                    }
                  }

                  // 如果是本位币，汇率固定为1且禁用编辑
                  if (isLocalCurrency) {
                    row['exchangeRate'] = 1;

                    // 设置汇率字段为禁用状态
                    const exchangeRateEditingKey = `__editing_exchangeRate`;
                    row[exchangeRateEditingKey] = false;

                    // 标记该行为本位币，用于在CellEditableNumber渲染器中禁用
                    row['__isLocalCurrency'] = true;

                    console.log('检测到本位币，汇率固定为1且不可修改');
                  } else {
                    // 非本位币，使用正常汇率
                    row['exchangeRate'] = props?.type
                      ? exchangeRateData.drValue
                      : exchangeRateData.crValue;
                    row['__isLocalCurrency'] = false;
                  }
                } catch (error) {
                  console.error('获取汇率详情失败:', error);
                }
              }
            }

            // 3. 自动填充税率
            if (
              feeCodeDetail.taxRate !== undefined &&
              feeCodeDetail.taxRate !== null
            ) {
              row['taxRate'] = feeCodeDetail.taxRate;
            }

            // 4. 自动填充单位和数量
            const defaultUnitName = feeCodeDetail.defaultUnitName;
            if (defaultUnitName) {
              // 直接将单位名称填充到unit字段（中文字符串）
              row['unit'] = defaultUnitName;

              // 根据单位类型自动填充数量
              if (defaultUnitName) {
                // 如果是箱型，需要查询订单的箱型信息
                if (defaultUnitName === '箱型' || defaultUnitName === 'CTN') {
                  await fillCtnQuantity(row);
                }
                // 如果是票，数量为1
                else if (
                  defaultUnitName === '票' ||
                  defaultUnitName === 'ORDER'
                ) {
                  row['quantity'] = 1;
                }
                // 如果是重量、尺码、件数、TEU，从订单详情中获取
                else if (
                  ['毛重', '尺码', '件数', 'TEU'].includes(defaultUnitName)
                ) {
                  await fillOrderQuantity(row, defaultUnitName);
                }
              }
            }

            // 触发相关字段的重算（如含税单价、金额等）
            if (attrs?.onFeeCodeChange) {
              await attrs.onFeeCodeChange(feeCodeDetail, row);
            }
          } catch (error) {
            console.error('自动填充费用信息失败:', error);
          }
        }

        /**
         * 将行业类别字母转换为数字
         */
        function getCategoryNumber(category: string): number | undefined {
          return getIndustryCategoryOptions().find(
            (item) => item.value === category,
          )?.key;
        }

        /**
         * 填充箱型数量和单位
         */
        async function fillCtnQuantity(row: any) {
          try {
            const transportOrderId = row['transportOrderId'];
            if (!transportOrderId) {
              console.warn('缺少运输订单ID');
              return;
            }

            // 获取订单详情（使用缓存）
            const orderDetail = await loadOrderDetailCached(transportOrderId);
            if (!orderDetail || !orderDetail.transportOrder?.orderCtns) {
              console.warn('未找到订单箱型信息');
              return;
            }

            const ctns = orderDetail.transportOrder.orderCtns;
            if (ctns.length === 0) {
              row['unit'] = '票';
              row['quantity'] = 1;
              return;
            }

            // 填充单位为"箱"（中文字符串）
            row['unit'] = ctns[0]?.ctnCodeName || '';

            // 计算箱型数量（有多少条箱型数据）
            row['quantity'] = ctns.filter(
              (ctn) => ctn.ctnCodeName === ctns[0]?.ctnCodeName,
            ).length;
          } catch (error) {
            console.error('填充箱型数量失败:', error);
          }
        }

        /**
         * 填充订单数量（重量、尺码、件数、TEU等）
         */
        async function fillOrderQuantity(row: any, unitName: string) {
          try {
            const transportOrderId = row['transportOrderId'];
            if (!transportOrderId) {
              console.warn('缺少运输订单ID');
              return;
            }

            // 获取订单详情（使用缓存）
            const orderDetail = await loadOrderDetailCached(transportOrderId);
            if (!orderDetail || !orderDetail.transportOrder) {
              console.warn('未找到订单详情');
              return;
            }

            const transportOrder = orderDetail.transportOrder;
            console.log('transportOrder:', transportOrder);

            // 根据单位类型填充数量
            switch (unitName.toLowerCase()) {
              case '毛重':
                row['quantity'] = transportOrder.kgs || 0;
                break;
              case '尺码':
                row['quantity'] = transportOrder.cbm || 0;
                break;
              case '件数':
                row['quantity'] = transportOrder.pkgs || 0;
                break;
              case 'teu': {
                // TEU需要根据订单中的箱型信息计算
                const orderCtns = transportOrder.orderCtns;
                if (!orderCtns || orderCtns.length === 0) {
                  row['quantity'] = 0;
                  console.log(
                    '✅ [fillOrderQuantity] TEU数量为 0（无箱型数据）',
                  );
                  break;
                }

                // 计算所有箱型的TEU总和
                let totalTeu = 0;
                for (const ctn of orderCtns) {
                  if (!ctn.ctnCodeId) {
                    console.warn(
                      '⚠️ [fillOrderQuantity] 箱型缺少ctnCodeId:',
                      ctn,
                    );
                    continue;
                  }

                  try {
                    // 使用缓存获取集装箱详情以获取TEU值
                    const ctnDetail = await loadCtnCodeCached(ctn.ctnCodeId);
                    if (
                      ctnDetail &&
                      ctnDetail.teu !== undefined &&
                      ctnDetail.teu !== null
                    ) {
                      totalTeu += ctnDetail.teu;
                      console.log(
                        `📦 [fillOrderQuantity] 箱型 ${ctn.ctnCodeName} TEU: ${ctnDetail.teu}`,
                      );
                    } else {
                      console.warn(
                        `⚠️ [fillOrderQuantity] 箱型 ${ctn.ctnCodeName} 未找到TEU值`,
                      );
                    }
                  } catch (error) {
                    console.error(
                      `❌ [fillOrderQuantity] 获取箱型 ${ctn.ctnCodeId} 详情失败:`,
                      error,
                    );
                  }
                }

                row['quantity'] = totalTeu;
                console.log('✅ [fillOrderQuantity] TEU总数量:', totalTeu);
                break;
              }
              default:
                row['quantity'] = 1;
            }
          } catch (error) {
            console.error('填充订单数量失败:', error);
          }
        }

        /**
         * 根据行业类别从订单详情中获取对应的结算对象
         */
        async function fillSettlementIdByIndustryCategory(
          row: any,
          industryCategory: string,
        ) {
          try {
            const transportOrderId = row['transportOrderId'];
            if (!transportOrderId) {
              console.warn('缺少运输订单ID，无法填充结算对象');
              return;
            }

            // 获取订单详情（使用缓存）
            const orderDetail = await loadOrderDetailCached(transportOrderId);
            if (!orderDetail) {
              console.warn('未找到订单详情');
              return;
            }

            let settlementId: string | number | undefined;

            // 根据行业类别映射到对应的字段
            switch (industryCategory.toLowerCase()) {
              case 'b': // 发货人
                settlementId = orderDetail.transportOrder?.shipperId;
                break;
              case 'c': // 场站
                settlementId = orderDetail.yardId;
                break;
              case 'e': // 收货人
                settlementId = orderDetail.transportOrder?.consigneeId;
                break;
              case 'f': // 报关行
                settlementId = orderDetail.transportOrder?.custBrokerId;
                break;
              case 'h': // 通知人
                settlementId = orderDetail.transportOrder?.notifierId;
                break;
              case 'i': // 车队
                settlementId = orderDetail.transportOrder?.teamId;
                break;
              case 'n': // 船代
                settlementId = orderDetail.shipAgentId;
                break;
              case 'o': // 订舱代理
                settlementId = orderDetail.bookingAgentId;
                break;
              case 'p': // 委托单位
                settlementId = orderDetail.transportOrder?.clientId;
                break;
              case 'q': // 仓库
                settlementId = orderDetail.transportOrder?.warehouseId;
                break;
              case 'r': // 保险公司
                settlementId = orderDetail.transportOrder?.insuranceId;
                break;
              case 's': // 国外代理
                settlementId = orderDetail.podAgentId;
                break;
              default:
                console.warn(`未识别的行业类别: ${industryCategory}`);
                return;
            }

            // 如果找到了对应的结算对象ID，则填充
            if (settlementId !== undefined && settlementId !== null) {
              row['settlementId'] = String(settlementId);
              console.log(
                `自动填充结算对象: ${settlementId} (行业类别: ${industryCategory})`,
              );
            } else {
              console.warn(
                `订单中未找到行业类别 ${industryCategory} 对应的结算对象`,
              );
            }
          } catch (error) {
            console.error('填充结算对象失败:', error);
          }
        }

        return h(FeeCodeSelect, finalProps);
      },
    });
    vxeUI.renderer.add('CellClientSelect', {
      renderTableDefault({ attrs, props }, { column, row }) {
        // 处理动态 disabled 属性
        const finalProps: any = {
          ...attrs,
          ...props,
          modelValue: row[column.field],
          'onUpdate:modelValue': onChange,
        };

        // 如果 disabled 是函数，则调用它并传入 row
        if (typeof finalProps.disabled === 'function') {
          finalProps.disabled = finalProps.disabled(row);
        }

        async function onChange(newVal: any) {
          if (!newVal) {
            row[column.field] = newVal;
            return;
          }

          // 更新当前字段的值
          row[column.field] = newVal;

          // 如果是结算对象字段变化，需要根据行业类别自动切换
          if (column.field === 'settlementId' && row['industryCategory']) {
            console.log('结算对象变化，检查是否需要自动切换');
            // 这里可以添加额外的逻辑，比如验证结算对象是否与行业类别匹配
          }
        }
        return h(ClientSelect, finalProps);
      },
    });

    // 注册行业类别选择器渲染器
    vxeUI.renderer.add('CellIndustryCategorySelect', {
      renderTableDefault({ attrs, props }, { column, row }) {
        // 处理动态 disabled 属性
        const finalProps: any = {
          ...attrs,
          ...props,
          modelValue: row[column.field],
          'onUpdate:modelValue': onChange,
        };

        // 如果 disabled 是函数，则调用它并传入 row
        if (typeof finalProps.disabled === 'function') {
          finalProps.disabled = finalProps.disabled(row);
        }

        async function onChange(newVal: any) {
          if (!newVal && newVal !== 0) {
            row[column.field] = newVal;
            return;
          }

          // 更新当前字段的值（存储的是key数字）
          row[column.field] = newVal;

          console.log('行业类别变化:', newVal);

          // 将key转换为value（字母代码）用于联动逻辑
          const industryCategoryValue = getIndustryCategoryOptions().find(
            (item) => item.key === newVal,
          )?.value;

          if (industryCategoryValue) {
            console.log('行业类别value:', industryCategoryValue);
            // 根据行业类别自动切换结算对象
            await fillSettlementIdByIndustryCategory(
              row,
              industryCategoryValue,
            );
          }
        }

        /**
         * 根据行业类别从订单详情中获取对应的结算对象
         */
        async function fillSettlementIdByIndustryCategory(
          row: any,
          industryCategory: string,
        ) {
          try {
            const transportOrderId = row['transportOrderId'];
            if (!transportOrderId) {
              console.warn('缺少运输订单ID，无法填充结算对象');
              return;
            }

            // 获取订单详情（使用缓存）
            const orderDetail = await loadOrderDetailCached(transportOrderId);
            if (!orderDetail) {
              console.warn('未找到订单详情');
              return;
            }

            let settlementId: string | number | undefined;

            // 根据行业类别映射到对应的字段
            switch (industryCategory.toLowerCase()) {
              case 'p': // 委托单位
                settlementId = orderDetail.transportOrder?.clientId;
                break;
              case 'b': // 发货人
                settlementId = orderDetail.transportOrder?.shipperId;
                break;
              case 'e': // 收货人
                settlementId = orderDetail.transportOrder?.consigneeId;
                break;
              case 'h': // 通知人
                settlementId = orderDetail.transportOrder?.notifierId;
                break;
              case 'c': // 场站
                settlementId = orderDetail.yardId;
                break;
              case 'q': // 仓库
                settlementId = orderDetail.transportOrder?.warehouseId;
                break;
              case 'i': // 车队
                settlementId = orderDetail.transportOrder?.teamId;
                break;
              case 'f': // 报关行
                settlementId = orderDetail.transportOrder?.custBrokerId;
                break;
              case 'r': // 保险公司
                settlementId = orderDetail.transportOrder?.insuranceId;
                break;
              case 'o': // 订舱代理
                settlementId = orderDetail.bookingAgentId;
                break;
              case 'n': // 船代
                settlementId = orderDetail.shipAgentId;
                break;
              case 's': // 目的港代理
                settlementId = orderDetail.podAgentId;
                break;
              default:
                console.warn(`未识别的行业类别: ${industryCategory}`);
                return;
            }

            // 如果找到了对应的结算对象ID，则填充
            if (settlementId !== undefined && settlementId !== null) {
              row['settlementId'] = String(settlementId);
              console.log(
                `自动填充结算对象: ${settlementId} (行业类别: ${industryCategory})`,
              );

              // 触发表格重新渲染
              if (attrs?.onIndustryCategoryChange) {
                await attrs.onIndustryCategoryChange(industryCategory, row);
              }
            } else {
              console.warn(
                `订单中未找到行业类别 ${industryCategory} 对应的结算对象`,
              );
            }
          } catch (error) {
            console.error('填充结算对象失败:', error);
          }
        }

        return h(IndustryCategorySelect, finalProps);
      },
    });
    vxeUI.renderer.add('CurrencySelect', {
      renderTableDefault({ attrs, props }, { column, row }) {
        // 处理动态 disabled 属性
        const finalProps: any = {
          ...attrs,
          ...props,
          modelValue: row[column.field],
          'onUpdate:modelValue': onChange,
        };

        // 如果 disabled 是函数，则调用它并传入 row
        if (typeof finalProps.disabled === 'function') {
          finalProps.disabled = finalProps.disabled(row);
        }

        async function onChange(newVal: any) {
          // 更新当前字段的值
          row[column.field] = newVal;

          console.log('currendIds change', newVal, props?.type);

          // 如果选择了币别，自动获取对应的汇率；如果清空币别，则清空汇率
          if (newVal) {
            try {
              // 先获取汇率详情
              const exchangeRateData = await getExchangeRateDetail(newVal);

              // 判断是否为本位币：需要查询订单所属公司的本位币
              let isLocalCurrency = false;

              // 从row中获取运输订单ID
              const transportOrderId = row['transportOrderId'];

              if (transportOrderId) {
                try {
                  // 获取订单详情（使用缓存）
                  const orderDetail =
                    await loadOrderDetailCached(transportOrderId);

                  if (
                    orderDetail &&
                    orderDetail.companys &&
                    orderDetail.companys.length > 0
                  ) {
                    // 获取第一个所属公司（通常只有一个）
                    const company = orderDetail.companys[0];

                    // 检查该公司的本位币是否与当前选择的币别一致
                    if (company?.localCurrencyId === newVal) {
                      isLocalCurrency = true;
                    }
                  }
                } catch (error) {
                  console.error('获取订单详情失败:', error);
                }
              }

              // 如果是本位币，汇率固定为1且禁用编辑
              if (isLocalCurrency) {
                row['exchangeRate'] = 1;

                // 设置汇率字段为禁用状态
                const exchangeRateEditingKey = `__editing_exchangeRate`;
                row[exchangeRateEditingKey] = false;

                // 标记该行为本位币，用于在CellEditableNumber渲染器中禁用
                row['__isLocalCurrency'] = true;

                console.log('检测到本位币，汇率固定为1且不可修改');
              } else {
                // 非本位币，使用正常汇率
                row['exchangeRate'] = props?.type
                  ? exchangeRateData.drValue
                  : exchangeRateData.crValue;
                row['__isLocalCurrency'] = false;
              }
            } catch (error) {
              console.error('获取汇率详情失败:', error);
            }
          } else {
            // 清空币别时，同时清空汇率
            row['exchangeRate'] = undefined;
            row['__isLocalCurrency'] = false;
          }
        }
        return h(CurrencySelect, finalProps);
      },
    });
    vxeUI.renderer.add('ExchangeRateSelect', {
      renderTableDefault({ attrs, props }, { column, row }) {
        // 处理动态 disabled 属性
        const finalProps: any = {
          ...attrs,
          ...props,
          modelValue: row[column.field],
          'onUpdate:modelValue': onChange,
        };

        // 如果 disabled 是函数，则调用它并传入 row
        if (typeof finalProps.disabled === 'function') {
          finalProps.disabled = finalProps.disabled(row);
        }

        function onChange(newVal: any) {
          // 允许清空汇率字段
          row[column.field] = newVal;
        }
        return h(ExchangeRateSelect, finalProps);
      },
    });
    vxeUI.renderer.add('CellUnitSelect', {
      renderTableDefault({ attrs, props }, { column, row }) {
        // 动态获取 unitOptions，如果 props 中提供了函数则调用它
        let dynamicUnitOptions = props?.unitOptions;
        if (typeof dynamicUnitOptions === 'function') {
          dynamicUnitOptions = dynamicUnitOptions();
        }

        // 处理动态 disabled 属性
        const finalProps: any = {
          ...attrs,
          ...props,
          unitOptions: dynamicUnitOptions, // 使用动态获取的 options
          modelValue: row[column.field],
          'onUpdate:modelValue': onChange,
        };

        // 如果 disabled 是函数，则调用它并传入 row
        if (typeof finalProps.disabled === 'function') {
          finalProps.disabled = finalProps.disabled(row);
        }

        async function onChange(newVal: any) {
          // 更新当前字段的值
          row[column.field] = newVal;

          console.log('📦 [CellUnitSelect.onChange] 单位变化:', newVal);

          if (!newVal) {
            // 清空单位时，不自动清空数量（保留用户手动输入的值）
            return;
          }

          // 根据单位类型自动填充数量
          await fillQuantityByUnit(row, newVal);
        }

        /**
         * 根据单位类型自动填充数量
         */
        async function fillQuantityByUnit(row: any, unitName: string) {
          try {
            const transportOrderId = row['transportOrderId'];
            if (!transportOrderId) {
              console.warn('⚠️ [fillQuantityByUnit] 缺少运输订单ID');
              return;
            }

            // 获取订单详情（使用缓存）
            const orderDetail = await loadOrderDetailCached(transportOrderId);
            if (!orderDetail || !orderDetail.transportOrder) {
              console.warn('⚠️ [fillQuantityByUnit] 未找到订单详情');
              return;
            }

            const transportOrder = orderDetail.transportOrder;
            const unitNameLower = unitName.toLowerCase();

            console.log(
              '🔍 [fillQuantityByUnit] 单位:',
              unitName,
              '单位小写:',
              unitNameLower,
            );

            // 根据单位类型填充数量
            if (unitNameLower === '票' || unitNameLower === 'order') {
              // 票：数量固定为 1
              row['quantity'] = 1;
              console.log('✅ [fillQuantityByUnit] 票数量: 1');
            } else if (
              unitNameLower === '毛重' ||
              unitNameLower === 'kgs' ||
              unitNameLower === 'weight'
            ) {
              // 重量：从订单获取 KGS
              row['quantity'] = transportOrder.kgs || 0;
              console.log('✅ [fillQuantityByUnit] 重量:', row['quantity']);
            } else if (
              unitNameLower === '尺码' ||
              unitNameLower === 'cbm' ||
              unitNameLower === 'measurement'
            ) {
              // 尺码：从订单获取 CBM
              row['quantity'] = transportOrder.cbm || 0;
              console.log('✅ [fillQuantityByUnit] 尺码:', row['quantity']);
            } else if (
              unitNameLower === '件数' ||
              unitNameLower === 'pkgs' ||
              unitNameLower === 'packages'
            ) {
              // 件数：从订单获取 PKGS
              row['quantity'] = transportOrder.pkgs || 0;
              console.log('✅ [fillQuantityByUnit] 件数:', row['quantity']);
            } else if (unitNameLower === 'teu') {
              // TEU需要根据订单中的箱型信息计算
              const orderCtns = transportOrder.orderCtns;
              if (!orderCtns || orderCtns.length === 0) {
                row['quantity'] = 0;
                console.log(
                  '✅ [fillQuantityByUnit] TEU数量为 0（无箱型数据）',
                );
              } else {
                // 计算所有箱型的TEU总和
                let totalTeu = 0;
                for (const ctn of orderCtns) {
                  if (!ctn.ctnCodeId) {
                    console.warn(
                      '⚠️ [fillQuantityByUnit] 箱型缺少ctnCodeId:',
                      ctn,
                    );
                    continue;
                  }

                  try {
                    // 使用缓存获取集装箱详情以获取TEU值
                    const ctnDetail = await loadCtnCodeCached(ctn.ctnCodeId);
                    if (
                      ctnDetail &&
                      ctnDetail.teu !== undefined &&
                      ctnDetail.teu !== null
                    ) {
                      totalTeu += ctnDetail.teu;
                      console.log(
                        `📦 [fillQuantityByUnit] 箱型 ${ctn.ctnCodeName} TEU: ${ctnDetail.teu}`,
                      );
                    } else {
                      console.warn(
                        `⚠️ [fillQuantityByUnit] 箱型 ${ctn.ctnCodeName} 未找到TEU值`,
                      );
                    }
                  } catch (error) {
                    console.error(
                      `❌ [fillQuantityByUnit] 获取箱型 ${ctn.ctnCodeId} 详情失败:`,
                      error,
                    );
                  }
                }

                row['quantity'] = totalTeu;
                console.log('✅ [fillQuantityByUnit] TEU总数量:', totalTeu);
              }
            } else if (unitNameLower !== '') {
              // 箱型：查询订单的箱型列表数量
              if (
                transportOrder.orderCtns &&
                transportOrder.orderCtns.length > 0
              ) {
                row['quantity'] = transportOrder.orderCtns.filter(
                  (ctn) => ctn.ctnCodeName === unitName,
                ).length;
                console.log(
                  '✅ [fillQuantityByUnit] 箱型数量:',
                  row['quantity'],
                );
              } else {
                row['quantity'] = 0;
                console.log('✅ [fillQuantityByUnit] 箱型数量为 0');
              }
            } else {
              // 其他单位：默认数量为 1
              row['quantity'] = 1;
              console.log('✅ [fillQuantityByUnit] 默认数量: 1');
            }
          } catch (error) {
            console.error('❌ [fillQuantityByUnit] 填充数量失败:', error);
          }
        }

        return h(UnitSelect, finalProps);
      },
    });
    vxeUI.renderer.add('Select', {
      renderTableDefault({ options, attrs, props }, { column, row }) {
        const finallyProps: any = {
          ...attrs,
          ...props,
          value: row[column.field],
          options,
          style: { width: '100%' },
          'onUpdate:value': onChange,
        };

        // 如果 disabled 是函数，则调用它并传入 row
        if (typeof finallyProps.disabled === 'function') {
          finallyProps.disabled = finallyProps.disabled(row);
        }

        function onChange(newVal: any) {
          if (newVal) {
            row[column.field] = newVal;
          }
        }
        return h(Select, finallyProps);
      },
    });
    //注册输入框渲染器
    vxeUI.renderer.add('CellInput', {
      // 表格默认模式渲染
      renderTableDefault(
        { attrs, props },
        { column, row, _columnIndex, _rowIndex },
      ) {
        const {
          disabled,
          readOnly,
          placeholder,
          maxLength,
          autoSize,
          ...otherProps
        } = props || {};
        // 处理loading状态
        const loadingKey = `__loading_${column.field}`;
        const inputValue = ref(row[column.field]);

        const finalProps = {
          ...otherProps,
          disabled:
            typeof disabled === 'function' ? disabled(row, column) : disabled,
          readOnly:
            typeof readOnly === 'function' ? readOnly(row, column) : readOnly,
          placeholder: placeholder,
          maxLength: maxLength || 100,
          autoSize: autoSize || {
            minRows: 1,
            maxRows: 4,
          },
          value: inputValue.value,
          loading: row[loadingKey] ?? false,
          allowClear: true,
          bordered: false,
          onChange: (e: any) => {
            const newVal = e.target.value;
            inputValue.value = newVal;
            console.log('inputValue', newVal);
            row[loadingKey] = true;
            Promise.resolve(
              attrs?.onChange?.(newVal, row, column, _rowIndex, _columnIndex),
            )
              .then((result) => {
                if (result !== false) {
                  row[column.field] = newVal;
                }
                // 含税单价 变化 同时更新 含税金额 不含税单价 不含税金额
                if (column.field === 'unitPrice' && newVal !== '') {
                  if (row['quantity']) {
                    // 同时更新 含税金额 字段
                    let amount = newVal * row['quantity'];
                    row[column.field.replace('unitPrice', 'amount')] = amount;
                  }
                  // 税率变化 或者 税率已存在 都需要更新 不含税单价 和 不含税金额
                  if (row['taxRate'] !== undefined) {
                    // 同时更新 不含税单价 字段
                    row[column.field.replace('unitPrice', 'noTaxUnitPrice')] = (
                      newVal /
                      (1 + row['taxRate'] / 100)
                    ).toFixed(4);
                    if (row['quantity']) {
                      // 同时更新 不含税金额 字段
                      row[column.field.replace('unitPrice', 'noTaxAmount')] = (
                        (newVal / (1 + row['taxRate'] / 100)) *
                        row['quantity']
                      ).toFixed(2);
                    }
                  }
                }

                if (column.field === 'quantity' && newVal !== '') {
                  if (row['unitPrice']) {
                    // 同时更新 含税金额 字段
                    row[column.field.replace('quantity', 'amount')] = (
                      newVal * row['unitPrice']
                    ).toFixed(2);
                  }
                  if (row['unitPrice'] && row['taxRate'] !== undefined) {
                    // 同时更新 不含税金额 字段
                    const noTaxUnitPrice =
                      row['unitPrice'] / (1 + (row['taxRate'] || 0) / 100);
                    row[column.field.replace('quantity', 'noTaxAmount')] = (
                      noTaxUnitPrice * newVal
                    ).toFixed(2);
                  }
                }
                if (column.field === 'taxRate' && newVal !== '') {
                  if (row['unitPrice']) {
                    // 同时更新 不含税单价 字段
                    row[column.field.replace('taxRate', 'noTaxUnitPrice')] = (
                      row['unitPrice'] /
                      (1 + newVal / 100)
                    ).toFixed(4);

                    // 同时更新 不含税金额 字段
                    row[column.field.replace('taxRate', 'noTaxAmount')] = (
                      row['noTaxUnitPrice'] * row['quantity']
                    ).toFixed(2);
                  }
                }

                // 含税金额 变化 同时更新 含税单价、不含税单价、不含税金额
                if (column.field === 'amount' && newVal !== '') {
                  const amountValue = Number(newVal);
                  const quantity = row['quantity'];
                  const taxRate = row['taxRate'];

                  if (quantity && quantity !== 0) {
                    // 1. 计算含税单价 = 含税金额 / 数量
                    const unitPrice = amountValue / quantity;
                    row['unitPrice'] = Number(unitPrice.toFixed(4));

                    // 2. 如果存在税率，计算不含税单价和不含税金额
                    if (taxRate !== undefined && taxRate !== null) {
                      // 不含税单价 = 含税单价 / (1 + 税率/100)
                      const noTaxUnitPrice = unitPrice / (1 + taxRate / 100);
                      row['noTaxUnitPrice'] = Number(noTaxUnitPrice.toFixed(4));

                      // 不含税金额 = 不含税单价 × 数量
                      const noTaxAmount = noTaxUnitPrice * quantity;
                      row['noTaxAmount'] = Number(noTaxAmount.toFixed(2));
                    }
                  }
                }
              })
              .finally(() => {
                row[loadingKey] = false;
              });
          },
        };
        return h(Input, {
          ...finalProps,
          style: {
            width: '100%',
            border: '1px solid #e4e4e7',
            borderRadius: '6px',
          },
        });
      },
    });

    /**
     * 可编辑数字单元格渲染器 - 支持双击编辑，带确认按钮
     */
    vxeUI.renderer.add('CellEditableNumber', {
      renderTableDefault(
        { attrs, props },
        { column, row, _columnIndex, _rowIndex },
      ) {
        // 使用row上的属性来存储编辑状态
        const editingKey = `__editing_${column.field}`;
        const editingValueKey = `__editingValue_${column.field}`;
        const loadingKey = `__loading_${column.field}`;

        // 初始化编辑状态
        if (row[editingKey] === undefined) {
          row[editingKey] = false;
        }
        if (row[editingValueKey] === undefined) {
          row[editingValueKey] = row[column.field];
        }

        // 检查是否为汇率字段且为本位币，如果是则禁止编辑
        const isExchangeRateField = column.field === 'exchangeRate';
        const isLocalCurrency = row['__isLocalCurrency'] === true;
        const isDisabled = isExchangeRateField && isLocalCurrency;

        function handleDoubleClick(e: MouseEvent) {
          // 如果字段被禁用，不允许进入编辑模式
          if (isDisabled) {
            e.stopPropagation();
            return;
          }

          e.stopPropagation();
          row[editingKey] = true;
          row[editingValueKey] = row[column.field];
        }

        function handleConfirm() {
          const newValue = Number(row[editingValueKey]);
          if (isNaN(newValue)) {
            message.warning('请输入有效的数字');
            return;
          }

          row[loadingKey] = true;
          Promise.resolve(
            attrs?.onConfirm?.(newValue, row, column, _rowIndex, _columnIndex),
          )
            .then((result) => {
              if (result !== false) {
                row[column.field] = newValue;
                row[editingKey] = false;
              }
            })
            .catch(() => {
              message.error('保存失败');
            })
            .finally(() => {
              row[loadingKey] = false;
            });
        }

        function handleCancel() {
          row[editingKey] = false;
          row[editingValueKey] = row[column.field];
        }

        function handleKeyPress(e: KeyboardEvent) {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleConfirm();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
          }
        }

        // 检查是否处于编辑模式
        const isEditing = row[editingKey];

        if (isEditing) {
          return h('div', { class: 'flex items-center gap-1' }, [
            h(Input, {
              value: row[editingValueKey],
              size: 'small',
              placeholder: '请输入',
              onPressEnter: handleConfirm,
              onKeydown: handleKeyPress,
              onChange: (e: any) => {
                row[editingValueKey] = e.target.value;
              },
              style: { flex: 1 },
              autofocus: true,
            }),
            h(
              Button,
              {
                type: 'primary',
                size: 'small',
                onClick: handleConfirm,
                loading: row[loadingKey],
              },
              {
                default: () => '确认',
              },
            ),
            h(
              Button,
              {
                size: 'small',
                onClick: handleCancel,
              },
              {
                default: () => '取消',
              },
            ),
          ]);
        }

        // 非编辑模式：显示可双击的值
        const displayValue =
          row[column.field] !== undefined && row[column.field] !== null
            ? Number(row[column.field]).toFixed(2)
            : '-';

        // 如果是本位币的汇率字段，显示特殊样式和提示
        if (isDisabled) {
          return h(
            'div',
            {
              class:
                'cell-editable-number px-2 py-1 bg-gray-50 text-gray-500 cursor-not-allowed',
              title: '本位币汇率固定为1，不可修改',
              style: {
                userSelect: 'none',
                WebkitUserSelect: 'none',
              },
            },
            displayValue,
          );
        }

        // 关键修复：使用原生DOM事件绑定并阻止冒泡
        return h(
          'div',
          {
            class:
              'cell-editable-number cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors',
            onDblclick: handleDoubleClick,
            title: '双击编辑',
            style: {
              userSelect: 'none',
              WebkitUserSelect: 'none',
            },
          },
          displayValue,
        );
      },
    });

    /**
     * 注册表格的操作按钮渲染器
     */
    vxeUI.renderer.add('CellOperation', {
      renderTableDefault({ attrs, options, props }, { column, row }) {
        const defaultProps = { size: 'small', type: 'link', ...props };
        let align = 'end';
        switch (column.align) {
          case 'center': {
            align = 'center';
            break;
          }
          case 'left': {
            align = 'start';
            break;
          }
          default: {
            align = 'end';
            break;
          }
        }
        const presets: Recordable<Recordable<any>> = {
          delete: {
            danger: true,
            text: $t('common.delete'),
          },
          edit: {
            text: $t('common.edit'),
          },
          more: {
            text: $t('common.more'),
          },
        };

        function resolveOperationOpt(opt: string | Recordable<any>) {
          if (isString(opt)) {
            return presets[opt]
              ? { code: opt, ...presets[opt], ...defaultProps }
              : {
                  code: opt,
                  text: $te(`common.${opt}`) ? $t(`common.${opt}`) : opt,
                  ...defaultProps,
                };
          }
          return { ...defaultProps, ...presets[opt.code], ...opt };
        }

        function resolveOperationBtn(opt: Recordable<any>) {
          const optBtn: Recordable<any> = {};
          Object.keys(opt).forEach((key) => {
            if (key === 'children' && Array.isArray(opt.children)) {
              optBtn.children = opt.children
                .map((child: string | Recordable<any>) =>
                  resolveOperationBtn(resolveOperationOpt(child)),
                )
                .filter((child: Recordable<any>) => child.show !== false);
              return;
            }
            optBtn[key] = isFunction(opt[key]) ? opt[key](row) : opt[key];
          });
          return optBtn;
        }

        const operations: Array<Recordable<any>> = (
          options || ['edit', 'delete']
        )
          .map((opt) => resolveOperationBtn(resolveOperationOpt(opt)))
          .filter((opt) => opt.show !== false);

        function renderBtn(opt: Recordable<any>, listen = true) {
          const { children: _children, show: _show, ...btnOpt } = opt;
          return h(
            Button,
            {
              ...props,
              ...btnOpt,
              icon: undefined,
              onClick: listen
                ? () =>
                    attrs?.onClick?.({
                      code: opt.code,
                      row,
                    })
                : undefined,
            },
            {
              default: () => {
                const content = [];
                if (opt.icon) {
                  content.push(
                    h(IconifyIcon, { class: 'size-5', icon: opt.icon }),
                  );
                }
                content.push(opt.text);
                return content;
              },
            },
          );
        }

        function triggerOperation(code: string) {
          attrs?.onClick?.({
            code,
            row,
          });
        }

        function renderConfirm(opt: Recordable<any>) {
          let viewportWrapper: HTMLElement | null = null;
          const { children: _children, show: _show, ...confirmOpt } = opt;
          return h(
            Popconfirm,
            {
              /**
               * 当popconfirm用在固定列中时，将固定列作为弹窗的容器时可能会因为固定列较窄而无法容纳弹窗
               * 将表格主体区域作为弹窗的容器时又会因为固定列的层级较高而遮挡弹窗
               * 将body或者表格视口区域作为弹窗容器时又会导致弹窗无法跟随表格滚动。
               * 鉴于以上各种情况，一种折中的解决方案是弹出层展示时，禁止操作表格的滚动条。
               * 这样既解决了弹窗的遮挡问题，又不至于让弹窗随着表格的滚动而跑出视口区域。
               */
              getPopupContainer(el) {
                viewportWrapper = el.closest('.vxe-table--viewport-wrapper');
                return document.body;
              },
              placement: 'topLeft',
              title: $t('ui.actionTitle.delete', [attrs?.nameTitle || '']),
              ...props,
              ...confirmOpt,
              icon: undefined,
              onOpenChange: (open: boolean) => {
                // 当弹窗打开时，禁止表格的滚动
                if (open) {
                  viewportWrapper?.style.setProperty('pointer-events', 'none');
                } else {
                  viewportWrapper?.style.removeProperty('pointer-events');
                }
              },
              onConfirm: () => {
                triggerOperation(opt.code);
              },
            },
            {
              default: () => renderBtn({ ...opt }, false),
              description: () =>
                h(
                  'div',
                  { class: 'truncate' },
                  $t('ui.actionMessage.deleteConfirm', [
                    resolveCellOperationRowName(row, attrs),
                  ]),
                ),
            },
          );
        }

        function renderMore(opt: Recordable<any>) {
          const children = Array.isArray(opt.children) ? opt.children : [];
          if (children.length === 0) {
            return null;
          }
          return h(
            Dropdown,
            {
              trigger: ['click'],
              getPopupContainer: () => document.body,
            },
            {
              default: () => renderBtn({ ...opt, code: 'more' }, false),
              overlay: () =>
                h(
                  Menu,
                  {
                    onClick: ({ key }: { key: string | number }) => {
                      const child = children.find(
                        (item: Recordable<any>) =>
                          String(item.code) === String(key),
                      );
                      if (!child) {
                        return;
                      }
                      if (child.code === 'delete') {
                        Modal.confirm({
                          title: $t('ui.actionTitle.delete', [
                            attrs?.nameTitle || '',
                          ]),
                          content: $t('ui.actionMessage.deleteConfirm', [
                            resolveCellOperationRowName(row, attrs),
                          ]),
                          okType: 'danger',
                          onOk: () => triggerOperation(child.code),
                        });
                        return;
                      }
                      triggerOperation(child.code);
                    },
                  },
                  () =>
                    children.map((child: Recordable<any>) =>
                      h(
                        Menu.Item,
                        {
                          key: child.code,
                          danger: child.danger === true,
                        },
                        () => child.text,
                      ),
                    ),
                ),
            },
          );
        }

        const btns = operations
          .map((opt) => {
            if (Array.isArray(opt.children) && opt.children.length > 0) {
              return renderMore(opt);
            }
            if (opt.code === 'delete') {
              return renderConfirm(opt);
            }
            return renderBtn(opt);
          })
          .filter(Boolean);
        return h(
          'div',
          {
            class: 'flex table-operations',
            style: { justifyContent: align },
          },
          btns,
        );
      },
    });

    // 这里可以自行扩展 vxe-table 的全局配置，比如自定义格式化
    // vxeUI.formats.add
  },
  useVbenForm,
});

function handleRemoteSortChange(
  params: Recordable<any>,
  listKey: string,
  defaultSort?: string,
  onSyncStart?: () => void,
  onSyncEnd?: () => void,
) {
  const grid = params?.$grid ?? params?.$table;
  if (!listKey) {
    return;
  }

  const sessionList = getSortSessionList(listKey);
  const uiSortList =
    sessionList.length > 0 ? sessionList : parseAbpSorting(defaultSort);
  onSyncStart?.();
  try {
    syncGridSortFromSession(grid, uiSortList);
  } finally {
    onSyncEnd?.();
  }
}

function enhanceGridOptionsForRemoteSort(
  options: Recordable<any>,
  listKey: string,
) {
  const gridOptions = options?.gridOptions;
  if (!gridOptions || !isRemoteSortEnabled(gridOptions)) {
    return options;
  }

  const queryFn = gridOptions?.proxyConfig?.ajax?.query;
  if (!isPagedListQuery(queryFn)) {
    return options;
  }

  const pagedSortOptions = queryFn.__pagedSortOptions ?? {};
  const defaultSort = pagedSortOptions.defaultSort;
  const columns =
    applyDefaultSortable(gridOptions.columns) ?? gridOptions.columns;
  const effectiveSortList = getEffectiveSortList(listKey, defaultSort);
  const userSortChange = options.gridEvents?.sortChange;
  let isSyncingSort = false;

  const wrappedQuery = async (
    params: Recordable<any>,
    formValues: Recordable<any>,
  ) => {
    return runWithSortContext(
      {
        listKey,
        columns,
        defaultSort,
        fieldMap: pagedSortOptions.fieldMap,
      },
      () => queryFn(params, formValues),
    );
  };

  return {
    ...options,
    gridEvents: {
      ...options.gridEvents,
      sortChange: (params: Recordable<any>) => {
        if (isSyncingSort) {
          return;
        }
        handleRemoteSortChange(
          params,
          listKey,
          defaultSort,
          () => {
            isSyncingSort = true;
          },
          () => {
            isSyncingSort = false;
          },
        );
        if (isFunction(userSortChange)) {
          userSortChange(params);
        }
      },
    },
    gridOptions: {
      ...gridOptions,
      columns,
      proxyConfig: {
        ...gridOptions.proxyConfig,
        sort: true,
        ajax: {
          ...gridOptions.proxyConfig?.ajax,
          query: wrappedQuery,
        },
      },
      sortConfig: {
        ...gridOptions.sortConfig,
        remote: true,
        multiple: true,
        chronological: true,
        allowClear: true,
        defaultSort: toVxeDefaultSort(effectiveSortList),
      },
    },
  };
}

export const useVbenVxeGrid = <T extends Record<string, any>>(
  ...rest: Parameters<typeof useGrid<T, ComponentType>>
) => {
  const route = useRoute();
  const tableConfigStore = useTableConfigStore();
  const [options, ...otherArgs] = rest;
  const fallbackTableId = String(route.name ?? route.path ?? '').trim();
  const gridTableId = String(options?.gridOptions?.id ?? '').trim();
  const preferredTableId =
    options?.columnPersist?.tableId || gridTableId || fallbackTableId;
  const debugPrefix = '[vxe-column-persist-adapter]';
  const debugStorageKey = '__debug_vxe_persist';
  const isDebugEnabled = () => {
    try {
      return (
        typeof window !== 'undefined' &&
        ['1', 'true'].includes(
          String(
            window.localStorage?.getItem(debugStorageKey) ?? '',
          ).toLowerCase(),
        )
      );
    } catch {
      return false;
    }
  };
  const debugLog = (message: string, payload?: Record<string, any>) => {
    if (!isDebugEnabled()) {
      return;
    }
    if (payload) {
      console.log(`${debugPrefix} ${message}`, payload);
      return;
    }
    console.log(`${debugPrefix} ${message}`);
  };

  const finalOptions = options
    ? enhanceGridOptionsForRemoteSort(
        {
          ...options,
          columnPersist: {
            ...options.columnPersist,
            tableId: preferredTableId,
            load:
              options.columnPersist?.load ??
              (async ({ keyword }) => {
                await tableConfigStore.loadTableConfigsOnce();
                const hit = tableConfigStore.getTableConfigByName(keyword);
                debugLog('load start', {
                  fromGlobalStore: true,
                  hasLoaded: tableConfigStore.hasLoaded,
                  keyword,
                  preferredTableId,
                });
                debugLog('load result', {
                  hit,
                });
                if (!hit) {
                  return null;
                }
                return { id: hit.id, setting: hit.setting };
              }),
            add:
              options.columnPersist?.add ??
              (async ({ name, setting }) =>
                await tableConfigStore.addTableConfig({
                  name,
                  setting,
                })),
            edit:
              options.columnPersist?.edit ??
              (async ({ id, name, setting }) =>
                await tableConfigStore.editTableConfig({
                  id,
                  name,
                  setting,
                })),
            remove:
              options.columnPersist?.remove ??
              (async ({ id }) => await tableConfigStore.removeTableConfig(id)),
          },
          searchPersist: {
            ...options.searchPersist,
            tableId: preferredTableId,
            load:
              options.searchPersist?.load ??
              (async ({ keyword }) => {
                await tableConfigStore.loadSearchFormConfigsOnce();
                const hit = tableConfigStore.getSearchFormConfigByName(keyword);
                debugLog('search persist load start', {
                  fromGlobalStore: true,
                  hasLoaded: tableConfigStore.searchFormHasLoaded,
                  keyword,
                  preferredTableId,
                });
                debugLog('search persist load result', {
                  hit,
                });
                if (!hit) {
                  return null;
                }
                return { id: hit.id, setting: hit.setting };
              }),
            add:
              options.searchPersist?.add ??
              (async ({ name, setting }) =>
                await tableConfigStore.addSearchFormConfig({
                  name,
                  setting,
                })),
            edit:
              options.searchPersist?.edit ??
              (async ({ id, name, setting }) =>
                await tableConfigStore.editSearchFormConfig({
                  id,
                  name,
                  setting,
                })),
            remove:
              options.searchPersist?.remove ??
              (async ({ id }) =>
                await tableConfigStore.removeSearchFormConfig(id)),
          },
        },
        preferredTableId,
      )
    : options;
  debugLog('init', {
    fallbackTableId,
    gridTableId,
    preferredTableId,
    finalTableId: finalOptions?.columnPersist?.tableId,
  });
  return useGrid<T, ComponentType>(finalOptions as any, ...otherArgs);
};

export type OnActionClickParams<T = Recordable<any>> = {
  code: string;
  row: T;
};
export type OnActionClickFn<T = Recordable<any>> = (
  params: OnActionClickParams<T>,
) => void;
export type * from '@vben/plugins/vxe-table';
