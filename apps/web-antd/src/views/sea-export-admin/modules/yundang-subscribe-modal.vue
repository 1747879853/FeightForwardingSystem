<script lang="ts" setup>
import type { SeaExportSubscribeRowInfo } from '../use-yundang-ocean-subscribe';

import { computed, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Collapse, Input, message, Radio, Select } from 'ant-design-vue';

import {
  batchSubscribeOceanBill,
  YundangAdminApi,
} from '#/api/yundang/yundang-admin';
import { $t } from '#/locales';

const emit = defineEmits<{
  subscribed: [
    payload: {
      result: YundangAdminApi.YundangOceanBatchSubscribeResultDto;
      rows: SeaExportSubscribeRowInfo[];
    },
  ];
}>();

const MAX_BATCH_HINT = 30;

const rows = ref<SeaExportSubscribeRowInfo[]>([]);
const fromEditor = ref(false);
const scene = ref<YundangAdminApi.YundangOceanSubscribeSceneValue>(
  YundangAdminApi.YundangOceanSubscribeScene.Normal,
);
const referenceType = ref<YundangAdminApi.YundangReferenceTypeValue>(
  YundangAdminApi.YundangReferenceType.BL,
);
const noticeEmail = ref('');
const advancedOpen = ref<string[]>([]);

const selectedCount = computed(() => rows.value.length);
const showBatchHint = computed(() => selectedCount.value > MAX_BATCH_HINT);

const sceneOptions = computed(() => [
  {
    value: YundangAdminApi.YundangOceanSubscribeScene.Normal,
    label: $t('seaExport.yundang.scene.normal'),
  },
  {
    value: YundangAdminApi.YundangOceanSubscribeScene.SpecifiedContainer,
    label: $t('seaExport.yundang.scene.specifiedContainer'),
  },
  {
    value: YundangAdminApi.YundangOceanSubscribeScene.Sino,
    label: $t('seaExport.yundang.scene.sino'),
  },
  {
    value: YundangAdminApi.YundangOceanSubscribeScene.History,
    label: $t('seaExport.yundang.scene.history'),
  },
  {
    value: YundangAdminApi.YundangOceanSubscribeScene.AutoCarrier,
    label: $t('seaExport.yundang.scene.autoCarrier'),
    extra: $t('seaExport.yundang.requiresActivation'),
  },
  {
    value: YundangAdminApi.YundangOceanSubscribeScene.Comprehensive,
    label: $t('seaExport.yundang.scene.comprehensive'),
    extra: $t('seaExport.yundang.requiresActivation'),
  },
]);

const referenceTypeDisabled = computed(() => {
  return scene.value === YundangAdminApi.YundangOceanSubscribeScene.History;
});

const isReferenceTypeOptionDisabled = (
  type: YundangAdminApi.YundangReferenceTypeValue,
) => {
  if (scene.value === YundangAdminApi.YundangOceanSubscribeScene.History) {
    return type !== YundangAdminApi.YundangReferenceType.CN;
  }
  if (
    scene.value ===
      YundangAdminApi.YundangOceanSubscribeScene.SpecifiedContainer ||
    scene.value === YundangAdminApi.YundangOceanSubscribeScene.Sino
  ) {
    return type === YundangAdminApi.YundangReferenceType.CN;
  }
  return false;
};

watch(scene, (nextScene) => {
  if (nextScene === YundangAdminApi.YundangOceanSubscribeScene.History) {
    referenceType.value = YundangAdminApi.YundangReferenceType.CN;
    return;
  }
  if (
    (nextScene ===
      YundangAdminApi.YundangOceanSubscribeScene.SpecifiedContainer ||
      nextScene === YundangAdminApi.YundangOceanSubscribeScene.Sino) &&
    referenceType.value === YundangAdminApi.YundangReferenceType.CN
  ) {
    referenceType.value = YundangAdminApi.YundangReferenceType.BL;
  }
});

function resetForm() {
  scene.value = YundangAdminApi.YundangOceanSubscribeScene.Normal;
  referenceType.value = YundangAdminApi.YundangReferenceType.BL;
  noticeEmail.value = '';
  advancedOpen.value = [];
}

const [Modal, modalApi] = useVbenModal({
  confirmText: $t('seaExport.yundang.confirmSubscribe'),
  async onConfirm() {
    if (rows.value.length === 0) {
      message.warning($t('seaExport.yundang.pleaseSelectRecords'));
      return;
    }

    modalApi.lock();
    try {
      const result = await batchSubscribeOceanBill({
        seaExportIds: rows.value.map((row) => row.id),
        scene: scene.value,
        referenceType: referenceType.value,
        noticeEmail: noticeEmail.value.trim() || undefined,
      });
      modalApi.close();
      emit('subscribed', { result, rows: [...rows.value] });
    } finally {
      modalApi.lock(false);
    }
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = modalApi.getData<{
        fromEditor?: boolean;
        rows: SeaExportSubscribeRowInfo[];
      }>();
      rows.value = data?.rows ?? [];
      fromEditor.value = !!data?.fromEditor;
      resetForm();
    }
  },
});
</script>

<template>
  <Modal :title="$t('seaExport.yundang.subscribeTitle')" class="w-[520px]">
    <div class="yundang-subscribe-form space-y-4">
      <p class="text-sm text-[rgba(0,0,0,0.65)]">
        {{ $t('seaExport.yundang.selectedCount', [selectedCount]) }}
      </p>
      <p v-if="fromEditor" class="text-xs text-[rgba(0,0,0,0.45)]">
        {{ $t('seaExport.yundang.savedDataHint') }}
      </p>
      <p v-if="showBatchHint" class="text-xs text-[#faad14]">
        {{ $t('seaExport.yundang.batchHint', [MAX_BATCH_HINT]) }}
      </p>

      <div>
        <div class="mb-2 text-sm font-medium">
          {{ $t('seaExport.yundang.referenceType') }}
        </div>
        <Radio.Group
          v-model:value="referenceType"
          :disabled="referenceTypeDisabled"
        >
          <Radio
            :value="YundangAdminApi.YundangReferenceType.BL"
            :disabled="
              isReferenceTypeOptionDisabled(
                YundangAdminApi.YundangReferenceType.BL,
              )
            "
          >
            {{ $t('seaExport.yundang.referenceTypeBl') }}
          </Radio>
          <Radio
            :value="YundangAdminApi.YundangReferenceType.BK"
            :disabled="
              isReferenceTypeOptionDisabled(
                YundangAdminApi.YundangReferenceType.BK,
              )
            "
          >
            {{ $t('seaExport.yundang.referenceTypeBk') }}
          </Radio>
          <Radio
            :value="YundangAdminApi.YundangReferenceType.CN"
            :disabled="
              isReferenceTypeOptionDisabled(
                YundangAdminApi.YundangReferenceType.CN,
              )
            "
          >
            {{ $t('seaExport.yundang.referenceTypeCn') }}
          </Radio>
        </Radio.Group>
      </div>

      <div>
        <div class="mb-2 text-sm font-medium">
          {{ $t('seaExport.yundang.noticeEmail') }}
        </div>
        <Input
          v-model:value="noticeEmail"
          :placeholder="$t('seaExport.yundang.noticeEmailPlaceholder')"
          allow-clear
        />
      </div>

      <Collapse v-model:active-key="advancedOpen" ghost>
        <Collapse.Panel
          key="advanced"
          :header="$t('seaExport.yundang.advancedOptions')"
        >
          <div>
            <div class="mb-2 text-sm font-medium">
              {{ $t('seaExport.yundang.sceneLabel') }}
            </div>
            <Select
              v-model:value="scene"
              class="w-full"
              :options="
                sceneOptions.map((item) => ({
                  value: item.value,
                  label: item.extra
                    ? `${item.label}（${item.extra}）`
                    : item.label,
                }))
              "
            />
          </div>
        </Collapse.Panel>
      </Collapse>
    </div>
  </Modal>
</template>
