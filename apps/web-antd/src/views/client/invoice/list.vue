<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Button,
  Card,
  message,
  Space,
  Spin,
  Collapse,
  CollapsePanel,
  Modal,
} from 'ant-design-vue';
import { $t } from '#/locales';
import { Page } from '@vben/common-ui';
import { Plus, IconifyIcon } from '@vben/icons';
import Form from './form.vue';
import {
  getClientInvoiceInfoList,
  addClientInvoiceInfo,
  editClientInvoiceInfo,
  deleteClientInvoiceInfo,
  type ClientInvoiceInfoAdminApi,
} from '#/api/sea-export/clinet-invoice-admin';

const route = useRoute();
const router = useRouter();

// 客户ID（从路由参数或query中获取）
const clientId = computed(() => {
  return (route.params.id || route.query.id) as string;
});

// 开票信息列表
const invoiceList = ref<ClientInvoiceInfoAdminApi.ClientInvoiceInfoDto[]>([]);
const loading = ref(false);
const submitting = ref(false);

// 当前展开的面板
const activeKey = ref<string[]>([]);

// 当前编辑的开票信息ID
const editingInvoiceId = ref<string>('');

// 表单组件引用
const formRefs = ref<Record<string, any>>({});

/**
 * 加载开票信息列表
 */
const loadInvoiceList = async () => {
  if (!clientId.value) {
    message.warning('缺少客户ID');
    return;
  }

  loading.value = true;
  try {
    const list = await getClientInvoiceInfoList({ ClientId: clientId.value });
    invoiceList.value = list ?? [];

    // 默认展开第一个
    if (invoiceList.value.length > 0 && invoiceList.value[0]) {
      activeKey.value = [invoiceList.value[0].id];
    }
  } catch (error) {
    console.error('加载开票信息列表失败:', error);
    message.error($t('common.errorMessage'));
  } finally {
    loading.value = false;
  }
};

/**
 * 新增开票信息
 */
const handleAddInvoice = () => {
  // 清空当前编辑状态
  editingInvoiceId.value = '';
  // 添加一个新的空面板
  const newId = `new_invoice_${Date.now()}`;
  invoiceList.value.push({
    id: newId,
    clientId: clientId.value,
    header: '',
    taxNum: '',
    address: '',
    tel: '',
    isDefault: false,
    sortId: invoiceList.value.length,
    clientInvoiceBanks: [],
    creationTime: new Date().toISOString(),
    isDeleted: false,
    deleterUserId: undefined,
    deletionTime: undefined,
    lastModificationTime: undefined,
    lastModifierUserId: undefined,
    creatorUserId: undefined,
  } as any);
  // 展开新添加的面板
  activeKey.value = [newId];
};

/**
 * 保存开票信息
 */
const handleSaveInvoice = async (invoiceId: string) => {
  const formRef = formRefs.value[invoiceId];
  if (!formRef) {
    message.error('表单未初始化');
    return;
  }

  try {
    submitting.value = true;
    const formData = await formRef.getFormData();

    if (!formData) {
      message.warning('请检查表单填写');
      return;
    }

    const isNew = invoiceId.startsWith('new_');

    if (isNew) {
      // 新增
      await addClientInvoiceInfo(
        formData as ClientInvoiceInfoAdminApi.ClientInvoiceInfoAddDto,
      );
      message.success($t('common.optionsSuccess'));
    } else {
      // 编辑
      await editClientInvoiceInfo(
        formData as ClientInvoiceInfoAdminApi.ClientInvoiceInfoEditDto,
      );
      message.success($t('common.optionsSuccess'));
    }

    // 重新加载列表
    await loadInvoiceList();
  } catch (error) {
    console.error('保存失败:', error);
    message.error($t('common.optionsFailed'));
  } finally {
    submitting.value = false;
  }
};

/**
 * 删除开票信息
 */
const handleDeleteInvoice = (invoiceId: string) => {
  Modal.confirm({
    title: $t('common.delete'),
    content: $t('common.confirmDelete', [$t('client.invoice.title')]),
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    okType: 'danger',
    onOk: async () => {
      try {
        await deleteClientInvoiceInfo({ id: invoiceId });
        message.success($t('common.deleteSuccess'));
        await loadInvoiceList();
      } catch (error) {
        console.error('删除失败:', error);
        message.error($t('common.deleteFailed'));
      }
    },
  });
};

/**
 * 设置表单ref
 */
const setFormRef = (el: any, invoiceId: string) => {
  if (el) {
    formRefs.value[invoiceId] = el;
  }
};

onMounted(() => {
  loadInvoiceList();
});
</script>

<template>
  <Page auto-content-height>
    <Spin :spinning="loading">
      <div class="invoice-list-container">
        <!-- 操作栏 -->
        <div class="mb-1 flex items-center justify-between">
          <Button type="primary" @click="handleAddInvoice">
            <Plus class="size-4" />
            {{ $t('common.create') }}
          </Button>
        </div>

        <!-- 开票信息列表 -->
        <Collapse v-model:activeKey="activeKey" :bordered="false">
          <CollapsePanel
            v-for="invoice in invoiceList"
            :key="invoice.id"
            :style="{
              background: '#f7f7f7',
              borderRadius: '4px',
              marginBottom: '16px',
              border: 0,
              overflow: 'hidden',
            }"
          >
            <template #header>
              <div class="flex w-full items-center justify-between pr-4">
                <Space>
                  <span class="text-base font-medium">
                    {{ invoice.header || $t('client.invoice.newInvoice') }}
                  </span>
                  <span v-if="invoice.isDefault" class="text-xs text-blue-500">
                    ({{ $t('client.invoice.isDefault') }})
                  </span>
                </Space>
                <Space>
                  <Button
                    type="primary"
                    size="small"
                    :loading="submitting && activeKey.includes(invoice.id)"
                    @click.stop="handleSaveInvoice(invoice.id)"
                  >
                    {{ $t('common.save') }}
                  </Button>
                  <Button
                    v-if="!invoice.id.startsWith('new_')"
                    danger
                    size="small"
                    @click.stop="handleDeleteInvoice(invoice.id)"
                  >
                    <IconifyIcon icon="mdi:delete" class="size-4" />
                  </Button>
                </Space>
              </div>
            </template>

            <div class="content-section__body">
              <Form
                :ref="(el) => setFormRef(el, invoice.id)"
                :invoice-id="invoice.id.startsWith('new_') ? '' : invoice.id"
                :client-id="clientId"
              />
            </div>
          </CollapsePanel>
        </Collapse>

        <!-- 空状态 -->
        <div
          v-if="!loading && invoiceList.length === 0"
          class="py-8 text-center text-gray-400"
        >
          {{ $t('common.noData') }}
        </div>
      </div>
    </Spin>
  </Page>
</template>

<style scoped lang="scss">
.invoice-list-container {
  padding: 1px;
}

.content-section__body {
  padding: 16px;
  background: #fff;
}

:deep(.ant-collapse-header) {
  padding: 12px 16px !important;
}

:deep(.ant-collapse-content-box) {
  padding: 0 !important;
}
</style>
