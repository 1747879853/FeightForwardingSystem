<script lang="ts" setup>
import type { EnumerationAdminApi } from '#/api/system/enum-admin';

import { computed, nextTick, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  addEnumeration,
  editEnumeration,
  getEnumerationDetail,
} from '#/api/system/enum-admin';
import { $t } from '#/locales';

import { useFormSchema } from '../data';

const emits = defineEmits(['success']);

const formData = ref<EnumerationAdminApi.EnumerationDetailDto>();
const enumerationItems = ref<EnumerationAdminApi.EnumerationItemEditDto[]>([]);

const [Form, formApi] = useVbenForm({
  schema: useFormSchema(),
  showDefaultActions: false,
});

const id = ref<string>();
const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;

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

      if (data?.id) {
        // 编辑模式：从接口获取完整数据
        id.value = data.id;
        try {
          const enumDetail = await getEnumerationDetail(data.id);
          formData.value = enumDetail;
          enumerationItems.value = enumDetail.enumerationItems || [];

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
 * 添加枚举项
 */
function addEnumItem() {
  // 计算下一个value值：取当前最大值 + 1
  const maxValue =
    enumerationItems.value.length > 0
      ? Math.max(...enumerationItems.value.map((item) => item.value))
      : 0;

  enumerationItems.value.push({
    value: maxValue + 1,
    enable: true,
    displayName: '',
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
                <label class="text-xs text-gray-500">{{
                  $t('system.enumeration.enumValue')
                }}</label>
                <input
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
                <input
                  v-model="item.remark"
                  type="text"
                  class="w-full rounded border px-2 py-1 text-sm"
                  placeholder="备注"
                />
              </div>
            </div>
            <div class="flex flex-col gap-16">
              <label class="flex items-center gap-1 text-xs">
                <input v-model="item.enable" type="checkbox" />
                {{ $t('system.enumeration.enable') }}
              </label>
              <Button danger size="small" @click="removeEnumItem(index)">
                {{ $t('common.delete') }}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Modal>
</template>
