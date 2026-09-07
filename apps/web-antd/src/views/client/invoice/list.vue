<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Button,
  Collapse,
  CollapsePanel,
  Empty,
  message,
  Modal,
  Spin,
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

defineOptions({ name: 'ClientInvoiceList' });

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
    } else {
      handleAddInvoice();
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
    mobile: '',
    require: '', // 添加require字段
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

    // 保存成功后重新同步脏值快照，否则未保存守卫会一直认为开票信息未保存，
    // 从而拦截系统 tab（路由级）跳转，导致点击系统 tab 无法切换页面
    await formRef.syncSnapshot?.();

    // 重新加载列表
    //await loadInvoiceList();
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
        await deleteClientInvoiceInfo({ ids: [invoiceId] });
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

async function isInvoiceDirty() {
  for (const form of Object.values(formRefs.value)) {
    const dirty = await form?.isInvoiceFormDirty?.();
    if (dirty) return true;
  }
  return false;
}

defineExpose({ isInvoiceDirty });

onMounted(() => {
  loadInvoiceList();
});
</script>

<template>
  <!-- 本组件作为「开票信息」tab 嵌在客户编辑页(client/editor.vue)的 Page auto-content-height 内。
       嵌套的 Page 会按全局视口高度(--vben-content-height)计算内容高，但它实际位于 editor 的
       内容 tab 栏(50px) + gap-2(8px) 下方，底部内容会被挤出可视区、需外层滚动才能看到。
       用 height-offset 扣除这段被 tab 栏占用的高度(58px)，使内容区正好收在屏幕内、无外层滚动条。 -->
  <Page auto-content-height :height-offset="58">
    <Spin :spinning="loading">
      <div class="invoice-page">
        <!-- 顶部工具栏 -->
        <div class="invoice-toolbar">
          <div class="invoice-toolbar__info">
            <span class="invoice-toolbar__icon">
              <IconifyIcon icon="mdi:receipt-text-outline" />
            </span>
            <span class="invoice-toolbar__title">
              {{ $t('client.invoice.title') }}
            </span>
            <span class="invoice-toolbar__count">{{ invoiceList.length }}</span>
          </div>
          <Button
            type="primary"
            class="invoice-toolbar__add"
            @click="handleAddInvoice"
          >
            <Plus class="size-4" />
            {{ $t('common.create') }}
          </Button>
        </div>

        <!-- 开票信息卡片列表 -->
        <Collapse
          v-model:activeKey="activeKey"
          :bordered="false"
          class="invoice-collapse"
        >
          <CollapsePanel
            v-for="invoice in invoiceList"
            :key="invoice.id"
            :class="{
              'invoice-card--default': invoice.isDefault,
              'invoice-card--active': activeKey.includes(invoice.id),
            }"
          >
            <template #header>
              <div class="invoice-card__header">
                <div class="invoice-card__heading">
                  <span class="invoice-card__badge">
                    <IconifyIcon icon="mdi:file-document-outline" />
                  </span>
                  <div class="invoice-card__meta">
                    <div class="invoice-card__title-row">
                      <span class="invoice-card__title">
                        {{ invoice.header || $t('client.invoice.newInvoice') }}
                      </span>
                      <span v-if="invoice.isDefault" class="invoice-card__tag">
                        <IconifyIcon icon="mdi:check-circle" />
                        {{ $t('client.invoice.isDefault') }}
                      </span>
                    </div>
                    <span class="invoice-card__subtitle">
                      <IconifyIcon icon="mdi:identifier" />
                      {{ invoice.taxNum || $t('client.invoice.taxNum') }}
                    </span>
                  </div>
                </div>
                <div class="invoice-card__actions" @click.stop>
                  <Button
                    type="primary"
                    size="small"
                    :loading="submitting && activeKey.includes(invoice.id)"
                    @click.stop="handleSaveInvoice(invoice.id)"
                  >
                    <IconifyIcon icon="mdi:content-save-outline" />
                    {{ $t('common.save') }}
                  </Button>
                  <Button
                    v-if="!invoice.id.startsWith('new_')"
                    danger
                    size="small"
                    @click.stop="handleDeleteInvoice(invoice.id)"
                  >
                    <IconifyIcon icon="mdi:trash-can-outline" />
                    {{ $t('common.delete') }}
                  </Button>
                </div>
              </div>
            </template>

            <div class="invoice-card__body">
              <Form
                :ref="(el) => setFormRef(el, invoice.id)"
                :invoice-id="invoice.id.startsWith('new_') ? '' : invoice.id"
                :client-id="clientId"
              />
            </div>
          </CollapsePanel>
        </Collapse>

        <!-- 空状态 -->
        <div v-if="!loading && invoiceList.length === 0" class="invoice-empty">
          <Empty
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
            :description="$t('common.noData')"
          />
        </div>
      </div>
    </Spin>
  </Page>
</template>

<style scoped lang="scss">
.invoice-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 顶部工具栏 */
.invoice-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 4%);
}

.invoice-toolbar__info {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.invoice-toolbar__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  font-size: 20px;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
  border-radius: 10px;
}

.invoice-toolbar__title {
  font-size: 16px;
  font-weight: 600;
  color: hsl(var(--foreground));
  white-space: nowrap;
}

.invoice-toolbar__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 600;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 12%);
  border-radius: 11px;
}

.invoice-toolbar__add {
  display: inline-flex;
  flex-shrink: 0;
  gap: 6px;
  align-items: center;
}

/* 折叠面板卡片化 */
.invoice-collapse {
  background: transparent;
}

.invoice-collapse :deep(.ant-collapse-item) {
  margin-bottom: 12px;
  overflow: hidden;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 12px !important;
  box-shadow: 0 1px 3px rgb(0 0 0 / 5%);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.invoice-collapse :deep(.ant-collapse-item:last-child) {
  margin-bottom: 0;
}

.invoice-collapse :deep(.ant-collapse-item:hover) {
  border-color: hsl(var(--primary) / 45%);
  box-shadow: 0 4px 14px rgb(0 0 0 / 8%);
}

.invoice-collapse :deep(.ant-collapse-item.invoice-card--active) {
  border-color: hsl(var(--primary) / 55%);
}

.invoice-collapse :deep(.ant-collapse-item.invoice-card--default) {
  border-color: hsl(var(--primary) / 45%);
  box-shadow: 0 2px 10px hsl(var(--primary) / 12%);
}

.invoice-collapse :deep(.ant-collapse-header) {
  display: flex;
  align-items: center !important;
  padding: 12px 16px !important;
  background: hsl(var(--accent) / 55%);
  transition: background 0.2s ease;
}

.invoice-collapse :deep(.ant-collapse-item-active > .ant-collapse-header) {
  background: hsl(var(--accent));
}

.invoice-collapse :deep(.invoice-card--default > .ant-collapse-header) {
  background: hsl(var(--primary) / 7%);
}

.invoice-collapse :deep(.ant-collapse-arrow) {
  color: hsl(var(--muted-foreground));
}

.invoice-collapse :deep(.ant-collapse-content) {
  border-top: none;
}

.invoice-collapse :deep(.ant-collapse-content-box) {
  padding: 0 !important;
}

/* 卡片头部内容 */
.invoice-card__header {
  display: flex;
  flex: 1;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
}

.invoice-card__heading {
  display: flex;
  gap: 12px;
  align-items: center;
  min-width: 0;
}

.invoice-card__badge {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  font-size: 18px;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 12%);
  border-radius: 9px;
}

.invoice-card__meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.invoice-card__title-row {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.invoice-card__title {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 600;
  color: hsl(var(--foreground));
  white-space: nowrap;
}

.invoice-card__tag {
  display: inline-flex;
  flex-shrink: 0;
  gap: 3px;
  align-items: center;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 500;
  line-height: 18px;
  color: hsl(var(--primary-foreground));
  background: hsl(var(--primary));
  border-radius: 9px;
}

.invoice-card__subtitle {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.invoice-card__actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  align-items: center;
  margin-left: 12px;
}

.invoice-card__actions :deep(.ant-btn) {
  display: inline-flex;
  gap: 5px;
  align-items: center;
}

/* 卡片主体 */
.invoice-card__body {
  padding: 16px;
  background: hsl(var(--card));
  border-top: 1px solid hsl(var(--border));
}

/* 空状态 */
.invoice-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  background: hsl(var(--card));
  border: 1px dashed hsl(var(--border));
  border-radius: 12px;
}
</style>
