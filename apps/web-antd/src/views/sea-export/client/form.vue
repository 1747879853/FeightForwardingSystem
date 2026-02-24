<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Button, Card, message, Space, Spin } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { getAreaAndParents } from '#/api/common/area';
import {
  addClient,
  editClient,
  getClientDetail,
} from '#/api/sea-export/client-admin';
import { $t } from '#/locales';

import { useFormSchema } from './data';

const route = useRoute();
const router = useRouter();

const editId = computed(() => {
  const id = route.params.id;
  return id ? Number(id) : undefined;
});

const isEdit = computed(() => !!editId.value);

const pageTitle = computed(() => {
  return isEdit.value
    ? $t('ui.actionTitle.edit', [$t('seaExport.client.name')])
    : $t('ui.actionTitle.create', [$t('seaExport.client.name')]);
});

const pageLoading = ref(false);
const submitting = ref(false);

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-2',
});

/**
 * 将后端的 areaId（最后一级 code）通过 GetAreaAndParents 接口转为路径数组
 */
const buildAreaPath = async (areaId?: string): Promise<string[]> => {
  if (!areaId) return [];
  try {
    const areas = await getAreaAndParents(areaId);
    if (!areas || areas.length === 0) return [];

    // 根据 parentId 链构建从根到叶的有序路径
    const idSet = new Set(areas.map((a) => a.id));
    const root = areas.find((a) => !a.parentId || !idSet.has(a.parentId));
    if (!root) return areas.map((a) => a.id).filter(Boolean) as string[];

    const ordered = [root];
    while (ordered.length < areas.length) {
      const currentId = ordered[ordered.length - 1]!.id;
      const next = areas.find((a) => a.parentId === currentId);
      if (!next) break;
      ordered.push(next);
    }
    return ordered.map((a) => a.id).filter(Boolean) as string[];
  } catch {
    return [];
  }
};

/** 将详情数据映射到表单值 */
const mapDetailToFormValues = async (detail: Record<string, any>) => {
  // areaId: 后端只存最后一级 code，通过接口转为 [省code, 市code, 区code] 给 AreaCascader
  const areaIdPath = await buildAreaPath(detail.areaId);

  return {
    name: detail.name,
    code: detail.code,
    phone: detail.phone,
    fullName: detail.fullName,
    enName: detail.enName,
    country: detail.country,
    areaId: areaIdPath,
    address: detail.address,
    enAddress: detail.enAddress,
    mainProduct: detail.mainProduct,
    enable: detail.enable,
    clientType: detail.clientType,
    industryCategories: detail.industryCategories
      ? detail.industryCategories.split(',').filter(Boolean)
      : [],
    remark: detail.remark,
  };
};

/** 加载编辑数据 */
const loadEditData = async () => {
  if (!editId.value) return;

  pageLoading.value = true;
  try {
    const detail = await getClientDetail(editId.value);
    const formValues = await mapDetailToFormValues(detail);
    await formApi.setValues(formValues);
  } finally {
    pageLoading.value = false;
  }
};

/** 提交表单 */
const handleSubmit = async () => {
  const { valid } = await formApi.validate();
  if (!valid) return;

  submitting.value = true;
  const values = await formApi.getValues();

  // industryCategories 数组拼接为逗号字符串
  const industryCategories = Array.isArray(values.industryCategories)
    ? values.industryCategories.join(',')
    : (values.industryCategories ?? '');

  // areaId: 表单中是路径数组，提交时只取最后一级 code 给后端
  const areaIdPath = values.areaId as string[] | undefined;
  const areaId =
    Array.isArray(areaIdPath) && areaIdPath.length > 0
      ? areaIdPath[areaIdPath.length - 1]
      : undefined;

  try {
    if (isEdit.value && editId.value) {
      await editClient({
        id: editId.value,
        name: values.name,
        code: values.code,
        phone: values.phone,
        fullName: values.fullName,
        enName: values.enName,
        country: values.country,
        areaId,
        address: values.address,
        enAddress: values.enAddress,
        mainProduct: values.mainProduct,
        enable: values.enable,
        clientType: values.clientType,
        industryCategories,
        remark: values.remark,
      });
    } else {
      await addClient({
        name: values.name,
        code: values.code,
        phone: values.phone,
        fullName: values.fullName,
        enName: values.enName,
        country: values.country,
        areaId,
        address: values.address,
        enAddress: values.enAddress,
        mainProduct: values.mainProduct,
        enable: values.enable,
        clientType: values.clientType,
        industryCategories,
        remark: values.remark,
      });
    }

    message.success($t('ui.actionMessage.operationSuccess'));
    router.push('/sea-export/clients');
  } finally {
    submitting.value = false;
  }
};

/** 取消返回 */
const handleCancel = () => {
  router.push('/sea-export/clients');
};

onMounted(() => {
  loadEditData();
});
</script>

<template>
  <Page auto-content-height>
    <Card :title="pageTitle">
      <Spin :spinning="pageLoading">
        <Form class="mx-4" />

        <div class="mx-4 mt-4 flex justify-end">
          <Space>
            <Button @click="handleCancel">
              {{ $t('common.cancel') }}
            </Button>
            <Button type="primary" :loading="submitting" @click="handleSubmit">
              {{ $t('common.confirm') }}
            </Button>
          </Space>
        </div>
      </Spin>
    </Card>
  </Page>
</template>
