<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  message,
  Space,
  Spin,
  Checkbox,
  CheckboxGroup,
  Select,
  Tag,
} from 'ant-design-vue';
import type { SystemUserAdminApi } from '#/api/system/user-admin';

import { useVbenForm } from '#/adapter/form';
import { getAreaAndParents } from '#/api/common/area';
import AddressModal from './address-modal.vue';
import { useVbenModal } from '@vben/common-ui';
import type { ClientAdminApi } from '#/api/sea-export/client-admin';
import { getUser, UserAttribute } from '#/api/system/user-admin';
import dayjs from 'dayjs';
import {
  ArrowLeft,
  FileText,
  IconifyIcon,
  MapPin,
  Package,
  Save,
  Ship,
  Users,
  Plus,
} from '@vben/icons';
import {
  addClient,
  editClient,
  getClientDetail,
} from '#/api/sea-export/client-admin';
import { $t } from '#/locales';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';
import {
  useBaseFormSchema,
  useBusinessFormSchema,
  useClientFormSchema,
  useSupplierFormSchema,
} from './data';
import * as ClientConstants from './data';
import UserSelect from '#/adapter/component/biz-select/user-select.vue';

const route = useRoute();
const router = useRouter();

const editId = computed<string | undefined>(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0];
  return id ? String(id) : undefined;
});

const isEdit = computed(() => !!editId.value);

type SectionKey = 'basic' | 'party' | 'shipment' | 'port' | 'cargo';
const sectionRefs = {
  basic: ref<HTMLElement | null>(null),
  shipment: ref<HTMLElement | null>(null),
  port: ref<HTMLElement | null>(null),
  cargo: ref<HTMLElement | null>(null),
  party: ref<HTMLElement | null>(null),
} as const;
const currentSection = ref<SectionKey>('basic');
const pageLoading = ref(false);
const submitting = ref(false);

const clientType = ref<number[]>([1]);
const clientTypeCoopStatus = ref<number>();
const customerType = ref<string[]>();
const supplierType = ref<string[]>();
const getOrderUserRoleLabel = (userAttribute?: number) => {
  switch (userAttribute) {
    case UserAttribute.Sales:
      return $t('seaExport.client.stakeholdersOptions.salesPerson');
    case UserAttribute.Operation:
      return $t('seaExport.client.stakeholdersOptions.operationPersonnel');
    case UserAttribute.CustomerService:
      return $t('seaExport.client.stakeholdersOptions.customerSupport');
    case UserAttribute.Documentation:
      return $t('seaExport.client.stakeholdersOptions.documentClerk');
    default:
      return '-';
  }
};
const defaultOrderUsers = ref<ClientAdminApi.ClientStakeholderListDto[]>([
  { userAttribute: UserAttribute.Sales, stakeholderList: [] },
  { userAttribute: UserAttribute.Operation, stakeholderList: [] },
  { userAttribute: UserAttribute.CustomerService, stakeholderList: [] },
  { userAttribute: UserAttribute.Documentation, stakeholderList: [] },
]);

const [BaseForm, baseFormApi] = useVbenForm({
  layout: 'vertical',
  schema: useBaseFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-4',
});

const [BusinessForm, businessFormApi] = useVbenForm({
  layout: 'vertical',
  schema: useBusinessFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-2',
});

const [ClientForm, clientFormApi] = useVbenForm({
  layout: 'vertical',
  schema: useClientFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-2',
});

const [SupplierForm, supplierFormApi] = useVbenForm({
  layout: 'vertical',
  schema: useSupplierFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-2',
});

const [Modal, modalApi] = useVbenModal({
  // 连接抽离的组件
  connectedComponent: AddressModal,
});

/** DatePicker 需要的 dayjs 对象，API 返回的是字符串 */
const toDayjs = (val: string | null | undefined) =>
  val && dayjs(val).isValid() ? dayjs(val) : undefined;
/** 提交时 dayjs/日期 转回 ISO 字符串 */
const toDateString = (val: unknown) => {
  if (val == null) return undefined;
  const d = dayjs(val as string | Date);
  return d.isValid() ? d.toISOString() : undefined;
};
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
const mapDetailToFormValues = async (detail: ClientAdminApi.ClientDto) => {
  // areaId: 后端只存最后一级 code，通过接口转为 [省code, 市code, 区code] 给 AreaCascader
  const areaIdPath = await buildAreaPath(detail.areaId);

  // 处理行业类别：将字符串转换为数组
  let industryCategoriesArray = detail.industryCategories
    ? detail.industryCategories
        .split('')
        .map((v) => v.trim())
        .filter(Boolean)
    : [];
  industryCategoriesArray = industryCategoriesArray.filter(
    (item, index) => industryCategoriesArray.indexOf(item) === index,
  );
  console.log('industryCategoriesArray', industryCategoriesArray);
  // 区分客户和供应商的行业类别
  const isCustomer = detail.isClient;
  const isSupplier = detail.isSupplier;

  // 设置客户类型
  clientType.value = [];
  if (isCustomer) clientType.value.push(1);
  if (isSupplier) clientType.value.push(2);

  // 设置合作状态
  clientTypeCoopStatus.value = isCustomer
    ? detail.clientCoopStatus
    : detail.supplierCoopStatus;

  // 设置行业类别
  if (isCustomer) {
    customerType.value = industryCategoriesArray;
  }
  if (isSupplier) {
    supplierType.value = industryCategoriesArray;
  }

  // 初始化干系人列表
  defaultOrderUsers.value.forEach((orderUser) => {
    switch (orderUser.userAttribute) {
      case UserAttribute.Sales:
        orderUser.userIds = detail.sales?.map((s) => s.userId) || [];
        orderUser.stakeholderList = detail.sales;
        break;
      case UserAttribute.Operation:
        orderUser.userIds = detail.operations?.map((s) => s.userId) || [];
        orderUser.stakeholderList = detail.operations;
        break;
      case UserAttribute.CustomerService:
        orderUser.userIds = detail.customerServices?.map((s) => s.userId) || [];
        orderUser.stakeholderList = detail.customerServices;
        break;
      case UserAttribute.Documentation:
        orderUser.userIds = detail.documentations?.map((s) => s.userId) || [];
        orderUser.stakeholderList = detail.documentations;
        break;
    }
  });

  // 初始化地址列表
  addressList.value = (detail.addresses || []).map((addr) => ({
    id: addr.id,
    name: addr.name || '',
    isDefault: addr.isDefault,
    address: addr.address || '',
    contactPerson: addr.contactPerson || '',
    mobile: addr.mobile || '',
    tel: addr.tel || '',
    remark: addr.remark || '',
  }));

  return {
    // 基础信息表单
    name: detail.name,
    fullName: detail.fullName,
    code: detail.code,
    enName: detail.enName,
    taxNo: detail.taxNo,
    phone: detail.phone,
    email: detail.email,
    url: detail.url,
    remark: detail.remark,
    country: detail.countryId,
    areaId: areaIdPath,
    address: detail.address,
    enAddress: detail.enAddress,
    mainProduct: detail.mainProduct,
    enable: detail.enable,

    // 业务信息表单
    legalPerson: detail.legalPerson,
    registeredCapital: detail.registeredCapital,
    establishmentDate: toDayjs(detail.establishmentDate),
    businessTerm: detail.businessTerm,

    // 客户信息表单
    clientType: detail.clientType,
    clientLevel: detail.clientLevel,
    source: detail.source,
    cargoType: detail.cargoType,
    clientCoopSince: toDayjs(detail.clientCoopSince),
    clientLastTxnTime: toDayjs(detail.clientLastTxnTime),

    // 供应商信息表单
    supplierLevel: detail.supplierLevel,
    yearTeu: detail.yearTeu?.toString(),
    yearTicketCount: detail.yearTicketCount?.toString(),
    laneIds: detail.clientLaneCodes?.map((lane) => lane.id),
    supplierCurrencyId: detail.supplierCurrencyId,
    supplierCoopSince: detail.supplierCoopSince,
    supplierLastTxnTime: detail.supplierLastTxnTime,
  };
};

/** 加载编辑数据 */
const loadEditData = async () => {
  if (!editId.value) return;

  pageLoading.value = true;
  try {
    const detail = await getClientDetail(editId.value);
    const formValues = await mapDetailToFormValues(detail);

    // 设置各个表单的值
    await baseFormApi.setValues(formValues);
    await businessFormApi.setValues(formValues);

    // 根据客户类型设置对应的表单
    if (clientType.value.includes(1)) {
      await clientFormApi.setValues(formValues);
    }
    if (clientType.value.includes(2)) {
      await supplierFormApi.setValues(formValues);
    }

    // 触发响应式更新
    await nextTick();
  } catch (error) {
    console.error('加载编辑数据失败:', error);
    //message.error($t('common.loadFailed'));
  } finally {
    pageLoading.value = false;
  }
};

const updateStakeholders = (
  userAttribute: number | undefined,
  values: number[],
) => {
  defaultOrderUsers.value.forEach((orderUser) => {
    if (orderUser.userAttribute === userAttribute) orderUser.userIds = values;
  });
};

/** 提交表单 */
const handleSubmit = async () => {
  try {
    submitting.value = true;

    // 验证所有表单
    const [baseValid, businessValid, clientValid, supplierValid] =
      await Promise.all([
        baseFormApi.validate(),
        businessFormApi.validate(),
        clientType.value.includes(1)
          ? clientFormApi.validate()
          : Promise.resolve(),
        clientType.value.includes(2)
          ? supplierFormApi.validate()
          : Promise.resolve(),
      ]);

    if (!baseValid || !businessValid) {
      message.warning($t('ui.formRules.pleaseCompleteRequiredFields'));
      return;
    }

    // 获取所有表单的值
    const baseValues = await baseFormApi.getValues();
    const businessValues = await businessFormApi.getValues();
    const clientValues = clientType.value.includes(1)
      ? await clientFormApi.getValues()
      : {};
    const supplierValues = clientType.value.includes(2)
      ? await supplierFormApi.getValues()
      : {};

    // 处理行业类别：将数组转换为字符串
    const industryCategories = [
      ...new Set([
        ...(customerType.value || []),
        ...(supplierType.value || []),
      ]),
    ].join('');

    // 构建干系人列表
    const sales = defaultOrderUsers.value
      .find((item) => item.userAttribute === UserAttribute.Sales)
      ?.userIds?.map((item) => ({
        userId: item,
        isDefault: false,
        userAttribute: UserAttribute.Sales,
        clientId: editId.value,
      }));

    console.log('sales', sales);
    const customerServices = defaultOrderUsers.value
      .find((item) => item.userAttribute === UserAttribute.CustomerService)
      ?.userIds?.map((item) => ({
        userId: item,
        isDefault: false,
        userAttribute: UserAttribute.CustomerService,
        clientId: editId.value,
      }));
    const operations = defaultOrderUsers.value
      .find((item) => item.userAttribute === UserAttribute.Operation)
      ?.userIds?.map((item) => ({
        userId: item,
        isDefault: false,
        userAttribute: UserAttribute.Operation,
        clientId: editId.value,
      }));
    const documentations = defaultOrderUsers.value
      .find((item) => item.userAttribute === UserAttribute.Documentation)
      ?.userIds?.map((item) => ({
        userId: item,
        isDefault: false,
        userAttribute: UserAttribute.Documentation,
        clientId: editId.value,
      }));

    // 构建地址列表
    const addresses = addressList.value.map((item) => ({
      id: item.id,
      name: item.name,
      isDefault: item.isDefault ? true : false,
      address: item.address,
      contactPerson: item.contactPerson,
      mobile: item.mobile,
      tel: item.tel,
      remark: item.remark,
    }));

    // 处理 areaId：取路径数组的最后一个（最后一级）
    const areaIdPath = Array.isArray(baseValues.areaId)
      ? baseValues.areaId
      : [];
    const areaId =
      areaIdPath.length > 0 ? areaIdPath[areaIdPath.length - 1] : undefined;

    // 构建提交数据
    const submitData:
      | ClientAdminApi.ClientAddDto
      | ClientAdminApi.ClientEditDto = {
      // 基本信息
      name: baseValues.name,
      code: baseValues.code,
      phone: baseValues.phone,
      fullName: baseValues.fullName,
      enName: baseValues.enName,
      countryId: baseValues.country,
      areaId,
      address: baseValues.address,
      enAddress: baseValues.enAddress,
      mainProduct: baseValues.mainProduct,
      enable: baseValues.enable ?? true,
      clientType: clientType.value.includes(1) ? 0 : 2, // 0-直客/同行，2-供应商
      industryCategories,
      remark: baseValues.remark,
      enFullName: baseValues.enFullName,
      taxNo: baseValues.taxNo,
      email: baseValues.email,
      url: baseValues.url,

      // 业务信息
      legalPerson: businessValues.legalPerson,
      registeredCapital: businessValues.registeredCapital,
      establishmentDate: businessValues.establishmentDate,
      businessTerm: businessValues.businessTerm,

      // 客户相关信息
      isClient: clientType.value.includes(1),
      clientCoopStatus: clientType.value.includes(1)
        ? clientTypeCoopStatus.value
        : undefined,
      clientLevel: clientValues.clientLevel,
      source: clientValues.source,
      cargoType: clientValues.cargoType,
      clientCurrencyId: clientValues.clientCurrencyId,
      clientCoopSince: clientValues.clientCoopSince,
      clientLastTxnTime: clientValues.clientLastTxnTime,

      // 供应商相关信息
      isSupplier: clientType.value.includes(2),
      supplierCoopStatus: clientType.value.includes(2)
        ? clientTypeCoopStatus.value
        : undefined,
      supplierLevel: supplierValues.supplierLevel,
      supplierCurrencyId: supplierValues.supplierCurrencyId,
      laneIds: supplierValues.laneIds,
      supplierCoopSince: supplierValues.supplierCoopSince,
      supplierLastTxnTime: supplierValues.supplierLastTxnTime,

      // 附件 todo、干系人、地址
      //stakeholders,

      sales,
      customerServices,
      operations,
      documentations,

      addresses,
    };

    let result: boolean | string;
    if (isEdit.value && editId.value) {
      // 编辑模式
      const editData: ClientAdminApi.ClientEditDto = {
        ...submitData,
        id: editId.value,
      } as ClientAdminApi.ClientEditDto;
      result = await editClient(editData);
    } else {
      // 新增模式
      result = await addClient(submitData as ClientAdminApi.ClientAddDto);
    }

    if (result) {
      message.success($t('ui.actionMessage.operationSuccess'));
      //router.push('/clients');
    } else {
      message.success($t('ui.actionMessage.operationFailed'));
    }
  } catch (error: any) {
    console.error('提交失败:', error);
    message.success($t('ui.actionMessage.operationFailed'));
  } finally {
    submitting.value = false;
  }
};

// ... existing code ...

/** 取消返回 */
const handleCancel = () => {
  router.push('/clients');
};

const addAddress = () => {
  modalApi.open();
};
const editAddress = (data: ClientAdminApi.ClientAddressEditDto) => {
  modalApi.setData(data).open();
};
const addressList = ref<ClientAdminApi.ClientAddressEditDto[]>([]);
// addressList.value.push({
//   name: '测试1',
//   address: '测试1地址',
//   contactPerson: '测试1联系人',
//   mobile: '12345678901',
//   remark: '测试1备注',
//   isDefault: true,
// });
const addAddressData = (data: ClientAdminApi.ClientAddressAddDto) => {
  if (data.isDefault) {
    addressList.value.forEach((item) => {
      item.isDefault = false;
    });
  }
  addressList.value.push(data);
};
const editAddressData = (data: ClientAdminApi.ClientAddressEditDto) => {
  if (data.isDefault) {
    addressList.value.forEach((item) => {
      item.isDefault = false;
    });
  }
  addressList.value = addressList.value.map((item) => {
    if (item.id === data.id) {
      return data;
    }
    return item;
  });

  console.log('edit-addressList.value', addressList.value);
};

const delAddress = (index: number) => {
  addressList.value = addressList.value.filter((_, i) => i !== index);
};
onMounted(() => {
  loadEditData();
});
</script>

<template>
  <div class="main-layout mb-2">
    <div class="center-column ml-2">
      <div class="content-column">
        <section :ref="sectionRefs.basic" class="content-section">
          <div class="content-section__actions">
            <Space>
              <Button @click="handleCancel">
                {{ $t('common.back') }}
              </Button>
              <Button
                type="primary"
                :loading="submitting"
                class="flex items-center justify-center"
                @click="handleSubmit"
              >
                <Save class="mr-1 inline-block size-4 align-middle" />
                <span class="align-middle">{{ $t('common.save') }}</span>
              </Button>
            </Space>
          </div>
          <div class="content-section__header">
            <span class="card-title">
              <FileText class="size-4" />
              {{ $t('seaExport.export.formCardBasicInfo') }}
            </span>
          </div>
          <div class="content-section__body">
            <div class="mb-2">
              <div class="my-2 rounded-lg bg-gray-100 py-1 shadow">
                <span class="mx-3 font-extrabold">{{
                  $t('seaExport.client.smallTitle.type')
                }}</span>
                <CheckboxGroup name="CheckboxGroup" v-model:value="clientType">
                  <Checkbox :value="1" class="lineheight-32">
                    {{ $t('seaExport.client.clientTypeOptions.customer') }}
                  </Checkbox>
                  <Select
                    v-model:value="clientTypeCoopStatus"
                    v-if="clientType.includes(1)"
                    :options="ClientConstants.getCustomerCoopStatusOptions()"
                    allowClear
                    class="mr-4 min-w-[100px]"
                    :placeholder="$t('ui.placeholder.select')"
                  />
                  <Checkbox :value="2" class="lineheight-32">
                    {{ $t('seaExport.client.clientTypeOptions.supplier') }}
                  </Checkbox>
                  <Select
                    v-model:value="clientTypeCoopStatus"
                    v-if="clientType.includes(2)"
                    :options="ClientConstants.getSupplierCoopStatusOptions()"
                    allowClear
                    class="min-w-[100px]"
                    :placeholder="$t('ui.placeholder.select')"
                  />
                </CheckboxGroup>
              </div>
              <div
                class="my-2 rounded-lg bg-gray-50 py-2 shadow"
                v-if="clientType.includes(1)"
              >
                <span class="mx-3 font-extrabold">{{
                  $t('seaExport.client.smallTitle.customerType')
                }}</span>
                <CheckboxGroup
                  name="CheckboxGroup"
                  v-model:value="customerType"
                  :options="
                    ClientConstants.getCustomerIndustryCategoryOptions()
                  "
                />
              </div>
              <div
                class="mb-4 mt-2 rounded-lg bg-gray-50 py-2 shadow"
                v-if="clientType.includes(2)"
              >
                <span class="mx-3 font-extrabold">{{
                  $t('seaExport.client.smallTitle.supplierType')
                }}</span>
                <CheckboxGroup
                  name="CheckboxGroup"
                  v-model:value="supplierType"
                  :options="
                    ClientConstants.getSupplierIndustryCategoryOptions()
                  "
                />
              </div>
            </div>
            <BaseForm class="mx-4" />
          </div>
        </section>
      </div>
      <div class="flex gap-3">
        <div class="content-column">
          <section class="content-section">
            <div class="content-section__header">
              <span class="card-title">
                <IconifyIcon
                  icon="material-symbols:business-messages-sharp"
                  class="size-4"
                ></IconifyIcon>
                {{ $t('seaExport.client.smallTitle.Business') }}
              </span>
            </div>
            <div class="content-section__body">
              <BusinessForm class="mx-4" />
            </div>
          </section>
        </div>
        <div class="content-column" v-if="clientType.includes(1)">
          <section class="content-section">
            <div class="content-section__header">
              <span class="card-title">
                <IconifyIcon
                  icon="streamline-ultimate-color:information-desk-customer"
                  class="size-4"
                ></IconifyIcon>
                {{ $t('seaExport.client.smallTitle.info') }}
              </span>
            </div>
            <div class="content-section__body">
              <ClientForm class="mx-4" />
            </div>
          </section>
        </div>
        <div class="content-column" v-if="clientType.includes(2)">
          <section class="content-section">
            <div class="content-section__header">
              <span class="card-title">
                <IconifyIcon icon="mdi:factory" class="size-4"></IconifyIcon>
                {{ $t('seaExport.client.smallTitle.supplier') }}
              </span>
            </div>
            <div class="content-section__body">
              <SupplierForm class="mx-4" />
            </div>
          </section>
        </div>
      </div>
      <div class="content-column">
        <section class="content-section">
          <div class="content-section__header flex justify-between">
            <div>
              <span class="card-title">
                <IconifyIcon
                  icon="entypo:location-pin"
                  class="size-4"
                ></IconifyIcon>
                {{ $t('seaExport.client.smallTitle.address') }}
              </span>
            </div>
            <div class="">
              <Button
                type="primary"
                :loading="submitting"
                class="flex items-center justify-center"
                @click="addAddress"
                size="small"
              >
                <Plus class="mr-1 inline-block size-4 align-middle" />
                <span class="align-middle">{{
                  $t('seaExport.client.addAddress')
                }}</span>
              </Button>
            </div>
          </div>
          <div class="content-section__body flex space-x-2">
            <div
              v-for="(item, index) in addressList"
              class="address-card mt-2 w-[450px] cursor-pointer rounded-md border-gray-200 p-2 shadow-md transition-all"
              :class="{ 'address-card-default': item.isDefault }"
            >
              <div class="address-heard flex justify-between py-2">
                <div class="flex font-semibold">
                  <span class="mr-2">{{ item.name }}</span>
                  <tag color="blue" v-if="item.isDefault">{{
                    ClientConstants.getDefaultOptions().find(
                      (o) => o.value === item.isDefault,
                    )?.label
                  }}</tag>
                </div>
                <div>
                  <Button type="text" @click="editAddress(item)" size="small">
                    <span class="align-middle">{{ $t('common.edit') }}</span>
                  </Button>
                  <Button type="text" @click="delAddress(index)" size="small">
                    <span class="align-middle">{{ $t('common.delete') }}</span>
                  </Button>
                </div>
              </div>
              <div class="address-content flex flex-col">
                <div class="address-item flex space-x-2 py-1">
                  <span class="pt-1">
                    <IconifyIcon
                      icon="mdi:location"
                      width="1.2em"
                      height="1.2em"
                      style="color: #109ae8"
                    />
                  </span>
                  <span class="text-normal">{{ item.address }}</span>
                </div>
                <div class="flex space-x-2">
                  <span class="pt-1">
                    <IconifyIcon icon="mdi:user" style="color: #ced3dd" />
                  </span>
                  <span class="text-sm text-gray-500">
                    {{ item.contactPerson }}
                  </span>
                  <span class="pt-1">
                    <IconifyIcon icon="mdi:telephone" style="color: #ced3dd" />
                  </span>
                  <span class="text-sm text-gray-500">{{ item.mobile }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <Card class="right-column mr-2 w-[260px] rounded-md shadow-md">
      <template #title>
        <span class="card-title">
          <IconifyIcon
            icon="gridicons:multiple-users"
            class="size-4"
          ></IconifyIcon>
          {{ $t('seaExport.client.stakeholders') }}
        </span>
      </template>
      <div
        v-for="(item, index) in defaultOrderUsers"
        :key="item.userAttribute"
        class="stakeholders-content w-full space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-3 shadow"
      >
        <div class="font-semibold">
          {{ getOrderUserRoleLabel(item.userAttribute) }}
        </div>
        <div>
          <UserSelect
            :mode="'multiple'"
            :model-value="item.userIds"
            labelKey="nickName"
            :selected-items="
              item?.stakeholderList
                ? item.stakeholderList.map((s) => {
                    return {
                      id: s.id,
                      nickName: s.userNickName,
                    } as SystemUserAdminApi.UserListDto;
                  })
                : []
            "
            :user-attribute="item.userAttribute"
            @update:model-value="
              (v) => updateStakeholders(item.userAttribute, v)
            "
          >
          </UserSelect>
        </div>
      </div>
    </Card>
  </div>

  <Modal @add="addAddressData" @edit="editAddressData" />
</template>

<style scoped lang="scss">
.right-column {
  :deep(.ant-card-body) {
    padding: 10px !important;
  }
}

.text-sm {
  font-size: 12px;
}

.border-b-grey {
  border-bottom: 1px solid #e8e8e8;
}

.main-layout {
  display: flex;
  gap: 14px;
  //padding: 12px;
}

.lineheight-32 {
  line-height: 32px;
}

.center-column {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.content-column {
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
}

.content-section {
  padding: 0;
}

.content-section__header {
  padding: 12px 18px 8px;
  padding-bottom: 5px;
  margin-bottom: 5px;
  border-bottom: 1px solid #e8e8e8;
}

.content-section__body {
  padding: 0 18px 14px;
}

.content-section__actions {
  display: flex;
  justify-content: flex-end;
  padding: 10px 18px;
  border-bottom: 1px solid #edf2f7;
}

.card-title {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: #1677ff;
}

.card-body {
  padding: 0 4px;
}

.address-card {
  border: #1677ff00 1px solid;

  &:hover {
    background: linear-gradient(to right, #1677ff18, #fff);
    border: #0668f1 1px solid;
  }

  .address-heard {
    border-bottom: 1px solid #edf2f7;
  }
}

.address-card-default {
  background: linear-gradient(to right, #1677ff18, #fff);
}
</style>
