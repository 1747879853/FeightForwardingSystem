import type {
  VbenFormSchema as FormSchema,
  VbenFormProps,
} from '@vben/common-ui';

import type { ComponentType } from './component';

import { setupVbenForm, useVbenForm as useForm, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

async function initSetupVbenForm() {
  setupVbenForm<ComponentType>({
    config: {
      // ant design vue组件库默认都是 v-model:value
      baseModelPropName: 'value',

      // 一些组件是 v-model:checked 或者 v-model:fileList
      modelPropNameMap: {
        Checkbox: 'checked',
        Radio: 'checked',
        Switch: 'checked',
        Upload: 'fileList',
      },
    },
    defineRules: {
      // 输入项目必填国际化适配
      required: (value, _params, ctx) => {
        if (value === undefined || value === null || value.length === 0) {
          return $t('ui.formRules.required', [ctx.label]);
        }
        return true;
      },
      // 选择项目必填国际化适配
      selectRequired: (value, _params, ctx) => {
        if (value === undefined || value === null) {
          return $t('ui.formRules.selectRequired', [ctx.label]);
        }
        return true;
      },
      // 最小长度验证
      min: (value, params, ctx) => {
        if (value === undefined || value === null || value === '') {
          return true;
        }
        const minLength = Number(params[0]);
        if (String(value).length < minLength) {
          return $t('ui.formRules.minLength', [ctx.label, minLength]);
        }
        return true;
      },
      // 最大长度验证
      max: (value, params, ctx) => {
        if (value === undefined || value === null || value === '') {
          return true;
        }
        const maxLength = Number(params[0]);
        if (String(value).length > maxLength) {
          return $t('ui.formRules.maxLength', [ctx.label, maxLength]);
        }
        return true;
      },
      // 邮箱格式验证
      email: (value, _params, ctx) => {
        if (value === undefined || value === null || value === '') {
          return true;
        }
        const emailRegex = /^[\w.%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
        if (!emailRegex.test(String(value))) {
          return $t('ui.formRules.invalidEmail', [ctx.label]);
        }
        return true;
      },
    },
  });
}

const useVbenForm = useForm<ComponentType>;

export { initSetupVbenForm, useVbenForm, z };

export type VbenFormSchema = FormSchema<ComponentType>;
export type { VbenFormProps };
