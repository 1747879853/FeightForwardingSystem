import type { PrintFormatAdminApi } from '#/api/system/print-format-admin';

import { ref } from 'vue';

import { downloadFileFromBlob } from '@vben/utils';

import { message } from 'ant-design-vue';

import {
  createOnlinePreviewAsync,
  getPrintAsync,
  getPrintFormatList,
} from '#/api/system/print-format-admin';
import {
  PrintExportFormat,
  type PrintFormatBizType,
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
/** 预览生成的原始文件名（含时间戳），用于 PDF 导出时复用、避免重复请求 */
const previewOriginalFilename = ref('');
/** 预览方式：pdf = 后端生成 PDF 预览；online = 后端 WebReport 在线预览（模板里的对话框可以点） */
const previewMode = ref<'online' | 'pdf'>('pdf');
const onlineLoading = ref(false);
/** 在线预览 iframe 地址（带一次性票据，只能打开一次） */
const onlinePreviewUrl = ref('');
/** 当前在线预览的票据：切走/关闭时凭它通知后端释放内存 */
const onlineTicket = ref('');
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
  orgId?: null | number | string;
  /** 业务类型，按「相等或为空」筛模板 */
  bizType?: PrintFormatBizType | null;
  /** 详情类/更改单类取数入参（GuidIdDto） */
  detailInput?: PrintFormatAdminApi.GuidIdDto;
  /** 费用列表类取数入参（OrderFeeQueryDto） */
  orderFeeListInput?: PrintFormatAdminApi.OrderFeeQueryDto;
  /** 是否更改单打印（仅费用列表类有效） */
  isChangeOrderPrint?: boolean;
}

/**
 * 清洗后端返回的文件名：去掉末尾的 `-<时间戳>` 段，保留扩展名。
 * 仅当最后一个 "-" 之后是纯数字（后端时间戳/ticks）时才截断，避免误伤友好名里的 "-"。
 * 例：`订舱委托书-101-639204489841449418.pdf` → `订舱委托书-101.pdf`
 */
function cleanReturnedFilename(filename: string) {
  if (!filename) return filename;
  const dotIndex = filename.lastIndexOf('.');
  const ext = dotIndex === -1 ? '' : filename.slice(dotIndex);
  const base = dotIndex === -1 ? filename : filename.slice(0, dotIndex);
  const dashIndex = base.lastIndexOf('-');
  if (dashIndex === -1) return filename;
  const tail = base.slice(dashIndex + 1);
  if (!/^\d+$/.test(tail)) return filename;
  return `${base.slice(0, dashIndex)}${ext}`;
}

/** 取文件名（去掉可能存在的路径前缀） */
function baseName(filename: string) {
  const slashIndex = filename.lastIndexOf('/');
  return slashIndex === -1 ? filename : filename.slice(slashIndex + 1);
}

/** 将后端返回的原始文件名（保留时间戳）拼接为服务器真实文件地址 */
function resolveRawPrintFileUrl(filename: string) {
  const path = filename.startsWith('/')
    ? filename
    : `/PrintTempFile/${filename}`;
  return buildStaticFileUrl(path);
}

/** 将后端返回的文件名拼接为可访问的静态文件地址（清洗后） */
function resolvePrintFileUrl(filename: string) {
  const cleaned = cleanReturnedFilename(filename);
  const path = cleaned.startsWith('/') ? cleaned : `/PrintTempFile/${cleaned}`;
  return buildStaticFileUrl(path);
}

/**
 * 导出下载：
 * 1. 用后端绝对地址（含时间戳的原始文件名）静默拉取 blob，禁止走前端端口/同源相对路径；
 * 2. 原始地址失败再试清洗后的后端地址；
 * 3. 再按现有逻辑去掉文件名后面的时间戳，作为 save-as 文件名触发浏览器下载。
 */
async function downloadPrintFile(filename: string) {
  const downloadName = cleanReturnedFilename(baseName(filename));
  // 仅后端绝对地址：原始名 → 清洗名（勿用 /PrintTempFile 相对路径，会落到前端端口）
  const candidateUrls = [
    resolveRawPrintFileUrl(filename),
    resolvePrintFileUrl(filename),
  ].filter((url) => /^https?:\/\//i.test(url));

  let blob: Blob | undefined;
  for (const url of candidateUrls) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const response = await fetch(url);
      if (response.ok) {
        // eslint-disable-next-line no-await-in-loop
        blob = await response.blob();
        break;
      }
    } catch {
      // 跨域/网络失败，尝试下一个候选地址
    }
  }

  if (!blob) {
    throw new Error('download failed');
  }

  downloadFileFromBlob({ source: blob, fileName: downloadName });
}

/**
 * 通知后端立刻释放当前在线预览（服务端缓存的报表实例 + 还没用掉的票据）。
 * 带图片的模板在服务端很占内存，切回 PDF、换模板、关弹窗时都要调；
 * 发出去就不管结果，失败也不影响前端，后端还有「打开满 5 分钟自动清掉」兜底。
 */
function releaseOnlinePreview() {
  const ticket = onlineTicket.value;
  if (!ticket) return;
  onlineTicket.value = '';
  // 后端 MVC 页面接口（不在 /api 下、不用登录）；no-cors 只负责把请求发出去，不读响应
  const url = buildStaticFileUrl(
    `/PrintOnline/Close?ticket=${encodeURIComponent(ticket)}`,
  );
  void fetch(url, { method: 'POST', mode: 'no-cors', keepalive: true }).catch(
    () => undefined,
  );
}

function close() {
  releaseOnlinePreview();
  visible.value = false;
  templates.value = [];
  selectedTemplateId.value = undefined;
  exportFormat.value = PrintExportFormat.Pdf;
  previewUrl.value = '';
  previewFilename.value = '';
  previewOriginalFilename.value = '';
  previewMode.value = 'pdf';
  onlinePreviewUrl.value = '';
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
  previewOriginalFilename.value = '';
  try {
    const filename = await getPrintAsync(
      buildPrintDto(selectedTemplateId.value, PrintExportFormat.Pdf),
    );
    if (!filename) {
      message.error('预览失败，未返回文件');
      return;
    }
    previewOriginalFilename.value = filename;
    previewFilename.value = cleanReturnedFilename(filename);
    previewUrl.value = resolveRawPrintFileUrl(filename);
  } catch {
    message.error('预览生成失败，请稍后重试');
  } finally {
    previewLoading.value = false;
  }
}

/** 按当前模板生成在线预览地址：后端校验权限、取数后发一次性票据，iframe 凭票据打开 WebReport 页面 */
async function loadOnlinePreview() {
  if (!selectedTemplateId.value) return;

  // 换模板、重新进入在线预览时，先释放上一份
  releaseOnlinePreview();
  onlineLoading.value = true;
  onlinePreviewUrl.value = '';
  try {
    const ticket = await createOnlinePreviewAsync(
      buildPrintDto(selectedTemplateId.value, PrintExportFormat.Pdf),
    );
    if (!ticket) {
      message.error('在线预览失败，未返回票据');
      return;
    }
    onlineTicket.value = ticket;
    // 等票据期间已经关掉弹窗或切回了 PDF：立刻释放，不再打开
    if (!visible.value || previewMode.value !== 'online') {
      releaseOnlinePreview();
      return;
    }
    // 必须是后端绝对地址：/PrintOnline 页面和它后续的 /_fr 请求都由后端站点提供，落到前端端口会 404
    onlinePreviewUrl.value = buildStaticFileUrl(
      `/PrintOnline/Preview?ticket=${encodeURIComponent(ticket)}`,
    );
  } catch {
    message.error('在线预览生成失败，请稍后重试');
  } finally {
    onlineLoading.value = false;
  }
}

/**
 * 弹窗内切换 PDF 预览 / 在线预览。
 * 在线预览票据只能用一次，每次切过去都重新生成；切回 PDF 时已有预览就直接复用。
 */
function togglePreviewMode() {
  if (!selectedTemplateId.value) return;

  if (previewMode.value === 'pdf') {
    previewMode.value = 'online';
    void loadOnlinePreview();
    return;
  }
  previewMode.value = 'pdf';
  onlinePreviewUrl.value = '';
  releaseOnlinePreview();
  if (!previewUrl.value && !previewLoading.value) {
    void loadPreview();
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
      bizType: params.bizType ?? undefined,
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
  releaseOnlinePreview();
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
  previewOriginalFilename.value = '';
  previewMode.value = 'pdf';
  onlinePreviewUrl.value = '';
  visible.value = true;
  void loadTemplates(params);
}

/** 切换模板时按当前预览方式重新生成预览；另一种方式的旧预览一并作废，切回去时按新模板重新生成 */
function handleTemplateChange(templateId: string) {
  selectedTemplateId.value = templateId;
  if (previewMode.value === 'online') {
    previewUrl.value = '';
    previewFilename.value = '';
    previewOriginalFilename.value = '';
    void loadOnlinePreview();
    return;
  }
  void loadPreview();
}

/**
 * 导出当前模板：所有格式（PDF/Excel/Word）统一用「原始文件名静默拉取 →
 * 去掉时间戳后触发浏览器下载」，PDF 不再新窗口打开。
 * PDF 复用预览已生成的原始文件名，避免重复请求。
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

  exporting.value = true;
  try {
    const filename =
      targetFormat === PrintExportFormat.Pdf && previewOriginalFilename.value
        ? previewOriginalFilename.value
        : await getPrintAsync(
            buildPrintDto(selectedTemplateId.value, targetFormat),
          );
    if (!filename) {
      message.error('导出失败，未返回文件');
      return;
    }
    await downloadPrintFile(filename);
    message.success('文件已下载');
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
    previewMode,
    onlineLoading,
    onlinePreviewUrl,
    pendingPrintJsonType,
    openPrint,
    close,
    handleTemplateChange,
    togglePreviewMode,
    handleExport,
  };
}
