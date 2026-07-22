<script setup lang="ts">
import type { VbenFormSchema } from '#/adapter/form';
import type { UserAdminMyDto } from '#/api/core/user';

import { computed, onMounted, ref } from 'vue';

import { ProfileBaseSetting, z } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';
import { message } from 'ant-design-vue';

import { getMyInfoApi, updateMyInfoApi } from '#/api';
import { useAuthStore } from '#/store';

const profileBaseSettingRef = ref();
const submitting = ref(false);
const currentAvatar = ref<null | string>(null);
const authStore = useAuthStore();
const userStore = useUserStore();

interface BaseSettingFormValues {
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

/** 由 GetMy 的 organizations 生成「组织」展示文案（默认组织追加标记，多组织以 ；分隔） */
function buildOrganizationsDisplay(
  organizations?: null | UserAdminMyDto['organizations'],
) {
  if (!organizations || organizations.length === 0) return '';
  return organizations
    .map((item) => {
      const path = (item.oneOrganizationPath ?? [])
        .map((node) => node.displayName?.trim())
        .filter(Boolean)
        .join('-');
      if (!path) return '';
      return item.default ? `${path}（默认）` : path;
    })
    .filter(Boolean)
    .join('；');
}

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      fieldName: 'userName',
      component: 'ReadonlyText',
      label: '用户名',
    },
    {
      fieldName: 'nickName',
      component: 'ReadonlyText',
      label: '昵称',
    },
    {
      fieldName: 'departmentDisplay',
      component: 'ReadonlyText',
      label: '组织',
    },
    {
      fieldName: 'employeeID',
      component: 'ReadonlyText',
      label: '工号',
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
      rules: z
        .string()
        .min(1, { message: '请输入邮箱' })
        .max(128, { message: '邮箱长度不能超过128位' })
        .refine((value) => /^[\w.%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(value), {
          message: '请输入有效的邮箱',
        }),
      componentProps: {
        maxlength: 128,
        placeholder: '请输入邮箱',
        showCount: true,
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
    gender: data.gender === 1 || data.gender === 2 ? data.gender : undefined,
    emailPwd: toDisplayText(data.emailPwd),
    departmentDisplay: buildOrganizationsDisplay(data.organizations),
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
    await authStore.fetchUserInfo();
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
