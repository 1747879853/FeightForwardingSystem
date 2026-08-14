/**
 * 业务联系单 AI 识别回填编排。
 *
 * 选文件 → ExtractPreOrderToAddDtoAsync（带 bizType）→ 规范化 →
 * 回填主表/收发通/港口/货物/箱表；Select 回显与联动由 afterApply 完成
 *（避免 updateSchema 冲掉 onChange）。
 * 纯规范化策略见 ./ai-extract-utils.ts。
 */
import type { Ref } from 'vue';

import { ref } from 'vue';

import { message } from 'ant-design-vue';

import type { TextInAdminApi } from '#/api/common/text-in-admin';

import { extractPreOrderToAddDto } from '#/api/common';

import {
  AI_RECOGNIZE_ALLOWED_FIELDS,
  buildAiExtractFormPayload,
  isAiExtractSupportedFile,
  normalizeAiFieldValue,
} from './ai-extract-utils';
import type { PreOrderCtnRow } from './modules/ctn-table.vue';

type AiRecognizeFormApi = {
  setValues: (values: Record<string, any>) => Promise<void> | void;
};

export type UsePreOrderAiRecognizeDeps = {
  formApis: {
    basic: AiRecognizeFormApi;
    party: AiRecognizeFormApi;
    port: AiRecognizeFormApi;
    cargoTypeInline: AiRecognizeFormApi;
    cargo: AiRecognizeFormApi;
  };
  ctns: Ref<PreOrderCtnRow[]>;
  /** 当前标题栏业务类型，作为识别入参；不传后端按海运出口 0 */
  getBizType: () => number | undefined;
  /** 回填完成后的联动与 selectedItems 注入 */
  afterApply: (ctx: {
    formValues: Record<string, unknown>;
    extractedSchema?: Record<string, unknown>;
    preOrderCodeGoodss: Array<number | string>;
    preOrderCtns: TextInAdminApi.PreOrderCtnExtractAddDto[];
  }) => Promise<void> | void;
  createCtnRowKey: () => string;
};

export function usePreOrderAiRecognize(deps: UsePreOrderAiRecognizeDeps) {
  const { formApis, ctns, getBizType, afterApply, createCtnRowKey } = deps;

  const aiRecognizing = ref(false);

  const applyAiRecognizedFormValues = async (
    values: Record<string, any>,
    options?: {
      preOrderCtnsPayload?: TextInAdminApi.PreOrderCtnExtractAddDto[];
      preOrderCodeGoodssPayload?: Array<number | string>;
      extractedSchema?: Record<string, unknown>;
    },
  ) => {
    await Promise.all([
      formApis.basic.setValues(values),
      formApis.party.setValues(values),
      formApis.port.setValues(values),
      formApis.cargo.setValues(values),
    ]);

    if (options?.preOrderCodeGoodssPayload?.length) {
      await formApis.cargoTypeInline.setValues({
        orderCodeGoodss: options.preOrderCodeGoodssPayload,
      });
    }

    if (options?.preOrderCtnsPayload?.length) {
      ctns.value = options.preOrderCtnsPayload.map((item) => ({
        ...item,
        rowKey: createCtnRowKey(),
        ctnCodeName: item.ctnCodeName ?? undefined,
        ctnCode:
          item.ctnCodeId != null && item.ctnCodeName
            ? { id: item.ctnCodeId, ctnName: item.ctnCodeName }
            : undefined,
      }));
    }

    await afterApply({
      formValues: values,
      extractedSchema: options?.extractedSchema,
      preOrderCodeGoodss: options?.preOrderCodeGoodssPayload ?? [],
      preOrderCtns: options?.preOrderCtnsPayload ?? [],
    });
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
      const result = await extractPreOrderToAddDto(file, getBizType());
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

      await applyAiRecognizedFormValues(payload.formValues, {
        preOrderCtnsPayload: payload.preOrderCtns,
        preOrderCodeGoodssPayload: payload.preOrderCodeGoodss,
        extractedSchema: result.extract?.extractedSchema,
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
