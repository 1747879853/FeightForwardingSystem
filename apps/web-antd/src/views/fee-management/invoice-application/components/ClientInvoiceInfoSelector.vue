<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import type { SelectValue } from 'ant-design-vue/es/select';
import { Button, Form, Input, message, Modal, Select } from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';
import {
  addClientInvoiceInfo,
  getClientInvoiceInfoList,
  type ClientInvoiceInfoAdminApi,
} from '#/api/sea-export/clinet-invoice-admin';
import { CurrencySelect } from '#/adapter/component';

interface Props {
  /** 客户ID（结算对象） */
  clientId?: string;
  /** 当前选中的开票信息ID */
  value?: string;
  /** 当前申请的币别ID */
  currencyId?: number;
  /** 当前选中的银行ID */
  bankId?: string;
  /** 是否禁用 */
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  clientId: '',
  value: '',
  currencyId: undefined,
  bankId: '',
  disabled: false,
});

const emit = defineEmits<{
  'update:value': [value: string];
  'update:bankId': [bankId: string];
  change: [
    value: string,
    info: ClientInvoiceInfoAdminApi.ClientInvoiceInfoDto | null,
  ];
  bankChange: [bankId: string];
}>();

// 状态管理
const loading = ref(false);
const invoiceInfoList = ref<ClientInvoiceInfoAdminApi.ClientInvoiceInfoDto[]>(
  [],
);
const showModal = ref(false);
const submitting = ref(false);

// 快捷录入表单
const quickForm = ref({
  header: '',
  taxNum: '',
  address: '',
  tel: '',
  bankName: '',
  bankAccount: '',
  currencyId: props.currencyId,
});

// 计算属性 - 下拉选项
const selectOptions = computed(() => {
  return invoiceInfoList.value.map((item) => ({
    label: item.header || '未命名抬头',
    value: item.id,
    info: item,
  }));
});

// 监听客户端变化，加载开票信息
watch(
  () => props.clientId,
  async (newClientId) => {
    if (newClientId) {
      await loadInvoiceInfoList();
    } else {
      invoiceInfoList.value = [];
    }
  },
  { immediate: true },
);

// 监听币别变化，更新表单默认币别
watch(
  () => props.currencyId,
  (newCurrencyId) => {
    if (newCurrencyId && !quickForm.value.currencyId) {
      quickForm.value.currencyId = newCurrencyId;
    }
  },
  { immediate: true },
);

/**
 * 加载开票信息列表
 */
async function loadInvoiceInfoList() {
  if (!props.clientId) return;

  loading.value = true;
  try {
    const list = await getClientInvoiceInfoList({ ClientId: props.clientId });
    invoiceInfoList.value = list || [];
  } catch (error) {
    console.error('加载开票信息失败:', error);
    message.error('加载开票信息失败');
  } finally {
    loading.value = false;
  }
}

/**
 * 处理选择变化
 */
function handleSelectChange(value: SelectValue) {
  if (!value || typeof value !== 'string') return;

  emit('update:value', value);
  const selected = invoiceInfoList.value.find((item) => item.id === value);
  emit('change', value, selected || null);

  // 清空银行选择
  emit('update:bankId', '');
  emit('bankChange', '');
}

/**
 * 打开新建弹窗
 */
function handleOpenModal() {
  // 重置表单
  quickForm.value = {
    header: '',
    taxNum: '',
    address: '',
    tel: '',
    bankName: '',
    bankAccount: '',
    currencyId: props.currencyId,
  };
  showModal.value = true;
}

/**
 * 关闭弹窗
 */
function handleCloseModal() {
  showModal.value = false;
}

/**
 * 验证表单
 */
function validateForm() {
  if (!quickForm.value.header?.trim()) {
    message.warning('请输入发票抬头');
    return false;
  }
  if (!quickForm.value.taxNum?.trim()) {
    message.warning('请输入纳税人识别号');
    return false;
  }
  return true;
}

/**
 * 保存新的开票信息
 */
async function handleSave() {
  if (!props.clientId) {
    message.warning('请先选择结算对象');
    return;
  }

  if (!validateForm()) {
    return;
  }

  submitting.value = true;
  try {
    const addData: ClientInvoiceInfoAdminApi.ClientInvoiceInfoAddDto = {
      clientId: props.clientId,
      header: quickForm.value.header.trim(),
      taxNum: quickForm.value.taxNum.trim(),
      address: quickForm.value.address?.trim(),
      tel: quickForm.value.tel?.trim(),
      isDefault: false,
      sortId: 0,
      clientInvoiceBanks: [
        {
          bankName: quickForm.value.bankName?.trim(),
          bankAccount: quickForm.value.bankAccount?.trim(),
          currencyId: quickForm.value.currencyId || props.currencyId || 0,
          isDefault: true,
          sortId: 0,
        },
      ],
    };

    const newId = await addClientInvoiceInfo(addData);

    if (newId) {
      message.success('开票信息保存成功');

      // 重新加载列表
      await loadInvoiceInfoList();

      // 自动选中新建的开票信息
      emit('update:value', newId);
      const newInfo = invoiceInfoList.value.find((item) => item.id === newId);
      emit('change', newId, newInfo || null);

      // 关闭弹窗
      showModal.value = false;

      // 重置表单
      quickForm.value = {
        header: '',
        taxNum: '',
        address: '',
        tel: '',
        bankName: '',
        bankAccount: '',
        currencyId: props.currencyId,
      };
    }
  } catch (error) {
    console.error('保存开票信息失败:', error);
    message.error('保存开票信息失败');
  } finally {
    submitting.value = false;
  }
}

/**
 * 处理银行选择变化
 */
function handleBankChange(bankId: SelectValue) {
  if (!bankId || typeof bankId !== 'string') return;

  emit('update:bankId', bankId);
  emit('bankChange', bankId);
}

/**
 * 获取当前选中开票信息下，与币别匹配的银行列表
 */
const filteredBanks = computed(() => {
  if (!props.value || !props.currencyId) {
    return [];
  }

  const selectedInfo = invoiceInfoList.value.find(
    (item) => item.id === props.value,
  );

  if (!selectedInfo || !selectedInfo.clientInvoiceBanks) {
    return [];
  }

  return selectedInfo.clientInvoiceBanks
    .filter((bank) => bank.currencyId === props.currencyId)
    .map((bank) => ({
      label: `${bank.bankName} - ${bank.bankAccount}`,
      value: bank.id,
    }));
});

/**
 * 暴露方法供父组件调用
 */
defineExpose({
  refresh: loadInvoiceInfoList,
});
</script>

<template>
  <div class="client-invoice-selector">
    <!-- 第一行：名称选择 + 快捷录入按钮 -->
    <div
      style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px"
    >
      <span style="min-width: 80px; color: #666"><strong>名 称:</strong></span>
      <Select
        :value="value"
        :options="selectOptions"
        :loading="loading"
        :disabled="disabled"
        placeholder="请选择购买方开票信息"
        style="flex: 1"
        size="small"
        @change="handleSelectChange"
      >
        <template #notFoundContent>
          <div style="padding: 8px; color: #999; text-align: center">
            {{ invoiceInfoList.length === 0 ? '暂无开票信息' : '未找到匹配项' }}
          </div>
        </template>
      </Select>
      <Button
        type="dashed"
        size="small"
        @click="handleOpenModal"
        :disabled="disabled || !clientId"
        style="flex-shrink: 0"
      >
        <template #icon>
          <IconifyIcon icon="ant-design:plus-outlined" />
        </template>
        新建
      </Button>
    </div>

    <!-- 第二行：纳税人识别号 -->
    <div
      style="
        display: flex;
        align-items: center;
        height: 28px;
        margin-bottom: 4px;
      "
    >
      <span style="min-width: 80px; margin-right: 8px; color: #666">
        <strong>纳税人识别号:</strong>
      </span>
      <span style="flex: 1; font-size: 13px">
        {{
          invoiceInfoList.find((item) => item.id === value)?.taxNum || '(选填)'
        }}
      </span>
    </div>

    <!-- 第三行：地址、电话 -->
    <div
      style="
        display: flex;
        align-items: center;
        height: 28px;
        margin-bottom: 4px;
      "
    >
      <span style="min-width: 80px; margin-right: 8px; color: #666">
        <strong>地址、电话:</strong>
      </span>
      <span style="flex: 1; font-size: 13px">
        {{
          invoiceInfoList.find((item) => item.id === value)?.address || '(选填)'
        }}
        {{ invoiceInfoList.find((item) => item.id === value)?.tel || '' }}
      </span>
    </div>

    <!-- 第四行：开户行及账号（改为下拉框） -->
    <div style="display: flex; align-items: center; height: 28px">
      <span style="min-width: 80px; margin-right: 8px; color: #666">
        <strong>开户行及账号:</strong>
      </span>
      <Select
        :value="bankId"
        :options="filteredBanks"
        :disabled="disabled || !value"
        placeholder="请选择银行"
        style="flex: 1"
        size="small"
        @change="handleBankChange"
      >
        <template #notFoundContent>
          <div style="padding: 8px; color: #999; text-align: center">
            {{ !value ? '请先选择开票信息' : '该币别下暂无银行账户' }}
          </div>
        </template>
      </Select>
    </div>

    <!-- 新建开票信息弹窗 -->
    <Modal
      v-model:open="showModal"
      title="新建客户开票信息"
      :width="600"
      :confirm-loading="submitting"
      ok-text="保存并选择"
      cancel-text="取消"
      @ok="handleSave"
      @cancel="handleCloseModal"
    >
      <Form
        layout="vertical"
        :label-col="{ span: 24 }"
        :wrapper-col="{ span: 24 }"
      >
        <Form.Item label="发票抬头" required>
          <Input
            v-model:value="quickForm.header"
            placeholder="请输入发票抬头"
            :maxlength="200"
          />
        </Form.Item>

        <Form.Item label="纳税人识别号" required>
          <Input
            v-model:value="quickForm.taxNum"
            placeholder="请输入纳税人识别号"
            :maxlength="50"
          />
        </Form.Item>

        <Form.Item label="开票地址">
          <Input
            v-model:value="quickForm.address"
            placeholder="请输入开票地址"
            :maxlength="200"
          />
        </Form.Item>

        <Form.Item label="开票电话">
          <Input
            v-model:value="quickForm.tel"
            placeholder="请输入开票电话"
            :maxlength="50"
          />
        </Form.Item>

        <Form.Item label="币别">
          <CurrencySelect
            v-model:value="quickForm.currencyId"
            placeholder="请选择币别"
            style="width: 100%"
          />
        </Form.Item>

        <Form.Item label="开户银行">
          <Input
            v-model:value="quickForm.bankName"
            placeholder="请输入开户银行"
            :maxlength="200"
          />
        </Form.Item>

        <Form.Item label="银行账号">
          <Input
            v-model:value="quickForm.bankAccount"
            placeholder="请输入银行账号"
            :maxlength="50"
          />
        </Form.Item>
      </Form>
    </Modal>
  </div>
</template>

<style scoped>
.client-invoice-selector {
  width: 100%;
}

/* 确保在固定高度容器内正常显示 */
.client-invoice-selector :deep(.ant-select) {
  max-width: 100%;
}
</style>
