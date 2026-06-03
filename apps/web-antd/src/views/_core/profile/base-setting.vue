<script setup lang="ts">
import type { VbenFormSchema } from '#/adapter/form';

import { computed, onMounted, ref } from 'vue';

import { ProfileBaseSetting } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';
import { message } from 'ant-design-vue';

import { getMyInfoApi, updateMyInfoApi } from '#/api';

const profileBaseSettingRef = ref();
const submitting = ref(false);
const currentAvatar = ref<null | string>(null);
const userStore = useUserStore();

interface BaseSettingFormValues {
  companyName: string;
  departmentDisplay: string;
  emailAddress: string;
  emailPwd: string;
  employeeID: string;
  enName: string;
  gender?: number;
  idNumber: string;
  nickName: string;
  officeTel: string;
  phoneNumber: string;
  qq: string;
  userName: string;
}

function toDisplayText(value?: null | string) {
  return value?.trim() || '';
}

function normalizeNullableText(value?: null | string) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function buildDepartmentDisplay(companyName: string, departmentName: string) {
  if (companyName && departmentName) {
    return `${companyName}-${departmentName}`;
  }
  return companyName || departmentName || '';
}

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      fieldName: 'userName',
      component: 'Input',
      label: '用户名',
      componentProps: {
        disabled: true,
      },
    },
    {
      fieldName: 'nickName',
      component: 'Input',
      label: '昵称',
      componentProps: {
        disabled: true,
      },
    },
    {
      fieldName: 'departmentDisplay',
      component: 'Input',
      label: '部门',
      componentProps: {
        disabled: true,
      },
    },
    {
      fieldName: 'employeeID',
      component: 'Input',
      label: '工号',
      componentProps: {
        disabled: true,
      },
    },
    {
      fieldName: 'phoneNumber',
      component: 'Input',
      label: '手机号',
      componentProps: {
        placeholder: '请输入手机号',
      },
    },
    {
      fieldName: 'emailAddress',
      component: 'Input',
      label: '邮箱',
      componentProps: {
        placeholder: '请输入邮箱',
      },
    },
    {
      fieldName: 'officeTel',
      component: 'Input',
      label: '办公电话',
      componentProps: {
        placeholder: '请输入办公电话',
      },
    },
    {
      fieldName: 'qq',
      component: 'Input',
      label: 'QQ',
      componentProps: {
        placeholder: '请输入QQ',
      },
    },
    {
      fieldName: 'idNumber',
      component: 'Input',
      label: '身份证号',
      componentProps: {
        placeholder: '请输入身份证号',
      },
    },
    {
      fieldName: 'gender',
      component: 'Select',
      label: '性别',
      componentProps: {
        allowClear: true,
        options: [
          { label: '未知', value: 0 },
          { label: '男', value: 1 },
          { label: '女', value: 2 },
        ],
        placeholder: '请选择性别',
      },
    },
    {
      fieldName: 'emailPwd',
      component: 'InputPassword',
      label: '个人邮箱密码',
      componentProps: {
        placeholder: '请输入个人邮箱密码',
      },
    },
    {
      fieldName: 'enName',
      component: 'Input',
      label: '英文名称',
      componentProps: {
        placeholder: '请输入英文名称',
      },
    },
  ];
});

async function loadMyInfo() {
  const data = await getMyInfoApi();
  currentAvatar.value =
    normalizeNullableText(data.avatar) ||
    normalizeNullableText(userStore.userInfo?.avatar);
  const companyName = toDisplayText(data.companyName);
  const departmentName = toDisplayText(data.departmentName);

  const values: BaseSettingFormValues = {
    userName: toDisplayText(data.userName),
    nickName: toDisplayText(data.nickName),
    enName: toDisplayText(data.enName),
    employeeID: toDisplayText(data.employeeID),
    phoneNumber: toDisplayText(data.phoneNumber),
    emailAddress: toDisplayText(data.emailAddress),
    officeTel: toDisplayText(data.officeTel),
    qq: toDisplayText(data.qq),
    idNumber: toDisplayText(data.idNumber),
    gender: data.gender ?? undefined,
    emailPwd: toDisplayText(data.emailPwd),
    companyName,
    departmentDisplay: buildDepartmentDisplay(companyName, departmentName),
  };

  profileBaseSettingRef.value?.getFormApi?.().setValues(values);
}

async function handleSubmit(values: Record<string, any>) {
  submitting.value = true;
  try {
    await updateMyInfoApi({
      enName: normalizeNullableText(values.enName),
      phoneNumber: normalizeNullableText(values.phoneNumber),
      emailAddress: normalizeNullableText(values.emailAddress),
      officeTel: normalizeNullableText(values.officeTel),
      qq: normalizeNullableText(values.qq),
      idNumber: normalizeNullableText(values.idNumber),
      gender: values.gender ?? null,
      avatar:
        currentAvatar.value ||
        normalizeNullableText(userStore.userInfo?.avatar),
      emailPwd: normalizeNullableText(values.emailPwd),
    });
    message.success('个人信息更新成功');
    await loadMyInfo();
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  await loadMyInfo();
});
</script>
<template>
  <ProfileBaseSetting
    ref="profileBaseSettingRef"
    :form-schema="formSchema"
    @submit="handleSubmit"
  />
</template>
