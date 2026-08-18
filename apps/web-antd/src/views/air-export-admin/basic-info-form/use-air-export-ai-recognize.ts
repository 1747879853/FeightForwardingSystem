/**
 * 空运出口 AI 识别回填编排。
 *
 * 与海运出口差异：空港匹配 AirPort；货物明细读 airExport.airExportOrderCtns；
 * 起飞/预抵对应 etd/eta；航司只在 extract 中，不写入 airExport。
 * 纯规范化策略见 ./ai-extract-utils.ts。
 */
import type { Ref } from 'vue';

import { ref } from 'vue';

import { message } from 'ant-design-vue';

import type { AirExportAdminApi } from '#/api/air-export/air-export-admin';

import { extractAirExportToAddDto } from '#/api/common';
import { $t } from '#/locales';

import {
  normalizeOrderCtnsWithRowKey,
  toSelectedItems,
} from './air-export-detail-mapper';
import {
  AI_RECOGNIZE_ALLOWED_FIELDS,
  buildAiExtractFormPayload,
  isAiExtractSupportedFile,
  normalizeAiFieldValue,
  pickExtractedLabel,
  resolveCitationKeys,
  toExtractAirPortSelectedItems,
} from './ai-extract-utils';

type AiRecognizeFormApi = {
  setFieldValue?: (field: string, value: unknown) => Promise<void> | void;
  setValues: (values: Record<string, any>) => Promise<void> | void;
  updateSchema: (schema: any[]) => void;
};

export type UseAirExportAiRecognizeDeps = {
  formApis: {
    party: AiRecognizeFormApi;
    basic: AiRecognizeFormApi;
    date: AiRecognizeFormApi;
    airLeg: AiRecognizeFormApi;
    airLegHeader: AiRecognizeFormApi;
    cargoTypeInline: AiRecognizeFormApi;
    cargoMain: AiRecognizeFormApi;
    cargoMetrics: AiRecognizeFormApi;
    cargoRemark: AiRecognizeFormApi;
    cargoDg: AiRecognizeFormApi;
    cargoReefer: AiRecognizeFormApi;
  };
  orderCtns: Ref<any[]>;
  syncBasicInfoHeaderFields: () => Promise<void> | void;
  setCodePackageSelectedItems?: (items: any[]) => void;
  onAirPortChange?: (
    fieldName: string,
    value: unknown,
    option: unknown,
  ) => void;
};

export function useAirExportAiRecognize(deps: UseAirExportAiRecognizeDeps) {
  const {
    formApis,
    orderCtns,
    syncBasicInfoHeaderFields,
    setCodePackageSelectedItems,
    onAirPortChange,
  } = deps;

  const aiRecognizing = ref(false);

  const applyAiRecognizedFormValues = async (
    values: Record<string, any>,
    options?: {
      orderCtnsPayload?: AirExportAdminApi.AirExportOrderCtnAddDto[];
      orderCodeGoodssPayload?: Array<number | string>;
    },
  ) => {
    await Promise.all([
      formApis.party.setValues(values),
      formApis.basic.setValues(values),
      formApis.date.setValues(values),
      formApis.airLeg.setValues(values),
      formApis.airLegHeader.setValues(values),
      formApis.cargoTypeInline.setValues(values),
      formApis.cargoMain.setValues(values),
      formApis.cargoMetrics.setValues(values),
      formApis.cargoRemark.setValues(values),
      formApis.cargoDg.setValues(values),
      formApis.cargoReefer.setValues(values),
    ]);

    // 件重尺 setValues 可能因 kgs/cbm 变化按前端公式重算泡比；识别结果以后端为准再写回一次
    if (values.bubbleRatio != null) {
      await formApis.cargoMetrics.setFieldValue?.(
        'bubbleRatio',
        values.bubbleRatio,
      );
    }

    if (options?.orderCodeGoodssPayload?.length) {
      await formApis.cargoTypeInline.setValues({
        orderCodeGoodss: options.orderCodeGoodssPayload,
      });
    }

    if (options?.orderCtnsPayload?.length) {
      orderCtns.value = normalizeOrderCtnsWithRowKey(
        options.orderCtnsPayload as AirExportAdminApi.AirExportOrderCtnEditDto[],
      );
    }

    await syncBasicInfoHeaderFields();
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
      item('codeServiceId', {
        selectedItems: toSelectedItems(
          values.codeServiceId,
          pickExtractedLabel(schema, resolveCitationKeys('codeServiceId')),
          'enName',
        ),
      }),
    ]);

    const airPortProps = (
      fieldName: 'podId' | 'polId' | 'potId',
      nameKeys: string[],
      codeKeys: string[],
    ) => ({
      allowClear: true,
      labelKey: 'iataCode',
      placeholder: $t('ui.placeholder.select'),
      selectedItems: toExtractAirPortSelectedItems(
        values[fieldName],
        pickExtractedLabel(schema, codeKeys),
        pickExtractedLabel(schema, nameKeys),
      ),
      ...(onAirPortChange
        ? {
            onChange: (value: unknown, option: unknown) =>
              onAirPortChange(fieldName, value, option),
          }
        : {}),
    });

    formApis.airLeg.updateSchema([
      item('polId', airPortProps('polId', ['起运地名称'], ['起运地代码'])),
      item('potId', airPortProps('potId', ['中转地名称'], ['中转地代码'])),
      item('podId', airPortProps('podId', ['目的地名称'], ['目的地代码'])),
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
      const result = await extractAirExportToAddDto(file);
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
      const airlineHint = payload.airlineLabel
        ? `；航司原文：${payload.airlineLabel}`
        : '';
      message.success(
        `AI识别完成${cacheHint}，已回填 ${recognizedFieldCount} 个字段${airlineHint}`,
      );
      if (payload.unmatchedLabels.length > 0) {
        message.warning(
          `${payload.unmatchedLabels.join('、')} 未匹配到系统数据，请手动补录`,
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
