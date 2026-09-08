/**
 * 通用组件共同的使用的基础组件，原先放在 adapter/form 内部，限制了使用范围，这里提取出来，方便其他地方使用
 * 可用于 vben-form、vben-modal、vben-drawer 等组件使用,
 */

/* eslint-disable vue/one-component-per-file */

import type {
  UploadChangeParam,
  UploadFile,
  UploadProps,
} from 'ant-design-vue';

import type { Component } from 'vue';

import type { BaseFormComponentType } from '@vben/common-ui';
import type { Recordable } from '@vben/types';

import {
  defineAsyncComponent,
  defineComponent,
  h,
  ref,
  render,
  watch,
} from 'vue';

import {
  ApiComponent,
  globalShareState,
  IconPicker,
  VCropper,
} from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { $t } from '@vben/locales';
import { isEmpty } from '@vben/utils';

import { message, Modal, notification } from 'ant-design-vue';

import { openAttachmentViewer } from '#/components/attachment-viewer/use-attachment-viewer';

const AutoComplete = defineAsyncComponent(
  () => import('ant-design-vue/es/auto-complete'),
);
const Button = defineAsyncComponent(() => import('ant-design-vue/es/button'));
const Checkbox = defineAsyncComponent(
  () => import('ant-design-vue/es/checkbox'),
);
const CheckboxGroup = defineAsyncComponent(() =>
  import('ant-design-vue/es/checkbox').then((res) => res.CheckboxGroup),
);
const DatePicker = defineAsyncComponent(
  () => import('ant-design-vue/es/date-picker'),
);
const Divider = defineAsyncComponent(() => import('ant-design-vue/es/divider'));
const Input = defineAsyncComponent(() => import('ant-design-vue/es/input'));
const InputNumber = defineAsyncComponent(
  () => import('ant-design-vue/es/input-number'),
);
const InputPassword = defineAsyncComponent(() =>
  import('ant-design-vue/es/input').then((res) => res.InputPassword),
);
const Mentions = defineAsyncComponent(
  () => import('ant-design-vue/es/mentions'),
);
const Radio = defineAsyncComponent(() => import('ant-design-vue/es/radio'));
const RadioGroup = defineAsyncComponent(() =>
  import('ant-design-vue/es/radio').then((res) => res.RadioGroup),
);
const RangePicker = defineAsyncComponent(() =>
  import('ant-design-vue/es/date-picker').then((res) => res.RangePicker),
);
const Rate = defineAsyncComponent(() => import('ant-design-vue/es/rate'));
const Select = defineAsyncComponent(() => import('ant-design-vue/es/select'));
const Space = defineAsyncComponent(() => import('ant-design-vue/es/space'));
const Switch = defineAsyncComponent(() => import('ant-design-vue/es/switch'));
const Textarea = defineAsyncComponent(() =>
  import('ant-design-vue/es/input').then((res) => res.Textarea),
);
const TimePicker = defineAsyncComponent(
  () => import('ant-design-vue/es/time-picker'),
);
const TreeSelect = defineAsyncComponent(
  () => import('ant-design-vue/es/tree-select'),
);
const Cascader = defineAsyncComponent(
  () => import('ant-design-vue/es/cascader'),
);
const Upload = defineAsyncComponent(() => import('ant-design-vue/es/upload'));

const withDefaultPlaceholder = <T extends Component>(
  component: T,
  type: 'input' | 'select',
  componentProps: Recordable<any> = {},
) => {
  return defineComponent({
    name: component.name,
    inheritAttrs: false,
    setup: (props: any, { attrs, expose, slots }) => {
      const placeholder =
        props?.placeholder ||
        attrs?.placeholder ||
        $t(`ui.placeholder.${type}`);
      // 透传组件暴露的方法
      const innerRef = ref();
      expose(
        new Proxy(
          {},
          {
            get: (_target, key) => innerRef.value?.[key],
            has: (_target, key) => key in (innerRef.value || {}),
          },
        ),
      );
      return () =>
        h(
          component,
          { ...componentProps, placeholder, ...props, ...attrs, ref: innerRef },
          slots,
        );
    },
  });
};

const withPreviewUpload = () => {
  // 检查是否为图片文件的辅助函数
  const isImageFile = (file: UploadFile): boolean => {
    const imageExtensions = new Set([
      'bmp',
      'gif',
      'jpeg',
      'jpg',
      'png',
      'svg',
      'webp',
    ]);
    if (file.url) {
      try {
        const pathname = new URL(file.url, 'http://localhost').pathname;
        const ext = pathname.split('.').pop()?.toLowerCase();
        return ext ? imageExtensions.has(ext) : false;
      } catch {
        const ext = file.url?.split('.').pop()?.toLowerCase();
        return ext ? imageExtensions.has(ext) : false;
      }
    }
    if (!file.type) {
      const ext = file.name?.split('.').pop()?.toLowerCase();
      return ext ? imageExtensions.has(ext) : false;
    }
    return file.type.startsWith('image/');
  };
  // 创建默认的上传按钮插槽
  const createDefaultSlotsWithUpload = (
    listType: string,
    placeholder: string,
  ) => {
    switch (listType) {
      case 'picture-card': {
        return {
          default: () => placeholder,
        };
      }
      default: {
        return {
          default: () =>
            h(
              Button,
              {
                icon: h(IconifyIcon, {
                  icon: 'ant-design:upload-outlined',
                  class: 'mb-1 size-4',
                }),
              },
              () => placeholder,
            ),
        };
      }
    }
  };
  const readLocalFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.addEventListener('load', () =>
        resolve(String(reader.result || '')),
      );
      reader.addEventListener('error', (error) => reject(error));
    });

  /** 表单 Upload 预览一律走全站查看器（含图片），下载才能用友好名 */
  const previewImage = async (file: UploadFile) => {
    let url = file.url || file.preview;
    if (!url && file.originFileObj) {
      url = await readLocalFileAsDataUrl(file.originFileObj);
    }
    if (url) {
      openAttachmentViewer({
        url,
        fileName: file.name,
        friendlyFileName: file.name,
      });
      return;
    }
    message.error($t('ui.formRules.previewWarning'));
  };

  // 图片裁剪操作
  const cropImage = (file: File, aspectRatio: string | undefined) => {
    return new Promise((resolve, reject) => {
      const container: HTMLElement | null = document.createElement('div');
      document.body.append(container);

      // 用于追踪组件是否已卸载
      let isUnmounted = false;
      let objectUrl: null | string = null;

      const open = ref<boolean>(true);
      const cropperRef = ref<InstanceType<typeof VCropper> | null>(null);

      const closeModal = () => {
        open.value = false;
        // 延迟清理，确保动画完成
        setTimeout(() => {
          if (!isUnmounted && container) {
            if (objectUrl) {
              URL.revokeObjectURL(objectUrl);
            }
            isUnmounted = true;
            render(null, container);
            container.remove();
          }
        }, 300);
      };

      const CropperWrapper = {
        setup() {
          return () => {
            if (isUnmounted) return null;
            if (!objectUrl) {
              objectUrl = URL.createObjectURL(file);
            }
            return h(
              Modal,
              {
                open: open.value,
                title: $t('ui.crop.title'),
                centered: true,
                width: 548,
                keyboard: false,
                maskClosable: false,
                closable: false,
                cancelText: $t('common.cancel'),
                okText: $t('ui.crop.confirm'),
                destroyOnClose: true,
                onOk: async () => {
                  const cropper = cropperRef.value;
                  if (!cropper) {
                    reject(new Error('Cropper not found'));
                    closeModal();
                    return;
                  }
                  try {
                    const dataUrl = await cropper.getCropImage();
                    resolve(dataUrl);
                  } catch {
                    reject(new Error($t('ui.crop.errorTip')));
                  } finally {
                    closeModal();
                  }
                },
                onCancel() {
                  resolve('');
                  closeModal();
                },
              },
              () =>
                h(VCropper, {
                  ref: (ref: any) => (cropperRef.value = ref),
                  img: objectUrl as string,
                  aspectRatio,
                }),
            );
          };
        },
      };

      render(h(CropperWrapper), container);
    });
  };

  const base64ToBlob = (base64: Base64URLString) => {
    try {
      const [typeStr, encodeStr] = base64.split(',');
      if (!typeStr || !encodeStr) return;
      const mime = typeStr.match(/:(.*?);/)?.[1];
      const raw = window.atob(encodeStr);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.codePointAt(i) as number;
      }
      return new Blob([uInt8Array], { type: mime });
    } catch {
      return undefined;
    }
  };
  return defineComponent({
    name: Upload.name,
    emits: ['update:modelValue'],
    setup: (
      props: any,
      { attrs, slots, emit }: { attrs: any; emit: any; slots: any },
    ) => {
      const placeholder = attrs?.placeholder || $t(`ui.placeholder.upload`);

      const listType = attrs?.listType || attrs?.['list-type'] || 'text';

      const fileList = ref<UploadProps['fileList']>(
        attrs?.fileList || attrs?.['file-list'] || [],
      );

      const handleBeforeUpload = async (
        file: UploadFile,
        originFileList: Array<File>,
      ) => {
        if (attrs.maxSize && (file.size || 0) / 1024 / 1024 > attrs.maxSize) {
          message.error($t('ui.formRules.sizeLimit', [attrs.maxSize]));
          file.status = 'removed';
          return false;
        }
        // 多选或者非图片不唤起裁剪框
        if (
          attrs.crop &&
          !attrs.multiple &&
          originFileList[0] &&
          isImageFile(file)
        ) {
          file.status = 'removed';
          // antd Upload组件问题 file参数获取的是UploadFile类型对象无法取到File类型 所以通过originFileList[0]获取
          const base64 = await cropImage(originFileList[0], attrs.aspectRatio);
          return new Promise((resolve, reject) => {
            if (!base64) {
              return reject(new Error($t('ui.crop.cancel')));
            }
            const blob = base64ToBlob(base64 as string);
            if (!blob) {
              return reject(new Error($t('ui.crop.errorTip')));
            }
            resolve(blob);
          });
        }

        return attrs.beforeUpload?.(file) ?? true;
      };

      const handleChange = (event: UploadChangeParam) => {
        try {
          // 行内写法 handleChange: (event) => {}
          attrs.handleChange?.(event);
          // template写法 @handle-change="(event) => {}"
          attrs.onHandleChange?.(event);
        } catch (error) {
          // Avoid breaking internal v-model sync on user handler errors
          console.error(error);
        }
        fileList.value = event.fileList.filter(
          (file) => file.status !== 'removed',
        );
        emit(
          'update:modelValue',
          event.fileList?.length ? fileList.value : undefined,
        );
      };

      const handlePreview = async (file: UploadFile) => {
        await previewImage(file);
      };

      const renderUploadButton = (): any => {
        const isDisabled = attrs.disabled;

        // 如果禁用，不渲染上传按钮
        if (isDisabled) {
          return null;
        }

        // 否则渲染默认上传按钮
        return isEmpty(slots)
          ? createDefaultSlotsWithUpload(listType, placeholder)
          : slots;
      };

      // 可以监听到表单API设置的值
      watch(
        () => attrs.modelValue,
        (res) => {
          fileList.value = res;
        },
      );

      return () =>
        h(
          Upload,
          {
            ...props,
            ...attrs,
            fileList: fileList.value,
            beforeUpload: handleBeforeUpload,
            onChange: handleChange,
            onPreview: handlePreview,
          },
          renderUploadButton(),
        );
    },
  });
};

// 这里需要自行根据业务组件库进行适配，需要用到的组件都需要在这里类型说明
export type ComponentType =
  | 'ApiCascader'
  | 'ApiSelect'
  | 'ApiTreeSelect'
  | 'AreaCascader'
  | 'AreaLeafCascader'
  | 'AutoComplete'
  | 'Cascader'
  | 'Checkbox'
  | 'CheckboxGroup'
  | 'DatePicker'
  | 'DefaultButton'
  | 'Divider'
  | 'FileUploadInput'
  | 'IconPicker'
  | 'Input'
  | 'InputNumber'
  | 'InputPassword'
  | 'Mentions'
  | 'PrimaryButton'
  | 'Radio'
  | 'RadioGroup'
  | 'RangePicker'
  | 'Rate'
  | 'RoleSelect'
  | 'Select'
  | 'Space'
  | 'Switch'
  | 'Textarea'
  | 'TimePicker'
  | 'TreeSelect'
  | 'Upload'
  | 'UserSelect'
  | 'BankStatementSelect'
  | 'CurrencySelect'
  | 'LaneSelect'
  | 'OrganizationSelect'
  | 'MyOrgSelect'
  | 'MyCompanySelect'
  | 'UserOrgSelect'
  | 'UserCompanySelect'
  | 'PortSelect'
  | 'AirPortSelect'
  | 'CarrierSelect'
  | 'ClientSelect'
  | 'CtnSelect'
  | 'CountrySelect'
  | 'CodeInvoiceSelect'
  | 'CodeServiceSelect'
  | 'CodeGoodsSelect'
  | 'CodePackageSelect'
  | 'CodeIssueTypeSelect'
  | 'CodeSourceSelect'
  | 'CodeFrtSelect'
  | 'FeeCodeSelect'
  | 'ExchangeRateSelect'
  | 'VesselVoyageInput'
  | 'PkgsPackageInput'
  | 'TrimInput'
  | 'EnglishUpperInput'
  | 'EnglishUpperTextarea'
  | 'ReadonlyText'
  | 'SigningInfoInput'
  | 'ServiceItemInput'
  | 'BillCountsInput'
  | 'FrtPrepareInput'
  | 'ServiceTradeTermsInput'
  | 'OrderGoodsButton'
  | 'OrderUsersButton'
  | BaseFormComponentType;

async function initComponentAdapter() {
  const components: Partial<Record<ComponentType, Component>> = {
    // 如果你的组件体积比较大，可以使用异步加载
    // Button: () =>
    // import('xxx').then((res) => res.Button),

    ApiCascader: withDefaultPlaceholder(ApiComponent, 'select', {
      component: Cascader,
      fieldNames: { label: 'label', value: 'value', children: 'children' },
      loadingSlot: 'suffixIcon',
      modelPropName: 'value',
      visibleEvent: 'onVisibleChange',
    }),
    ApiSelect: withDefaultPlaceholder(ApiComponent, 'select', {
      component: Select,
      loadingSlot: 'suffixIcon',
      modelPropName: 'value',
      visibleEvent: 'onVisibleChange',
    }),
    ApiTreeSelect: withDefaultPlaceholder(ApiComponent, 'select', {
      component: TreeSelect,
      fieldNames: { label: 'label', value: 'value', children: 'children' },
      loadingSlot: 'suffixIcon',
      modelPropName: 'value',
      optionsPropName: 'treeData',
      visibleEvent: 'onVisibleChange',
    }),
    AreaCascader: defineAsyncComponent(
      () => import('./biz-select/area-cascader.vue'),
    ),
    AreaLeafCascader: defineAsyncComponent(
      () => import('./biz-select/area-leaf-cascader.vue'),
    ),
    AutoComplete,
    Cascader,
    Checkbox,
    CheckboxGroup,
    DatePicker,
    // 自定义默认按钮
    DefaultButton: (props, { attrs, slots }) => {
      return h(Button, { ...props, attrs, type: 'default' }, slots);
    },
    Divider,
    FileUploadInput: defineAsyncComponent(
      () => import('./file-upload/file-upload-input.vue'),
    ),
    IconPicker: withDefaultPlaceholder(IconPicker, 'select', {
      iconSlot: 'addonAfter',
      inputComponent: Input,
      modelValueProp: 'value',
    }),
    Input: withDefaultPlaceholder(Input, 'input'),
    InputNumber: withDefaultPlaceholder(InputNumber, 'input'),
    InputPassword: withDefaultPlaceholder(InputPassword, 'input'),
    Mentions: withDefaultPlaceholder(Mentions, 'input'),
    // 自定义主要按钮
    PrimaryButton: (props, { attrs, slots }) => {
      return h(Button, { ...props, attrs, type: 'primary' }, slots);
    },
    Radio,
    RadioGroup,
    RangePicker,
    Rate,
    RoleSelect: defineAsyncComponent(
      () => import('./biz-select/role-select.vue'),
    ),
    Select: withDefaultPlaceholder(Select, 'select'),
    Space,
    Switch,
    Textarea: withDefaultPlaceholder(Textarea, 'input'),
    TimePicker,
    TreeSelect: withDefaultPlaceholder(TreeSelect, 'select'),
    Upload: withPreviewUpload(),
    UserSelect: defineAsyncComponent(
      () => import('./biz-select/user-select.vue'),
    ),
    BankStatementSelect: defineAsyncComponent(
      () => import('./biz-select/bank-statement-select.vue'),
    ),
    CurrencySelect: defineAsyncComponent(
      () => import('./biz-select/currency-select.vue'),
    ),
    LaneSelect: defineAsyncComponent(
      () => import('./biz-select/lane-select.vue'),
    ),
    OrganizationSelect: defineAsyncComponent(
      () => import('./biz-select/organization-select.vue'),
    ),
    MyOrgSelect: defineAsyncComponent(
      () => import('./biz-select/my-org-select.vue'),
    ),
    UserOrgSelect: defineAsyncComponent(
      () => import('./biz-select/user-org-select.vue'),
    ),
    PortSelect: defineAsyncComponent(
      () => import('./biz-select/port-select.vue'),
    ),
    AirPortSelect: defineAsyncComponent(
      () => import('./biz-select/air-port-select.vue'),
    ),
    CarrierSelect: defineAsyncComponent(
      () => import('./biz-select/carrier-select.vue'),
    ),
    CtnSelect: defineAsyncComponent(
      () => import('./biz-select/ctn-select.vue'),
    ),
    ClientSelect: defineAsyncComponent(
      () => import('./biz-select/client-select.vue'),
    ),
    CountrySelect: defineAsyncComponent(
      () => import('./biz-select/country-select.vue'),
    ),
    CodeInvoiceSelect: defineAsyncComponent(
      () => import('./biz-select/code-invoice-select.vue'),
    ),
    CodeServiceSelect: defineAsyncComponent(
      () => import('./biz-select/code-service-select.vue'),
    ),
    CodeGoodsSelect: defineAsyncComponent(
      () => import('./biz-select/code-goods-select.vue'),
    ),
    CodePackageSelect: defineAsyncComponent(
      () => import('./biz-select/code-package-select.vue'),
    ),
    CodeIssueTypeSelect: defineAsyncComponent(
      () => import('./biz-select/code-issue-type-select.vue'),
    ),
    CodeSourceSelect: defineAsyncComponent(
      () => import('./biz-select/code-source-select.vue'),
    ),
    CodeFrtSelect: defineAsyncComponent(
      () => import('./biz-select/code-frt-select.vue'),
    ),
    FeeCodeSelect: defineAsyncComponent(
      () => import('./biz-select/fee-code-select.vue'),
    ),
    IndustryCategorySelect: defineAsyncComponent(
      () => import('./biz-select/industry-category-select.vue'),
    ),
    UnitSelect: defineAsyncComponent(
      () => import('./biz-select/unit-select.vue'),
    ),
    ExchangeRateSelect: defineAsyncComponent(
      () => import('./biz-select/exchange-rate-select.vue'),
    ),
    OrgBankAccountSelect: defineAsyncComponent(
      () => import('./biz-select/org-bank-account-select.vue'),
    ),
    OrgBankAccountLinkageSelect: defineAsyncComponent(
      () => import('./biz-select/org-bank-account-linkage-select.vue'),
    ),
    ClientBankAccountSelect: defineAsyncComponent(
      () => import('./biz-select/client-bank-account-select.vue'),
    ),
    OrderGoodsButton: defineAsyncComponent(
      () => import('./biz-form/order-goods-button.vue'),
    ),
    OrderUsersButton: defineAsyncComponent(
      () => import('./biz-form/order-users-button.vue'),
    ),
    UserCompanySelect: defineAsyncComponent(
      () => import('./biz-select/user-company-select.vue'),
    ),
    MyCompanySelect: defineAsyncComponent(
      () => import('./biz-select/my-company-select.vue'),
    ),
    VesselVoyageInput: defineAsyncComponent(
      () => import('./vessel-voyage-input.vue'),
    ),
    PkgsPackageInput: defineAsyncComponent(
      () => import('./pkgs-package-input.vue'),
    ),
    TrimInput: defineAsyncComponent(() => import('./trim-input.vue')),
    EnglishUpperInput: defineAsyncComponent(
      () => import('./english-upper-input.vue'),
    ),
    EnglishUpperTextarea: defineAsyncComponent(
      () => import('./english-upper-textarea.vue'),
    ),
    ReadonlyText: defineAsyncComponent(() => import('./readonly-text.vue')),
    SigningInfoInput: defineAsyncComponent(
      () => import('./signing-info-input.vue'),
    ),
    ServiceItemInput: defineAsyncComponent(
      () => import('./service-item-input.vue'),
    ),
    BillCountsInput: defineAsyncComponent(
      () => import('./bill-counts-input.vue'),
    ),
    FrtPrepareInput: defineAsyncComponent(
      () => import('./frt-prepare-input.vue'),
    ),
    ServiceTradeTermsInput: defineAsyncComponent(
      () => import('./service-trade-terms-input.vue'),
    ),
    nameInput: defineAsyncComponent(() => import('./biz-input/name-input.vue')),
    shortNameInput: defineAsyncComponent(
      () => import('./biz-input/short-name-input.vue'),
    ),
  };

  // 将组件注册到全局共享状态中
  globalShareState.setComponents(components);

  // 定义全局共享状态中的消息提示
  globalShareState.defineMessage({
    // 复制成功消息提示
    copyPreferencesSuccess: (title, content) => {
      notification.success({
        description: content,
        message: title,
        placement: 'bottomRight',
      });
    },
  });
}

export { initComponentAdapter };

// 导出业务选择组件
export {
  ClientSelect,
  ClientBankAccountSelect,
  CodeSourceSelect,
  CurrencySelect,
  FeeCodeSelect,
  MyOrgSelect,
  MyCompanySelect,
  OrganizationSelect,
  OrgBankAccountSelect,
  OrgBankAccountLinkageSelect,
  RoleSelect,
  UserSelect,
  UserOrgSelect,
  UserCompanySelect,
} from './biz-select';
