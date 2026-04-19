<script setup lang="ts">
import { ref, computed, watch, h, onUnmounted } from 'vue';
import {
  Button,
  Result,
  Space,
  Spin,
  Checkbox,
  CheckboxGroup,
  Select,
  Tag,
  Modal,
} from 'ant-design-vue';

interface Props {
  // 控制显示
  visible?: boolean;
  // 文件URL
  fileUrl: string;
  // 文件名（用于识别文件类型）
  fileName?: string;
  // 标题
  title?: string;
  // 是否显示工具栏
  showToolbar?: boolean;
  // 使用微软在线预览（默认true）
  useMsPreview?: boolean;
  // 是否转换为PDF预览
  convertToPdf?: boolean;
  // 文件类型，可选 word/excel/pdf，不传则自动识别
  fileType?: 'word' | 'excel' | 'pdf' | 'other';
  // 自定义预览URL，覆盖自动生成的
  customPreviewUrl?: string;
  // 是否自动加载
  autoLoad?: boolean;
  // 加载文本
  loadingText?: string;
  // 文件大小限制（MB），超过则提示下载
  sizeLimit?: number;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  fileName: '',
  title: '文件预览',
  showToolbar: true,
  useMsPreview: true,
  convertToPdf: false,
  fileType: undefined,
  customPreviewUrl: '',
  autoLoad: true,
  loadingText: '文件加载中...',
  sizeLimit: 50, // 50MB
});

const emit = defineEmits<{
  'update:visible': [value: boolean];
  close: [];
  download: [url: string];
  load: [];
  error: [error: Error];
  loaded: [fileInfo: FileInfo];
}>();

interface FileInfo {
  type: 'word' | 'excel' | 'pdf' | 'other';
  extension: string;
  name: string;
  size?: number;
}

// 响应式数据
const visible = ref(props.visible);
const loading = ref(false);
const showError = ref(false);
const errorMessage = ref('');
const errorTitle = ref('加载失败');
const previewFrame = ref<HTMLIFrameElement>();
const fileSize = ref<number>(0);

// 计算文件类型
const fileExtension = computed(() => {
  if (props.fileName) {
    const ext = props.fileName.split('.').pop()?.toLowerCase() || '';
    return ext;
  }

  // 从URL中提取
  const url = props.fileUrl;
  const match = url.match(/\.([a-z0-9]+)(?:[?#]|$)/i);
  return match ? match[1].toLowerCase() : '';
});

// 计算文件类型
const detectedFileType = computed(() => {
  if (props.fileType) return props.fileType;

  const ext = fileExtension.value;
  const wordExts = ['doc', 'docx', 'docm', 'dot', 'dotx', 'dotm'];
  const excelExts = [
    'xls',
    'xlsx',
    'xlsm',
    'xlt',
    'xltx',
    'xltm',
    'xlsb',
    'xlam',
  ];
  const pdfExts = ['pdf'];

  if (wordExts.includes(ext)) return 'word';
  if (excelExts.includes(ext)) return 'excel';
  if (pdfExts.includes(ext)) return 'pdf';
  return 'other';
});

// 计算标题
const computedTitle = computed(() => {
  if (props.title === '文件预览' && props.fileName) {
    return `${props.fileName} - 预览`;
  }
  return props.title;
});

// 计算预览URL
const previewUrl = computed(() => {
  // 优先使用自定义URL
  if (props.customPreviewUrl) return props.customPreviewUrl;

  const url = encodeURIComponent(props.fileUrl);
  const ext = fileExtension.value;

  // 如果是PDF或明确指定不转换，直接使用原URL
  if (detectedFileType.value === 'pdf' || !props.convertToPdf) {
    // 使用微软在线预览
    if (props.useMsPreview) {
      if (
        detectedFileType.value === 'word' ||
        detectedFileType.value === 'excel'
      ) {
        return `https://view.officeapps.live.com/op/view.aspx?src=${url}`;
      }
    }
  }

  // 转换为PDF预览
  if (props.convertToPdf) {
    // 这里可以调用后端转换服务
    // 例如: return `/api/convert-to-pdf?url=${url}&type=${detectedFileType.value}`;
    return props.fileUrl; // 暂时返回原URL
  }

  return props.fileUrl;
});

// 处理取消
const handleCancel = () => {
  visible.value = false;
  emit('update:visible', false);
  emit('close');
};

// 新窗口打开
const openInNewWindow = () => {
  window.open(previewUrl.value, '_blank', 'noopener,noreferrer');
};

// 下载文件
const downloadFile = () => {
  const link = document.createElement('a');
  link.href = props.fileUrl;
  link.download = props.fileName || `download.${fileExtension.value}`;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  emit('download', props.fileUrl);
};

// 刷新预览
const reloadPreview = () => {
  if (previewFrame.value) {
    previewFrame.value.src = previewFrame.value.src;
  }
};

// 处理iframe加载
const handleIframeLoad = () => {
  loading.value = false;
  showError.value = false;
  emit('loaded', {
    type: detectedFileType.value,
    extension: fileExtension.value,
    name: props.fileName,
    size: fileSize.value,
  });
};

// 处理iframe错误
const handleIframeError = (e: Event) => {
  loading.value = false;
  showError.value = true;
  errorTitle.value = '预览加载失败';
  errorMessage.value = '无法加载文件预览，请检查网络连接或文件地址';
  emit('error', new Error('IFrame加载失败'));
};

// 重试
const retry = () => {
  loading.value = true;
  showError.value = false;
  if (previewFrame.value) {
    previewFrame.value.src = previewFrame.value.src;
  }
};

// 获取文件大小
const getFileSize = async () => {
  try {
    const response = await fetch(props.fileUrl, { method: 'HEAD' });
    const size = response.headers.get('content-length');
    if (size) {
      fileSize.value = parseInt(size) / 1024 / 1024; // 转换为MB

      // 检查文件大小限制
      if (fileSize.value > props.sizeLimit) {
        showError.value = true;
        errorTitle.value = '文件过大';
        errorMessage.value = `文件大小 ${fileSize.value.toFixed(2)}MB 超过 ${props.sizeLimit}MB 限制，建议下载后查看`;
        return false;
      }
    }
    return true;
  } catch (error) {
    console.warn('无法获取文件大小:', error);
    return true;
  }
};

// 初始化加载
const initLoad = async () => {
  if (!props.fileUrl || !props.autoLoad) return;

  loading.value = true;
  showError.value = false;

  try {
    // 检查文件大小
    const sizeOk = await getFileSize();
    if (!sizeOk) {
      loading.value = false;
      return;
    }

    // 触发加载事件
    emit('load');
  } catch (error) {
    loading.value = false;
    showError.value = true;
    errorTitle.value = '加载失败';
    errorMessage.value = error instanceof Error ? error.message : '未知错误';
    emit('error', error instanceof Error ? error : new Error(String(error)));
  }
};

// 监听visible变化
watch(
  () => props.visible,
  (val) => {
    visible.value = val;
    if (val) {
      initLoad();
    }
  },
);

// 监听文件URL变化
watch(
  () => props.fileUrl,
  () => {
    if (visible.value) {
      initLoad();
    }
  },
);

// 生命周期
onUnmounted(() => {
  // 清理资源
  if (previewFrame.value) {
    previewFrame.value.src = '';
  }
});

// 暴露方法
defineExpose({
  reloadPreview,
  downloadFile,
  openInNewWindow,
  getFileInfo: () => ({
    type: detectedFileType.value,
    extension: fileExtension.value,
    name: props.fileName,
    size: fileSize.value,
  }),
});
</script>
<!-- components/OfficePreview.vue -->
<template>
  <Modal
    v-model:visible="visible"
    :title="title"
    width="90%"
    class="office-preview-modal"
    :footer="null"
    @cancel="handleCancel"
    destroyOnClose
  >
    <!-- 顶部操作栏 -->
    <div v-if="showToolbar" class="office-toolbar">
      <Space>
        <Button @click="openInNewWindow" size="small"> 新窗口打开 </Button>
        <Button @click="downloadFile" size="small"> 下载 </Button>
        <Button @click="reloadPreview" size="small"> 刷新 </Button>
        <Tag :color="fileType === 'excel' ? 'green' : 'blue'">
          {{ fileExtension }}
        </Tag>
      </Space>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="office-loading">
      <Spin :tip="loadingText" size="large" />
    </div>

    <!-- 错误状态 -->
    <div v-if="showError" class="office-error">
      <Result status="error" :title="errorTitle" :sub-title="errorMessage">
        <template #extra>
          <Space>
            <Button type="primary" @click="retry"> 重试 </Button>
            <Button @click="downloadFile"> 下载文件 </Button>
          </Space>
        </template>
      </Result>
    </div>

    <!-- 预览内容 -->
    <div v-else class="office-preview-container">
      <!-- Word/Excel 预览 -->
      <iframe
        v-if="fileType === 'word' || fileType === 'excel'"
        ref="previewFrame"
        :src="previewUrl"
        :title="title"
        frameborder="0"
        class="office-iframe"
        @load="handleIframeLoad"
        @error="handleIframeError"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
      ></iframe>

      <!-- PDF 预览（Word转PDF） -->
      <div v-else-if="fileType === 'pdf'" class="pdf-container">
        <iframe
          v-if="visible"
          :src="previewUrl"
          frameborder="0"
          class="pdf-iframe"
        ></iframe>
      </div>

      <!-- 不支持的格式 -->
      <div v-else class="unsupported-format">
        <Result
          status="warning"
          title="不支持的文件格式"
          :sub-title="`无法预览 ${fileExtension.toUpperCase()} 格式的文件`"
        >
          <template #extra>
            <Button type="primary" @click="downloadFile"> 下载文件 </Button>
          </template>
        </Result>
      </div>
    </div>
  </Modal>
</template>
<style scoped>
.office-preview-modal :deep(.ant-modal) {
  top: 20px;
}

.office-preview-modal :deep(.ant-modal-body) {
  display: flex;
  flex-direction: column;
  height: 80vh;
  padding: 0;
}

.office-toolbar {
  padding: 12px 24px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

.office-loading,
.office-error,
.unsupported-format {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;
}

.office-preview-container {
  position: relative;
  flex: 1;
  overflow: hidden;
}

.office-iframe,
.pdf-iframe {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
}

.pdf-container {
  width: 100%;
  height: 100%;
  overflow: auto;
}
</style>
