<script lang="ts" setup>
import type { PaymentSettlementAdminApi } from '#/api/sea-export/payment-settlement-admin';
import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';
import type { Attachment } from '#/api/common/upload';

import { computed, onMounted, ref, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import dayjs from 'dayjs';

import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';
import { $t } from '#/locales';

import {
  Button,
  Card,
  DatePicker,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  OrgBankAccountSelect,
  ClientSelect,
  CurrencySelect,
  ClientBankAccountSelect,
} from '#/adapter/component';
import FileUploadInput from '#/adapter/component/file-upload/file-upload-input.vue';
import {
  addPaymentSettlement,
  editPaymentSettlement,
  getPaymentSettlementDetail,
  addItemsToSettlement,
  deleteItemsFromSettlement,
} from '#/api/sea-export/payment-settlement-admin';
import { getPaymentApplicationDetail } from '#/api/settlement-management/payment-application-admin';

import AddApplicationDrawer from './add-application-drawer/index.vue';
import { formatAmount, payTypeOptions } from './form-data';
import { returnToListWithRefresh } from '#/utils/list-refresh-flag';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const editId = computed<string | undefined>(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0];
  return id ? String(id) : undefined;
});
const isEdit = computed(() => !!editId.value);

const pageLoading = ref(false);
const submitting = ref(false);

// 表单数据
const settlementNo = ref(''); // 结算单号
const companys = ref<Array<{ id: number; name?: string }>>([]); // 所属公司列表
const settlementTime = ref(dayjs());
const payType = ref<number | undefined>(undefined);
const settlementId = ref<string>('');
const settlementName = ref('');
const currencyId = ref<number | undefined>(undefined);
const currencyCode = ref('');
const orgBankAccountId = ref<string | undefined>(undefined);
const orgBankAccountName = ref('');
const clientInvoiceBankId = ref<string | undefined>(undefined);
const clientBankName = ref('');
const clientBankAccount = ref('');
const transactionFee = ref<number | undefined>(undefined);
const remark = ref('');
const attachments = ref<Attachment[]>([]);

// 汇率列表（扩展类型以包含currencyCode用于显示）
interface RateListItem
  extends PaymentSettlementAdminApi.PaymentSettlementRateAddDto {
  currencyCode?: string;
}
const rateList = ref<RateListItem[]>([]);

// 我司银行选项（根据申请明细中的费用所属公司动态加载）
interface OrgBankOption {
  id: string;
  label: string; // 格式：开户银行(银行账号)
  bankName?: string;
  bankAccount?: string;
  currencyId: number;
}
const orgBankOptions = ref<OrgBankOption[]>([]);

// 结算银行选项（根据结算对象动态加载）
interface ClientBankOption {
  id: string;
  label: string; // 格式：开户银行(银行账号)
  bankName?: string;
  bankAccount?: string;
  currencyId: number;
}
const clientBankOptions = ref<ClientBankOption[]>([]);

// 结算明细列表 (保持原始层级结构以支持树状表格)
interface SettlementItem {
  id: string;
  application: PaymentApplicationAdminApi.PaymentApplicationForSettlementDto;
  // 用户输入的结算数据
  userSettledPrice?: number; // 固定币别申请的结算总金额
  userCurrencyItems?: Array<{
    originalCurrencyId: number;
    settledAmount: number;
  }>; // 原币申请的各币别结算量
}

const settlementItems = ref<SettlementItem[]>([]);

// 计算是否已有费用
const hasExistingFees = computed(() => settlementItems.value.length > 0);

// 计算已存在的申请ID列表（用于在抽屉中禁用这些申请的输入）
const existingApplicationIds = computed(() => {
  return settlementItems.value.map((item) => item.application.id);
});

// 抽屉引用
const addApplicationDrawerRef = ref<InstanceType<
  typeof AddApplicationDrawer
> | null>(null);

// 当前用户
const currentUserName = computed(
  () => userStore.userInfo?.realName || userStore.userInfo?.username || '-',
);

// 计算结算总金额
const totalSettlementAmount = computed(() => {
  const itemsTotal = settlementItems.value.reduce(
    (sum, item) =>
      sum +
      (item.userSettledPrice ||
        calculateTotalFromCurrencyItems(item.userCurrencyItems)),
    0,
  );
  return itemsTotal + (transactionFee.value || 0);
});

/** 从currencyItems计算总金额 */
function calculateTotalFromCurrencyItems(
  currencyItems:
    | Array<{ originalCurrencyId: number; settledAmount: number }>
    | undefined,
): number {
  if (!currencyItems || currencyItems.length === 0) return 0;
  return currencyItems.reduce((sum, item) => sum + item.settledAmount, 0);
}

/** 打开选择付费申请抽屉 */
function handleAddApplication() {
  // 新建时不需要前置条件，编辑时如果有费用则锁定筛选条件
  nextTick(() => {
    addApplicationDrawerRef.value?.openDrawer();
  });
}

/** 确认选择付费申请 */
async function handleConfirmApplications(
  applications: Array<{
    application: PaymentApplicationAdminApi.PaymentApplicationForSettlementDto;
    settledPrice?: number; // 固定币别申请的结算总金额
    currencyItems?: Array<{
      originalCurrencyId: number;
      settledAmount: number;
    }>; // 原币申请的各币别结算量
  }>,
  selectedCurrencyId?: number, // 用户在抽屉中选择的结算币别ID
) {
  if (isEdit.value) {
    // 编辑模式：直接调用后端接口保存新增的费用项
    await handleAddAndSaveToSettlement(applications, selectedCurrencyId);
  } else {
    // 新建模式：添加到列表，等待用户点击保存
    await handleAddToExistingSettlement(applications, selectedCurrencyId);
  }
}

/** 编辑模式下：添加并立即保存到结算单 */
async function handleAddAndSaveToSettlement(
  applications: Array<{
    application: PaymentApplicationAdminApi.PaymentApplicationForSettlementDto;
    settledPrice?: number;
    currencyItems?: Array<{
      originalCurrencyId: number;
      settledAmount: number;
    }>;
  }>,
  selectedCurrencyId?: number,
) {
  if (!selectedCurrencyId) {
    message.warning('请选择结算币别');
    return;
  }

  if (!editId.value) {
    message.error('结算单ID不存在');
    return;
  }

  submitting.value = true;
  try {
    // 收集所有涉及的原币币别ID（只收集实际有结算金额的币别）
    const originalCurrencyIds = new Set<number>();
    applications.forEach((app) => {
      if (app.application.currencyId) {
        // 固定币别申请：添加申请的币别ID作为原币
        originalCurrencyIds.add(app.application.currencyId);
      } else if (app.currencyItems && app.currencyItems.length > 0) {
        // 原币申请：只从实际有结算金额的currencyItems中收集原币ID
        app.currencyItems.forEach((item) => {
          originalCurrencyIds.add(item.originalCurrencyId);
        });
      }
    });

    // 构建完整的汇率列表（包含所有已有的币别 + 新增的币别）
    const allRates: PaymentSettlementAdminApi.PaymentSettlementRateAddDto[] =
      [];

    // 首先添加所有已有的汇率
    rateList.value.forEach((existingRate) => {
      allRates.push({
        originalCurrencyId: existingRate.originalCurrencyId,
        rate: existingRate.rate,
      });
    });

    // 然后处理新增的币别
    for (const originalCurrencyId of originalCurrencyIds) {
      // 检查是否已存在该原币的汇率
      const existingRateIndex = allRates.findIndex(
        (r) => r.originalCurrencyId === originalCurrencyId,
      );

      if (existingRateIndex === -1) {
        // 新增币别：需要从汇率管理中查询
        try {
          const { getExchangeRatePagedList } =
            await import('#/api/system/base-data/exchange-rate-admin');

          const result = await getExchangeRatePagedList({
            CurrencyId: originalCurrencyId,
            PageIndex: 1,
            PageSize: 1,
          });

          let rate = 1; // 默认值

          if (result.items && result.items.length > 0) {
            const rateData = result.items[0];
            // 使用 calculateValue（核算汇率）
            rate = rateData?.calculateValue ?? 1;

            // 如果是同种币别，强制汇率为1
            if (originalCurrencyId === selectedCurrencyId) {
              rate = 1;
            }
          } else {
            console.warn(
              `未找到原币 ${originalCurrencyId} 到结算币别 ${selectedCurrencyId} 的汇率，使用默认值1`,
            );
          }

          // 添加到汇率列表
          allRates.push({
            originalCurrencyId,
            rate,
          });

          // 同时更新本地的rateList（用于界面显示）
          let currencyCode = '';
          try {
            const { getCurrencyDetail } =
              await import('#/api/system/base-data/currency-admin');
            const currencyDetail = await getCurrencyDetail(
              String(originalCurrencyId),
            );
            currencyCode = currencyDetail.code || '';
          } catch (error) {
            console.error(`获取原币 ${originalCurrencyId} 代码失败:`, error);
          }

          rateList.value.push({
            originalCurrencyId,
            rate,
            currencyCode,
          });
        } catch (error) {
          console.error(`获取原币 ${originalCurrencyId} 的汇率失败:`, error);

          // 失败时使用默认值1
          let rate = 1;
          if (originalCurrencyId === selectedCurrencyId) {
            rate = 1;
          }

          allRates.push({
            originalCurrencyId,
            rate,
          });

          rateList.value.push({
            originalCurrencyId,
            rate,
            currencyCode: '',
          });
        }
      }
    }

    // 转换为付费申请分组数据
    const paymentApplicationGroups: PaymentSettlementAdminApi.PaymentSettlementAddItemGroupDto[] =
      applications
        .filter((app) => {
          const isFixedCurrency = !!app.application.currencyId;

          if (isFixedCurrency) {
            // 固定币别申请：检查settledPrice是否有有效值（非0、非空）
            return (
              app.settledPrice !== undefined &&
              app.settledPrice !== null &&
              app.settledPrice !== 0
            );
          } else {
            // 原币申请：检查currencyItems是否有有效数据
            return app.currencyItems && app.currencyItems.length > 0;
          }
        })
        .map((app) => {
          const isFixedCurrency = !!app.application.currencyId;

          if (isFixedCurrency) {
            // 固定币别申请：只传settledPrice
            return {
              paymentApplicationId: app.application.id,
              settledPrice: app.settledPrice || 0,
            };
          } else {
            // 原币申请：传currencyItems指定各币别结算量
            return {
              paymentApplicationId: app.application.id,
              currencyItems: app.currencyItems || [],
            };
          }
        });

    // 如果过滤后没有有效数据，提示用户
    if (paymentApplicationGroups.length === 0) {
      message.warning(
        '所有申请的结算金额都为0或未填写，请至少填写一个非零的结算金额',
      );
      return;
    }

    // 调用后端接口保存（使用包含所有币别的完整汇率列表）
    await addItemsToSettlement({
      id: editId.value,
      paymentApplicationGroups,
      paymentSettlementRates: allRates,
    });

    message.success(
      `已添加并保存 ${paymentApplicationGroups.length} 个付费申请`,
    );

    // 重新加载详情数据以刷新列表
    await loadEditData();
  } catch (error: any) {
    message.error(error.message || '保存失败');
  } finally {
    submitting.value = false;
  }
}

/** 编辑结算单：添加到现有列表了 */
async function handleAddToExistingSettlement(
  applications: Array<{
    application: PaymentApplicationAdminApi.PaymentApplicationForSettlementDto;
    settledPrice?: number;
    currencyItems?: Array<{
      originalCurrencyId: number;
      settledAmount: number;
    }>;
  }>,
  selectedCurrencyId?: number,
) {
  if (!selectedCurrencyId) {
    message.warning('请选择结算币别');
    return;
  }

  // 获取第一个申请的结算对象
  const firstApp = applications[0]?.application;
  if (!firstApp || !firstApp.settlementId) {
    message.warning('无法获取结算对象信息');
    return;
  }

  try {
    // 收集所有涉及的原币币别ID（只收集实际有结算金额的币别）
    const originalCurrencyIds = new Set<number>();
    applications.forEach((app) => {
      if (app.application.currencyId) {
        // 固定币别申请：添加申请的币别ID作为原币
        originalCurrencyIds.add(app.application.currencyId);
      } else if (app.currencyItems && app.currencyItems.length > 0) {
        // 原币申请：只从实际有结算金额的currencyItems中收集原币ID
        app.currencyItems.forEach((item) => {
          originalCurrencyIds.add(item.originalCurrencyId);
        });
      }
    });

    // 获取汇率列表并更新rateList
    if (originalCurrencyIds.size > 0) {
      for (const originalCurrencyId of originalCurrencyIds) {
        // 检查是否已存在该原币的汇率
        const existingRate = rateList.value.find(
          (r) => r.originalCurrencyId === originalCurrencyId,
        );

        if (!existingRate) {
          try {
            // 根据原币ID查询汇率
            const { getExchangeRatePagedList } =
              await import('#/api/system/base-data/exchange-rate-admin');
            const { getCurrencyDetail } =
              await import('#/api/system/base-data/currency-admin');

            const result = await getExchangeRatePagedList({
              CurrencyId: originalCurrencyId,
              PageIndex: 1,
              PageSize: 1,
            });

            // 获取原币代码
            let currencyCode = '';
            try {
              const currencyDetail = await getCurrencyDetail(
                String(originalCurrencyId),
              );
              currencyCode = currencyDetail.code || '';
            } catch (error) {
              console.error(`获取原币 ${originalCurrencyId} 代码失败:`, error);
            }

            if (result.items && result.items.length > 0) {
              const rateData = result.items[0];
              // 使用 calculateValue（计算汇率）
              let rate = rateData?.calculateValue ?? 1;

              // 如果是同种币别，强制汇率为1
              if (originalCurrencyId === selectedCurrencyId) {
                rate = 1;
              }

              rateList.value.push({
                originalCurrencyId,
                rate,
                currencyCode,
              });
            } else {
              // 如果没有找到汇率，使用默认值1
              let rate = 1;

              // 如果是同种币别，强制汇率为1
              if (originalCurrencyId === selectedCurrencyId) {
                rate = 1;
              }

              rateList.value.push({
                originalCurrencyId,
                rate,
                currencyCode,
              });
              console.warn(
                `未找到原币 ${originalCurrencyId} 到结算币别 ${selectedCurrencyId} 的汇率，使用默认值1`,
              );
            }
          } catch (error) {
            console.error(`获取原币 ${originalCurrencyId} 的汇率失败:`, error);

            // 尝试获取原币代码
            let currencyCode = '';
            try {
              const { getCurrencyDetail } =
                await import('#/api/system/base-data/currency-admin');
              const currencyDetail = await getCurrencyDetail(
                String(originalCurrencyId),
              );
              currencyCode = currencyDetail.code || '';
            } catch (e) {
              // 忽略错误
            }

            // 失败时使用默认值1，如果是同种币别，强制汇率为1
            let rate = 1;
            if (originalCurrencyId === selectedCurrencyId) {
              rate = 1;
            }

            rateList.value.push({
              originalCurrencyId,
              rate,
              currencyCode,
            });
          }
        }
      }
    }

    // 转换为结算明细 (保持层级结构)，并过滤掉结算金额为0或空的申请
    const newItems: SettlementItem[] = applications
      .filter((app) => {
        const isFixedCurrency = !!app.application.currencyId;

        if (isFixedCurrency) {
          // 固定币别申请：检查settledPrice是否有有效值（非0、非空）
          return (
            app.settledPrice !== undefined &&
            app.settledPrice !== null &&
            app.settledPrice !== 0
          );
        } else {
          // 原币申请：检查currencyItems是否有有效数据（至少有一个币别填写了有效的结算金额）
          return app.currencyItems && app.currencyItems.length > 0;
        }
      })
      .map((app, index) => {
        const isFixedCurrency = !!app.application.currencyId;

        return {
          id: `${Date.now()}-${index}`,
          application: app.application,
          // 保存用户输入的结算数据
          userSettledPrice: isFixedCurrency ? app.settledPrice : undefined,
          userCurrencyItems: !isFixedCurrency ? app.currencyItems : undefined,
        };
      });

    // 如果过滤后没有有效数据，提示用户
    if (newItems.length === 0) {
      message.warning(
        '所有申请的结算金额都为0或未填写，请至少填写一个非零的结算金额',
      );
      return;
    }

    // 添加到列表
    settlementItems.value.push(...newItems);

    // 如果是第一次添加，自动填充结算信息
    if (settlementItems.value.length === newItems.length) {
      settlementId.value = firstApp.settlementId;
      currencyId.value = selectedCurrencyId;
    }

    message.success(`已添加 ${newItems.length} 个付费申请`);
  } catch (error: any) {
    message.error(error.message || '操作失败');
  }
}

/** 删除结算明细 */
async function handleDeleteItem(index: number) {
  if (!isEdit.value || !editId.value) {
    // 新建模式：直接从列表中移除
    settlementItems.value.splice(index, 1);
    return;
  }

  // 编辑模式：调用后端接口删除
  const itemToDelete = settlementItems.value[index];
  if (!itemToDelete) {
    message.error('未找到要删除的申请');
    return;
  }

  try {
    // 使用 Modal.confirm 进行二次确认
    await new Promise<void>((resolve, reject) => {
      Modal.confirm({
        title: '确认删除',
        content: `确定要删除申请 ${itemToDelete.application.applicationNo} 吗？`,
        okText: '确定',
        cancelText: '取消',
        onOk: () => {
          resolve();
        },
        onCancel: () => {
          reject(new Error('取消删除'));
        },
      });
    });

    submitting.value = true;

    // 1. 收集要删除的付费申请ID
    const paymentApplicationIds = [itemToDelete.application.id];

    // 2. 构建删除后剩余的汇率列表（从当前汇率列表中过滤）
    // 先获取删除后剩余的申请列表
    const remainingItems = settlementItems.value.filter((_, i) => i !== index);

    // 收集剩余申请涉及的所有原币币别ID
    const remainingOriginalCurrencyIds = new Set<number>();
    console.log('remainingItems:', remainingItems);
    remainingItems.forEach((item) => {
      if (item.application.currencyId) {
        // 固定币别申请：添加申请的币别ID作为原币
        remainingOriginalCurrencyIds.add(item.application.currencyId);
      } else if (
        item.application?.currencyGroup &&
        item.application?.currencyGroup.length > 0
      ) {
        // 原币申请：从currencyItems中收集原币ID
        item.application?.currencyGroup?.forEach((app) => {
          remainingOriginalCurrencyIds.add(app.id);
        });
      }
    });

    // 从当前汇率列表中过滤出剩余申请涉及的币别
    const remainingRates: PaymentSettlementAdminApi.PaymentSettlementRateAddDto[] =
      rateList.value
        .filter((rate) =>
          remainingOriginalCurrencyIds.has(rate.originalCurrencyId),
        )
        .map((rate) => ({
          originalCurrencyId: rate.originalCurrencyId,
          rate: rate.rate,
        }));

    // 3. 调用后端接口删除
    await deleteItemsFromSettlement({
      id: editId.value,
      paymentApplicationIds,
      paymentSettlementRates: remainingRates,
    });

    message.success('删除成功');

    // 4. 重新加载详情数据以刷新列表和汇率
    await loadEditData();
  } catch (error: any) {
    if (error.message !== '取消删除') {
      message.error(error.message || '删除失败');
    }
  } finally {
    submitting.value = false;
  }
}

/** 保存 */
async function handleSave() {
  if (!validateForm()) {
    return;
  }

  submitting.value = true;
  try {
    const data: PaymentSettlementAdminApi.PaymentSettlementAddDto = {
      settlementTime: settlementTime.value.toISOString(),
      payType: payType.value,
      settlementId: settlementId.value,
      currencyId: currencyId.value!,
      orgBankAccountId: orgBankAccountId.value,
      clientInvoiceBankId: clientInvoiceBankId.value,
      transactionFee: transactionFee.value,
      remark: remark.value,
      paymentSettlementRates: rateList.value,
      paymentApplicationGroups: buildPaymentApplicationGroups(),
      attachments: attachments.value.map((a, idx) => ({
        attachmentId: Number(a.attachmentId),
        displayOrder: idx,
      })),
    };

    if (isEdit.value && editId.value) {
      await editPaymentSettlement({
        id: editId.value,
        ...data,
      } as any);
      message.success('保存成功');
      returnToListWithRefresh('PaymentSettlementList', () => {
        router.push('/settlement-management/payment-settlement');
      });
    } else {
      await addPaymentSettlement(data);
      message.success('新建成功');
      returnToListWithRefresh('PaymentSettlementList', () => {
        router.push('/settlement-management/payment-settlement');
      });
    }
  } catch (error: any) {
    message.error(error.message || '操作失败');
  } finally {
    submitting.value = false;
  }
}

/** 构建付费申请分组数据 */
function buildPaymentApplicationGroups(): PaymentSettlementAdminApi.PaymentSettlementAddItemGroupDto[] {
  // 根据 settlementItems 构建分组数据
  const groups: PaymentSettlementAdminApi.PaymentSettlementAddItemGroupDto[] =
    [];
  console.log('settlementItems:', settlementItems.value);
  settlementItems.value.forEach((item) => {
    const app = item.application;
    const isFixedCurrency = !!app.currencyId;

    if (isFixedCurrency) {
      // 固定币别申请：只传settledPrice，后端自动分配
      groups.push({
        paymentApplicationId: app.id,
        settledPrice: item.userSettledPrice || 0,
      });
    } else {
      // 原币申请：传currencyItems指定各币别结算量
      groups.push({
        paymentApplicationId: app.id,
        currencyItems: item.userCurrencyItems || [],
      });
    }
  });

  return groups;
}

/** 表单验证 */
function validateForm(): boolean {
  if (!settlementId.value) {
    message.warning('请选择结算对象');
    return false;
  }
  if (!currencyId.value) {
    message.warning('请选择结算币别');
    return false;
  }
  if (settlementItems.value.length === 0) {
    message.warning('请至少添加一个付费申请');
    return false;
  }
  return true;
}

/** 加载编辑数据 */
async function loadEditData() {
  if (!editId.value) return;

  pageLoading.value = true;
  try {
    const detail = await getPaymentSettlementDetail(editId.value);

    settlementNo.value = detail.settlementNo || ''; // 加载结算单号
    companys.value = detail.companys || []; // 加载所属公司
    settlementTime.value = dayjs(detail.settlementTime);
    payType.value = detail.payType;
    settlementId.value = detail.settlementId;
    settlementName.value = detail.settlementName;
    currencyId.value = detail.currencyId;
    currencyCode.value = detail.currencyCode || '';
    transactionFee.value = detail.transactionFee;
    remark.value = detail.remark || '';

    // 加载汇率列表（包含currencyCode用于显示）
    const { getCurrencyDetail } =
      await import('#/api/system/base-data/currency-admin');
    rateList.value = await Promise.all(
      detail.paymentSettlementRates.map(async (r) => {
        let currencyCode = '';
        try {
          const currencyDetail = await getCurrencyDetail(
            String(r.originalCurrencyId),
          );
          currencyCode = currencyDetail.code || '';
        } catch (error) {
          console.error(`获取原币 ${r.originalCurrencyId} 代码失败:`, error);
        }

        // 如果是同种币别，强制汇率为1
        let rate = r.rate;
        if (r.originalCurrencyId === detail.currencyId) {
          rate = 1;
        }

        return {
          originalCurrencyId: r.originalCurrencyId,
          rate,
          currencyCode,
        };
      }),
    );

    // 加载编辑数据时，直接使用详情接口返回的 paymentApplications 字段
    // paymentApplications 的类型是 PaymentApplicationForDetailDto[]，包含本次结算的信息
    const rebuiltItems: SettlementItem[] = [];

    if (detail.paymentApplications && detail.paymentApplications.length > 0) {
      for (const app of detail.paymentApplications) {
        try {
          // 从 currencyGroup 中提取用户输入的结算数据
          let userSettledPrice: number | undefined;
          let userCurrencyItems:
            | Array<{ originalCurrencyId: number; settledAmount: number }>
            | undefined;

          // 判断是固定币别还是原币申请（通过检查是否有多个币别）
          const hasMultipleCurrencies =
            app.currencyGroup && app.currencyGroup.length > 1;

          if (
            !hasMultipleCurrencies &&
            app.totalSettledPrice !== undefined &&
            app.totalSettledPrice !== null
          ) {
            // 固定币别申请：使用 totalSettledPrice
            userSettledPrice = app.totalSettledPrice;
          } else {
            // 原币申请：从 currencyGroup 中提取各币别的 settledAmount（保留所有有 settledAmount 字段的币别，包括值为0的）
            if (app.currencyGroup && app.currencyGroup.length > 0) {
              userCurrencyItems = app.currencyGroup
                .filter((currency) => currency.settledAmount !== undefined)
                .map((currency) => ({
                  originalCurrencyId: currency.id,
                  settledAmount: currency.settledAmount ?? 0,
                }));
            }
          }

          // 构造 application 对象用于展示
          // 需要将详情接口的 CurrencyGroupForDetailDto 转换为 CurrencyGroupForSettlementDto 格式
          const convertedCurrencyGroup: PaymentApplicationAdminApi.CurrencyGroupForSettlementDto[] =
            [];

          if (app.currencyGroup && app.currencyGroup.length > 0) {
            for (const detailCurrency of app.currencyGroup) {
              // 使用通用转换函数
              const convertedCurrency =
                convertCurrencyGroupForDetailToSettlement(detailCurrency);
              convertedCurrencyGroup.push(convertedCurrency);
            }
          }

          // 从 paymentSettlementItems 中获取公司信息（根据 paymentApplicationId 匹配）
          const relatedItems = detail.paymentSettlementItems?.filter(
            (item) => item.paymentApplicationId === app.id,
          );
          console.log(
            `应用 ${app.applicationNo} 相关的结算明细:`,
            relatedItems,
          );
          // 从第一个相关的结算明细中获取公司信息

          const companys = detail?.companys || [];

          // 构造完整的 application 对象
          const mockApplication: PaymentApplicationAdminApi.PaymentApplicationForSettlementDto =
            {
              id: app.id,
              applicationNo: app.applicationNo,
              status: 3, // 已审核通过
              settlementId: detail.settlementId,
              clientName: detail.settlementName,
              currencyCode: app.currencyGroup?.[0]?.code || '',
              currencyId: app.currencyGroup?.[0]?.id, // 从 currencyGroup 中获取第一个币别的ID
              creatorUserName: detail.creatorUserName,
              totalSettleablePriceUpperLimit: 0,
              totalSettleablePriceLowerLimit: 0,
              // 从 paymentSettlementItems 中获取公司信息
              companys: companys,
              // 关键：使用转换后的 currencyGroup，包含完整的费用明细
              currencyGroup: convertedCurrencyGroup,
            };

          rebuiltItems.push({
            id: app.id,
            application: mockApplication,
            userSettledPrice,
            userCurrencyItems,
          });
        } catch (e) {
          console.error(`Failed to process application ${app.id}:`, e);
        }
      }
    }

    settlementItems.value = rebuiltItems;

    attachments.value = (detail.attachments ?? []).map((a) => ({
      attachmentId: a.attachmentId,
      url: a.attachmentPath || '',
      fileName: a.friendlyFileName || '',
    }));

    // 先加载银行选项，再赋值选中值（确保选项存在后才能正确回显）
    await loadOrgBankOptions();
    await loadClientBankOptions();

    // 在银行选项加载完成后，再设置选中值
    orgBankAccountId.value = detail.orgBankAccountId;
    clientInvoiceBankId.value = detail.clientInvoiceBankId;
  } finally {
    pageLoading.value = false;
  }
}

/** 加载我司银行选项（根据申请明细中的费用所属公司） */
async function loadOrgBankOptions() {
  if (settlementItems.value.length === 0) {
    console.warn('settlementItems为空，无法加载我司银行选项');
    orgBankOptions.value = [];
    return;
  }

  try {
    // 收集所有涉及的公司ID（从申请明细中的费用所属公司）
    const companyIds = new Set<number>();

    settlementItems.value.forEach((item) => {
      // 从申请中获取公司信息
      if (item.application.companys && item.application.companys.length > 0) {
        item.application.companys.forEach((company) => {
          companyIds.add(company.id);
        });
      } else {
        console.warn(`申请 ${item.application.applicationNo} 没有公司信息`);
      }
    });

    console.log('收集到的公司IDs:', Array.from(companyIds));

    if (companyIds.size === 0) {
      console.warn('未找到任何公司信息，无法加载我司银行选项');
      orgBankOptions.value = [];
      return;
    }

    // 为每个公司获取银行信息
    const allBanks: OrgBankOption[] = [];
    const { getOrganizationUnit } =
      await import('#/api/system/organization-unit');

    for (const companyId of companyIds) {
      try {
        const companyDetail = await getOrganizationUnit(companyId);

        if (
          companyDetail.orgBankAccounts &&
          companyDetail.orgBankAccounts.length > 0
        ) {
          // 根据结算币别过滤银行
          const filteredBanks = companyDetail.orgBankAccounts.filter(
            (bank: any) => bank.currencyId === currencyId.value && bank.enable,
          );

          filteredBanks.forEach((bank: any) => {
            allBanks.push({
              id: bank.id,
              label: `${bank.bankName || ''}(${bank.bankAccount || ''})`.trim(),
              bankName: bank.bankName,
              bankAccount: bank.bankAccount,
              currencyId: bank.currencyId,
            });
          });
        }
      } catch (error) {
        console.error(`获取公司 ${companyId} 详情失败:`, error);
      }
    }

    orgBankOptions.value = allBanks;
  } catch (error) {
    console.error('加载我司银行选项失败:', error);
  }
}

/** 加载结算银行选项（根据结算对象） */
async function loadClientBankOptions() {
  if (!settlementId.value) {
    clientBankOptions.value = [];
    return;
  }

  try {
    const { getClientInvoiceInfoList } =
      await import('#/api/sea-export/clinet-invoice-admin');

    // 获取客户的所有开票信息
    const invoiceInfos = await getClientInvoiceInfoList({
      ClientId: settlementId.value,
    });

    if (!invoiceInfos || invoiceInfos.length === 0) {
      clientBankOptions.value = [];
      return;
    }

    // 收集所有银行信息
    const allBanks: ClientBankOption[] = [];

    invoiceInfos.forEach((invoiceInfo) => {
      if (
        invoiceInfo.clientInvoiceBanks &&
        invoiceInfo.clientInvoiceBanks.length > 0
      ) {
        // 根据结算币别过滤银行
        const filteredBanks = invoiceInfo.clientInvoiceBanks.filter(
          (bank) => bank.currencyId === currencyId.value && !bank.isDeleted,
        );

        filteredBanks.forEach((bank) => {
          allBanks.push({
            id: bank.id,
            label: `${bank.bankName || ''}(${bank.bankAccount || ''})`.trim(),
            bankName: bank.bankName,
            bankAccount: bank.bankAccount,
            currencyId: bank.currencyId,
          });
        });
      }
    });

    clientBankOptions.value = allBanks;
  } catch (error) {
    console.error('加载结算银行选项失败:', error);
  }
}

/** 获取指定币别的结算金额 */
function getSettledAmountForCurrency(
  currencyItems:
    | Array<{ originalCurrencyId: number; settledAmount: number }>
    | undefined,
  currencyId: number,
): number {
  if (!currencyItems) return 0;
  const item = currencyItems.find((i) => i.originalCurrencyId === currencyId);
  return item ? item.settledAmount : 0;
}

/** 过滤出有有效结算金额的币别分组（用于表格显示） */
function filterCurrencyGroupWithSettlement(
  record: SettlementItem,
): PaymentApplicationAdminApi.CurrencyGroupForSettlementDto[] {
  if (!record.application.currencyGroup) return [];

  // 固定币别申请：不显示第二层
  if (record.application.currencyId) return [];

  // 原币申请：
  // - 编辑模式：显示所有币别（包括结算金额为0的），方便用户查看完整信息
  // - 新增模式：只显示用户填写了有效结算金额的币别
  if (isEdit.value) {
    // 编辑模式：返回所有币别
    return record.application.currencyGroup;
  } else {
    // 新增模式：只显示有有效结算金额的币别
    return record.application.currencyGroup.filter((currency) => {
      const settledAmount = getSettledAmountForCurrency(
        record.userCurrencyItems,
        currency.id,
      );
      return (
        settledAmount !== undefined &&
        settledAmount !== null &&
        settledAmount !== 0
      );
    });
  }
}

/** 格式化业务类型 */
function getBizTypeName(bizType: number): string {
  const bizTypeMap: Record<number, string> = {
    1: '海运出口',
    2: '海运进口',
    3: '空运出口',
    4: '空运进口',
    5: '陆运',
  };
  return bizTypeMap[bizType] || '未知';
}

/** 获取状态颜色 */
function getStatusColor(status: number): string {
  const statusColorMap: Record<number, string> = {
    0: 'default',
    1: 'processing',
    2: 'success',
    3: 'error',
    4: 'warning',
  };
  return statusColorMap[status] || 'default';
}

/** 获取状态文本 */
function getStatusText(status: number): string {
  const statusTextMap: Record<number, string> = {
    0: '草稿',
    1: '待审核',
    2: '已通过',
    3: '已拒绝',
    4: '已取消',
  };
  return statusTextMap[status] || '未知';
}

/** 格式化未结算费用范围 */
function formatUnsettledRange(upperLimit: number, lowerLimit: number): string {
  if (upperLimit === 0 && lowerLimit === 0) return '-';
  return `[${formatAmount(lowerLimit)} ~ ${formatAmount(upperLimit)}]`;
}

/** 将详情接口的币别分组转换为选择列表格式 */
function convertCurrencyGroupForDetailToSettlement(
  detailCurrency: PaymentSettlementAdminApi.CurrencyGroupForDetailDto,
): PaymentApplicationAdminApi.CurrencyGroupForSettlementDto {
  // 从 orderFees 中计算汇总数据
  const orderFees = detailCurrency.orderFees || [];

  // 计算应收/应付金额（根据 paySide 区分）
  let receiveAmount = 0;
  let payAmount = 0;

  orderFees.forEach((fee) => {
    if (fee.paySide === 0) {
      // 收
      receiveAmount += fee.amount || 0;
    } else {
      // 付
      payAmount += fee.amount || 0;
    }
  });

  // 计算未结算金额
  const totalUnSettledAmount = orderFees.reduce((sum, fee) => {
    return sum + (fee.unSettledAmount || 0);
  }, 0);

  // 计算可结算上下限
  let settleableUpperLimit = 0;
  let settleableLowerLimit = 0;

  orderFees.forEach((fee) => {
    const unSettled = fee.unSettledAmount || 0;
    if (unSettled > 0) {
      settleableUpperLimit += unSettled;
    } else if (unSettled < 0) {
      settleableLowerLimit += unSettled;
    }
  });

  // 转换费用列表
  const convertedOrderFees = orderFees.map((fee) =>
    convertOrderFeeForDetailToSettlement(fee),
  );

  return {
    id: detailCurrency.id,
    code: detailCurrency.code,
    receiveAmount,
    receivePrice: undefined, // 原币申请为 null
    payAmount,
    payPrice: undefined, // 原币申请为 null
    totalUnSettledAmount,
    settleableUpperLimit,
    settleablePriceUpperLimit: undefined, // 原币申请为 null
    settleableLowerLimit,
    settleablePriceLowerLimit: undefined, // 原币申请为 null
    settledAmount: detailCurrency.settledAmount, // 保留本次结算金额字段
    orderFees: convertedOrderFees,
  } as any; // 使用类型断言，允许添加 settledAmount 字段到返回对象中
}

/** 将详情接口的费用转换为选择列表格式 */
function convertOrderFeeForDetailToSettlement(
  detailFee: PaymentSettlementAdminApi.OrderFeeDto,
): PaymentApplicationAdminApi.OrderFeeForSettlementDto {
  return {
    // 基类字段
    id: detailFee.id,
    creationTime: '', // 详情接口可能没有这个字段
    creatorUserId: undefined,
    lastModificationTime: undefined,
    lastModifierUserId: undefined,
    userId: 0,
    organizationUnits: [],
    companys: detailFee.companys || [],

    // 本体字段
    transportOrderId: detailFee.id, // 临时使用 fee.id，实际应该从其他地方获取
    changeOrderId: undefined,
    paySide: detailFee.paySide || 0,
    feeStatus: detailFee.feeStatus || 0,
    settlementStatus: 0,
    invoiceStatus: 0,
    feeCodeId: 0,
    industryCategory: 0,
    settlementId: '',
    settlementName: detailFee.settlementName || '',
    currencyId: 0,
    currencyCode: detailFee.currencyCode || '',
    currencyName: '',
    exchangeRate: 0,
    unitPrice: detailFee.unitPrice || 0,
    amount: detailFee.amount || 0,
    unit: detailFee.unit || '',
    quantity: detailFee.quantity || 0,
    taxIncluded: false,
    taxRate: 0,
    noTaxUnitPrice: 0,
    noTaxAmount: 0,
    invoicedAmount: 0,
    orderInvoiceAmount: 0,
    unInvoicedAmount: detailFee.unInvoicedAmount || 0,
    settledAmount: detailFee.settledAmount || 0,
    unSettledAmount: detailFee.unSettledAmount || 0,
    canInvoice: false,
    isConfidential: false,
    dataEntryMethod: 0,
    remark: detailFee.remark || '',
    localCurrencyCode: '',
    creatorUserName: '',
    rqstPaymentAmount: 0,
    unRqstPaymentAmount: 0,

    // 本次结算量（关键：保留这个字段用于第三层显示）
    thisSettledAmount: detailFee.thisSettledAmount,

    // 关联业务信息（需要从其他地方获取）
    transportOrder: undefined,
  };
}

/** 监听结算对象变化，更新名称并清空银行信息 */
watch(settlementId, async (newVal) => {
  if (newVal) {
    // 获取客户详情以获取名称
    try {
      const { getClientDetail } = await import('#/api/sea-export/client-admin');
      const detail = await getClientDetail(newVal);
      settlementName.value = detail.name || detail.fullName || '';
    } catch (error) {
      console.error('获取客户详情失败:', error);
    }
  } else {
    settlementName.value = '';
  }
  // 清空银行信息
  clientInvoiceBankId.value = undefined;
});

// 监听结算币别变化，更新币别代码
watch(currencyId, async (newVal) => {
  if (newVal) {
    try {
      const { getCurrencyDetail } =
        await import('#/api/system/base-data/currency-admin');
      const detail = await getCurrencyDetail(String(newVal));
      currencyCode.value = detail.code || '';
    } catch (error) {
      console.error('获取币别详情失败:', error);
    }
  } else {
    currencyCode.value = '';
  }

  // 结算币别变化时，重新加载银行选项
  await loadOrgBankOptions();
  await loadClientBankOptions();
});

// 监听申请明细变化，重新加载我司银行选项
watch(
  () => settlementItems.value.length,
  async () => {
    await loadOrgBankOptions();
  },
  { deep: true },
);

// 监听结算对象变化，重新加载结算银行选项
watch(settlementId, async () => {
  await loadClientBankOptions();
});

onMounted(() => {
  if (isEdit.value) {
    loadEditData();
  } else {
    // 新建时自动打开抽屉，让用户选择结算对象、结算币别和付费申请
    nextTick(() => {
      handleAddApplication();
    });
  }
});
</script>

<template>
  <Page :title="isEdit ? '编辑结算单' : '新建结算单'">
    <template #extra>
      <Space>
        <Button @click="router.back()"> 返回 </Button>
        <Button type="primary" @click="handleSave" :loading="submitting">
          保存
        </Button>
      </Space>
    </template>

    <div v-loading="pageLoading" style="padding: 16px">
      <!-- 顶部三栏布局 -->
      <div
        style="
          display: grid;
          grid-template-columns: 320px 1fr 240px;
          gap: 16px;
          margin-bottom: 16px;
        "
      >
        <!-- 左侧：结算信息 -->
        <Card title="结算信息" :bordered="true" size="small">
          <div style="display: flex; flex-direction: column; gap: 12px">
            <!-- 结算单号（仅编辑时显示） -->
            <div v-if="isEdit">
              <div style="margin-bottom: 4px; font-size: 12px; color: #666">
                结算单号
              </div>
              <Input :value="settlementNo" disabled />
            </div>

            <!-- 所属公司 -->
            <div v-if="companys.length > 0">
              <div style="margin-bottom: 4px; font-size: 12px; color: #666">
                所属公司
              </div>
              <Select
                mode="multiple"
                :value="companys.map((c) => c.id)"
                :options="companys.map((c) => ({ label: c.name, value: c.id }))"
                disabled
                style="width: 100%"
              />
            </div>

            <!-- 两列布局 -->
            <div
              style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px"
            >
              <div>
                <div style="margin-bottom: 4px; font-size: 12px; color: #666">
                  结算人
                </div>
                <Input :value="currentUserName" disabled />
              </div>
              <div>
                <div style="margin-bottom: 4px; font-size: 12px; color: #666">
                  结算时间
                </div>
                <DatePicker
                  v-model:value="settlementTime"
                  show-time
                  format="YYYY-MM-DD HH:mm"
                  style="width: 100%"
                />
              </div>
            </div>

            <div
              style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px"
            >
              <div>
                <div style="margin-bottom: 4px; font-size: 12px; color: #666">
                  付款方式
                </div>
                <Select
                  v-model:value="payType"
                  :options="payTypeOptions"
                  placeholder="请选择"
                  allow-clear
                  style="width: 100%"
                />
              </div>
              <div>
                <div style="margin-bottom: 4px; font-size: 12px; color: #666">
                  结算对象
                </div>
                <ClientSelect
                  v-model="settlementId"
                  placeholder="请选择结算对象"
                  allow-clear
                  disabled
                  style="width: 100%"
                />
              </div>
            </div>

            <div
              style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px"
            >
              <div>
                <div style="margin-bottom: 4px; font-size: 12px; color: #666">
                  结算币别
                </div>
                <CurrencySelect
                  v-model="currencyId"
                  placeholder="请选择"
                  allow-clear
                  disabled
                  style="width: 100%"
                />
              </div>
              <div></div>
            </div>

            <div>
              <div style="margin-bottom: 4px; font-size: 12px; color: #666">
                备注
              </div>
              <Input.TextArea
                v-model:value="remark"
                placeholder="请输入备注信息（选填）"
                :rows="2"
              />
            </div>
          </div>
        </Card>

        <!-- 中间：费用汇总 -->
        <Card title="费用汇总" :bordered="true" size="small">
          <div style="display: flex; flex-direction: column; gap: 12px">
            <!-- 结算总金额 -->
            <div
              style="
                padding: 12px;
                text-align: center;
                background: #f5f7fa;
                border-radius: 4px;
              "
            >
              <div style="margin-bottom: 6px; font-size: 12px; color: #999">
                结算总金额
              </div>
              <div style="font-size: 20px; font-weight: bold; color: #1890ff">
                ¥{{ formatAmount(totalSettlementAmount) }}
              </div>
              <div style="margin-top: 2px; font-size: 12px; color: #999">
                {{ currencyCode || 'RMB' }}
              </div>
            </div>

            <!-- 我司银行和对方银行同行显示 -->
            <div
              style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px"
            >
              <!-- 我司银行 -->
              <div
                style="
                  padding: 10px;
                  border: 1px solid #e8e8e8;
                  border-radius: 4px;
                "
              >
                <div
                  style="
                    margin-bottom: 6px;
                    font-size: 13px;
                    font-weight: 500;
                    color: #1890ff;
                  "
                >
                  我司银行
                </div>
                <Select
                  v-model:value="orgBankAccountId"
                  :options="
                    orgBankOptions.map((opt) => ({
                      label: opt.label,
                      value: opt.id,
                    }))
                  "
                  placeholder="请先添加申请明细，然后选择我司银行"
                  allow-clear
                  :disabled="settlementItems.length === 0"
                  style="width: 100%"
                />
              </div>

              <!-- 对方银行 -->
              <div
                style="
                  padding: 10px;
                  border: 1px solid #e8e8e8;
                  border-radius: 4px;
                "
              >
                <div
                  style="
                    margin-bottom: 6px;
                    font-size: 13px;
                    font-weight: 500;
                    color: #fa8c16;
                  "
                >
                  对方银行
                </div>
                <Select
                  v-model:value="clientInvoiceBankId"
                  :options="
                    clientBankOptions.map((opt) => ({
                      label: opt.label,
                      value: opt.id,
                    }))
                  "
                  placeholder="请先选择结算对象，然后选择对方银行"
                  allow-clear
                  :disabled="!settlementId"
                  style="width: 100%"
                />
              </div>
            </div>

            <!-- 手续费 -->
            <div style="display: flex; gap: 8px; align-items: center">
              <span style="color: #fa8c16">手续费</span>
              <InputNumber
                v-model:value="transactionFee"
                placeholder="0.00"
                :min="0"
                :precision="2"
                style="width: 100px"
              />
              <span style="font-size: 12px; color: #999">RMB</span>
            </div>

            <!-- 汇率管理（动态显示） -->
            <div
              v-if="rateList.length > 0"
              style="
                padding: 10px;
                margin-top: 8px;
                background: #fafafa;
                border: 1px solid #d9d9d9;
                border-radius: 4px;
              "
            >
              <div
                style="
                  margin-bottom: 8px;
                  font-size: 13px;
                  font-weight: 500;
                  color: #1890ff;
                "
              >
                汇率设置
              </div>
              <div
                style="
                  display: grid;
                  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                  gap: 8px;
                "
              >
                <div
                  v-for="rate in rateList"
                  :key="rate.originalCurrencyId"
                  style="
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    padding: 6px;
                    background: white;
                    border: 1px solid #e8e8e8;
                    border-radius: 4px;
                  "
                >
                  <span
                    style="font-size: 12px; color: #666; white-space: nowrap"
                  >
                    {{ rate.currencyCode || `币别${rate.originalCurrencyId}` }}
                    → {{ currencyCode }}
                  </span>
                  <InputNumber
                    v-model:value="rate.rate"
                    :min="0"
                    :precision="6"
                    :step="0.000001"
                    placeholder="请输入汇率"
                    :disabled="rate.originalCurrencyId === currencyId"
                    style="flex: 1"
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        <!-- 右侧：附件 -->
        <Card title="附件" :bordered="true" size="small">
          <FileUploadInput
            v-model="attachments"
            module-type-id="160011"
            :max-count="10"
          />
        </Card>
      </div>

      <!-- 申请明细 -->
      <Card :bordered="true" size="small" style="min-height: 300px">
        <template #title>
          <div style="display: flex; gap: 8px; align-items: center">
            <div
              style="
                padding: 2px 8px;
                font-size: 12px;
                color: white;
                background: #1890ff;
              "
            >
              申请明细
            </div>
          </div>
        </template>
        <template #extra>
          <Space>
            <Button type="primary" size="small" @click="handleAddApplication">
              + 添加申请
            </Button>
          </Space>
        </template>

        <Table
          :columns="[
            {
              dataIndex: 'applicationNo',
              title: '申请单号',
              minWidth: 140,
              fixed: 'left',
            },
            { dataIndex: 'clientName', title: '结算对象', minWidth: 120 },
            { dataIndex: 'currencyCode', title: '申请币别', width: 100 },
            {
              dataIndex: 'settledPriceDisplay',
              title: '本次结算金额',
              width: 150,
              align: 'right',
            },
            { key: 'action', title: '操作', width: 100, fixed: 'right' },
          ]"
          :data-source="settlementItems"
          :pagination="false"
          bordered
          size="small"
          row-key="id"
          :expandable="{
            defaultExpandAllRows: false,
            expandIconColumnIndex: 0,
          }"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.dataIndex === 'applicationNo'">
              <a style="color: #fa8c16">{{
                record.application.applicationNo
              }}</a>
            </template>
            <template v-else-if="column.dataIndex === 'clientName'">
              {{ record.application.clientName }}
            </template>
            <template v-else-if="column.dataIndex === 'currencyCode'">
              <Tag color="red">{{ record.application.currencyCode }}</Tag>
            </template>
            <template v-else-if="column.dataIndex === 'settledPriceDisplay'">
              <span
                v-if="record.application.currencyId"
                style="font-weight: bold; color: #fa8c16"
              >
                ¥{{ formatAmount(record.userSettledPrice || 0) }}
              </span>
              <span v-else style="color: #999">原币申请</span>
            </template>
            <template v-else-if="column.key === 'action'">
              <Space>
                <Button
                  type="primary"
                  size="small"
                  danger
                  @click="handleDeleteItem(index)"
                >
                  {{ $t('common.delete') }}
                </Button>
              </Space>
            </template>
          </template>

          <!-- 第二层：币别分组 -->
          <template #expandedRowRender="{ record }">
            <Table
              :columns="[
                { dataIndex: 'code', title: '币别', width: 80 },
                {
                  dataIndex: 'receiveAmount',
                  title: '应收金额',
                  width: 120,
                  align: 'right',
                },
                {
                  dataIndex: 'payAmount',
                  title: '应付金额',
                  width: 120,
                  align: 'right',
                },
                {
                  dataIndex: 'unsettledRange',
                  title: '未结算费用',
                  width: 180,
                  align: 'right',
                },
                {
                  dataIndex: 'settledAmount',
                  title: '本次结算金额',
                  width: 150,
                  align: 'right',
                },
              ]"
              :data-source="filterCurrencyGroupWithSettlement(record)"
              :pagination="false"
              row-key="id"
              bordered
              size="small"
              :expandable="{
                defaultExpandAllRows: false,
                expandIconColumnIndex: 0,
              }"
            >
              <template #bodyCell="{ column, record: currencyRecord }">
                <template v-if="column.dataIndex === 'unsettledRange'">
                  {{
                    formatUnsettledRange(
                      currencyRecord.settleableUpperLimit || 0,
                      currencyRecord.settleableLowerLimit || 0,
                    )
                  }}
                </template>

                <template v-else-if="column.dataIndex === 'settledAmount'">
                  <!-- 固定币别申请不显示第二级输入框，或者显示汇总 -->
                  <span
                    v-if="!record.application.currencyId"
                    style="font-weight: bold; color: #1890ff"
                  >
                    {{ formatAmount(currencyRecord.settledAmount ?? 0) }}
                  </span>
                  <span v-else style="color: #999">-</span>
                </template>
              </template>

              <!-- 第三层：费用明细 -->
              <template #expandedRowRender="{ record: feeRecord }">
                <Table
                  :columns="[
                    {
                      dataIndex: 'commissionNum',
                      title: '委托编号',
                      width: 150,
                    },
                    { dataIndex: 'bizType', title: '业务类型', width: 100 },
                    { dataIndex: 'mblNum', title: '主提单号', width: 150 },
                    { dataIndex: 'feeCodeName', title: '费用名称', width: 120 },
                    { dataIndex: 'currencyCode', title: '币别', width: 80 },
                    {
                      dataIndex: 'unInvoicedAmount',
                      title: '未开票金额',
                      width: 120,
                      align: 'right',
                    },
                    {
                      dataIndex: 'unSettledAmount',
                      title: '未结算金额',
                      width: 120,
                      align: 'right',
                    },
                  ]"
                  :data-source="feeRecord.orderFees || []"
                  :pagination="false"
                  row-key="id"
                  bordered
                  size="small"
                >
                  <template #bodyCell="{ column, record: feeItem }">
                    <template v-if="column.dataIndex === 'commissionNum'">
                      {{ feeItem.transportOrder?.commissionNum || '-' }}
                    </template>

                    <template v-else-if="column.dataIndex === 'bizType'">
                      {{ feeItem.transportOrder?.bizType || '-' }}
                    </template>

                    <template v-else-if="column.dataIndex === 'mblNum'">
                      {{ feeItem.transportOrder?.mblNum || '-' }}
                    </template>
                  </template>
                </Table>
              </template>
            </Table>
          </template>
        </Table>
      </Card>
    </div>

    <!-- 选择付费申请抽屉 -->
    <AddApplicationDrawer
      ref="addApplicationDrawerRef"
      :payment-settlement-id="editId"
      :settlement-id="settlementId"
      :currency-id="currencyId"
      :has-existing-fees="hasExistingFees"
      :existing-application-ids="existingApplicationIds"
      @confirm="handleConfirmApplications"
    />
  </Page>
</template>

<style scoped>
:deep(.ant-card-small .ant-card-head) {
  min-height: 36px;
  padding: 0 12px;
}

:deep(.ant-card-small .ant-card-body) {
  padding: 12px;
}
</style>
