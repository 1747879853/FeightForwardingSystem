/**
 * 空运出口 AI 识别回填编排。
 *
 * 与海运出口差异：空港匹配 AirPort；货物明细读 airExportOrderCtns；
 * 起飞/预抵对应 etd/eta；未匹配空港提示读 polRemark/potRemark/podRemark。
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
  syncTabTitleFromValues: (values: Record<string, any>) => void;
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
    syncTabTitleFromValues,
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
    syncTabTitleFromValues(values);
  };

  const applyAiExtractSelectedItems = (values: Record<string, any>) => {
    const item = (fieldName: string, componentProps: Record<string, any>) => ({
      fieldName,
      componentProps: { ...componentProps, size: 'small' },
    });

    formApis.basic.updateSchema([
      item('clientId', {
        selectedItems: toSelectedItems(values.clientId, ''),
      }),
      item('codeServiceId', {
        selectedItems: toSelectedItems(values.codeServiceId, '', 'enName'),
      }),
    ]);

    const airPortProps = (fieldName: 'podId' | 'polId' | 'potId') => ({
      allowClear: true,
      labelKey: 'iataCode',
      placeholder: $t('ui.placeholder.select'),
      selectedItems: toExtractAirPortSelectedItems(
        values[fieldName],
        values[`${fieldName.replace(/Id$/, 'Remark')}`],
      ),
      ...(onAirPortChange
        ? {
            onChange: (value: unknown, option: unknown) =>
              onAirPortChange(fieldName, value, option),
          }
        : {}),
    });

    formApis.airLeg.updateSchema([
      item('polId', airPortProps('polId')),
      item('potId', airPortProps('potId')),
      item('podId', airPortProps('podId')),
    ]);

    setCodePackageSelectedItems?.(toSelectedItems(values.codePackageId, ''));
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

      const payload = buildAiExtractFormPayload(result, {
        allowedFields: AI_RECOGNIZE_ALLOWED_FIELDS,
        normalizeValue: normalizeAiFieldValue,
      });
      const recognizedFieldCount = payload.filledFields.length;
      if (recognizedFieldCount === 0) {
        message.warning('识别成功，但没有可回填的字段');
        return false;
      }

      applyAiExtractSelectedItems(payload.formValues);
      await applyAiRecognizedFormValues(payload.formValues, {
        orderCtnsPayload: payload.orderCtns,
        orderCodeGoodssPayload: payload.orderCodeGoodss,
      });

      message.success(`AI识别完成，已回填 ${recognizedFieldCount} 个字段`);
      if (payload.unmatchedLabels.length > 0) {
        message.warning(
          `${payload.unmatchedLabels.join('、')} 未匹配到系统数据，请手动补录`,
        );
      }
      return true;
    } catch {
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
