<script lang="ts" setup>
import type { EnumerationAdminApi } from '#/api/system/enum-admin';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Descriptions, Tag } from 'ant-design-vue';

import { getEnumerationDetail } from '#/api/system/enum-admin';
import {
  getUserAttributeLabel,
  isOrderUserRoleEnum,
} from '#/composables/use-order-user-roles';
import { $t } from '#/locales';

import dayjs from 'dayjs';

import { sortEnumerationItemsByValue } from '../data';

const enumDetail = ref<EnumerationAdminApi.EnumerationDetailDto>();

/** 详情枚举项按 value 升序展示 */
const sortedEnumerationItems = computed(() =>
  sortEnumerationItemsByValue(enumDetail.value?.enumerationItems ?? []),
);

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    modalApi.close();
  },
  async onOpenChange(isOpen) {
    if (isOpen) {
      const data = modalApi.getData<EnumerationAdminApi.EnumerationListDto>();
      if (data?.id) {
        try {
          enumDetail.value = await getEnumerationDetail(data.id);
        } catch (error) {
          console.error('获取枚举详情失败:', error);
        }
      }
    } else {
      enumDetail.value = undefined;
    }
  },
});

const toDataString = (val: any) => {
  return dayjs(val).isValid() ? dayjs(val).format('YYYY-MM-DD HH:mm:ss') : '';
};
const getModalTitle = computed(() => {
  return $t('system.enumeration.detail');
});

/**
 * 判断字符串是否为有效的十六进制颜色值
 * @param value - 要检查的字符串
 * @returns 是否为颜色值
 */
function isColorValue(value: string): boolean {
  // 匹配 #RGB, #RRGGBB, #RGBA, #RRGGBBAA 格式
  const colorRegex =
    /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{8})$/;
  return colorRegex.test(value);
}

/** 子项 `extra1` 在各枚举下的语义，与编辑弹窗口径一致 */
const EXTRA1_TAG_TEXT_BY_ENUM: Record<string, [string, string]> = {
  SeaExportUserAttribute: ['默认展示', '手动添加'],
  // SeaImportUserAttribute 暂未落地，见 ORDER_USER_ROLE_ENUM_NAMES
  ServiceType: ['主流程', '服务项目'],
};

const extra1TagText = computed(
  () => EXTRA1_TAG_TEXT_BY_ENUM[enumDetail.value?.name?.trim() ?? ''],
);

/** 干系人角色枚举的 value 是 UserAttribute 位值，直接看数字无从判断配了谁 */
const isUserRoleEnum = computed(() =>
  isOrderUserRoleEnum(enumDetail.value?.name?.trim()),
);
const userAttributeLabelOf = (value: number) =>
  `${getUserAttributeLabel(value)}（${value}）`;
</script>

<template>
  <Modal :title="getModalTitle" class="w-[800px]" :footer="null">
    <div v-if="enumDetail" class="space-y-4">
      <!-- 基本信息 -->
      <Descriptions bordered :column="2" size="small">
        <Descriptions.Item :label="$t('system.enumeration.enumName')">
          {{ enumDetail.name || '-' }}
        </Descriptions.Item>
        <Descriptions.Item :label="$t('system.enumeration.description')">
          {{ enumDetail.description || '-' }}
        </Descriptions.Item>

        <Descriptions.Item :label="$t('common.createTime')">
          {{ toDataString(enumDetail.creationTime) || '-' }}
        </Descriptions.Item>
      </Descriptions>

      <!-- 枚举值列表 -->
      <div>
        <h3 class="mb-3 text-base font-medium">
          {{ $t('system.enumeration.enumItems') }}
        </h3>
        <div
          v-if="sortedEnumerationItems.length === 0"
          class="py-4 text-center text-gray-400"
        >
          {{ $t('common.noData') }}
        </div>
        <div v-else class="max-h-[400px] space-y-2 overflow-y-auto">
          <div
            v-for="(item, index) in sortedEnumerationItems"
            :key="item.id || index"
            class="rounded border p-3 hover:bg-gray-50"
          >
            <div class="mb-2 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="font-medium">
                  {{
                    isUserRoleEnum
                      ? $t('system.user.userAttribute')
                      : $t('system.enumeration.enumValue')
                  }}:
                </span>
                <span>
                  {{
                    isUserRoleEnum
                      ? userAttributeLabelOf(item.value)
                      : item.value
                  }}
                </span>
                <Tag :color="item.enable ? 'success' : 'default'">
                  {{
                    item.enable ? $t('common.enabled') : $t('common.disabled')
                  }}
                </Tag>
                <Tag
                  v-if="extra1TagText"
                  :color="item.extra1 ? 'processing' : 'default'"
                >
                  {{ item.extra1 ? extra1TagText[0] : extra1TagText[1] }}
                </Tag>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span class="text-gray-500"
                  >{{ $t('system.enumeration.displayName') }}:</span
                >
                <span class="ml-1">{{ item.displayName || '-' }}</span>
              </div>
              <div>
                <span class="text-gray-500"
                  >{{ $t('system.enumeration.description') }}:</span
                >
                <span class="ml-1">{{ item.description || '-' }}</span>
              </div>
              <div class="col-span-2">
                <span class="text-gray-500"
                  >{{ $t('system.enumeration.remark') }}:</span
                >
                <span v-if="item.remark" class="ml-1 flex items-center gap-2">
                  <!-- 如果是颜色值（十六进制格式），显示颜色预览 -->
                  <span
                    v-if="isColorValue(item.remark)"
                    class="inline-block h-6 w-12 rounded border"
                    :style="{ backgroundColor: item.remark }"
                    :title="item.remark"
                  ></span>
                  <span>{{ item.remark }}</span>
                </span>
                <span v-else class="ml-1">-</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Modal>
</template>
