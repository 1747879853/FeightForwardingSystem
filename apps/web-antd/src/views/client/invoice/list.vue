<script lang="ts" setup>
import { computed, nextTick, onMounted, ref } from 'vue';
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
import InvoiceAiUploadModal from './invoice-ai-upload-modal.vue';
import {
  getClientInvoiceInfoList,
  addClientInvoiceInfo,
  editClientInvoiceInfo,
  deleteClientInvoiceInfo,
  type ClientInvoiceInfoAdminApi,
} from '#/api/sea-export/clinet-invoice-admin';
import {
  CLIENT_INVOICE_INFO_MAX_BYTES,
  extractClientInvoiceInfo,
  isClientInvoiceInfoUploadFile,
} from '#/api/sea-export/gemini-admin';

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

const aiModalOpen = ref(false);
const aiRecognizing = ref(false);
/** 当前进行 AI 识别的开票卡片 id（识别时再确定：复用首条新增或自动新建） */
const aiTargetInvoiceId = ref<string>('');

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
 * 用表单最新值回写列表卡片标题区（抬头 / 税号等），避免保存成功后仍显示空占位
 */
const patchInvoiceListItem = (
  invoiceId: string,
  patch: Partial<ClientInvoiceInfoAdminApi.ClientInvoiceInfoDto>,
  nextId?: string,
) => {
  const index = invoiceList.value.findIndex((item) => item.id === invoiceId);
  if (index < 0) {
    return;
  }
  const current = invoiceList.value[index]!;
  const resolvedId = nextId || invoiceId;
  invoiceList.value[index] = {
    ...current,
    ...patch,
    id: resolvedId,
  };

  if (nextId && nextId !== invoiceId) {
    // 临时 new_* id 换成真实 id：同步展开态，并丢掉旧 formRef（面板会因 :key 变化重建）
    activeKey.value = activeKey.value.map((key) =>
      key === invoiceId ? nextId : key,
    );
    delete formRefs.value[invoiceId];
  }
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
    const titlePatch: Partial<ClientInvoiceInfoAdminApi.ClientInvoiceInfoDto> =
      {
        address: formData.address ?? '',
        header: formData.header ?? '',
        isDefault: formData.isDefault ?? false,
        mobile: formData.mobile ?? '',
        require: formData.require ?? '',
        sortId: formData.sortId ?? 0,
        taxNum: formData.taxNum ?? '',
        tel: formData.tel ?? '',
      };

    if (isNew) {
      // AddAsync 返回新建开票信息 id；必须写回列表，否则标题仍空且下次保存还会再走新增
      const createdId = await addClientInvoiceInfo(
        formData as ClientInvoiceInfoAdminApi.ClientInvoiceInfoAddDto,
      );
      if (!createdId) {
        message.error($t('common.optionsFailed'));
        return;
      }
      patchInvoiceListItem(invoiceId, titlePatch, String(createdId));
      message.success($t('common.optionsSuccess'));
    } else {
      await editClientInvoiceInfo(
        formData as ClientInvoiceInfoAdminApi.ClientInvoiceInfoEditDto,
      );
      patchInvoiceListItem(invoiceId, titlePatch);
      message.success($t('common.optionsSuccess'));
      // 编辑成功后重新同步脏值快照；新增场景面板会重建并由详情加载同步快照
      await formRef.syncSnapshot?.();
    }
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
 * 设置表单ref（卸载时清掉，避免 new_* → 真实 id 后残留脏引用）
 */
const setFormRef = (el: any, invoiceId: string) => {
  if (el) {
    formRefs.value[invoiceId] = el;
  } else {
    delete formRefs.value[invoiceId];
  }
};

function openAiRecognize() {
  if (aiRecognizing.value) return;
  aiModalOpen.value = true;
}

/** 首条已是未保存新增则复用；否则自动新建一条作为回填目标 */
function ensureAiTargetInvoiceId(): string {
  const first = invoiceList.value[0];
  if (first?.id?.startsWith('new_')) {
    return first.id;
  }
  handleAddInvoice();
  const created = invoiceList.value[invoiceList.value.length - 1];
  return created?.id ?? '';
}

async function waitForFormRef(invoiceId: string, retries = 8) {
  for (let i = 0; i < retries; i += 1) {
    await nextTick();
    const formRef = formRefs.value[invoiceId];
    if (formRef?.applyAiResult) return formRef;
  }
  return formRefs.value[invoiceId];
}

async function runAiRecognize(file?: File, text?: string) {
  if (aiRecognizing.value) return;
  if (file) {
    if (!isClientInvoiceInfoUploadFile(file)) {
      message.warning('请上传 PDF、图片或 Excel/TXT 文件');
      return;
    }
    if (file.size > CLIENT_INVOICE_INFO_MAX_BYTES) {
      message.warning('文件大小超过 20MB 上限，无法识别');
      return;
    }
  }
  if (!file && !text?.trim()) {
    message.warning('请上传开票资料文件或输入需要识别的文字');
    return;
  }

  aiRecognizing.value = true;
  try {
    const result = await extractClientInvoiceInfo(file, text);

    const invoiceId = ensureAiTargetInvoiceId();
    if (!invoiceId) {
      message.warning('无法创建开票信息，请稍后重试');
      return;
    }
    aiTargetInvoiceId.value = invoiceId;
    if (!activeKey.value.includes(invoiceId)) {
      activeKey.value = [invoiceId];
    }

    const formRef = await waitForFormRef(invoiceId);
    if (!formRef?.applyAiResult) {
      message.warning('表单尚未就绪，请展开开票信息后重试');
      return;
    }
    await formRef.whenReady?.();

    const hasUnmatched = await formRef.applyAiResult(result);
    // 同步卡片标题区抬头/税号
    patchInvoiceListItem(invoiceId, {
      header: result.header ?? undefined,
      taxNum: result.taxNum ?? undefined,
      address: result.address ?? undefined,
      tel: result.tel ?? undefined,
      mobile: result.mobile ?? undefined,
      require: result.require ?? undefined,
    });
    aiModalOpen.value = false;
    if (hasUnmatched) {
      message.warning('识别完成，请核对标红银行币别后再保存');
    } else {
      message.success('AI识别完成，请核对后保存');
    }
  } catch (error) {
    console.error('开票信息 AI 识别失败:', error);
  } finally {
    aiRecognizing.value = false;
  }
}

async function handleAiFile(file: File) {
  await runAiRecognize(file);
}

async function handleAiText(text: string) {
  await runAiRecognize(undefined, text);
}

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
          <div class="invoice-toolbar__actions">
            <Button
              class="invoice-toolbar__ai"
              :loading="aiRecognizing"
              @click="openAiRecognize"
            >
              <IconifyIcon icon="mdi:robot-outline" class="size-4" />
              AI识别
            </Button>
            <Button
              type="primary"
              class="invoice-toolbar__add"
              @click="handleAddInvoice"
            >
              <Plus class="size-4" />
              {{ $t('common.create') }}
            </Button>
          </div>
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

    <InvoiceAiUploadModal
      v-model:open="aiModalOpen"
      :recognizing="aiRecognizing"
      @file="handleAiFile"
      @text="handleAiText"
    />
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

.invoice-toolbar__actions {
  display: inline-flex;
  flex-shrink: 0;
  gap: 8px;
  align-items: center;
}

.invoice-toolbar__ai,
.invoice-toolbar__add {
  display: inline-flex;
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
