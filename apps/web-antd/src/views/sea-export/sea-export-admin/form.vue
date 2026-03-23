<script lang="ts" setup>
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import dayjs from 'dayjs';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  ArrowLeft,
  FileText,
  MapPin,
  Package,
  Save,
  Ship,
  Users,
} from '@vben/icons';

import { Button, Card, message, Space, Spin } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  addSeaExport,
  editSeaExport,
  getSeaExportDetail,
} from '#/api/sea-export/sea-export-admin';
import { UserAttribute } from '#/api/system/user-admin';
import { $t } from '#/locales';

import OrderCtnTable from './modules/order-ctn-table.vue';
import {
  useBasicInfoFormSchema,
  useCargoFormSchema,
  usePartyInfoFormSchema,
  usePortFormSchema,
  useShipmentFormSchema,
} from './data';

const route = useRoute();
const router = useRouter();

const editId = computed(() => {
  const id = route.params.id;
  return id ? Number(id) : undefined;
});

const isEdit = computed(() => !!editId.value);

const pageTitle = computed(() => {
  return isEdit.value
    ? $t('ui.actionTitle.edit', [$t('seaExport.export.name')])
    : $t('ui.actionTitle.create', [$t('seaExport.export.name')]);
});

const pageLoading = ref(false);
const submitting = ref(false);
const transportOrderId = ref<number | undefined>();
const defaultOrderUsers: SeaExportAdminApi.OrderUserAddDto[] = [
  { userAttribute: UserAttribute.Business, sortId: 4 },
  { userAttribute: UserAttribute.Operation, sortId: 3 },
  { userAttribute: UserAttribute.CustomerService, sortId: 2 },
  { userAttribute: UserAttribute.Documentation, sortId: 1 },
];

/** 左侧表单：相关方信息（发货人、收货人、通知人等） */
const [PartyInfoForm, partyInfoFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  schema: usePartyInfoFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'flex flex-col',
});

/** 右侧表单：基础信息 */
const [BasicInfoForm, basicInfoFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  schema: useBasicInfoFormSchema(isEdit.value),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-6 gap-x-4',
});

/** 右侧表单：船期信息 */
const [ShipmentForm, shipmentFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  schema: useShipmentFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-6 gap-x-4',
});

/** 右侧表单：港口信息 */
const [PortForm, portFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  schema: usePortFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-3 gap-x-4',
});

/** 右侧表单：箱型与货物（箱型由 OrderCtnTable 渲染 + 货物信息） */
const [CtnCargoForm, ctnCargoFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  schema: useCargoFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-6 gap-x-4',
});

/** 箱型箱量数据（由 OrderCtnTable 管理） */
const orderCtns = ref<SeaExportAdminApi.OrderCtnAddDto[]>([]);

/** DatePicker 需要的 dayjs 对象，API 返回的是字符串 */
const toDayjs = (val: string | null | undefined) =>
  val && dayjs(val).isValid() ? dayjs(val) : undefined;

/** 提交时 dayjs/日期 转回 ISO 字符串 */
const toDateString = (val: unknown) => {
  if (val == null) return undefined;
  const d = dayjs(val as string | Date);
  return d.isValid() ? d.toISOString() : undefined;
};

const flattenDetail = (
  detail: SeaExportAdminApi.SeaExportDto,
): Record<string, any> => {
  const to = detail.transportOrder;
  return {
    countryName: (detail as any).countryName,
    laneName: (detail as any).laneName,
    blType: detail.blType,
    billType: detail.billType,
    issueType: detail.issueType,
    vessel: detail.vessel,
    innerVoyno: detail.innerVoyno,
    carrierId: detail.carrierId,
    secondNotifierId: detail.secondNotifierId,
    secondNotifierContent: detail.secondNotifierContent,
    podAgentId: detail.podAgentId,
    podAgentContent: detail.podAgentContent,
    bookingAgentId: detail.bookingAgentId,
    shipAgentId: detail.shipAgentId,
    yardId: detail.yardId,
    noBillEnum: detail.noBillEnum,
    copyNoBillEnum: detail.copyNoBillEnum,
    goodsCompleteTime: toDayjs(detail.goodsCompleteTime),
    etd: toDayjs(detail.etd),
    eta: toDayjs(detail.eta),
    closingTime: toDayjs(detail.closingTime),
    closeVgmTime: toDayjs(detail.closeVgmTime),
    closeDocTime: toDayjs(detail.closeDocTime),
    closeManifestTime: toDayjs(detail.closeManifestTime),
    signingTime: toDayjs(detail.signingTime),
    sortId: detail.sortId,
    remark: detail.remark,
    commissionNum: to?.commissionNum,
    mblNum: to?.mblNum,
    bookingNum: to?.bookingNum,
    accountDate: toDayjs(to?.accountDate),
    settlementDate: toDayjs(to?.settlementDate),
    codeSourceId: to?.codeSourceId,
    isBusinessLocking: to?.isBusinessLocking,
    isFeeLocking: to?.isFeeLocking,
    codeFrtId: to?.codeFrtId,
    codeServiceId: to?.codeServiceId,
    tradeTermsType: to?.tradeTermsType,
    polId: detail.polId,
    polRemark: detail.polRemark,
    podId: detail.podId,
    podRemark: detail.podRemark,
    poT1Id: detail.poT1Id,
    poT1Remark: detail.poT1Remark,
    poT2Id: detail.poT2Id,
    poT2Remark: detail.poT2Remark,
    receivePortId: detail.receivePortId,
    receivePortRemark: detail.receivePortRemark,
    deliverPortId: detail.deliverPortId,
    deliverPortRemark: detail.deliverPortRemark,
    signingPortId: detail.signingPortId,
    clientId: to?.clientId,
    teamId: to?.teamId,
    custBrokerId: to?.custBrokerId,
    warehouseId: to?.warehouseId,
    insuranceId: to?.insuranceId,
    consigneeId: to?.consigneeId,
    consigneeContent: to?.consigneeContent,
    shipperId: to?.shipperId,
    shipperContent: to?.shipperContent,
    notifierId: to?.notifierId,
    notifierContent: to?.notifierContent,
    marks: to?.marks,
    noPkgs: to?.noPkgs,
    goodsDes: to?.goodsDes,
    kgs: to?.kgs,
    cbm: to?.cbm,
    internalRemark: to?.internalRemark,
    orderCodeGoodss: to?.orderCodeGoodss ?? [],
    orderUsers: to?.orderUsers ?? [],
  };
};

/** 为 orderCtns 每项添加 _rowKey，供 Table 使用 */
const normalizeOrderCtnsWithRowKey = (
  items: SeaExportAdminApi.OrderCtnAddDto[] | undefined,
) => {
  if (!items?.length) return [];
  return items.map((item, i) => ({
    ...item,
    _rowKey: `ctn_${i}_${Date.now()}`,
  })) as any[];
};

const ORDER_CTN_API_KEYS: Array<
  Extract<keyof SeaExportAdminApi.OrderCtnAddDto, string>
> = [
  'ctnCodeId',
  'ctnNo',
  'sealNo',
  'pkgs',
  'codePackageId',
  'grossWeight',
  'tareWeight',
  'overLength',
  'overWidth',
  'overHeight',
  'volume',
  'codeGoodsId',
  'bookingNo',
  'remark',
];

const ORDER_USER_API_KEYS: Array<
  Extract<keyof SeaExportAdminApi.OrderUserAddDto, string>
> = ['userId', 'userAttribute', 'sortId', 'remark'];

/** 提交时移除 _rowKey 等非 API 字段，仅保留 OrderCtnAddDto 字段 */
const sanitizeOrderCtns = (
  items: any[] | undefined,
): SeaExportAdminApi.OrderCtnAddDto[] => {
  if (!items?.length) return [];
  return items.map((item) => {
    const dto: Record<string, any> = {};
    for (const key of ORDER_CTN_API_KEYS) {
      const val = item[key];
      if (val !== undefined && val !== null) {
        if (typeof val === 'string' && val === '') continue;
        dto[key] = val;
      }
    }
    return dto as SeaExportAdminApi.OrderCtnAddDto;
  });
};

/** 提交时移除 userName 等非 API 字段，仅保留 OrderUserAddDto 字段 */
const sanitizeOrderUsers = (
  items: any[] | undefined,
): SeaExportAdminApi.OrderUserAddDto[] => {
  if (!items?.length) return [];
  return items
    .map((item) => {
      const dto: Record<string, any> = {};
      for (const key of ORDER_USER_API_KEYS) {
        const val = item[key];
        if (val !== undefined && val !== null) {
          if (typeof val === 'string' && val === '') continue;
          dto[key] = val;
        }
      }
      return dto as SeaExportAdminApi.OrderUserAddDto;
    })
    .filter((item) => item.userAttribute != null || item.userId != null);
};

/**
 * 从 id + name 构建 select 组件的 selectedItems，
 * 避免每个 select 组件单独调详情接口回显。
 * @param labelKey 对应 select 组件的 labelKey，如 ClientSelect 用 'name'，CarrierSelect/PortSelect 用 'cnName'
 */
const toSelectedItems = (id: any, name: any, labelKey = 'name') => {
  if (id == null) return [];
  return [{ id, [labelKey]: name || '' }] as any[];
};

const loadEditData = async () => {
  if (!editId.value) return;

  pageLoading.value = true;
  try {
    const detail = await getSeaExportDetail(editId.value);
    transportOrderId.value = detail.transportOrder?.id;
    const formValues = flattenDetail(detail);
    const to = detail.transportOrder;

    partyInfoFormApi.updateSchema([
      {
        fieldName: 'shipperId',
        componentProps: {
          selectedItems: toSelectedItems(
            to?.shipperId,
            (to as any)?.shipperName,
          ),
        },
      },
      {
        fieldName: 'consigneeId',
        componentProps: {
          selectedItems: toSelectedItems(
            to?.consigneeId,
            (to as any)?.consigneeName,
          ),
        },
      },
      {
        fieldName: 'notifierId',
        componentProps: {
          selectedItems: toSelectedItems(
            to?.notifierId,
            (to as any)?.notifierName,
          ),
        },
      },
      {
        fieldName: 'secondNotifierId',
        componentProps: {
          selectedItems: toSelectedItems(
            detail.secondNotifierId,
            detail.secondNotifierName,
          ),
        },
      },
      {
        fieldName: 'podAgentId',
        componentProps: {
          selectedItems: toSelectedItems(
            detail.podAgentId,
            detail.podAgentName,
          ),
        },
      },
    ]);

    basicInfoFormApi.updateSchema([
      {
        fieldName: 'codeSourceId',
        componentProps: {
          selectedItems: toSelectedItems(
            to?.codeSourceId,
            (to as any)?.codeSourceName,
            'cnName',
          ),
        },
      },
      {
        fieldName: 'codeFrtId',
        componentProps: {
          selectedItems: toSelectedItems(
            to?.codeFrtId,
            (to as any)?.codeFrtName,
            'cnName',
          ),
        },
      },
      {
        fieldName: 'codeServiceId',
        componentProps: {
          selectedItems: toSelectedItems(
            to?.codeServiceId,
            (to as any)?.codeServiceName,
            'cnName',
          ),
        },
      },
      {
        fieldName: 'issueType',
        componentProps: {
          selectedItems: toSelectedItems(
            detail.issueType,
            (detail as any)?.issueTypeName,
            'billType',
          ),
        },
      },
      {
        fieldName: 'clientId',
        componentProps: {
          selectedItems: toSelectedItems(to?.clientId, (to as any)?.clientName),
        },
      },
      {
        fieldName: 'teamId',
        componentProps: {
          selectedItems: toSelectedItems(to?.teamId, (to as any)?.teamName),
        },
      },
      {
        fieldName: 'custBrokerId',
        componentProps: {
          selectedItems: toSelectedItems(
            to?.custBrokerId,
            (to as any)?.custBrokerName,
          ),
        },
      },
      {
        fieldName: 'warehouseId',
        componentProps: {
          selectedItems: toSelectedItems(
            to?.warehouseId,
            (to as any)?.warehouseName,
          ),
        },
      },
      {
        fieldName: 'insuranceId',
        componentProps: {
          selectedItems: toSelectedItems(
            to?.insuranceId,
            (to as any)?.insuranceName,
          ),
        },
      },
    ]);

    shipmentFormApi.updateSchema([
      {
        fieldName: 'carrierId',
        componentProps: {
          selectedItems: toSelectedItems(
            detail.carrierId,
            detail.carrierName,
            'cnName',
          ),
        },
      },
      {
        fieldName: 'bookingAgentId',
        componentProps: {
          selectedItems: toSelectedItems(
            detail.bookingAgentId,
            detail.bookingAgentName,
          ),
        },
      },
      {
        fieldName: 'shipAgentId',
        componentProps: {
          selectedItems: toSelectedItems(
            detail.shipAgentId,
            detail.shipAgentName,
          ),
        },
      },
      {
        fieldName: 'yardId',
        componentProps: {
          selectedItems: toSelectedItems(detail.yardId, detail.yardName),
        },
      },
    ]);

    portFormApi.updateSchema([
      {
        fieldName: 'polId',
        componentProps: {
          selectedItems: toSelectedItems(
            formValues.polId,
            detail.polName,
            'cnName',
          ),
        },
      },
      {
        fieldName: 'podId',
        componentProps: {
          selectedItems: toSelectedItems(
            formValues.podId,
            detail.podName,
            'cnName',
          ),
        },
      },
      {
        fieldName: 'poT1Id',
        componentProps: {
          selectedItems: toSelectedItems(
            formValues.poT1Id,
            detail.poT1Name,
            'cnName',
          ),
        },
      },
      {
        fieldName: 'poT2Id',
        componentProps: {
          selectedItems: toSelectedItems(
            formValues.poT2Id,
            detail.poT2Name,
            'cnName',
          ),
        },
      },
      {
        fieldName: 'receivePortId',
        componentProps: {
          selectedItems: toSelectedItems(
            formValues.receivePortId,
            detail.receivePortName,
            'cnName',
          ),
        },
      },
      {
        fieldName: 'deliverPortId',
        componentProps: {
          selectedItems: toSelectedItems(
            formValues.deliverPortId,
            detail.deliverPortName,
            'cnName',
          ),
        },
      },
      {
        fieldName: 'signingPortId',
        componentProps: {
          selectedItems: toSelectedItems(
            formValues.signingPortId,
            detail.signingPortName,
            'cnName',
          ),
        },
      },
    ]);

    await Promise.all([
      partyInfoFormApi.setValues(formValues),
      basicInfoFormApi.setValues(formValues),
      shipmentFormApi.setValues(formValues),
      portFormApi.setValues(formValues),
      ctnCargoFormApi.setValues(formValues),
    ]);

    orderCtns.value = normalizeOrderCtnsWithRowKey(
      detail.transportOrder?.orderCtns as any,
    );
  } finally {
    pageLoading.value = false;
  }
};

const buildDto = (values: Record<string, any>) => {
  const seaExportFields: Record<string, any> = {
    blType: values.blType ?? undefined,
    billType: values.billType ?? undefined,
    issueType: values.issueType ?? undefined,
    vessel: values.vessel,
    innerVoyno: values.innerVoyno,
    carrierId: values.carrierId ?? undefined,
    secondNotifierId: values.secondNotifierId ?? undefined,
    secondNotifierContent: values.secondNotifierContent,
    podAgentId: values.podAgentId ?? undefined,
    podAgentContent: values.podAgentContent,
    bookingAgentId: values.bookingAgentId ?? undefined,
    shipAgentId: values.shipAgentId ?? undefined,
    yardId: values.yardId ?? undefined,
    noBillEnum: values.noBillEnum ?? undefined,
    copyNoBillEnum: values.copyNoBillEnum ?? undefined,
    goodsCompleteTime: toDateString(values.goodsCompleteTime),
    etd: toDateString(values.etd),
    eta: toDateString(values.eta),
    closingTime: toDateString(values.closingTime),
    closeVgmTime: toDateString(values.closeVgmTime),
    closeDocTime: toDateString(values.closeDocTime),
    closeManifestTime: toDateString(values.closeManifestTime),
    signingTime: toDateString(values.signingTime),
    signingPortId: values.signingPortId ?? undefined,
    podId: values.podId ?? undefined,
    podRemark: values.podRemark,
    polId: values.polId ?? undefined,
    polRemark: values.polRemark,
    poT1Id: values.poT1Id ?? undefined,
    poT1Remark: values.poT1Remark,
    poT2Id: values.poT2Id ?? undefined,
    poT2Remark: values.poT2Remark,
    receivePortId: values.receivePortId ?? undefined,
    receivePortRemark: values.receivePortRemark,
    deliverPortId: values.deliverPortId ?? undefined,
    deliverPortRemark: values.deliverPortRemark,
    sortId: values.sortId,
    remark: values.remark,
  };

  const transportOrderFields: Record<string, any> = {
    commissionNum: values.commissionNum,
    mblNum: values.mblNum,
    bookingNum: values.bookingNum,
    accountDate: toDateString(values.accountDate),
    settlementDate: toDateString(values.settlementDate),
    codeSourceId: values.codeSourceId ?? undefined,
    isBusinessLocking: values.isBusinessLocking ?? false,
    isFeeLocking: values.isFeeLocking ?? false,
    codeFrtId: values.codeFrtId ?? undefined,
    codeServiceId: values.codeServiceId ?? undefined,
    tradeTermsType: values.tradeTermsType ?? undefined,
    clientId: values.clientId,
    teamId: values.teamId ?? undefined,
    custBrokerId: values.custBrokerId ?? undefined,
    warehouseId: values.warehouseId ?? undefined,
    insuranceId: values.insuranceId ?? undefined,
    consigneeId: values.consigneeId ?? undefined,
    consigneeContent: values.consigneeContent,
    shipperId: values.shipperId ?? undefined,
    shipperContent: values.shipperContent,
    notifierId: values.notifierId ?? undefined,
    notifierContent: values.notifierContent,
    marks: values.marks,
    noPkgs: values.noPkgs,
    goodsDes: values.goodsDes,
    kgs: values.kgs,
    cbm: values.cbm,
    internalRemark: values.internalRemark,
    orderCodeGoodss: values.orderCodeGoodss ?? [],
    orderCtns: sanitizeOrderCtns(orderCtns.value),
    orderUsers: sanitizeOrderUsers(values.orderUsers),
  };

  if (isEdit.value && transportOrderId.value) {
    (transportOrderFields as any).id = transportOrderId.value;
  }

  return {
    ...seaExportFields,
    ...(isEdit.value && editId.value ? { id: editId.value } : {}),
    transportOrder: transportOrderFields,
  };
};

const handleSubmit = async () => {
  const [partyResult, basicResult, shipmentResult, portResult, ctnCargoResult] =
    await Promise.all([
      partyInfoFormApi.validate(),
      basicInfoFormApi.validate(),
      shipmentFormApi.validate(),
      portFormApi.validate(),
      ctnCargoFormApi.validate(),
    ]);
  const allValid =
    partyResult.valid &&
    basicResult.valid &&
    shipmentResult.valid &&
    portResult.valid &&
    ctnCargoResult.valid;
  if (!allValid) {
    message.warning($t('ui.formRules.pleaseCompleteRequiredFields'));
    return;
  }

  submitting.value = true;
  const [partyValues, basicValues, shipmentValues, portValues, ctnCargoValues] =
    await Promise.all([
      partyInfoFormApi.getValues(),
      basicInfoFormApi.getValues(),
      shipmentFormApi.getValues(),
      portFormApi.getValues(),
      ctnCargoFormApi.getValues(),
    ]);
  const values = {
    ...partyValues,
    ...basicValues,
    ...shipmentValues,
    ...portValues,
    ...ctnCargoValues,
  };
  const dto = buildDto(values);

  try {
    if (isEdit.value) {
      await editSeaExport(dto as SeaExportAdminApi.SeaExportEditDto);
    } else {
      await addSeaExport(dto as SeaExportAdminApi.SeaExportAddDto);
    }

    message.success($t('ui.actionMessage.operationSuccess'));
    router.push('/sea-exports');
  } finally {
    submitting.value = false;
  }
};

const handleCancel = () => {
  router.push('/sea-exports');
};

const handleBack = () => {
  router.push('/sea-exports');
};

onMounted(() => {
  if (!isEdit.value) {
    partyInfoFormApi.setValues({
      orderUsers: defaultOrderUsers,
    });
  }
  loadEditData();
});
</script>

<template>
  <Page auto-content-height>
    <template #extra>
      <Space>
        <Button @click="handleCancel">
          {{ $t('common.cancel') }}
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
    </template>
    <Spin :spinning="pageLoading">
      <div class="mr-4 flex items-stretch gap-6">
        <!-- 左侧：相关方信息，垂直方向撑满 -->
        <Card class="flex w-[280px] shrink-0 flex-col">
          <template #title>
            <span class="flex items-center gap-2">
              <Users class="size-4" />
              {{ $t('seaExport.export.formCardPartyInfo') }}
            </span>
          </template>
          <div class="flex-1 px-1">
            <PartyInfoForm />
          </div>
        </Card>

        <!-- 右侧：基础信息、船期信息、港口与货物 -->
        <div class="flex min-w-0 flex-1 flex-col gap-2">
          <Card>
            <template #title>
              <span class="flex items-center gap-2">
                <FileText class="size-4" />
                {{ $t('seaExport.export.formCardBasicInfo') }}
              </span>
            </template>
            <div class="px-1">
              <BasicInfoForm />
            </div>
          </Card>

          <Card>
            <template #title>
              <span class="flex items-center gap-2">
                <Ship class="size-4" />
                {{ $t('seaExport.export.formCardShipment') }}
              </span>
            </template>
            <div class="px-1">
              <ShipmentForm />
            </div>
          </Card>

          <Card>
            <template #title>
              <span class="flex items-center gap-2">
                <MapPin class="size-4" />
                {{ $t('seaExport.export.formCardPort') }}
              </span>
            </template>
            <div class="px-1">
              <PortForm />
            </div>
          </Card>

          <Card>
            <template #title>
              <span class="flex items-center gap-2">
                <Package class="size-4" />
                {{ $t('seaExport.export.formCardCtnCargo') }}
              </span>
            </template>
            <div class="px-1">
              <CtnCargoForm />
              <div class="mt-4">
                <OrderCtnTable v-model="orderCtns" />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Spin>
  </Page>
</template>
