import type { PrintFormatAdminApi } from '#/api/system/print-format-admin';

import { ref } from 'vue';

import { message } from 'ant-design-vue';

import {
  getPrintFormatPagedList,
  printFormatAsync,
} from '#/api/system/print-format-admin';
import {
  PrintExportFormat,
  type PrintJsonType,
} from '#/components/print-format/types';
import { buildStaticFileUrl } from '#/utils/attachment-url';
import { downloadFileByUrl } from '#/utils/download-file';

const visible = ref(false);
const loading = ref(false);
const previewLoading = ref(false);
const exporting = ref(false);
const templates = ref<PrintFormatAdminApi.PrintFormatDto[]>([]);
const selectedTemplateId = ref<string>();
const exportFormat = ref<PrintExportFormat>(PrintExportFormat.Pdf);
const previewUrl = ref('');
const previewFilename = ref('');
const pendingJson = ref('');
const pendingPrintJsonType = ref<PrintJsonType>();

export interface PrintFormatOpenParams {
  printJsonType: PrintJsonType;
  json: string;
}

/** 将后端返回的文件名拼接为可访问的静态文件地址 */
function resolvePrintFileUrl(filename: string) {
  const path = filename.startsWith('/')
    ? filename
    : `/PrintTempFile/${filename}`;
  return buildStaticFileUrl(path);
}

function close() {
  visible.value = false;
  templates.value = [];
  selectedTemplateId.value = undefined;
  exportFormat.value = PrintExportFormat.Pdf;
  previewUrl.value = '';
  previewFilename.value = '';
  pendingJson.value = '';
  pendingPrintJsonType.value = undefined;
}

/** 按当前模板拉取 PDF 并生成 iframe 预览地址 */
async function loadPreview() {
  if (!selectedTemplateId.value) return;

  previewLoading.value = true;
  previewUrl.value = '';
  previewFilename.value = '';
  try {
    const filename = await printFormatAsync({
      printFormatId: selectedTemplateId.value,
      json: pendingJson.value,
      format: PrintExportFormat.Pdf,
    });
    if (!filename) {
      message.error('预览失败，未返回文件');
      return;
    }
    previewFilename.value = filename;
    previewUrl.value = resolvePrintFileUrl(filename);
  } catch {
    message.error('预览生成失败，请稍后重试');
  } finally {
    previewLoading.value = false;
  }
}

async function loadTemplates(printJsonType: PrintJsonType) {
  loading.value = true;
  try {
    const result = await getPrintFormatPagedList({
      printJsonType,
      pageIndex: 1,
      pageSize: 1000,
    });
    templates.value =
      result.items ??
      (result as { Items?: PrintFormatAdminApi.PrintFormatDto[] }).Items ??
      [];
    if (templates.value.length === 0) {
      message.error('暂无可用打印模板');
      close();
      return;
    }
    // 默认不选择模板，待用户在下拉中选择后再渲染 PDF 预览。
  } catch {
    message.error('获取打印模板失败');
    close();
  } finally {
    loading.value = false;
  }
}

function openPrint(params: PrintFormatOpenParams) {
  if (!params.json?.trim()) {
    message.warning('打印数据不能为空');
    return;
  }

  pendingJson.value = params.json;
  pendingPrintJsonType.value = params.printJsonType;
  selectedTemplateId.value = undefined;
  exportFormat.value = PrintExportFormat.Pdf;
  previewUrl.value = '';
  previewFilename.value = '';
  visible.value = true;
  void loadTemplates(params.printJsonType);
}

/** 切换模板时重新拉取 PDF 预览 */
function handleTemplateChange(templateId: string) {
  selectedTemplateId.value = templateId;
  void loadPreview();
}

/**
 * 导出当前模板：
 * - PDF：直接下载已生成的预览文件；
 * - Excel/Word：重新按目标格式生成并在新窗口打开下载。
 * @param format 指定导出格式；不传则使用当前 exportFormat（默认 PDF）
 */
async function handleExport(format?: PrintExportFormat) {
  if (!selectedTemplateId.value) {
    message.warning('请先选择打印模板');
    return;
  }

  if (format !== undefined) {
    exportFormat.value = format;
  }
  const targetFormat = exportFormat.value;

  // PDF 复用已生成的预览文件，避免重复请求。
  if (targetFormat === PrintExportFormat.Pdf) {
    if (previewUrl.value) {
      downloadFileByUrl(previewUrl.value, previewFilename.value);
      return;
    }
    // 预览缺失时兜底重新生成 PDF。
    await loadPreview();
    if (previewUrl.value) {
      downloadFileByUrl(previewUrl.value, previewFilename.value);
    }
    return;
  }

  exporting.value = true;
  try {
    const filename = await printFormatAsync({
      printFormatId: selectedTemplateId.value,
      json: pendingJson.value,
      format: targetFormat,
    });
    if (!filename) {
      message.error('导出失败，未返回文件');
      return;
    }
    window.open(resolvePrintFileUrl(filename), '_blank', 'noopener');
    message.success('导出文件已生成');
  } catch {
    message.error('导出失败，请稍后重试');
  } finally {
    exporting.value = false;
  }
}

export function usePrintFormat() {
  return {
    visible,
    loading,
    previewLoading,
    exporting,
    templates,
    selectedTemplateId,
    exportFormat,
    previewUrl,
    pendingPrintJsonType,
    openPrint,
    close,
    handleTemplateChange,
    handleExport,
  };
}
