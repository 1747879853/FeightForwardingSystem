import type { PrintFormatAdminApi } from '#/api/system/print-format-admin';

import { ref } from 'vue';

import { message } from 'ant-design-vue';

import {
  getPrintAsync,
  getPrintFormatList,
} from '#/api/system/print-format-admin';
import {
  PrintExportFormat,
  type PrintJsonType,
} from '#/components/print-format/types';
import { buildStaticFileUrl } from '#/utils/attachment-url';

const visible = ref(false);
const loading = ref(false);
const previewLoading = ref(false);
const exporting = ref(false);
const templates = ref<PrintFormatAdminApi.PrintFormatDto[]>([]);
const selectedTemplateId = ref<string>();
const exportFormat = ref<PrintExportFormat>(PrintExportFormat.Pdf);
const previewUrl = ref('');
const previewFilename = ref('');
const pendingPrintJsonType = ref<PrintJsonType>();
/** 后端自动取数打印入参（不含 printFormatId / format，导出时再补齐） */
const pendingInput = ref<{
  detailInput?: PrintFormatAdminApi.GuidIdDto;
  isChangeOrderPrint?: boolean;
  orderFeeListInput?: PrintFormatAdminApi.OrderFeeQueryDto;
}>({});

export interface PrintFormatOpenParams {
  /** 数据源类型，决定取数逻辑与所用入参字段 */
  printJsonType: PrintJsonType;
  /** 当票签单方式 id，用于筛选模板 */
  codeIssueTypeId?: null | number;
  /** 当票船公司 id，用于筛选模板 */
  carrierId?: null | number;
  /** 当票分公司/组织 id，用于筛选模板 */
  orgId?: null | number;
  /** 详情类/更改单类取数入参（GuidIdDto） */
  detailInput?: PrintFormatAdminApi.GuidIdDto;
  /** 费用列表类取数入参（OrderFeeQueryDto） */
  orderFeeListInput?: PrintFormatAdminApi.OrderFeeQueryDto;
  /** 是否更改单打印（仅费用列表类有效） */
  isChangeOrderPrint?: boolean;
}

/**
 * 清洗后端返回的文件名：
 * 若文件名中含有 "-"，将 "-" 及其之后的内容删除，但保留扩展名。
 * 例：`638881234567890123-海运出口.pdf` → `638881234567890123.pdf`
 */
function cleanReturnedFilename(filename: string) {
  if (!filename) return filename;
  const dashIndex = filename.indexOf('-');
  if (dashIndex === -1) return filename;
  const dotIndex = filename.lastIndexOf('.');
  const ext = dotIndex > dashIndex ? filename.slice(dotIndex) : '';
  return `${filename.slice(0, dashIndex)}${ext}`;
}

/** 将后端返回的文件名拼接为可访问的静态文件地址 */
function resolvePrintFileUrl(filename: string) {
  const cleaned = cleanReturnedFilename(filename);
  const path = cleaned.startsWith('/') ? cleaned : `/PrintTempFile/${cleaned}`;
  return buildStaticFileUrl(path);
}

function close() {
  visible.value = false;
  templates.value = [];
  selectedTemplateId.value = undefined;
  exportFormat.value = PrintExportFormat.Pdf;
  previewUrl.value = '';
  previewFilename.value = '';
  pendingPrintJsonType.value = undefined;
  pendingInput.value = {};
}

/** 组装后端自动取数打印入参 */
function buildPrintDto(
  printFormatId: string,
  format: PrintExportFormat,
): PrintFormatAdminApi.GetPrintDto {
  return {
    printFormatId,
    printJsonType: pendingPrintJsonType.value as PrintJsonType,
    detailInput: pendingInput.value.detailInput,
    orderFeeListInput: pendingInput.value.orderFeeListInput,
    isChangeOrderPrint: pendingInput.value.isChangeOrderPrint,
    format,
  };
}

/** 按当前模板拉取 PDF 并生成 iframe 预览地址 */
async function loadPreview() {
  if (!selectedTemplateId.value) return;

  previewLoading.value = true;
  previewUrl.value = '';
  previewFilename.value = '';
  try {
    const filename = await getPrintAsync(
      buildPrintDto(selectedTemplateId.value, PrintExportFormat.Pdf),
    );
    if (!filename) {
      message.error('预览失败，未返回文件');
      return;
    }
    previewFilename.value = cleanReturnedFilename(filename);
    previewUrl.value = resolvePrintFileUrl(filename);
  } catch {
    message.error('预览生成失败，请稍后重试');
  } finally {
    previewLoading.value = false;
  }
}

async function loadTemplates(params: PrintFormatOpenParams) {
  loading.value = true;
  try {
    const result = await getPrintFormatList({
      printJsonType: params.printJsonType,
      codeIssueTypeId: params.codeIssueTypeId ?? undefined,
      carrierId: params.carrierId ?? undefined,
      orgId: params.orgId ?? undefined,
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
  pendingPrintJsonType.value = params.printJsonType;
  pendingInput.value = {
    detailInput: params.detailInput,
    orderFeeListInput: params.orderFeeListInput,
    isChangeOrderPrint: params.isChangeOrderPrint,
  };
  selectedTemplateId.value = undefined;
  exportFormat.value = PrintExportFormat.Pdf;
  previewUrl.value = '';
  previewFilename.value = '';
  visible.value = true;
  void loadTemplates(params);
}

/** 切换模板时重新拉取 PDF 预览 */
function handleTemplateChange(templateId: string) {
  selectedTemplateId.value = templateId;
  void loadPreview();
}

/**
 * 导出当前模板：
 * - PDF：在新窗口打开已生成的预览文件；
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
      window.open(previewUrl.value, '_blank', 'noopener');
      return;
    }
    // 预览缺失时兜底重新生成 PDF。
    await loadPreview();
    if (previewUrl.value) {
      window.open(previewUrl.value, '_blank', 'noopener');
    }
    return;
  }

  exporting.value = true;
  try {
    const filename = await getPrintAsync(
      buildPrintDto(selectedTemplateId.value, targetFormat),
    );
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
