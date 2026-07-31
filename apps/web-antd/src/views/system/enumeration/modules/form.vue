<script lang="ts" setup>
import type { EnumerationAdminApi } from '#/api/system/enum-admin';

import { computed, nextTick, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Select } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  addEnumeration,
  editEnumeration,
  getEnumerationDetail,
} from '#/api/system/enum-admin';
import {
  getUserAttributeRoleOptions,
  isOrderUserRoleEnum,
  ORDER_USER_ROLE_ENUM_NAMES,
} from '#/composables/use-order-user-roles';
import { $t } from '#/locales';

import { useFormSchema } from '../data';

const emits = defineEmits(['success']);

const formData = ref<EnumerationAdminApi.EnumerationDetailDto>();
const enumerationItems = ref<EnumerationAdminApi.EnumerationItemEditDto[]>([]);

/**
 * 枚举名决定子项怎么编辑（`extra1` 勾选框、value 是否改为用户属性下拉）。
 * 新增态没有详情可读，须跟着表单输入实时更新；`formApi.form` 是普通属性，挂载后替换不触发响应。
 */
const currentEnumName = ref('');

const [Form, formApi] = useVbenForm({
  handleValuesChange: (values) => {
    currentEnumName.value = String(values.name ?? '').trim();
  },
  schema: useFormSchema(),
  showDefaultActions: false,
});

const id = ref<string>();
const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    if (isUserRoleEnum.value && !validateUserRoleItems()) return;

    const values = await formApi.getValues();

    // 构建符合API要求的数据结构
    const submitData:
      | EnumerationAdminApi.EnumerationAddDto
      | EnumerationAdminApi.EnumerationEditDto = {
      name: values.name,
      description: values.description,
      remark: values.remark,
      enumerationItems: enumerationItems.value.map((item) => ({
        ...item,
        enable: item.enable ?? true,
        extra1: item.extra1 ?? false,
      })),
    };

    if (id.value) {
      (submitData as EnumerationAdminApi.EnumerationEditDto).id = id.value;
    }

    modalApi.lock();
    (id.value
      ? editEnumeration(submitData as EnumerationAdminApi.EnumerationEditDto)
      : addEnumeration(submitData as EnumerationAdminApi.EnumerationAddDto)
    )
      .then(() => {
        emits('success');
        modalApi.close();
        message.success(
          id.value
            ? $t('ui.actionMessage.editSuccess', [
                $t('system.enumeration.name'),
              ])
            : $t('ui.actionMessage.createSuccess', [
                $t('system.enumeration.name'),
              ]),
        );
      })
      .catch(() => {
        modalApi.unlock();
      });
  },

  async onOpenChange(isOpen) {
    if (isOpen) {
      const data = modalApi.getData<EnumerationAdminApi.EnumerationListDto>();
      formApi.resetForm();
      enumerationItems.value = [];
      currentEnumName.value = '';

      if (data?.id) {
        // 编辑模式：从接口获取完整数据
        id.value = data.id;
        try {
          const enumDetail = await getEnumerationDetail(data.id);
          formData.value = enumDetail;
          enumerationItems.value = enumDetail.enumerationItems || [];
          // handleValuesChange 有防抖，先同步一次避免子项编辑区闪一下通用形态
          currentEnumName.value = enumDetail.name?.trim() ?? '';

          // Wait for Vue to flush DOM updates (form fields mounted)
          await nextTick();
          // 设置表单值
          formApi.setValues({
            name: enumDetail.name,
            description: enumDetail.description,
            remark: enumDetail.remark,
          });
        } catch (error) {
          console.error('获取枚举详情失败:', error);
          message.error($t('ui.actionMessage.fetchFailed'));
          modalApi.close();
        }
      } else {
        // 新增模式
        id.value = undefined;
        formData.value = undefined;
      }
    }
  },
});

const getModalTitle = computed(() => {
  return formData.value?.id
    ? $t('common.edit', $t('system.enumeration.name'))
    : $t('common.create', $t('system.enumeration.name'));
});
/**
 * 需要维护子项 `extra1` 的枚举 → 勾选框文案与说明。
 * 其余枚举 `extra1` 无业务含义，不展示勾选框以免误配。
 * 干系人角色枚举由 `ORDER_USER_ROLE_ENUM_NAMES` 派生，新增业务类型无需在此登记。
 */
const EXTRA1_CONFIG_BY_ENUM: Record<string, { label: string; tip: string }> = {
  ServiceType: {
    label: '是否业务流程',
    tip: '勾选表示该服务项属于业务主流程',
  },
  ...Object.fromEntries(
    Object.values(ORDER_USER_ROLE_ENUM_NAMES).map((name) => [
      name,
      {
        label: '默认展示',
        tip: '勾选后该角色进入干系人面板即展示；不勾选则只出现在「+ 添加角色」候选中',
      },
    ]),
  ),
};

const extra1Config = computed(
  () => EXTRA1_CONFIG_BY_ENUM[currentEnumName.value],
);

/** 干系人角色枚举的 value 必须落在 UserAttribute 位值上，故改为下拉勾选而非手填 */
const isUserRoleEnum = computed(() =>
  isOrderUserRoleEnum(currentEnumName.value),
);
const userAttributeRoleOptions = getUserAttributeRoleOptions();

/** 同一个用户属性只能配一次，已被别的子项占用的置灰 */
function roleOptionsFor(current: EnumerationAdminApi.EnumerationItemEditDto) {
  const used = new Set(
    enumerationItems.value
      .filter((item) => item !== current)
      .map((item) => Number(item.value)),
  );
  return userAttributeRoleOptions.map((option) => ({
    ...option,
    disabled: used.has(option.value),
  }));
}

/** 选完属性顺带补显示名称，避免后台漏填导致面板显示位值 */
function onRoleValueChange(
  item: EnumerationAdminApi.EnumerationItemEditDto,
  value: unknown,
) {
  item.value = Number(value);
  const label = userAttributeRoleOptions.find(
    (option) => option.value === item.value,
  )?.label;
  if (label && !item.displayName?.trim()) item.displayName = label;
}

/** 干系人角色子项：必须选属性且不可重复，否则前端匹配不到人员 */
function validateUserRoleItems(): boolean {
  const values = enumerationItems.value.map((item) => Number(item.value));
  const isKnownAttribute = (value: number) =>
    userAttributeRoleOptions.some((option) => option.value === value);
  if (!values.every(isKnownAttribute)) {
    message.error('请为每个枚举项选择用户属性');
    return false;
  }
  if (new Set(values).size !== values.length) {
    message.error('同一个用户属性只能配置一次');
    return false;
  }
  return true;
}

/**
 * 添加枚举项
 */
function addEnumItem() {
  // 计算下一个value值：取当前最大值 + 1
  const maxValue =
    enumerationItems.value.length > 0
      ? Math.max(...enumerationItems.value.map((item) => item.value))
      : 0;
  // 干系人角色的 value 是位标志，递增会配出无效属性，故预选第一个未占用项
  const nextRoleOption = isUserRoleEnum.value
    ? roleOptionsFor({} as EnumerationAdminApi.EnumerationItemEditDto).find(
        (option) => !option.disabled,
      )
    : undefined;

  enumerationItems.value.push({
    value: isUserRoleEnum.value ? (nextRoleOption?.value ?? 0) : maxValue + 1,
    enable: true,
    extra1: false,
    displayName: nextRoleOption?.label ?? '',
    description: '',
    remark: '',
  });
}

/**
 * 删除枚举项
 */
function removeEnumItem(index: number) {
  enumerationItems.value.splice(index, 1);
}

/**
 * 根据背景色计算对比色（黑色或白色）
 * @param hexColor - 十六进制颜色值
 * @returns 黑色(#000000)或白色(#ffffff)
 */
function getContrastColor(hexColor: string): string {
  // 移除 # 号
  const hex = hexColor.replace('#', '');

  // 解析 RGB 值
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // 计算亮度 (使用 YIQ 公式)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  // 如果亮度大于 128，返回黑色，否则返回白色
  return brightness > 128 ? '#000000' : '#ffffff';
}
</script>

<template>
  <Modal :title="getModalTitle" class="w-[800px]">
    <div class="flex flex-col gap-4">
      <Form />

      <!-- 枚举值列表 -->
      <div class="mt-4">
        <div class="mb-2 flex items-center justify-between">
          <span class="font-medium">{{
            $t('system.enumeration.enumItems')
          }}</span>
          <Button size="small" type="primary" @click="addEnumItem">
            <Plus class="size-4" />
            {{ $t('system.enumeration.addEnumItem') }}
          </Button>
        </div>

        <div
          v-if="enumerationItems.length === 0"
          class="py-4 text-center text-gray-400"
        >
          {{ $t('common.noData') }}
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="(item, index) in enumerationItems"
            :key="index"
            class="flex items-start gap-2 rounded border p-3 hover:bg-gray-50"
          >
            <div class="grid flex-1 grid-cols-2 gap-2">
              <div>
                <label class="text-xs text-gray-500">
                  {{
                    isUserRoleEnum
                      ? $t('system.user.userAttribute')
                      : $t('system.enumeration.enumValue')
                  }}
                </label>
                <Select
                  v-if="isUserRoleEnum"
                  :options="roleOptionsFor(item)"
                  :value="item.value"
                  class="w-full"
                  :placeholder="$t('system.user.selectUserAttribute')"
                  @change="(value) => onRoleValueChange(item, value)"
                />
                <input
                  v-else
                  v-model.number="item.value"
                  type="number"
                  class="w-full rounded border px-2 py-1 text-sm"
                  placeholder="0"
                />
              </div>
              <div>
                <label class="text-xs text-gray-500">{{
                  $t('system.enumeration.displayName')
                }}</label>
                <input
                  v-model="item.displayName"
                  type="text"
                  class="w-full rounded border px-2 py-1 text-sm"
                  placeholder="显示名称"
                />
              </div>
              <div>
                <label class="text-xs text-gray-500">{{
                  $t('system.enumeration.description')
                }}</label>
                <input
                  v-model="item.description"
                  type="text"
                  class="w-full rounded border px-2 py-1 text-sm"
                  placeholder="描述"
                />
              </div>
              <div>
                <label class="text-xs text-gray-500">{{
                  $t('system.enumeration.remark')
                }}</label>
                <div class="flex items-center gap-2">
                  <input
                    v-model="item.remark"
                    type="color"
                    class="h-8 w-16 cursor-pointer rounded border p-1"
                    title="选择颜色"
                  />
                  <span
                    v-if="item.remark"
                    class="rounded px-2 py-1 text-xs font-medium"
                    :style="{
                      backgroundColor: item.remark,
                      color: getContrastColor(item.remark),
                    }"
                  >
                    {{ item.remark }}
                  </span>
                </div>
              </div>
            </div>
            <div class="flex flex-col gap-4">
              <label
                v-if="extra1Config"
                class="flex items-center gap-1 whitespace-nowrap text-xs"
                :title="extra1Config.tip"
              >
                <input v-model="item.extra1" type="checkbox" />
                {{ extra1Config.label }}
              </label>
              <label class="flex items-center gap-1 text-xs">
                <input v-model="item.enable" type="checkbox" />
                {{ $t('system.enumeration.enable') }}
              </label>
              <Button
                class="mt-auto"
                danger
                size="small"
                @click="removeEnumItem(index)"
              >
                {{ $t('common.delete') }}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Modal>
</template>
