<script lang="ts" setup>
import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';
import { computed, ref, watch, nextTick } from 'vue';
import { useVbenModal } from '@vben/common-ui';
import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';
import * as feeConstants from '../data';
import {
  getCurrencyEnumOptions,
  getCurrencyEnumSymbolOptions,
  getIndustryCategoryOptions,
} from '../data';
import { getSeaExportDetail } from '#/api/sea-export/sea-export-admin';
import { getFeeCodeDetail } from '#/api/system/base-data/fee-code-admin';
import { getExchangeRateDetail } from '#/api/system/base-data/exchange-rate-admin';
import { getCurrencyPagedList } from '#/api/system/base-data/currency-admin';
import { orderCtnListRef } from '../data';

// 定义Props
const props = defineProps<{
  recAmountMap: Record<string, any>;
  payAmountMap: Record<string, any>;
  feeCodeList?: any[];
}>();

// 定义Emits
const emit = defineEmits(['confirm']);

// 当前编辑的费用数据
const currentFeeData = ref<OrderFeeAdminApi.OrderFeeDto | null>(null);
const originalFeeData = ref<OrderFeeAdminApi.OrderFeeDto | null>(null);

// 订单基础数据（用于行业类别切换时自动填充结算对象）
const orderBaseData = ref<SeaExportAdminApi.SeaExportDto | null>(null);

// 订单详情加载状态标记（防止重复加载）
const isLoadingOrderDetail = ref(false);
const toSelectedItems = (id: any, name: any, labelKey = 'name') => {
  if (id == null) return [];
  return [{ id, [labelKey]: name || '' }] as any[];
};
// 统一的订单详情加载函数（带缓存和防重复加载）
const loadOrderDetailIfNeeded = async (transportOrderId: string) => {
  console.log(
    '🔍 [loadOrderDetailIfNeeded] 被调用, transportOrderId:',
    transportOrderId,
  );
  console.log(
    '🔍 [loadOrderDetailIfNeeded] 当前 orderBaseData.value:',
    orderBaseData.value,
  );
  console.log(
    '🔍 [loadOrderDetailIfNeeded] 当前 isLoadingOrderDetail:',
    isLoadingOrderDetail.value,
  );

  // 如果已经有订单数据，直接返回
  if (orderBaseData.value) {
    console.log('✅ [loadOrderDetailIfNeeded] 使用缓存的订单数据');
    return orderBaseData.value;
  }

  // 防止并发加载
  if (isLoadingOrderDetail.value) {
    console.log('⏳ [loadOrderDetailIfNeeded] 正在加载中，等待...');
    // 等待加载完成
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (!isLoadingOrderDetail.value) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 50);
    });
    console.log('✅ [loadOrderDetailIfNeeded] 等待结束，返回缓存数据');
    return orderBaseData.value;
  }

  if (!transportOrderId) {
    console.warn('⚠️ [loadOrderDetailIfNeeded] 缺少运输订单ID');
    return null;
  }

  try {
    isLoadingOrderDetail.value = true;
    console.log(
      '🔄 [loadOrderDetailIfNeeded] 开始加载订单详情:',
      transportOrderId,
    );

    const orderDetail = await getSeaExportDetail(transportOrderId);
    console.log('📥 [loadOrderDetailIfNeeded] API返回数据:', !!orderDetail);

    if (orderDetail) {
      orderBaseData.value = orderDetail;
      console.log('✅ [loadOrderDetailIfNeeded] 订单详情加载成功并已缓存');
    } else {
      console.warn('⚠️ [loadOrderDetailIfNeeded] 订单详情为空');
    }

    return orderDetail;
  } catch (error) {
    console.error('❌ [loadOrderDetailIfNeeded] 加载订单详情失败:', error);
    return null;
  } finally {
    isLoadingOrderDetail.value = false;
    console.log(
      '🏁 [loadOrderDetailIfNeeded] 加载完成，isLoadingOrderDetail设为false',
    );
  }
};

// 表单API
const [OrderFeeForm, orderFeeFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  schema: useOrderFeeFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-3',
});

// 模态框
const [Modal, modalApi] = useVbenModal({
  class: 'w-[1400px]',
  onConfirm: async () => {
    const formValues = await orderFeeFormApi.getValues();
    console.log('表单提交数据:', formValues);

    // 计算更改后的金额
    const updatedFeeData = {
      ...currentFeeData.value,
      ...formValues,
    };

    emit('confirm', {
      originalData: originalFeeData.value,
      updatedData: updatedFeeData,
    });

    modalApi.close();
  },
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      const data = modalApi.getData<any>();
      console.log('📊 [编辑模态框] 打开，接收到的数据:', data);
      console.log(
        '📊 [编辑模态框] data.orderBaseData 是否存在:',
        !!data?.orderBaseData,
      );
      console.log(
        '📊 [编辑模态框] data.feeData.transportOrderId:',
        data?.feeData?.transportOrderId,
      );

      if (data) {
        // 兼容旧的数据格式（直接传递费用数据）和新的数据格式（包含orderBaseData）
        const feeData = data.feeData || data;
        console.log('📊 [编辑模态框] 费用数据:', feeData);

        currentFeeData.value = { ...feeData };
        originalFeeData.value = { ...feeData };

        // 如果父组件已经传入了orderBaseData，直接使用；否则后续按需加载
        if (data.orderBaseData) {
          orderBaseData.value = data.orderBaseData;
          console.log('✅ [编辑模态框] 使用父组件传入的订单数据');
          console.log(
            '✅ [编辑模态框] orderBaseData.value 已设置:',
            !!orderBaseData.value,
          );
        } else {
          orderBaseData.value = null;
          console.log('⚠️ [编辑模态框] 未传入订单数据，将按需加载');
          console.log(
            '⚠️ [编辑模态框] 当前 orderBaseData.value:',
            orderBaseData.value,
          );
        }

        console.log(
          '📊 [编辑模态框] 设置的originalFeeData:',
          originalFeeData.value,
        );
        console.log(
          '📊 [编辑模态框] paySide值:',
          originalFeeData.value?.paySide,
        );

        // 在nextTick中设置表单值，确保表单已完全初始化
        nextTick(async () => {
          console.log('📊 [编辑模态框] 开始设置表单值...');

          // 打印feeData的所有字段名，用于对比
          console.log(
            '📊 [编辑模态框] feeData的字段列表:',
            Object.keys(feeData),
          );

          // ✅ 关键修复：确保currencyId和feeCodeId是ID而不是名称
          const processedFeeData = { ...feeData };

          // 处理currencyId：如果是对象，提取id；如果是字符串且看起来像名称，需要查询获取ID
          if (
            processedFeeData.currencyId !== undefined &&
            processedFeeData.currencyId !== null
          ) {
            console.log(
              '🔍 [数据预处理] currencyId原始值:',
              processedFeeData.currencyId,
              '类型:',
              typeof processedFeeData.currencyId,
            );

            // 如果是对象，提取id或value字段
            if (typeof processedFeeData.currencyId === 'object') {
              const currencyObj = processedFeeData.currencyId as any;
              processedFeeData.currencyId =
                currencyObj.id || currencyObj.value || currencyObj.currencyId;
              console.log(
                '✅ [数据预处理] 从对象中提取currencyId:',
                processedFeeData.currencyId,
              );
            }
            // 如果是字符串，可能是名称，需要保持原样（后续通过监听器处理）
            else if (typeof processedFeeData.currencyId === 'string') {
              console.log(
                '⚠️ [数据预处理] currencyId是字符串，可能是名称:',
                processedFeeData.currencyId,
              );
              // 暂时保持原样，等待费用代码变化监听器会重新查询
            }
          }

          // 处理feeCodeId：如果是对象，提取id
          if (
            processedFeeData.feeCodeId !== undefined &&
            processedFeeData.feeCodeId !== null
          ) {
            console.log(
              '🔍 [数据预处理] feeCodeId原始值:',
              processedFeeData.feeCodeId,
              '类型:',
              typeof processedFeeData.feeCodeId,
            );

            // 如果是对象，提取id或value字段
            if (typeof processedFeeData.feeCodeId === 'object') {
              const feeCodeObj = processedFeeData.feeCodeId as any;
              processedFeeData.feeCodeId =
                feeCodeObj.id || feeCodeObj.value || feeCodeObj.feeCodeId;
              console.log(
                '✅ [数据预处理] 从对象中提取feeCodeId:',
                processedFeeData.feeCodeId,
              );
            }
          }

          // 处理settlementId：如果是对象，提取id
          if (
            processedFeeData.settlementId !== undefined &&
            processedFeeData.settlementId !== null
          ) {
            console.log(
              '🔍 [数据预处理] settlementId原始值:',
              processedFeeData.settlementId,
              '类型:',
              typeof processedFeeData.settlementId,
            );

            // 如果是对象，提取id或value字段
            if (typeof processedFeeData.settlementId === 'object') {
              const settlementObj = processedFeeData.settlementId as any;
              processedFeeData.settlementId =
                settlementObj.id ||
                settlementObj.value ||
                settlementObj.settlementId;
              console.log(
                '✅ [数据预处理] 从对象中提取settlementId:',
                processedFeeData.settlementId,
              );
            }
          }

          // 等待一小段时间确保组件完全渲染
          await new Promise((resolve) => setTimeout(resolve, 50));

          // 逐个字段设置，便于调试
          const fieldsToSet = [
            'feeCodeId',
            'industryCategory',
            'settlementId',
            'currencyId',
            'exchangeRate',
            'unit',
            'quantity',
            'noTaxUnitPrice',
            'noTaxAmount',
            'taxRate',
            'unitPrice',
            'amount',
            'invoiceBlocked',
            'isConfidential',
            'remark',
          ];

          console.log('📊 [编辑模态框] 准备设置的字段值:');
          fieldsToSet.forEach((field) => {
            console.log(`  - ${field}:`, processedFeeData[field]);
          });
          processedFeeData['feeCodeId'] = processedFeeData['feeCodeId_value'];
          processedFeeData['currencyId'] = processedFeeData['currencyId_value'];
          processedFeeData['settlementId'] =
            processedFeeData['settlementId_value'];
          processedFeeData['unit'] = processedFeeData['unit_value'];
          processedFeeData['industryCategory'] =
            processedFeeData['industryCategory_value'];
          // 设置表单值（使用处理后的数据）
          await orderFeeFormApi.setValues(processedFeeData);

          // 验证表单值是否设置成功
          const formValues = await orderFeeFormApi.getValues();
          console.log('📊 [编辑模态框] 表单当前值:', formValues);
          console.log(
            '📊 [编辑模态框] 表单字段列表:',
            Object.keys(formValues || {}),
          );

          // ✅ 关键修复：动态更新ClientSelect的selectedItems，确保结算单位名称正确显示
          if (currentFeeData.value) {
            const settlementIdValue =
              (currentFeeData.value as any)?.settlementId_value ||
              currentFeeData.value?.settlementId;
            const settlementName =
              currentFeeData.value?.settlementName ||
              currentFeeData.value?.settlementId ||
              '';

            if (settlementIdValue != null) {
              orderFeeFormApi.updateSchema([
                {
                  fieldName: 'settlementId',
                  componentProps: {
                    selectedItems: toSelectedItems(
                      settlementIdValue,
                      settlementName,
                    ),
                  },
                },
              ]);
              console.log(
                '✅ [编辑模态框] 动态更新ClientSelect selectedItems:',
                { settlementIdValue, settlementName },
              );
            }
          }

          // // ✅ 关键修复：如果currencyId或feeCodeId仍然是名称而非ID，需要手动触发onChange来重新查询
          // if (
          //   processedFeeData.feeCodeId &&
          //   typeof processedFeeData.feeCodeId === 'string'
          // ) {
          //   console.log(
          //     '⚠️ [编辑模态框] feeCodeId可能是名称，尝试通过onChange重新查询...',
          //   );

          //   // 获取费用代码详情，将其转换为ID
          //   try {
          //     // 尝试将字符串作为ID查询
          //     const feeCodeDetail = await getFeeCodeDetail(
          //       processedFeeData.feeCodeId_value,
          //     );
          //     if (feeCodeDetail && feeCodeDetail.id) {
          //       console.log(
          //         '✅ [编辑模态框] 成功获取费用代码详情，ID:',
          //         feeCodeDetail.id,
          //       );
          //       // 更新为正确的ID
          //       await orderFeeFormApi.setFieldValue(
          //         'feeCodeId',
          //         feeCodeDetail.id,
          //       );

          //       // 同时更新currencyId
          //       if (feeCodeDetail.currencyId) {
          //         await orderFeeFormApi.setFieldValue(
          //           'currencyId',
          //           feeCodeDetail.currencyId,
          //         );
          //         console.log(
          //           '✅ [编辑模态框] 更新currencyId为:',
          //           feeCodeDetail.currencyId,
          //         );
          //       }
          //     } else {
          //       console.warn('⚠️ [编辑模态框] 未能获取有效的费用代码详情');
          //     }
          //   } catch (error) {
          //     console.error('❌ [编辑模态框] 查询费用代码详情失败:', error);
          //   }
          // }

          // // 如果currencyId仍然是名称（字符串），尝试查询币别详情获取ID
          // if (
          //   processedFeeData.currencyId &&
          //   typeof processedFeeData.currencyId === 'string' &&
          //   !processedFeeData.feeCodeId
          // ) {
          //   console.log(
          //     '⚠️ [编辑模态框] currencyId是名称且没有feeCodeId，尝试查询币别详情...',
          //   );

          //   try {
          //     // 尝试根据名称查询币别列表
          //     const currencyList = await getCurrencyPagedList({
          //       Keyword: processedFeeData.currencyId,
          //       PageIndex: 1,
          //       PageSize: 10,
          //     });

          //     if (currencyList.items && currencyList.items.length > 0) {
          //       // 查找完全匹配的币别
          //       const matchedCurrency = currencyList.items.find(
          //         (item: any) =>
          //           item.code === processedFeeData.currencyId ||
          //           item.cnName === processedFeeData.currencyId ||
          //           item.enName === processedFeeData.currencyId,
          //       );

          //       if (matchedCurrency && matchedCurrency.id) {
          //         await orderFeeFormApi.setFieldValue(
          //           'currencyId',
          //           matchedCurrency.id,
          //         );
          //         console.log(
          //           '✅ [编辑模态框] 更新currencyId为ID:',
          //           matchedCurrency.id,
          //         );
          //       } else {
          //         console.warn('⚠️ [编辑模态框] 未找到匹配的币别');
          //       }
          //     }
          //   } catch (error) {
          //     console.error('❌ [编辑模态框] 查询币别列表失败:', error);
          //   }
          // }

          // 预加载订单详情（只加载一次，后续所有监听器共享）
          const transportOrderId =
            feeData?.transportOrderId || currentFeeData.value?.transportOrderId;
          console.log(
            '🔄 [编辑模态框] 准备预加载订单详情，transportOrderId:',
            transportOrderId,
          );
          console.log(
            '🔄 [编辑模态框] 当前 orderBaseData.value 状态:',
            !!orderBaseData.value,
          );

          if (transportOrderId) {
            await loadOrderDetailIfNeeded(transportOrderId);
            console.log(
              '✅ [编辑模态框] 预加载完成，orderBaseData.value 状态:',
              !!orderBaseData.value,
            );
          }

          // 为industryCategory字段添加onChange事件监听
          setupIndustryCategoryChangeListener();

          // 为单位字段添加onChange事件监听，实现自动填充数量
          setupUnitChangeListener();

          // 为费用代码字段添加onChange事件监听，实现自动填充相关字段
          setupFeeCodeChangeListener();
        });
      } else {
        console.warn('⚠️ [编辑模态框] 没有接收到数据');
      }
    } else {
      console.log('📊 [编辑模态框] 关闭');
      currentFeeData.value = null;
      originalFeeData.value = null;
      orderBaseData.value = null;
      isLoadingOrderDetail.value = false;
    }
  },
});

// 暴露modalApi供父组件调用
defineExpose({
  modalApi,
});

// 设置行业类别变化监听器
const setupIndustryCategoryChangeListener = async () => {
  try {
    // 获取表单API的实例
    const formInstance = orderFeeFormApi.form;

    if (!formInstance) {
      console.warn('表单实例未初始化');
      return;
    }

    // 获取当前表单值
    const formValues = await orderFeeFormApi.getValues();
    const transportOrderId =
      formValues?.transportOrderId || currentFeeData.value?.transportOrderId;

    if (!transportOrderId) {
      console.warn('缺少运输订单ID');
      return;
    }

    // 使用统一的加载函数（会自动使用缓存）
    await loadOrderDetailIfNeeded(transportOrderId);

    // 更新industryCategory字段的schema，添加onChange事件
    orderFeeFormApi.updateSchema([
      {
        fieldName: 'industryCategory',
        componentProps: {
          onChange: async (value: any) => {
            console.log('📊 行业类别发生变化:', value);

            if (!value && value !== 0) {
              console.log('行业类别被清空');
              return;
            }

            // 将key转换为value（字母代码）用于联动逻辑
            const industryCategoryValue = getIndustryCategoryOptions().find(
              (item) => item.key === value,
            )?.value;

            if (industryCategoryValue) {
              console.log('行业类别value:', industryCategoryValue);
              // 根据行业类别自动切换结算对象
              await fillSettlementIdByIndustryCategory(industryCategoryValue);
            }
          },
        },
      },
    ]);
  } catch (error) {
    console.error('设置行业类别监听器失败:', error);
  }
};

/**
 * 根据行业类别从订单详情中获取对应的结算对象
 */
const fillSettlementIdByIndustryCategory = async (industryCategory: string) => {
  try {
    if (!orderBaseData.value) {
      console.warn('订单基础数据未加载');
      return;
    }

    const orderDetail = orderBaseData.value;
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
      await orderFeeFormApi.setFieldValue('settlementId', String(settlementId));
      console.log(
        `✅ 自动填充结算对象: ${settlementId} (行业类别: ${industryCategory})`,
      );
    } else {
      console.warn(`订单中未找到行业类别 ${industryCategory} 对应的结算对象`);
    }
  } catch (error) {
    console.error('填充结算对象失败:', error);
  }
};

// 设置单位变化监听器，根据单位类型自动填充数量
const setupUnitChangeListener = async () => {
  try {
    // 获取表单API的实例
    const formInstance = orderFeeFormApi.form;

    if (!formInstance) {
      console.warn('表单实例未初始化');
      return;
    }

    // 获取当前表单值
    const formValues = await orderFeeFormApi.getValues();
    const transportOrderId =
      formValues?.transportOrderId || currentFeeData.value?.transportOrderId;

    if (!transportOrderId) {
      console.warn('缺少运输订单ID');
      return;
    }

    // 使用统一的加载函数（会自动使用缓存）
    await loadOrderDetailIfNeeded(transportOrderId);

    // 更新unit字段的schema，添加onChange事件
    orderFeeFormApi.updateSchema([
      {
        fieldName: 'unit',
        componentProps: {
          onChange: async (value: any) => {
            console.log('📦 [UnitSelect.onChange] 单位变化:', value);

            if (!value) {
              // 清空单位时，不自动清空数量（保留用户手动输入的值）
              return;
            }

            // 根据单位类型自动填充数量
            await fillQuantityByUnit(value);
          },
        },
      },
    ]);
  } catch (error) {
    console.error('设置单位监听器失败:', error);
  }
};

/**
 * 根据单位类型自动填充数量
 */
const fillQuantityByUnit = async (unitName: string) => {
  try {
    if (!orderBaseData.value) {
      console.warn('⚠️ [fillQuantityByUnit] 订单基础数据未加载');
      return;
    }

    const orderDetail = orderBaseData.value;
    if (!orderDetail.transportOrder) {
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

    let quantity = 0;

    // 根据单位类型填充数量
    if (unitNameLower === '票' || unitNameLower === 'order') {
      // 票：数量固定为 1
      quantity = 1;
      console.log('✅ [fillQuantityByUnit] 票数量: 1');
    } else if (
      unitNameLower === '毛重' ||
      unitNameLower === 'kgs' ||
      unitNameLower === 'weight'
    ) {
      // 重量：从订单获取 KGS
      quantity = transportOrder.kgs || 0;
      console.log('✅ [fillQuantityByUnit] 重量:', quantity);
    } else if (
      unitNameLower === '尺码' ||
      unitNameLower === 'cbm' ||
      unitNameLower === 'measurement'
    ) {
      // 尺码：从订单获取 CBM
      quantity = transportOrder.cbm || 0;
      console.log('✅ [fillQuantityByUnit] 尺码:', quantity);
    } else if (
      unitNameLower === '件数' ||
      unitNameLower === 'pkgs' ||
      unitNameLower === 'packages'
    ) {
      // 件数：从订单获取 PKGS
      quantity = transportOrder.pkgs || 0;
      console.log('✅ [fillQuantityByUnit] 件数:', quantity);
    } else if (unitNameLower === 'teu') {
      // TEU：从订单获取 TEU
      quantity = transportOrder.teu || 0;
      console.log('✅ [fillQuantityByUnit] TEU:', quantity);
    } else if (unitNameLower !== '') {
      // 箱型：查询订单的箱型列表数量
      if (transportOrder.orderCtns && transportOrder.orderCtns.length > 0) {
        quantity = transportOrder.orderCtns.filter(
          (ctn: any) => ctn.ctnCodeName === unitName,
        ).length;
        console.log('✅ [fillQuantityByUnit] 箱型数量:', quantity);
      } else {
        quantity = 0;
        console.log('✅ [fillQuantityByUnit] 箱型数量为 0');
      }
    } else {
      // 其他单位：默认数量为 1
      quantity = 1;
      console.log('✅ [fillQuantityByUnit] 默认数量: 1');
    }

    // 更新数量字段
    await orderFeeFormApi.setFieldValue('quantity', quantity);

    // 触发数量变化的联动计算
    await handleFieldChange('quantity');
  } catch (error) {
    console.error('❌ [fillQuantityByUnit] 填充数量失败:', error);
  }
};

// 处理表单值变化 - 实现与VxeTable相同的联动计算逻辑
const handleFieldChange = async (fieldName: string) => {
  console.log('表单字段变化:', fieldName);
  const values = await orderFeeFormApi.getValues();
  if (!values) return;

  let noTaxUnitPrice = Number(values.noTaxUnitPrice) || 0;
  const quantity = Number(values.quantity) || 0;
  const taxRate = Number(values.taxRate) || 0;
  let unitPrice = Number(values.unitPrice) || 0;
  let amount = Number(values.amount) || 0;
  let noTaxAmount = Number(values.noTaxAmount) || 0;

  // 根据不同的字段变化执行相应的计算逻辑

  // 1. 含税单价变化：同时更新含税金额、不含税单价、不含税金额
  if (fieldName === 'unitPrice' && unitPrice !== 0) {
    // 更新含税金额
    if (quantity) {
      amount = unitPrice * quantity;
      await orderFeeFormApi.setFieldValue(
        'amount',
        parseFloat(amount.toFixed(2)),
      );
    }

    // 如果税率存在，更新不含税单价和不含税金额
    if (taxRate !== undefined && taxRate !== null) {
      noTaxUnitPrice = unitPrice / (1 + taxRate / 100);
      await orderFeeFormApi.setFieldValue(
        'noTaxUnitPrice',
        parseFloat(noTaxUnitPrice.toFixed(4)),
      );

      if (quantity) {
        const calculatedNoTaxAmount = noTaxUnitPrice * quantity;
        await orderFeeFormApi.setFieldValue(
          'noTaxAmount',
          parseFloat(calculatedNoTaxAmount.toFixed(2)),
        );
      }
    }
  }

  // 2. 数量变化：同时更新含税金额、不含税金额
  if (fieldName === 'quantity' && quantity !== 0) {
    if (unitPrice) {
      amount = unitPrice * quantity;
      await orderFeeFormApi.setFieldValue(
        'amount',
        parseFloat(amount.toFixed(2)),
      );
    }

    if (noTaxUnitPrice) {
      noTaxAmount = noTaxUnitPrice * quantity;
      await orderFeeFormApi.setFieldValue(
        'noTaxAmount',
        parseFloat(noTaxAmount.toFixed(2)),
      );
    }
  }

  // 3. 税率变化：同时更新含税单价、含税金额（基于不含税单价）
  if (fieldName === 'taxRate' && taxRate !== 0) {
    if (noTaxUnitPrice) {
      // 根据不含税单价和税率计算含税单价
      unitPrice = noTaxUnitPrice * (1 + taxRate / 100);
      await orderFeeFormApi.setFieldValue(
        'unitPrice',
        parseFloat(unitPrice.toFixed(4)),
      );

      // 计算不含税金额
      noTaxAmount = noTaxUnitPrice * quantity;

      // 根据不含税金额和税率计算含税金额
      amount = noTaxAmount * (1 + taxRate / 100);
      await orderFeeFormApi.setFieldValue(
        'amount',
        parseFloat(amount.toFixed(2)),
      );
    }
  }

  // 4. 不含税单价变化：同时更新不含税金额、含税单价、含税金额
  if (fieldName === 'noTaxUnitPrice' && noTaxUnitPrice !== 0) {
    // 更新不含税金额
    noTaxAmount = noTaxUnitPrice * quantity;
    await orderFeeFormApi.setFieldValue(
      'noTaxAmount',
      parseFloat(noTaxAmount.toFixed(2)),
    );

    // 根据不含税单价和税率计算含税单价
    unitPrice =
      taxRate > 0 ? noTaxUnitPrice * (1 + taxRate / 100) : noTaxUnitPrice;
    await orderFeeFormApi.setFieldValue(
      'unitPrice',
      parseFloat(unitPrice.toFixed(4)),
    );

    // 根据不含税金额和税率计算含税金额
    amount = noTaxAmount * (1 + taxRate / 100);
    await orderFeeFormApi.setFieldValue(
      'amount',
      parseFloat(amount.toFixed(2)),
    );
  }

  // 5. 不含税金额变化：更新不含税单价、含税单价和含税金额
  if (fieldName === 'noTaxAmount' && noTaxAmount !== 0) {
    if (quantity) {
      // 根据不含税金额和数量计算不含税单价
      noTaxUnitPrice = noTaxAmount / quantity;
      await orderFeeFormApi.setFieldValue(
        'noTaxUnitPrice',
        parseFloat(noTaxUnitPrice.toFixed(4)),
      );

      // 根据不含税单价和税率计算含税单价
      unitPrice = noTaxUnitPrice * (1 + taxRate / 100);
      await orderFeeFormApi.setFieldValue(
        'unitPrice',
        parseFloat(unitPrice.toFixed(4)),
      );

      // 根据不含税金额和税率计算含税金额
      amount = noTaxAmount * (1 + taxRate / 100);
      await orderFeeFormApi.setFieldValue(
        'amount',
        parseFloat(amount.toFixed(2)),
      );
    }
  }

  // 同步更新 currentFeeData，触发计算属性重新计算
  if (currentFeeData.value) {
    const updatedValues = await orderFeeFormApi.getValues();
    currentFeeData.value = {
      ...currentFeeData.value,
      noTaxUnitPrice: parseFloat(
        (updatedValues.noTaxUnitPrice || 0).toFixed(4),
      ),
      noTaxAmount: parseFloat((updatedValues.noTaxAmount || 0).toFixed(2)),
      unitPrice: parseFloat((updatedValues.unitPrice || 0).toFixed(4)),
      amount: parseFloat((updatedValues.amount || 0).toFixed(2)),
      quantity: updatedValues.quantity || 0,
      taxRate: updatedValues.taxRate || 0,
    };
  }
};

// 设置费用代码变化监听器，自动填充相关字段
const setupFeeCodeChangeListener = async () => {
  try {
    // 获取表单API的实例
    const formInstance = orderFeeFormApi.form;

    if (!formInstance) {
      console.warn('表单实例未初始化');
      return;
    }

    // 获取当前表单值
    const formValues = await orderFeeFormApi.getValues();
    const transportOrderId =
      formValues?.transportOrderId || currentFeeData.value?.transportOrderId;

    if (!transportOrderId) {
      console.warn('缺少运输订单ID');
      return;
    }

    // 使用统一的加载函数（会自动使用缓存）
    await loadOrderDetailIfNeeded(transportOrderId);

    // 更新feeCodeId字段的schema，添加onChange事件
    orderFeeFormApi.updateSchema([
      {
        fieldName: 'feeCodeId',
        componentProps: {
          onChange: async (newVal: any) => {
            console.log('💰 [FeeCodeSelect.onChange] 费用代码变化:', newVal);
            console.log(
              '💰 [FeeCodeSelect.onChange] newVal类型:',
              typeof newVal,
            );

            if (!newVal) {
              return;
            }

            try {
              // ✅ 关键修复：如果newVal是对象，提取其id字段；如果是字符串/数字，直接使用
              let feeCodeId = newVal;
              if (typeof newVal === 'object' && newVal !== null) {
                feeCodeId = newVal.id || newVal.value;
                console.log(
                  '💰 [FeeCodeSelect.onChange] 从对象中提取ID:',
                  feeCodeId,
                );
              }

              console.log(
                '💰 [FeeCodeSelect.onChange] 最终使用的费用代码ID:',
                feeCodeId,
              );

              // 获取费用代码详情
              const feeCodeDetail = await getFeeCodeDetail(feeCodeId);
              if (!feeCodeDetail) {
                console.warn('未找到费用代码详情');
                return;
              }

              console.log('费用代码详情:', feeCodeDetail);
              console.log(
                '费用代码详情中的currencyId:',
                feeCodeDetail.currencyId,
                '类型:',
                typeof feeCodeDetail.currencyId,
              );

              // 获取收付类型
              const paySide = originalFeeData.value?.paySide; // 0=应收, 1=应付

              // 1. 自动填充行业类别和结算对象
              if (paySide === 0) {
                // 应收费用：使用收费客户类型（defaultDebitName）
                const debitCategory = feeCodeDetail.defaultDebitName;
                if (debitCategory) {
                  console.log(
                    '自动填充行业类别:',
                    debitCategory,
                    getCategoryNumber(debitCategory),
                  );
                  await orderFeeFormApi.setFieldValue(
                    'industryCategory',
                    getCategoryNumber(debitCategory),
                  );

                  // 根据行业类别从订单详情中获取对应的结算对象
                  await fillSettlementIdByIndustryCategoryForFeeCode(
                    debitCategory,
                  );
                }
              } else if (paySide === 1) {
                // 应付费用：使用付费客户类型（defaultCreditName）
                const creditCategory = feeCodeDetail.defaultCreditName;
                if (creditCategory) {
                  await orderFeeFormApi.setFieldValue(
                    'industryCategory',
                    getCategoryNumber(creditCategory),
                  );

                  // 根据行业类别从订单详情中获取对应的结算对象
                  await fillSettlementIdByIndustryCategoryForFeeCode(
                    creditCategory,
                  );
                }
              }

              // 2. 自动填充币别
              if (feeCodeDetail.currencyId) {
                await orderFeeFormApi.setFieldValue(
                  'currencyId',
                  feeCodeDetail.currencyId,
                );

                // 同时获取汇率
                if (feeCodeDetail.currencyId) {
                  try {
                    // ✅ 关键修复：确保传递的是ID而不是名称
                    let currencyIdForApi: any = feeCodeDetail.currencyId;

                    // 如果currencyId是对象，提取其id字段
                    if (
                      typeof currencyIdForApi === 'object' &&
                      currencyIdForApi !== null
                    ) {
                      currencyIdForApi =
                        (currencyIdForApi as any).id ||
                        (currencyIdForApi as any).value;
                      console.log(
                        '✅ [汇率查询] 从对象中提取币别ID:',
                        currencyIdForApi,
                      );
                    }

                    console.log(
                      '✅ [汇率查询] 即将调用 getExchangeRateDetail，参数:',
                      currencyIdForApi,
                      '类型:',
                      typeof currencyIdForApi,
                    );

                    // 先获取汇率详情
                    const exchangeRateData =
                      await getExchangeRateDetail(currencyIdForApi);

                    console.log(
                      '✅ [汇率查询] 成功获取汇率详情:',
                      exchangeRateData,
                    );

                    // 判断是否为本位币：需要查询订单所属公司的本位币
                    let isLocalCurrency = false;

                    // 从row中获取运输订单ID
                    if (transportOrderId && orderBaseData.value) {
                      const orderDetail = orderBaseData.value;

                      // 从组织串中取公司节点（第一个含本位币的节点）
                      const companyNode = orderDetail.orgs?.find(
                        (node) =>
                          node?.localCurrencyId !== null &&
                          node?.localCurrencyId !== undefined,
                      );

                      // ✅ 关键修复：比较时也使用正确的ID
                      let companyCurrencyId: any = companyNode?.localCurrencyId;
                      if (
                        typeof companyCurrencyId === 'object' &&
                        companyCurrencyId !== null
                      ) {
                        companyCurrencyId =
                          (companyCurrencyId as any).id ||
                          (companyCurrencyId as any).value;
                      }

                      if (
                        companyNode &&
                        String(companyCurrencyId) === String(currencyIdForApi)
                      ) {
                        isLocalCurrency = true;
                        console.log(
                          '✅ [本位币判断] 检测到本位币，公司本位币ID:',
                          companyCurrencyId,
                          '费用币别ID:',
                          currencyIdForApi,
                        );
                      }
                    }

                    // 如果是本位币，汇率固定为1
                    if (isLocalCurrency) {
                      await orderFeeFormApi.setFieldValue('exchangeRate', 1);
                      console.log('检测到本位币，汇率固定为1');
                    } else {
                      // 非本位币，使用正常汇率
                      const exchangeRate =
                        paySide === 0
                          ? exchangeRateData.drValue
                          : exchangeRateData.crValue;
                      await orderFeeFormApi.setFieldValue(
                        'exchangeRate',
                        exchangeRate,
                      );
                      console.log('✅ [汇率设置] 设置汇率为:', exchangeRate);
                    }
                  } catch (error) {
                    console.error('❌ [汇率查询] 获取汇率详情失败:', error);
                    console.error('❌ [汇率查询] 错误详情:', {
                      message:
                        error instanceof Error ? error.message : '未知错误',
                      currencyId: feeCodeDetail.currencyId,
                      currencyIdType: typeof feeCodeDetail.currencyId,
                    });
                  }
                }
              }

              // 3. 自动填充税率
              if (
                feeCodeDetail.taxRate !== undefined &&
                feeCodeDetail.taxRate !== null
              ) {
                await orderFeeFormApi.setFieldValue(
                  'taxRate',
                  feeCodeDetail.taxRate,
                );
              }

              // 4. 自动填充单位和数量
              const defaultUnitName = feeCodeDetail.defaultUnitName;
              if (defaultUnitName) {
                // 直接将单位名称填充到unit字段
                await orderFeeFormApi.setFieldValue('unit', defaultUnitName);

                // 根据单位类型自动填充数量
                if (defaultUnitName) {
                  // 如果是箱型，需要查询订单的箱型信息
                  if (defaultUnitName === '箱型' || defaultUnitName === 'CTN') {
                    await fillCtnQuantityForFeeCode();
                  }
                  // 如果是票，数量为1
                  else if (
                    defaultUnitName === '票' ||
                    defaultUnitName === 'ORDER'
                  ) {
                    await orderFeeFormApi.setFieldValue('quantity', 1);
                  }
                  // 如果是重量、尺码、件数、TEU，从订单详情中获取
                  else if (
                    [
                      '毛重',
                      'KGS',
                      '尺码',
                      'CBM',
                      '件数',
                      'PKGS',
                      'TEU',
                    ].includes(defaultUnitName)
                  ) {
                    await fillOrderQuantityForFeeCode(defaultUnitName);
                  }
                }
              }

              // 触发金额重新计算
              await handleFieldChange('taxRate');
            } catch (error) {
              console.error('自动填充费用信息失败:', error);
            }
          },
        },
      },
    ]);
  } catch (error) {
    console.error('设置费用代码监听器失败:', error);
  }
};

/**
 * 将行业类别字母转换为数字
 */
function getCategoryNumber(category: string): number | undefined {
  return getIndustryCategoryOptions().find((item) => item.value === category)
    ?.key;
}

/**
 * 根据行业类别从订单详情中获取对应的结算对象（用于费用代码变化时）
 */
const fillSettlementIdByIndustryCategoryForFeeCode = async (
  industryCategory: string,
) => {
  try {
    if (!orderBaseData.value) {
      console.warn('订单基础数据未加载');
      return;
    }

    const orderDetail = orderBaseData.value;
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
      await orderFeeFormApi.setFieldValue('settlementId', String(settlementId));
      console.log(
        `✅ 自动填充结算对象: ${settlementId} (行业类别: ${industryCategory})`,
      );
    } else {
      console.warn(`订单中未找到行业类别 ${industryCategory} 对应的结算对象`);
    }
  } catch (error) {
    console.error('填充结算对象失败:', error);
  }
};

/**
 * 填充箱型数量和单位（用于费用代码变化时）
 */
const fillCtnQuantityForFeeCode = async () => {
  try {
    if (!orderBaseData.value || !orderBaseData.value.transportOrder) {
      console.warn('缺少订单详情');
      return;
    }

    const ctns = orderBaseData.value.transportOrder.orderCtns;
    if (!ctns || ctns.length === 0) {
      await orderFeeFormApi.setFieldValue('quantity', 0);
      return;
    }

    // 填充单位为第一个箱型名称
    await orderFeeFormApi.setFieldValue('unit', ctns[0]?.ctnCodeName || '');

    // 计算箱型数量（有多少条箱型数据）
    const quantity = ctns.filter(
      (ctn) => ctn.ctnCodeName === ctns[0]?.ctnCodeName,
    ).length;
    await orderFeeFormApi.setFieldValue('quantity', quantity);
  } catch (error) {
    console.error('填充箱型数量失败:', error);
  }
};

/**
 * 填充订单数量（重量、尺码、件数、TEU等，用于费用代码变化时）
 */
const fillOrderQuantityForFeeCode = async (unitName: string) => {
  try {
    if (!orderBaseData.value || !orderBaseData.value.transportOrder) {
      console.warn('缺少订单详情');
      return;
    }

    const transportOrder = orderBaseData.value.transportOrder;
    let quantity = 0;

    // 根据单位类型填充数量
    switch (unitName.toLowerCase()) {
      case '重量':
      case 'weight':
        quantity = transportOrder.kgs || 0;
        break;
      case '尺码':
      case 'measurement':
        quantity = transportOrder.cbm || 0;
        break;
      case '件数':
      case 'packages':
        quantity = transportOrder.pkgs || 0;
        break;
      case 'teu':
        quantity = transportOrder.teu || 0;
        break;
      default:
        quantity = 1;
    }

    await orderFeeFormApi.setFieldValue('quantity', quantity);
  } catch (error) {
    console.error('填充订单数量失败:', error);
  }
};

// 费用表单Schema - 与useOrderFeeColumns保持一致的可编辑字段
function useOrderFeeFormSchema() {
  return [
    {
      component: 'FeeCodeSelect',
      fieldName: 'feeCodeId',
      label: $t('seaExport.export.orderFee.feecodeName'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'IndustryCategorySelect',
      fieldName: 'industryCategory',
      label: $t('seaExport.client.industryCategories'),
      componentProps: {
        style: { width: '100%' },
      },
    },
    {
      component: 'ClientSelect',
      fieldName: 'settlementId',
      label: $t('seaExport.export.orderFee.settlement'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        selectedItems: toSelectedItems(
          (currentFeeData.value as any)?.settlementId_value ||
            currentFeeData.value?.settlementId,
          currentFeeData.value?.settlementName ||
            currentFeeData.value?.settlementId,
        ),
      },
    },
    {
      component: 'CurrencySelect',
      fieldName: 'currencyId',
      label: $t('seaExport.export.orderFee.currency'),
      componentProps: {
        type: computed(() =>
          originalFeeData.value?.paySide === 0 ? '应收' : '应付',
        ),
        style: { width: '100%' },
      },
    },
    {
      component: 'ExchangeRateSelect',
      fieldName: 'exchangeRate',
      label: $t('seaExport.export.orderFee.ExchangeRate'),
      dependencies: {
        triggerFields: ['currencyId'],
        componentProps: (values: any, _formApi: any) => {
          return {
            currencyId: values.currencyId,
            valueKey:
              originalFeeData.value?.paySide === 0 ? 'drValue' : 'crValue',
          };
        },
      },
    },
    {
      component: 'UnitSelect',
      fieldName: 'unit',
      label: $t('seaExport.export.orderFee.unitEmum'),
      componentProps: {
        // 使用computed确保响应式更新箱型列表
        unitOptions: computed(() => {
          const list = orderCtnListRef.value;
          console.log('🔍 [unitOptions] 当前箱型列表:', list);
          return list.map((ctn) => ({
            label: ctn.ctnCodeName,
            value: ctn.ctnCodeName,
          }));
        }),
        style: { width: '100%' },
      },
    },

    {
      component: 'InputNumber',
      fieldName: 'quantity',
      label: $t('seaExport.export.orderFee.quantity'),
      componentProps: {
        min: 0,
        precision: 2,
        style: { width: '100%' },
        onChange: () => handleFieldChange('quantity'),
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'noTaxUnitPrice',
      label: $t('seaExport.export.orderFee.noTaxUnitPrice'),
      componentProps: {
        min: 0,
        precision: 4,
        style: { width: '100%' },
        onChange: () => handleFieldChange('noTaxUnitPrice'),
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'noTaxAmount',
      label: $t('seaExport.export.orderFee.noTaxAmount'),
      componentProps: {
        min: 0,
        precision: 2,
        style: { width: '100%' },
        onChange: () => handleFieldChange('noTaxAmount'),
      },
    },

    {
      component: 'InputNumber',
      fieldName: 'taxRate',
      label: $t('seaExport.export.orderFee.taxRate'),
      componentProps: {
        min: 0,
        max: 100,
        precision: 2,
        style: { width: '100%' },
        onChange: () => handleFieldChange('taxRate'),
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'unitPrice',
      label: $t('seaExport.export.orderFee.unitPrice'),
      componentProps: {
        min: 0,
        precision: 4,
        disabled: true,
        style: { width: '100%' },
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'amount',
      label: $t('seaExport.export.orderFee.amount'),
      componentProps: {
        min: 0,
        precision: 2,
        disabled: true,
        style: { width: '100%' },
      },
    },

    {
      component: 'Switch',
      fieldName: 'invoiceBlocked',
      label: $t('seaExport.export.orderFee.canInvoice'),
      componentProps: {
        checkedChildren: '是',
        unCheckedChildren: '否',
      },
    },
    {
      component: 'Switch',
      fieldName: 'isConfidential',
      label: $t('seaExport.export.orderFee.isConfidential'),
      componentProps: {
        checkedChildren: '是',
        unCheckedChildren: '否',
      },
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: $t('seaExport.export.orderFee.remark'),
      componentProps: {
        rows: 3,
        maxlength: 200,
        showCount: true,
      },
    },
  ];
}

// 计算更改前的利润
const originalProfit = computed(() => {
  let totalRec = 0;
  let totalPay = 0;

  Object.values(props.recAmountMap).forEach((item: any) => {
    totalRec += (item.totalRecAmount || 0) * (item.exchangeRate || 1);
  });

  Object.values(props.payAmountMap).forEach((item: any) => {
    totalPay += (item.totalPayAmount || 0) * (item.exchangeRate || 1);
  });

  return totalRec - totalPay;
});

// 计算更改后的利润
const updatedProfit = computed(() => {
  console.log('currentFeeData', currentFeeData.value);

  if (!currentFeeData.value || !originalFeeData.value) {
    return originalProfit.value;
  }

  let totalRec = 0;
  let totalPay = 0;

  // 计算原有的应收应付总额
  Object.values(props.recAmountMap).forEach((item: any) => {
    totalRec += (item.totalRecAmount || 0) * (item.exchangeRate || 1);
  });

  Object.values(props.payAmountMap).forEach((item: any) => {
    totalPay += (item.totalPayAmount || 0) * (item.exchangeRate || 1);
  });

  // 获取原费用和更新后费用的金额差值
  const originalAmount = originalFeeData.value.amount || 0;
  const updatedAmount = currentFeeData.value.amount || 0;
  const amountDiff = updatedAmount - originalAmount;

  // 根据收付类型计算新利润
  if (originalFeeData.value.paySide === 0) {
    // 应收费用：增加金额会提升利润，减少金额会降低利润
    return originalProfit.value + amountDiff;
  } else {
    // 应付费用：增加金额会降低利润，减少金额会提升利润
    return originalProfit.value - amountDiff;
  }
});

// 利润变化
const profitChange = computed(() => {
  return updatedProfit.value - originalProfit.value;
});

// 格式化货币显示
const formatCurrency = (amount: number, currencyId: number = 1) => {
  const symbol =
    getCurrencyEnumSymbolOptions().find((item) => item.value === currencyId)
      ?.label || '￥';
  return `${symbol}${amount.toFixed(2)}`;
};
</script>

<template>
  <Modal :title="$t('seaExport.export.orderFee.editFee')" width="1400px">
    <div class="flex gap-4">
      <!-- 左侧区域 -->
      <div class="flex flex-1 flex-col gap-4">
        <!-- 左上：原费用数据展示 -->
        <div class="rounded border border-gray-200 p-4">
          <h3 class="mb-3 text-base font-semibold">
            {{ $t('seaExport.export.orderFee.originalFeeData') }}
          </h3>
          <div class="grid grid-cols-3 gap-3 text-sm">
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.feecodeName') }}:</span
              >
              <span class="font-medium">{{
                originalFeeData?.feeCodeName || '--'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.client.industryCategories') }}:</span
              >
              <span class="font-medium">{{
                feeConstants
                  .getIndustryCategoryOptions()
                  .find(
                    (item) => item.key === originalFeeData?.industryCategory,
                  )?.label || '--'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.settlement') }}:</span
              >
              <span class="font-medium">{{
                originalFeeData?.settlementName || '--'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.currency') }}:</span
              >
              <span class="font-medium">{{
                originalFeeData?.currencyName || '--'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.ExchangeRate') }}:</span
              >
              <span class="font-medium">{{
                originalFeeData?.exchangeRate?.toFixed(4) || '1.0000'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.unitPrice') }}:</span
              >
              <span class="font-medium">{{
                originalFeeData?.unitPrice?.toFixed(2) || '0.00'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.quantity') }}:</span
              >
              <span class="font-medium">{{
                originalFeeData?.quantity?.toFixed(2) || '0.00'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.amount') }}:</span
              >
              <span class="font-medium text-blue-600">{{
                originalFeeData?.amount?.toFixed(2) || '0.00'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.unitEmum') }}:</span
              >
              <span class="font-medium">{{
                originalFeeData?.unit || '--'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.taxRate') }}:</span
              >
              <span class="font-medium"
                >{{ originalFeeData?.taxRate?.toFixed(2) || '0.00' }}%</span
              >
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.noTaxUnitPrice') }}:</span
              >
              <span class="font-medium">{{
                originalFeeData?.noTaxUnitPrice?.toFixed(4) || '0.0000'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.noTaxAmount') }}:</span
              >
              <span class="font-medium">{{
                originalFeeData?.noTaxAmount?.toFixed(2) || '0.00'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.rqstPaymentAmount') }}:</span
              >
              <span class="font-medium">{{
                originalFeeData?.rqstPaymentAmount?.toFixed(2) || '0.00'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.invoicedAmount') }}:</span
              >
              <span class="font-medium">{{
                originalFeeData?.invoicedAmount?.toFixed(2) || '0.00'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.orderInvoiceAmount') }}:</span
              >
              <span class="font-medium">{{
                originalFeeData?.orderInvoiceAmount?.toFixed(2) || '0.00'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.settledAmount') }}:</span
              >
              <span class="font-medium">{{
                originalFeeData?.settledAmount?.toFixed(2) || '0.00'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.canInvoice') }}:</span
              >
              <span class="font-medium">{{
                originalFeeData?.invoiceBlocked ? '是' : '否'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.isConfidential') }}:</span
              >
              <span class="font-medium">{{
                originalFeeData?.isConfidential ? '是' : '否'
              }}</span>
            </div>
            <div class="col-span-3 flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.remark') }}:</span
              >
              <span class="font-medium">{{
                originalFeeData?.remark || '--'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.feeStatus') }}:</span
              >
              <span class="font-medium">{{
                feeConstants
                  .getFeeStatusOptions()
                  .find((item) => item.value === originalFeeData?.feeStatus)
                  ?.label || '--'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.invoiceStatus') }}:</span
              >
              <span class="font-medium">{{
                feeConstants
                  .getInvoiceStatusOptions()
                  .find((item) => item.value === originalFeeData?.invoiceStatus)
                  ?.label || '--'
              }}</span>
            </div>
            <div class="flex">
              <span class="w-28 text-gray-600"
                >{{ $t('seaExport.export.orderFee.dataEntryMethod') }}:</span
              >
              <span class="font-medium">{{
                feeConstants
                  .getDataEntryMethodOptions()
                  .find(
                    (item) => item.value === originalFeeData?.dataEntryMethod,
                  )?.label || '--'
              }}</span>
            </div>
          </div>
        </div>

        <!-- 左下：费用编辑表单 -->
        <div class="flex-1 rounded border border-gray-200 p-4">
          <h3 class="mb-3 text-base font-semibold">
            {{ $t('seaExport.export.orderFee.editFeeInfo') }}
          </h3>
          <OrderFeeForm />
        </div>
      </div>

      <!-- 右侧：利润变化展示 -->
      <div class="w-80 rounded border border-gray-200 p-4">
        <h3 class="mb-3 text-base font-semibold">
          {{ $t('seaExport.export.orderFee.profitChange') }}
        </h3>
        <div class="space-y-4">
          <div class="rounded bg-gray-50 p-3">
            <div class="mb-1 text-sm text-gray-600">
              {{ $t('seaExport.export.orderFee.originalProfit') }}
            </div>
            <div class="text-lg font-semibold text-blue-600">
              {{ formatCurrency(originalProfit) }}
            </div>
          </div>

          <div class="rounded bg-gray-50 p-3">
            <div class="mb-1 text-sm text-gray-600">
              {{ $t('seaExport.export.orderFee.updatedProfit') }}
            </div>
            <div
              class="text-lg font-semibold"
              :class="updatedProfit >= 0 ? 'text-green-600' : 'text-red-600'"
            >
              {{ formatCurrency(updatedProfit) }}
            </div>
          </div>

          <div class="rounded bg-gray-50 p-3">
            <div class="mb-1 text-sm text-gray-600">
              {{ $t('seaExport.export.orderFee.profitDifference') }}
            </div>
            <div
              class="text-lg font-semibold"
              :class="profitChange >= 0 ? 'text-green-600' : 'text-red-600'"
            >
              {{ profitChange >= 0 ? '+' : ''
              }}{{ formatCurrency(profitChange) }}
            </div>
          </div>

          <div class="mt-4 rounded bg-blue-50 p-3 text-xs text-blue-700">
            <div class="mb-1 font-medium">💡 说明：</div>
            <div v-if="originalFeeData?.paySide === 0">
              • 应收费用：增加金额会提升利润，减少金额会降低利润
            </div>
            <div v-else>• 应付费用：增加金额会降低利润，减少金额会提升利润</div>
          </div>
        </div>
      </div>
    </div>
  </Modal>
</template>

<style scoped lang="scss">
:deep(.ant-form-item) {
  margin-bottom: 12px;
}
</style>
