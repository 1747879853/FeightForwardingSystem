<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import type { OnActionClickParams } from '#/adapter/vxe-table';
import { Page } from '@vben/common-ui';
import { Button, message, Modal, Space, Upload } from 'ant-design-vue';
import type { UploadProps } from 'ant-design-vue';
import { Plus, IconifyIcon } from '@vben/icons';
import { $t } from '#/locales';
import dayjs from 'dayjs';
import FileUploadInput from '#/adapter/component/file-upload/file-upload-input.vue';
import {
  EditAttachmentAsync,
  getClientDetail,
  type ClientAdminApi,
} from '#/api/sea-export/client-admin';
import PdfPreview from '#/adapter/component/file-preview/pdf-preview-modal.vue';
import WordPreview from '#/adapter/component/file-preview/word-preview-modal.vue';
const route = useRoute();

// 客户ID（从路由参数或query中获取）
const clientId = computed(() => {
  return (route.params.id || route.query.id) as string;
});

// 附件列表数据
const attachmentList = ref<ClientAdminApi.AttachmentItemForItemInputDto[]>([]);
const submitting = ref(false);

// 文件上传相关
const uploadVisible = ref(false);
const tempAttachments = ref<any[]>([]);
/**
 * 格式化文件大小
 */
const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

/**
 * 加载客户详情（包含附件信息）
 */
const loadClientDetail = async () => {
  if (!clientId.value) {
    message.warning('缺少客户ID');
    return;
  }

  try {
    const detail = await getClientDetail(clientId.value);

    attachmentList.value =
      detail.attachments?.map((item) => {
        return { ...item, fileLength: formatFileSize(item.fileLength) };
      }) ?? [];
  } catch (error) {
    console.error('加载客户详情失败:', error);
    //message.error($t('common.errorMessage'));
  }
};

/**
 * 获取文件类型显示文本
 */
const getFileTypeText = (fileName?: string): string => {
  if (!fileName) return '-';
  const ext = fileName.split('.').pop()?.toLowerCase();
  const typeMap: Record<string, string> = {
    pdf: 'PDF',
    doc: 'Word',
    docx: 'Word',
    xls: 'Excel',
    xlsx: 'Excel',
    jpg: '图片',
    jpeg: '图片',
    png: '图片',
    gif: '图片',
    bmp: '图片',
    zip: '压缩包',
    rar: '压缩包',
  };
  return typeMap[ext || ''] || ext?.toUpperCase() || '未知';
};

/**
 * 表格操作点击处理
 */
const handleActionClick = ({
  code,
  row,
}: OnActionClickParams<ClientAdminApi.AttachmentItemForItemInputDto>) => {
  switch (code) {
    case 'download': {
      handleDownload(row);
      break;
    }
    case 'delete': {
      handleDelete(row);
      break;
    }
  }
};

/**
 * 下载文件
 */
const handleDownload = (row: ClientAdminApi.AttachmentItemForItemInputDto) => {
  if (row.url) {
    window.open(row.url, '_blank');
  } else {
    message.warning('文件链接不存在');
  }
};

/**
 * 删除附件
 */
const handleDelete = (row: ClientAdminApi.AttachmentItemDto) => {
  Modal.confirm({
    title: $t('common.confirmDelete', [$t('client.attachment.fileName')]),
    content: `确定要删除文件 "${row.friendlyFileName?.split('/').pop() || '未知文件'}" 吗？`,
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    okType: 'danger',
    onOk: async () => {
      try {
        // 从列表中移除该附件
        const updatedAttachments = attachmentList.value.filter(
          (item) => item.attachmentId !== row.attachmentId,
        );

        await EditAttachmentAsync({
          id: clientId.value,
          attachments: updatedAttachments,
        });

        message.success($t('common.deleteSuccess'));
        await loadClientDetail();
      } catch (error) {
        console.error('删除失败:', error);
        message.error($t('common.deleteFailed'));
      }
    },
  });
};

/**
 * 打开上传弹窗
 */
const handleUpload = () => {
  tempAttachments.value = [];
  uploadVisible.value = true;
};

/**
 * 确认上传
 */
const handleUploadConfirm = async () => {
  if (tempAttachments.value.length === 0) {
    message.warning('请选择要上传的文件');
    return;
  }

  try {
    submitting.value = true;

    // 将新上传的附件转换为 AttachmentItemForItemInputDto 格式
    const newAttachments: ClientAdminApi.AttachmentItemForItemInputDto[] =
      tempAttachments.value.map((file, index) => ({
        attachmentId: file.attachmentId,
        url: file.url,
        itemId: clientId.value,
        displayOrder: attachmentList.value.length + index + 1,
      }));

    // 合并现有附件和新附件
    const allAttachments = [...attachmentList.value, ...newAttachments];

    await EditAttachmentAsync({
      id: clientId.value,
      attachments: allAttachments,
    });

    message.success($t('common.uploadSuccess'));
    uploadVisible.value = false;
    await loadClientDetail();
  } catch (error) {
    console.error('上传失败:', error);
    message.error($t('common.uploadFailed'));
  } finally {
    submitting.value = false;
  }
};

/**
 * 列配置
 */
const columns = [
  {
    field: 'friendlyFileName',
    title: $t('client.attachment.fileName'),
    minWidth: 200,
  },
  {
    field: 'fileType',
    title: $t('client.attachment.fileType'),
    width: 120,
  },
  {
    field: 'fileLength',
    title: $t('client.attachment.fileSize'),
    width: 120,
  },
  {
    field: 'creationTime',
    title: $t('client.attachment.uploadTime'),
    width: 180,
    formatter: 'formatDateTime',
  },
  {
    field: 'creatorUserNickName',
    title: $t('client.attachment.uploader'),
    width: 150,
  },
  {
    title: $t('seaExport.client.operation'),
    width: 250,
    fixed: 'right' as const,
    slots: { default: 'action' },
  },
];

const [Grid, gridApi] = useVbenVxeGrid<
  ClientAdminApi.AttachmentItemForItemInputDto & {
    friendlyFileName?: string;
    fileType?: string;
    fileSize?: string;
    uploadTime?: string;
    uploader?: string;
  }
>({
  gridOptions: {
    columns,
    data: [],
    height: 'auto',
    rowConfig: {
      keyField: 'attachmentId',
    },
    pagerConfig: {
      enabled: false,
    },
    toolbarConfig: {
      custom: true,
      export: false,
      refresh: false,
      zoom: true,
    },
  },
});

/**
 * 更新表格数据
 */
const updateGridData = () => {
  const tableData = attachmentList.value.map((item) => ({
    ...item,
    fileName: item.url ? item.url.split('/').pop() : '未知文件',
    fileType: getFileTypeText(item.url),
    fileSize: '-', // API 未返回文件大小，暂时显示 -
    uploadTime: '-', // API 未返回上传时间，暂时显示 -
    uploader: '-', // API 未返回上传人，暂时显示 -
  }));

  gridApi.grid?.loadData(tableData);
};

onMounted(() => {
  loadClientDetail();
});

// 监听附件列表变化，更新表格
watch(
  () => attachmentList.value,
  () => {
    updateGridData();
  },
  { deep: true },
);

const previewVisible = ref(false);
const currentPdfUrl = ref('');

const openPdfPreview = (row: ClientAdminApi.AttachmentItemForItemInputDto) => {
  // 根据pdfId获取对应的URL
  // api.getPdfUrl(pdfId).then(res => {
  //   currentPdfUrl.value = res.data.url;
  //   previewVisible.value = true;
  // });

  currentPdfUrl.value = row.url || '';
  previewVisible.value = true;
};

const handlePdfClose = () => {
  console.log('PDF预览已关闭');
};

// 通用预览
const officeVisible = ref(false);
const currentFileUrl = ref('');
const currentFileName = ref('');
const currentFileTitle = ref('');
// 显示Word预览
const showWordPreview = () => {
  currentFileUrl.value =
    '/Uploads/document/20260417/6391204290217497459137.doc';
  currentFileName.value = '示例文档.docx';
  currentFileTitle.value = 'Word文档预览';
  officeVisible.value = true;
};
</script>

<template>
  <Page auto-content-height>
    <!-- 表格 -->
    <Grid :table-title="$t('client.attachment.title')">
      <template #toolbar-tools>
        <Space>
          <Button type="primary" @click="handleUpload">
            <IconifyIcon icon="mdi:upload" class="size-5" />
            {{ $t('client.attachment.uploadTitle') }}
          </Button>
          <!-- <Button type="primary" @click="showWordPreview">
            <IconifyIcon icon="mdi:upload" class="size-5" />
            {{ $t('client.attachment.preview') }}
          </Button> -->
        </Space>
      </template>
      <template #fileName="{ row }">
        <div class="flex items-center gap-2">
          <IconifyIcon icon="mdi:file-document-outline" class="text-gray-400" />
          <span>{{ row.friendlyFileName }}</span>
        </div>
      </template>

      <template #action="{ row }">
        <Space>
          <Button type="link" size="small" @click="handleDownload(row)">
            <IconifyIcon icon="mdi:download" />
            {{ $t('client.attachment.downloadTitle') }}
          </Button>
          <!-- <Button type="link" size="small" @click="openPdfPreview(row)">
            <IconifyIcon icon="qlementine-icons:preview-16" />
            {{ $t('client.attachment.preview') }}
          </Button> -->
          <Button type="link" size="small" danger @click="handleDelete(row)">
            <IconifyIcon icon="mdi:delete" />
            {{ $t('common.delete') }}
          </Button>
        </Space>
      </template>
    </Grid>

    <!-- 上传弹窗 -->
    <Modal
      v-model:open="uploadVisible"
      :title="$t('client.attachment.uploadTitle')"
      :confirm-loading="submitting"
      @ok="handleUploadConfirm"
      @cancel="uploadVisible = false"
    >
      <div class="py-4">
        <FileUploadInput
          v-model="tempAttachments"
          :max-count="20"
          :max-size-m-b="10"
          :allowed-types="[
            '.pdf',
            '.doc',
            '.docx',
            '.xls',
            '.xlsx',
            '.jpg',
            '.jpeg',
            '.png',
            '.gif',
            '.bmp',
          ]"
        />
        <div class="mt-2 text-xs text-gray-400">
          {{ $t('client.attachment.uploadTip') }}
        </div>
      </div>
    </Modal>

    <PdfPreview
      v-model:value="previewVisible"
      :src="currentPdfUrl"
      title="文档预览"
      @close="handlePdfClose"
    />

    <WordPreview
      v-model:visible="officeVisible"
      :file-url="currentFileUrl"
      :fileName="currentFileName"
      :title="currentFileTitle"
    />
  </Page>
</template>

<style scoped lang="scss"></style>
