import type { PrintFormatAdminApi } from '#/api/system/print-format-admin';

import { ref } from 'vue';

import { message } from 'ant-design-vue';

import {
  getPrintFormatPagedList,
  printFormatAsync,
} from '#/api/system/print-format-admin';
import type { PrintJsonType } from '#/components/print-format/types';
import { buildAttachmentUrl } from '#/utils/attachment-url';
import { downloadFileByUrl } from '#/utils/download-file';

const visible = ref(false);
const loading = ref(false);
const printing = ref(false);
const templates = ref<PrintFormatAdminApi.PrintFormatDto[]>([]);
const selectedTemplateId = ref<string>();
const pendingJson = ref('');
const pendingPrintJsonType = ref<PrintJsonType>();

export interface PrintFormatOpenParams {
  printJsonType: PrintJsonType;
  json: string;
}

function close() {
  visible.value = false;
  templates.value = [];
  selectedTemplateId.value = undefined;
  pendingJson.value = '';
  pendingPrintJsonType.value = undefined;
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
    const firstTemplate = templates.value[0];
    if (firstTemplate) {
      selectedTemplateId.value = firstTemplate.id;
    }
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
  visible.value = true;
  void loadTemplates(params.printJsonType);
}

async function confirmPrint() {
  if (!selectedTemplateId.value) {
    message.warning('请选择打印模板');
    return;
  }

  printing.value = true;
  try {
    const filename = await printFormatAsync({
      printFormatId: selectedTemplateId.value,
      json: pendingJson.value,
    });
    if (!filename) {
      message.error('打印失败，未返回文件');
      return;
    }

    const pdfPath = filename.startsWith('/')
      ? filename
      : `/PrintTempFile/${filename}`;
    downloadFileByUrl(buildAttachmentUrl(pdfPath), filename);
    message.success('打印文件已生成');
    close();
  } catch {
    message.error('打印失败，请稍后重试');
  } finally {
    printing.value = false;
  }
}

export function usePrintFormat() {
  return {
    visible,
    loading,
    printing,
    templates,
    selectedTemplateId,
    pendingPrintJsonType,
    openPrint,
    close,
    confirmPrint,
  };
}
