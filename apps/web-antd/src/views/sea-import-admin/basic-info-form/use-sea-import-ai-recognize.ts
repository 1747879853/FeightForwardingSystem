/**
 * 海运进口 AI 识别回填编排。
 *
 * 与出口差异：箱子读 seaImport.orderCtns；到港日期→etd；未匹配箱型保留 ctnCodeName。
 * 纯规范化策略见 ./ai-extract-utils.ts。
 */
import type { Ref } from 'vue';

import { ref } from 'vue';

import { message } from 'ant-design-vue';

import type { TextInAdminApi } from '#/api/common/text-in-admin';

import { extractSeaImportToAddDto } from '#/api/common';

import {
  normalizeOrderCtnsWithRowKey,
  toPortSelectedItems,
  toSelectedItems,
} from './sea-import-detail-mapper';
import {
  AI_RECOGNIZE_ALLOWED_FIELDS,
  buildAiExtractFormPayload,
  isAiExtractSupportedFile,
  normalizeAiFieldValue,
  pickExtractedLabel,
  resolveCitationKeys,
} from './ai-extract-utils';

type AiRecognizeFormApi = {
  setValues: (values: Record<string, any>) => Promise<void> | void;
  updateSchema: (schema: any[]) => void;
};

export type UseSeaImportAiRecognizeDeps = {
  formApis: {
    party: AiRecognizeFormApi;
    basic: AiRecognizeFormApi;
    shipment: AiRecognizeFormApi;
    port: AiRecognizeFormApi;
    cargoTypeInline: AiRecognizeFormApi;
    cargoMain: AiRecognizeFormApi;
    cargoMetrics: AiRecognizeFormApi;
    cargoRemark: AiRecognizeFormApi;
    cargoDg: AiRecognizeFormApi;
    cargoReefer: AiRecognizeFormApi;
  };
  orderCtns: Ref<any[]>;
  entrustReadonlyInfo: Ref<Record<string, any>>;
  refreshEntrustReadonlyInfo: (values: Record<string, any>) => void;
  syncBasicInfoHeaderFields: () => Promise<void> | void;
  /** 回填到港日期后重算转站/箱使 */
  recalcDerivedDates: () => Promise<void> | void;
  /** 件数/包装合并控件的包装回显项 */
  setCodePackageSelectedItems?: (items: any[]) => void;
};

export function useSeaImportAiRecognize(deps: UseSeaImportAiRecognizeDeps) {
  const {
    formApis,
    orderCtns,
    entrustReadonlyInfo,
    refreshEntrustReadonlyInfo,
    syncBasicInfoHeaderFields,
    recalcDerivedDates,
    setCodePackageSelectedItems,
  } = deps;

  const aiRecognizing = ref(false);

  const applyAiRecognizedFormValues = async (
    values: Record<string, any>,
    options?: {
      orderCtnsPayload?: TextInAdminApi.SeaImportOrderCtnExtractAddDto[];
      orderCodeGoodssPayload?: Array<number | string>;
    },
  ) => {
    await Promise.all([
      formApis.party.setValues(values),
      formApis.basic.setValues(values),
      formApis.shipment.setValues(values),
      formApis.port.setValues(values),
      formApis.cargoTypeInline.setValues(values),
      formApis.cargoMain.setValues(values),
      formApis.cargoMetrics.setValues(values),
      formApis.cargoRemark.setValues(values),
      formApis.cargoDg.setValues(values),
      formApis.cargoReefer.setValues(values),
    ]);

    if (options?.orderCodeGoodssPayload?.length) {
      await formApis.cargoTypeInline.setValues({
        orderCodeGoodss: options.orderCodeGoodssPayload,
      });
    }

    if (options?.orderCtnsPayload?.length) {
      orderCtns.value = normalizeOrderCtnsWithRowKey(
        options.orderCtnsPayload as any,
      );
    }

    refreshEntrustReadonlyInfo({
      ...entrustReadonlyInfo.value,
      commissionNum:
        values.commissionNum ?? entrustReadonlyInfo.value.commissionNum,
      accountDate: values.accountDate ?? entrustReadonlyInfo.value.accountDate,
      settlementDate:
        values.settlementDate ?? entrustReadonlyInfo.value.settlementDate,
      countryName: values.countryName ?? entrustReadonlyInfo.value.countryName,
      laneName: values.laneName ?? entrustReadonlyInfo.value.laneName,
    });
    await syncBasicInfoHeaderFields();

    if (values.etd != null) {
      await recalcDerivedDates();
    }
  };

  const applyAiExtractSelectedItems = (
    values: Record<string, any>,
    extractedSchema?: Record<string, unknown>,
  ) => {
    const schema = extractedSchema ?? {};
    const item = (fieldName: string, componentProps: Record<string, any>) => ({
      fieldName,
      componentProps: { ...componentProps, size: 'small' },
    });

    formApis.basic.updateSchema([
      item('clientId', {
        selectedItems: toSelectedItems(
          values.clientId,
          pickExtractedLabel(schema, resolveCitationKeys('clientId')),
        ),
      }),
      item('carrierId', {
        selectedItems: toSelectedItems(
          values.carrierId,
          pickExtractedLabel(schema, resolveCitationKeys('carrierId')),
          'cnShortName',
        ),
      }),
      item('codeServiceId', {
        selectedItems: toSelectedItems(
          values.codeServiceId,
          pickExtractedLabel(schema, resolveCitationKeys('codeServiceId')),
          'enName',
        ),
      }),
    ]);

    formApis.port.updateSchema([
      item('polId', {
        selectedItems: toPortSelectedItems(
          values.polId,
          pickExtractedLabel(schema, ['起运港名称']),
          pickExtractedLabel(schema, ['起运港代码']),
        ),
      }),
      item('podId', {
        selectedItems: toPortSelectedItems(
          values.podId,
          pickExtractedLabel(schema, ['目的港名称']),
          pickExtractedLabel(schema, ['目的港代码']),
        ),
      }),
    ]);

    setCodePackageSelectedItems?.(
      toSelectedItems(
        values.codePackageId,
        pickExtractedLabel(schema, resolveCitationKeys('codePackageId')),
      ),
    );
  };

  /**
   * 对单个文件执行 AI 识别并回填表单。
   * @returns 是否识别并成功回填（无字段可回填视为 false）
   */
  const recognizeAiFile = async (file: File): Promise<boolean> => {
    if (!isAiExtractSupportedFile(file)) {
      message.warning(
        '请上传 PDF、图片（png/jpg/jpeg/bmp/tiff/webp）或 Office/OFD 文件（doc/docx/xls/xlsx/ofd）',
      );
      return false;
    }

    if (aiRecognizing.value) return false;

    aiRecognizing.value = true;
    const hideLoading = message.loading('AI识别中，请稍候...', 0);
    try {
      const result = await extractSeaImportToAddDto(file);
      if (result.extract?.code != null && result.extract.code !== 200) {
        message.error(result.extract.message || 'AI识别失败，请稍后重试');
        return false;
      }

      const payload = buildAiExtractFormPayload(result, {
        allowedFields: AI_RECOGNIZE_ALLOWED_FIELDS,
        normalizeValue: normalizeAiFieldValue,
      });
      const recognizedFieldCount = payload.filledFields.length;
      if (recognizedFieldCount === 0) {
        message.warning('识别成功，但没有可回填的字段');
        return false;
      }

      applyAiExtractSelectedItems(
        payload.formValues,
        result.extract?.extractedSchema,
      );
      await applyAiRecognizedFormValues(payload.formValues, {
        orderCtnsPayload: payload.orderCtns,
        orderCodeGoodssPayload: payload.orderCodeGoodss,
      });

      const cacheHint = result.extract?.isFromCache ? '（缓存）' : '';
      message.success(
        `AI识别完成${cacheHint}，已回填 ${recognizedFieldCount} 个字段`,
      );
      if (payload.unmatchedCtnCount > 0) {
        message.warning(
          `有 ${payload.unmatchedCtnCount} 条箱型未匹配系统数据，请按识别原文补选箱型`,
        );
      }
      return true;
    } catch {
      message.error('AI识别失败，请稍后重试');
      return false;
    } finally {
      hideLoading();
      aiRecognizing.value = false;
    }
  };

  return {
    aiRecognizing,
    recognizeAiFile,
  };
}
