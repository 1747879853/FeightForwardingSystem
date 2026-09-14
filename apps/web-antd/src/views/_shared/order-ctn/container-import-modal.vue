<script lang="ts" setup>
import type { CtnCodeAdminApi } from '#/api/system/base-data/ctn-code-admin';
import type { CodePackageAdminApi } from '#/api/system/base-data/code-package-admin';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { Alert, Button, message, Table, UploadDragger } from 'ant-design-vue';
import * as XLSX from 'xlsx';

import { getCodePackagePagedList } from '#/api/system/base-data/code-package-admin';
import { getCtnCodePagedList } from '#/api/system/base-data/ctn-code-admin';
import { $t } from '#/locales';
import { toEnglishUpperCase } from '#/utils/english-upper-case';
import { roundWeightVolume } from '#/utils/weight-volume-precision';

type ModalData = {
  createEmptyCtnRow: (
    defaults?: Record<string, unknown>,
    extra?: Record<string, unknown>,
  ) => Record<string, unknown>;
  i18nNs: string;
  resolveDefaultPackageFields: () => Promise<Record<string, unknown>>;
};

type ParsedPreviewRow = {
  ctnCodeName: string;
  ctnNo: string;
  codePackageName: string;
  grossWeight?: number;
  pkgs?: number;
  sealNo: string;
  sheetRow: number;
  tareWeight?: number;
  valid: boolean;
  volume?: number;
};

const TEMPLATE_HEADERS = [
  '箱型',
  '箱号',
  '封号',
  '件数',
  '包装',
  '毛重',
  '皮重',
  '体积',
];

const COLUMN_ALIASES: Record<string, string[]> = {
  ctnCode: ['箱型', 'containertype', 'ctntype', 'ctn'],
  ctnNo: ['箱号', 'containerno', 'ctnno'],
  sealNo: ['封号', 'sealno', 'seal'],
  pkgs: ['件数', 'pkgs', 'qty', 'quantity', 'packages'],
  package: ['包装', 'package', 'packaging'],
  grossWeight: ['毛重', 'grossweight', 'gw', 'g.w.'],
  tareWeight: ['皮重', 'tareweight', 'tw', 't.w.'],
  volume: ['体积', 'volume', 'cbm'],
};

const emits = defineEmits<{
  confirm: [rows: Record<string, unknown>[]];
}>();

const fileList = ref<File[]>([]);
const parsing = ref(false);
const parseError = ref('');
const previewRows = ref<ParsedPreviewRow[]>([]);
const importErrors = ref<string[]>([]);
const importWarnings = ref<string[]>([]);
const validImportRows = ref<Record<string, unknown>[]>([]);
const modalData = ref<ModalData | null>(null);

const i18nNs = computed(() => modalData.value?.i18nNs ?? 'seaExport.export');

function t(key: string, params?: (number | string)[]) {
  return $t(`${i18nNs.value}.${key}` as never, params as never);
}

const previewColumns = computed(() => [
  {
    title: t('importCtnSheetRow'),
    dataIndex: 'sheetRow',
    key: 'sheetRow',
    width: 64,
    align: 'center' as const,
  },
  {
    title: t('ctnCodeId'),
    dataIndex: 'ctnCodeName',
    key: 'ctnCodeName',
    width: 90,
  },
  {
    title: t('ctnNo'),
    dataIndex: 'ctnNo',
    key: 'ctnNo',
    width: 110,
  },
  {
    title: t('sealNo'),
    dataIndex: 'sealNo',
    key: 'sealNo',
    width: 100,
  },
  {
    title: t('pkgs'),
    dataIndex: 'pkgs',
    key: 'pkgs',
    width: 72,
    align: 'right' as const,
  },
  {
    title: t('codePackageId'),
    dataIndex: 'codePackageName',
    key: 'codePackageName',
    width: 90,
  },
  {
    title: t('grossWeight'),
    dataIndex: 'grossWeight',
    key: 'grossWeight',
    width: 80,
    align: 'right' as const,
  },
  {
    title: t('tareWeight'),
    dataIndex: 'tareWeight',
    key: 'tareWeight',
    width: 80,
    align: 'right' as const,
  },
  {
    title: t('volume'),
    dataIndex: 'volume',
    key: 'volume',
    width: 80,
    align: 'right' as const,
  },
  {
    title: t('importCtnStatus'),
    key: 'valid',
    width: 72,
    align: 'center' as const,
  },
]);

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replaceAll(/\s+/g, '');
}

function cellToString(value: unknown): string {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function parseNumber(value: string): number | undefined {
  const normalized = value.replaceAll(',', '').trim();
  if (!normalized) return undefined;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : undefined;
}

function buildColumnIndexMap(headers: string[]): Record<string, number> {
  const normalizedHeaders = headers.map((header) => normalizeHeader(header));
  const map: Record<string, number> = {};

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    const normalizedAliases = aliases.map((alias) => normalizeHeader(alias));
    const index = normalizedHeaders.findIndex((header) =>
      normalizedAliases.includes(header),
    );
    if (index >= 0) {
      map[field] = index;
    }
  }

  return map;
}

function isBlankRow(values: string[]): boolean {
  return values.every((value) => !value);
}

async function loadAllEnabledCtnCodes(): Promise<CtnCodeAdminApi.CtnCodeDto[]> {
  const pageSize = 200;
  let pageIndex = 1;
  let totalCount = Number.POSITIVE_INFINITY;
  const all: CtnCodeAdminApi.CtnCodeDto[] = [];

  while (all.length < totalCount) {
    const ctnRes = await getCtnCodePagedList({
      PageIndex: pageIndex,
      PageSize: pageSize,
      Sorting: 'OrderNo ASC, Id DESC',
    });
    const items = (ctnRes.items || []) as CtnCodeAdminApi.CtnCodeDto[];
    totalCount = Number(ctnRes.totalCount ?? items.length);
    all.push(...items);
    if (!items.length || items.length < pageSize) break;
    pageIndex += 1;
    if (pageIndex > 50) break;
  }

  return all.filter((item) => item.status === 0);
}

async function loadAllEnabledPackages(): Promise<
  CodePackageAdminApi.CodePackageDto[]
> {
  const pageSize = 200;
  let pageIndex = 1;
  let totalCount = Number.POSITIVE_INFINITY;
  const all: CodePackageAdminApi.CodePackageDto[] = [];

  while (all.length < totalCount) {
    const res = await getCodePackagePagedList({
      PageIndex: pageIndex,
      PageSize: pageSize,
    });
    const items = res.items ?? [];
    totalCount = Number(res.totalCount ?? items.length);
    all.push(...items);
    if (!items.length || items.length < pageSize) break;
    pageIndex += 1;
    if (pageIndex > 50) break;
  }

  return all.filter((item) => item.enable !== false);
}

function buildCtnLookup(ctnCodes: CtnCodeAdminApi.CtnCodeDto[]) {
  const byName = new Map<
    string,
    { ctnName: string; id: number | string | undefined }
  >();

  for (const item of ctnCodes) {
    const id = item.id;
    const ctnName = item.ctnName?.trim();
    if (ctnName) {
      byName.set(normalizeHeader(ctnName), { id, ctnName });
    }
    const ediCode = item.ediCode?.trim();
    if (ediCode) {
      byName.set(normalizeHeader(ediCode), {
        id,
        ctnName: ctnName || ediCode,
      });
    }
  }

  return byName;
}

function buildPackageLookup(packages: CodePackageAdminApi.CodePackageDto[]) {
  const byName = new Map<
    string,
    { id: number | string | undefined; name: string }
  >();

  for (const item of packages) {
    const name = item.name?.trim();
    if (!name) continue;
    byName.set(normalizeHeader(name), { id: item.id, name });
  }

  return byName;
}

async function validateAndMapRows(
  rawRows: string[][],
  columnMap: Record<string, number>,
  data: ModalData,
): Promise<{
  errors: string[];
  preview: ParsedPreviewRow[];
  rows: Record<string, unknown>[];
  warnings: string[];
}> {
  const [ctnCodes, packages] = await Promise.all([
    loadAllEnabledCtnCodes(),
    loadAllEnabledPackages(),
  ]);
  const ctnLookup = buildCtnLookup(ctnCodes);
  const packageLookup = buildPackageLookup(packages);
  const defaultPackageFields = await data.resolveDefaultPackageFields();

  const errors: string[] = [];
  const warnings: string[] = [];
  const preview: ParsedPreviewRow[] = [];
  const rows: Record<string, unknown>[] = [];

  for (let index = 0; index < rawRows.length; index++) {
    const cells = rawRows[index] ?? [];
    const getCell = (field: string) => {
      const colIndex = columnMap[field];
      if (colIndex === undefined) return '';
      return cellToString(cells[colIndex]);
    };

    const values = Object.keys(COLUMN_ALIASES).map((field) => getCell(field));
    if (isBlankRow(values)) continue;

    const sheetRow = index + 2;
    const ctnCodeRaw = getCell('ctnCode');
    const ctnNo = toEnglishUpperCase(getCell('ctnNo'));
    const sealNo = toEnglishUpperCase(getCell('sealNo'));
    const pkgsRaw = getCell('pkgs');
    const packageRaw = getCell('package');
    const grossWeightRaw = getCell('grossWeight');
    const tareWeightRaw = getCell('tareWeight');
    const volumeRaw = getCell('volume');

    const pkgs = parseNumber(pkgsRaw);
    const grossWeightValue = parseNumber(grossWeightRaw);
    const tareWeightValue = parseNumber(tareWeightRaw);
    const volumeValue = parseNumber(volumeRaw);
    const grossWeight =
      grossWeightValue === undefined
        ? undefined
        : roundWeightVolume(grossWeightValue);
    const tareWeight =
      tareWeightValue === undefined
        ? undefined
        : roundWeightVolume(tareWeightValue);
    const volume =
      volumeValue === undefined ? undefined : roundWeightVolume(volumeValue);

    const previewRow: ParsedPreviewRow = {
      sheetRow,
      ctnCodeName: ctnCodeRaw,
      ctnNo,
      sealNo,
      pkgs,
      codePackageName: packageRaw,
      grossWeight,
      tareWeight,
      volume,
      valid: false,
    };

    if (!ctnCodeRaw) {
      errors.push(String(t('importCtnRowCtnEmpty', [sheetRow])));
      preview.push(previewRow);
      continue;
    }

    const ctnMatch = ctnLookup.get(normalizeHeader(ctnCodeRaw));
    if (!ctnMatch?.id) {
      errors.push(String(t('importCtnRowCtnNotFound', [sheetRow, ctnCodeRaw])));
      preview.push(previewRow);
      continue;
    }

    let packageFields: Record<string, unknown> = {};
    if (!packageRaw) {
      packageFields = { ...defaultPackageFields };
      previewRow.codePackageName = cellToString(
        defaultPackageFields.codePackageName,
      );
    } else {
      const packageMatch = packageLookup.get(normalizeHeader(packageRaw));
      if (!packageMatch?.id) {
        warnings.push(
          String(t('importCtnRowPackageNotFound', [sheetRow, packageRaw])),
        );
        previewRow.codePackageName = '';
      } else {
        packageFields = {
          codePackageId: packageMatch.id,
          codePackageName: packageMatch.name,
        };
        previewRow.codePackageName = packageMatch.name;
      }
    }

    const row = data.createEmptyCtnRow(packageFields, {
      ctnCodeId: ctnMatch.id,
      ctnCodeName: ctnMatch.ctnName,
      ctnNo: ctnNo || undefined,
      sealNo: sealNo || undefined,
      pkgs,
      grossWeight,
      tareWeight,
      volume,
    });

    previewRow.valid = true;
    preview.push(previewRow);
    rows.push(row);
  }

  return { preview, errors, warnings, rows };
}

function resetState() {
  fileList.value = [];
  parsing.value = false;
  parseError.value = '';
  previewRows.value = [];
  importErrors.value = [];
  importWarnings.value = [];
  validImportRows.value = [];
}

async function parseUploadedFile(file: File) {
  if (!modalData.value) return;

  parsing.value = true;
  parseError.value = '';
  previewRows.value = [];
  importErrors.value = [];
  importWarnings.value = [];
  validImportRows.value = [];

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      parseError.value = String(t('importCtnParseFailed'));
      return;
    }

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      parseError.value = String(t('importCtnParseFailed'));
      return;
    }

    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: '',
      raw: false,
    });

    if (!matrix.length) {
      parseError.value = String(t('importCtnNoData'));
      return;
    }

    const headerRow = (matrix[0] ?? []).map((cell) => cellToString(cell));
    const columnMap = buildColumnIndexMap(headerRow);
    if (columnMap.ctnCode === undefined) {
      parseError.value = String(
        t('importCtnMissingHeaders', [TEMPLATE_HEADERS[0] ?? '箱型']),
      );
      return;
    }

    const dataRows = matrix
      .slice(1)
      .map((row) => (row ?? []).map((cell) => cellToString(cell)));

    const result = await validateAndMapRows(
      dataRows,
      columnMap,
      modalData.value,
    );
    previewRows.value = result.preview;
    importErrors.value = result.errors;
    importWarnings.value = result.warnings;
    validImportRows.value = result.rows;

    if (!result.preview.length) {
      parseError.value = String(t('importCtnNoData'));
    }
  } catch (error) {
    console.error('解析箱型 Excel 失败:', error);
    parseError.value = String(t('importCtnParseFailed'));
  } finally {
    parsing.value = false;
  }
}

function handleBeforeUpload(file: File) {
  const isExcel =
    file.type ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.type === 'application/vnd.ms-excel' ||
    file.name.toLowerCase().endsWith('.xlsx') ||
    file.name.toLowerCase().endsWith('.xls');

  if (!isExcel) {
    message.error($t('system.user.onlyExcelAllowed'));
    return false;
  }

  const isLt10M = file.size / 1024 / 1024 < 10;
  if (!isLt10M) {
    message.error($t('system.user.fileSizeLimit'));
    return false;
  }

  fileList.value = [file];
  void parseUploadedFile(file);
  return false;
}

function handleRemove() {
  fileList.value = [];
  previewRows.value = [];
  importErrors.value = [];
  importWarnings.value = [];
  validImportRows.value = [];
  parseError.value = '';
}

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '箱型');
  XLSX.writeFile(wb, '箱型导入模板.xlsx');
}

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    if (!validImportRows.value.length) {
      message.warning(String(t('importCtnNoValidRows')));
      return;
    }

    emits('confirm', validImportRows.value);

    const importedCount = validImportRows.value.length;
    const failedCount = importErrors.value.length;
    if (failedCount > 0) {
      message.success(
        String(t('importCtnPartialSuccess', [importedCount, failedCount])),
      );
    } else {
      message.success(String(t('importCtnSuccess', [importedCount])));
    }

    modalApi.close();
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      modalData.value = modalApi.getData<ModalData>();
      resetState();
    } else {
      resetState();
      modalData.value = null;
    }
  },
});
</script>

<template>
  <Modal :title="t('importCtnTitle')" class="w-[920px]">
    <div class="container-import-modal">
      <div class="container-import-modal__toolbar">
        <Button type="link" class="!px-0" @click="downloadTemplate">
          <IconifyIcon icon="mdi:download" class="mr-1 inline-block size-4" />
          {{ t('importCtnDownloadTemplate') }}
        </Button>
      </div>

      <UploadDragger
        :file-list="fileList as any[]"
        accept=".xlsx,.xls"
        :disabled="parsing"
        :before-upload="handleBeforeUpload"
        @remove="handleRemove"
      >
        <p class="ant-upload-drag-icon !mb-2 flex justify-center">
          <IconifyIcon
            class="text-5xl text-blue-400"
            icon="ant-design:inbox-outlined"
          />
        </p>
        <p class="ant-upload-text">
          {{ $t('system.user.clickOrDragUpload') }}
        </p>
        <p class="ant-upload-hint">
          {{ t('importCtnSupportExcel') }}
        </p>
      </UploadDragger>

      <Alert
        v-if="parseError"
        class="mt-4"
        type="error"
        show-icon
        :message="parseError"
      />

      <template v-if="previewRows.length">
        <div class="container-import-modal__section-title">
          {{ t('importCtnPreview') }}
        </div>
        <Table
          :columns="previewColumns"
          :data-source="previewRows"
          :pagination="false"
          :scroll="{ x: 900, y: 240 }"
          size="small"
          bordered
          row-key="sheetRow"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'valid'">
              <span :class="record.valid ? 'text-green-600' : 'text-red-500'">
                {{
                  record.valid
                    ? t('importCtnStatusValid')
                    : t('importCtnStatusInvalid')
                }}
              </span>
            </template>
          </template>
        </Table>
      </template>

      <Alert
        v-if="importErrors.length"
        class="mt-4"
        type="error"
        show-icon
        :message="t('importCtnErrors')"
      >
        <template #description>
          <ul class="container-import-modal__issue-list">
            <li v-for="item in importErrors" :key="item">{{ item }}</li>
          </ul>
        </template>
      </Alert>

      <Alert
        v-if="importWarnings.length"
        class="mt-4"
        type="warning"
        show-icon
        :message="t('importCtnWarnings')"
      >
        <template #description>
          <ul class="container-import-modal__issue-list">
            <li v-for="item in importWarnings" :key="item">{{ item }}</li>
          </ul>
        </template>
      </Alert>
    </div>
  </Modal>
</template>

<style scoped>
.container-import-modal {
  min-height: 200px;
}

.container-import-modal__toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.container-import-modal__section-title {
  margin: 16px 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: #262626;
}

.container-import-modal__issue-list {
  padding-left: 18px;
  margin: 0;
}
</style>
