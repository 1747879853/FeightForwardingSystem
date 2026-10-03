<script lang="ts" setup>
import type { RongETongApi } from '#/api/rong-e-tong/rong-e-tong-admin';

import dayjs from 'dayjs';
import { computed, onActivated, ref, watch } from 'vue';

import {
  Alert,
  Button,
  Card,
  Checkbox,
  CheckboxGroup,
  Descriptions,
  DescriptionsItem,
  Empty,
  Input,
  message,
  Modal,
  Radio,
  RadioGroup,
  Space,
  Spin,
  Table,
  Tag,
  Textarea,
} from 'ant-design-vue';

import CountrySelect from '#/adapter/component/biz-select/country-select.vue';
import {
  addSubManifestAsync,
  deleteManifestAsync,
  getManifestAsync,
  queryManifestShipAgentAsync,
  refreshManifestAsync,
  resendManifestAsync,
  saveManifestAsync,
  sendManifestAsync,
  updateManifestAsync,
  updateManifestConfigAsync,
} from '#/api/rong-e-tong/rong-e-tong-admin';
import { useKeepAliveRouteParamId } from '#/composables/use-keep-alive-route-param-id';

defineOptions({
  name: 'SeaExportManifest',
});

type PartyKey = 'consignee' | 'notifier' | 'shipper';

const PARTY_ROWS: { key: PartyKey; label: string }[] = [
  { key: 'shipper', label: '发货人' },
  { key: 'consignee', label: '收货人' },
  { key: 'notifier', label: '通知人' },
];

const PORT_TEXT: Record<number, string> = { 1: '上海', 2: '青岛' };

const STATUS_TEXT: Record<number, { color: string; text: string }> = {
  0: { color: 'default', text: '未发送' },
  1: { color: 'blue', text: '已发送' },
  2: { color: 'orange', text: '已删单' },
};

/** 分提单最近一次操作类型 */
const MSG_TYPE_TEXT: Record<number, string> = {
  1: '原始',
  2: '修改',
  3: '删除',
  4: '重发',
  5: '改配',
};

/** 分提单回执状态 */
const RES_STATE_TEXT: Record<number, { color: string; text: string }> = {
  0: { color: 'red', text: '发送失败' },
  1: { color: 'processing', text: '已发送' },
  2: { color: 'red', text: '回执错误' },
  3: { color: 'green', text: '回执成功' },
  4: { color: 'orange', text: '退单' },
  5: { color: 'orange', text: '船舶未备案' },
  6: { color: 'purple', text: '船代统一换船' },
};

const seaExportIdRef = useKeepAliveRouteParamId();
const seaExportId = computed(() => seaExportIdRef.value ?? '');

const loading = ref(false);
const acting = ref(false);
const data = ref<null | RongETongApi.ManifestDto>(null);

const emptyParty = (): RongETongApi.ManifestPartyInputDto => ({
  countryId: undefined,
  tel: '',
  actualPerson: '',
  actualTele: '',
  companyId: '',
  aeoCode: '',
});

const form = ref({
  isSoc: false,
  isDraftPlan: false,
  remark: '',
  parties: {
    shipper: emptyParty(),
    consignee: emptyParty(),
    notifier: emptyParty(),
  } as Record<PartyKey, RongETongApi.ManifestPartyInputDto>,
});
/** 收发通国家回显用的已选国家 */
const selectedCountries = ref<
  Record<PartyKey, RongETongApi.ManifestCountryDto[]>
>({
  shipper: [],
  consignee: [],
  notifier: [],
});
const formSnapshot = ref('');

const manifest = computed(() => data.value?.manifest ?? null);
const preview = computed(() => data.value?.preview ?? null);
const errors = computed(() => data.value?.errors ?? []);
/** 发送过的按发送时的口岸，没发过的按当前起运港 */
const port = computed(() => manifest.value?.port ?? data.value?.port ?? null);
const isShanghai = computed(() => port.value === 1);
const isQingdao = computed(() => port.value === 2);
const status = computed(() => manifest.value?.status ?? 0);
const isSent = computed(() => status.value === 1);
const isFormDirty = computed(
  () => JSON.stringify(form.value) !== formSnapshot.value,
);

const formatTime = (val?: null | string) =>
  val && dayjs(val).isValid() ? dayjs(val).format('YYYY-MM-DD HH:mm:ss') : '';

const displayText = (val?: null | number | string) =>
  val === null || val === undefined || val === '' ? '--' : String(val);

/** 分提单回执按分提单号对上待发送明细 */
const receiptMap = computed(() => {
  const map = new Map<string, RongETongApi.ManifestHouseDto>();
  for (const house of manifest.value?.houses ?? []) {
    if (house.blNum) map.set(house.blNum.toUpperCase(), house);
  }
  return map;
});

const getReceipt = (blNum?: null | string) =>
  blNum ? receiptMap.value.get(blNum.toUpperCase()) : undefined;

const fillForm = (detail: RongETongApi.ManifestDto) => {
  const record = detail.manifest;
  const toInput = (
    party?: null | RongETongApi.ManifestPartyDto,
  ): RongETongApi.ManifestPartyInputDto => ({
    countryId: party?.country?.id ?? undefined,
    tel: party?.tel ?? '',
    actualPerson: party?.actualPerson ?? '',
    actualTele: party?.actualTele ?? '',
    companyId: party?.companyId ?? '',
    aeoCode: party?.aeoCode ?? '',
  });
  form.value = {
    isSoc: record?.isSoc ?? false,
    isDraftPlan: record?.isDraftPlan ?? false,
    remark: record?.remark ?? '',
    parties: {
      shipper: toInput(record?.shipper),
      consignee: toInput(record?.consignee),
      notifier: toInput(record?.notifier),
    },
  };
  selectedCountries.value = {
    shipper: record?.shipper?.country ? [record.shipper.country] : [],
    consignee: record?.consignee?.country ? [record.consignee.country] : [],
    notifier: record?.notifier?.country ? [record.notifier.country] : [],
  };
  formSnapshot.value = JSON.stringify(form.value);
};

const loadData = async () => {
  const id = seaExportId.value;
  if (!id) return;
  loading.value = true;
  try {
    const res = await getManifestAsync(id);
    // 切单过程中以最新 id 为准，避免慢请求回写旧票
    if (seaExportId.value !== id) return;
    data.value = res;
    fillForm(res);
  } finally {
    loading.value = false;
  }
};

watch(seaExportId, () => void loadData(), { immediate: true });
onActivated(() => void loadData());

const buildSaveInput = (): RongETongApi.ManifestSaveDto => {
  const toParty = (party: RongETongApi.ManifestPartyInputDto) => ({
    countryId: party.countryId || undefined,
    tel: party.tel?.trim() || undefined,
    actualPerson: party.actualPerson?.trim() || undefined,
    actualTele: party.actualTele?.trim() || undefined,
    companyId: party.companyId?.trim() || undefined,
    aeoCode: party.aeoCode?.trim() || undefined,
  });
  return {
    seaExportId: seaExportId.value,
    isSoc: form.value.isSoc,
    isDraftPlan: form.value.isDraftPlan,
    remark: form.value.remark?.trim() || undefined,
    shipper: toParty(form.value.parties.shipper),
    consignee: toParty(form.value.parties.consignee),
    notifier: toParty(form.value.parties.notifier),
  };
};

const onSave = async () => {
  acting.value = true;
  try {
    await saveManifestAsync(buildSaveInput());
    message.success('舱单补充信息已保存');
    await loadData();
  } finally {
    acting.value = false;
  }
};

/** 发送类操作前补充信息有改动的先保存，免得发出去的是旧值 */
const runAction = async (
  action: () => Promise<unknown>,
  successText: string,
) => {
  acting.value = true;
  try {
    if (isFormDirty.value) await saveManifestAsync(buildSaveInput());
    await action();
    message.success(successText);
  } finally {
    acting.value = false;
    await loadData();
  }
};

const confirmAction = (
  title: string,
  content: string,
  action: () => Promise<unknown>,
  successText: string,
) => {
  Modal.confirm({
    title,
    content,
    onOk: () => runAction(action, successText),
  });
};

const onSend = () =>
  confirmAction(
    '发送舱单',
    `按海运出口当前的数据发送${PORT_TEXT[port.value ?? 0] ?? ''}舱单，三方会按分单个数扣舱单发送权益。确定发送？`,
    () => sendManifestAsync(seaExportId.value),
    '舱单已发送，回执稍后推送',
  );

const onResend = () =>
  confirmAction(
    '重发舱单',
    '按海运出口当前的数据重新发送，三方会按分单个数扣舱单发送权益。确定重发？',
    () => resendManifestAsync(seaExportId.value),
    '舱单已重发',
  );

const onUpdate = () =>
  confirmAction(
    '舱单改单',
    isQingdao.value
      ? '按海运出口当前的数据改单。船名、航次、提单号、船代、箱型、箱号不能改单，要删单后重发；只改船名航次请用改配。确定改单？'
      : '按海运出口当前的数据改单。确定改单？',
    () => updateManifestAsync(seaExportId.value),
    '已提交改单',
  );

const onConfig = () =>
  confirmAction(
    '舱单改配',
    `按海运出口当前的船名「${preview.value?.vessel ?? ''}」、航次「${preview.value?.innerVoyno ?? ''}」改配。确定改配？`,
    () => updateManifestConfigAsync(seaExportId.value),
    '已提交改配',
  );

const onRefresh = () =>
  runAction(() => refreshManifestAsync(seaExportId.value), '回执已刷新');

const onQueryShipAgent = async () => {
  acting.value = true;
  try {
    const res = await queryManifestShipAgentAsync(seaExportId.value);
    Modal.info({
      title: '船代查询结果',
      content: `船代：${res?.shipAgentName ?? '--'}（${res?.shipAgentCode ?? '--'}）；船公司：${res?.carrierName ?? '--'}（${res?.carrierCode ?? '--'}）`,
    });
  } finally {
    acting.value = false;
  }
};

// ==================== 删单 ====================

const deleteVisible = ref(false);
const deleteReason = ref('');
const deleteBlNums = ref<string[]>([]);
const sentBlNums = computed(() =>
  (manifest.value?.houses ?? []).map((x) => x.blNum ?? '').filter(Boolean),
);

const openDelete = () => {
  deleteReason.value = '';
  deleteBlNums.value = [];
  deleteVisible.value = true;
};

const onDelete = async () => {
  const reason = deleteReason.value.trim();
  if (!reason) {
    message.warning('请填写删单原因');
    return;
  }
  deleteVisible.value = false;
  await runAction(
    () =>
      deleteManifestAsync({
        seaExportId: seaExportId.value,
        reason,
        blNums: deleteBlNums.value,
      }),
    '已提交删单',
  );
};

// ==================== 补发分票（青岛） ====================

const addSubVisible = ref(false);
const addSubBlNums = ref<string[]>([]);
/** 当前分单里还没发送过的分提单号 */
const unsentBlNums = computed(() => {
  const all = [
    ...new Set(
      (preview.value?.houses ?? []).map((x) => x.blNum ?? '').filter(Boolean),
    ),
  ];
  return all.filter((x) => !getReceipt(x));
});

const openAddSub = () => {
  addSubBlNums.value = [...unsentBlNums.value];
  addSubVisible.value = true;
};

const onAddSub = async () => {
  if (addSubBlNums.value.length === 0) {
    message.warning('请选择要补发的分提单');
    return;
  }
  addSubVisible.value = false;
  await runAction(
    () =>
      addSubManifestAsync({
        seaExportId: seaExportId.value,
        blNums: addSubBlNums.value,
      }),
    '已提交补发分票',
  );
};

// ==================== 表格列 ====================

const houseColumns = [
  { title: '分提单号', dataIndex: 'blNum', key: 'blNum', width: 150 },
  { title: '箱号', dataIndex: 'ctnNo', key: 'ctnNo', width: 120 },
  {
    title: '箱型',
    dataIndex: 'containerTypeName',
    key: 'containerTypeName',
    width: 70,
  },
  { title: '封号', dataIndex: 'sealNo', key: 'sealNo', width: 110 },
  {
    title: '货主箱',
    dataIndex: 'containerOwnerName',
    key: 'containerOwnerName',
    width: 100,
  },
  { title: '件数', dataIndex: 'packageNum', key: 'packageNum', width: 70 },
  { title: '包装', dataIndex: 'unitName', key: 'unitName', width: 100 },
  { title: '毛重', dataIndex: 'grossWeight', key: 'grossWeight', width: 90 },
  { title: '体积', dataIndex: 'volume', key: 'volume', width: 80 },
  {
    title: '唛头',
    dataIndex: 'marks',
    key: 'marks',
    width: 140,
    ellipsis: true,
  },
  {
    title: '英文品名',
    dataIndex: 'goodsDes',
    key: 'goodsDes',
    width: 180,
    ellipsis: true,
  },
  { title: 'HS编码', dataIndex: 'hsCode', key: 'hsCode', width: 100 },
  { title: '回执', key: 'receipt', width: 220, fixed: 'right' as const },
];

const partyColumns = computed(() => [
  { title: '', dataIndex: 'label', key: 'label', width: 70 },
  { title: '名称（取自海运出口）', key: 'partyName', width: 200 },
  { title: '国家', key: 'country', width: 160 },
  { title: '电话', key: 'tel', width: 140 },
  ...(isShanghai.value
    ? [
        { title: '实际联系人', key: 'actualPerson', width: 120 },
        { title: '实际联系人电话', key: 'actualTele', width: 130 },
        { title: '企业代码', key: 'companyId', width: 160 },
        { title: 'AEO代码', key: 'aeoCode', width: 140 },
      ]
    : []),
]);

const partyPreview = (key: PartyKey) => preview.value?.[key] ?? null;
</script>

<template>
  <div
    class="manifest-tab flex min-h-0 min-w-0 flex-1 flex-col overflow-auto px-5 py-4"
  >
    <Spin :spinning="loading || acting">
      <Empty
        v-if="data && !data.port && !manifest?.port"
        :description="data.unsupportedMessage || '当前起运港暂不支持舱单'"
      />
      <Space v-else-if="data" direction="vertical" :size="12" class="w-full">
        <Card size="small">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <Space wrap>
              <Tag color="blue">{{ PORT_TEXT[port ?? 0] }}舱单</Tag>
              <Tag :color="STATUS_TEXT[status]?.color">{{
                STATUS_TEXT[status]?.text
              }}</Tag>
              <span v-if="manifest?.outTradeCode" class="text-xs text-gray-500">
                外部交易号：{{ manifest.outTradeCode }}
              </span>
              <span v-if="manifest?.sendTime" class="text-xs text-gray-500">
                最近提交：{{ formatTime(manifest.sendTime) }}
              </span>
            </Space>
            <Space wrap>
              <Button :disabled="!isFormDirty" @click="onSave"
                >保存补充信息</Button
              >
              <Button v-if="status === 0" type="primary" @click="onSend"
                >发送</Button
              >
              <Button v-if="status !== 0" @click="onResend">重发</Button>
              <Button v-if="isSent" @click="onUpdate">改单</Button>
              <Button v-if="isSent && isQingdao" @click="openAddSub"
                >补发分票</Button
              >
              <Button v-if="isSent && isQingdao" @click="onConfig">改配</Button>
              <Button v-if="isSent" danger @click="openDelete">删单</Button>
              <Button v-if="manifest?.outTradeCode" @click="onRefresh"
                >刷新回执</Button
              >
              <Button @click="onQueryShipAgent">查询船代</Button>
            </Space>
          </div>
        </Card>

        <Alert
          v-if="errors.length > 0"
          type="warning"
          show-icon
          message="以下资料不完整，补齐后才能发送（在基础信息、分单里修改）"
        >
          <template #description>
            <ul class="manifest-errors">
              <li v-for="item in errors" :key="item">{{ item }}</li>
            </ul>
          </template>
        </Alert>

        <Card size="small" title="舱单补充信息">
          <Space direction="vertical" :size="12" class="w-full">
            <Space wrap :size="24">
              <span>
                货主箱：
                <RadioGroup v-model:value="form.isSoc">
                  <Radio :value="false">COC 船东箱</Radio>
                  <Radio :value="true">SOC 自有箱</Radio>
                </RadioGroup>
              </span>
              <Checkbox v-if="isQingdao" v-model:checked="form.isDraftPlan">
                有集港计划后自动发送（场站取海运出口的场站）
              </Checkbox>
            </Space>
            <Table
              :columns="partyColumns"
              :data-source="PARTY_ROWS"
              :pagination="false"
              row-key="key"
              size="small"
              bordered
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'partyName'">
                  {{ displayText(partyPreview(record.key)?.partyName) }}
                </template>
                <template v-else-if="column.key === 'country'">
                  <CountrySelect
                    v-model="form.parties[record.key as PartyKey].countryId"
                    :selected-items="
                      selectedCountries[record.key as PartyKey] as any
                    "
                    :placeholder="
                      partyPreview(record.key)?.countryName || '取客户上的国家'
                    "
                  />
                </template>
                <template v-else-if="column.key !== 'label'">
                  <Input
                    v-model:value="
                      (form.parties[record.key as PartyKey] as any)[column.key]
                    "
                    :placeholder="
                      column.key === 'tel'
                        ? partyPreview(record.key)?.partyTele ||
                          '取客户上的电话'
                        : ''
                    "
                    allow-clear
                  />
                </template>
              </template>
            </Table>
            <Textarea
              v-model:value="form.remark"
              :maxlength="2000"
              :auto-size="{ minRows: 1, maxRows: 4 }"
              placeholder="舱单备注"
            />
          </Space>
        </Card>

        <Card
          v-if="preview"
          size="small"
          title="待发送内容（按海运出口当前数据生成）"
        >
          <Descriptions :column="4" size="small" bordered>
            <DescriptionsItem label="主提单号">{{
              displayText(preview.mblNum)
            }}</DescriptionsItem>
            <DescriptionsItem label="订舱编号">
              {{ displayText(preview.bookingNum) }}
            </DescriptionsItem>
            <DescriptionsItem label="船公司">{{
              displayText(preview.carrierName)
            }}</DescriptionsItem>
            <DescriptionsItem label="船代">{{
              displayText(preview.shipAgentName)
            }}</DescriptionsItem>
            <DescriptionsItem label="船名">{{
              displayText(preview.vessel)
            }}</DescriptionsItem>
            <DescriptionsItem label="航次">{{
              displayText(preview.innerVoyno)
            }}</DescriptionsItem>
            <DescriptionsItem label="货物类型">{{
              displayText(preview.cargoName)
            }}</DescriptionsItem>
            <DescriptionsItem label="提单类型">
              {{ displayText(preview.billLadingTypeName) }}
            </DescriptionsItem>
            <DescriptionsItem label="提单份数">
              {{ displayText(preview.originalNumber) }}
            </DescriptionsItem>
            <DescriptionsItem label="付款方式">
              {{ displayText(preview.paymentTermNameCn) }}
            </DescriptionsItem>
            <DescriptionsItem label="运输条款">
              {{ displayText(preview.shippingItem) }}
            </DescriptionsItem>
            <DescriptionsItem label="签发地">
              {{ displayText(preview.placeIssueName) }}
            </DescriptionsItem>
            <DescriptionsItem label="收货地">
              {{ displayText(preview.placeReceiptName) }}
            </DescriptionsItem>
            <DescriptionsItem label="装货港">
              {{ displayText(preview.portLoadingName) }}
            </DescriptionsItem>
            <DescriptionsItem label="卸货港">
              {{ displayText(preview.portDischargeName) }}
            </DescriptionsItem>
            <DescriptionsItem label="交货地">
              {{ displayText(preview.placeDeliveryName) }}
            </DescriptionsItem>
            <DescriptionsItem
              v-if="preview.dgContact || preview.dgTel"
              label="危品联系人"
            >
              {{ displayText(preview.dgContact) }} /
              {{ displayText(preview.dgTel) }}
            </DescriptionsItem>
            <DescriptionsItem v-if="preview.reeferTemperature" label="冷藏温度">
              {{ displayText(preview.reeferTemperature) }}
              {{ preview.temperatureUnitName ?? '' }}
              <template v-if="preview.reeferVentilation">
                ，通风 {{ preview.reeferVentilation }}
              </template>
            </DescriptionsItem>
            <DescriptionsItem v-if="preview.webCode" label="集港场站">
              {{ preview.webCode }}
            </DescriptionsItem>
          </Descriptions>

          <Table
            class="mt-3"
            :columns="houseColumns"
            :data-source="preview.houses ?? []"
            :pagination="false"
            :row-key="
              (row: RongETongApi.ManifestHousePreviewDto) =>
                `${row.blNum}-${row.ctnNo}`
            "
            :scroll="{ x: 1500 }"
            size="small"
            bordered
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'receipt'">
                <template v-if="getReceipt(record.blNum)">
                  <Space :size="4" wrap>
                    <Tag v-if="getReceipt(record.blNum)?.msgType">
                      {{
                        MSG_TYPE_TEXT[getReceipt(record.blNum)?.msgType ?? 0]
                      }}
                    </Tag>
                    <Tag
                      :color="
                        RES_STATE_TEXT[getReceipt(record.blNum)?.resState ?? -1]
                          ?.color
                      "
                    >
                      {{
                        RES_STATE_TEXT[getReceipt(record.blNum)?.resState ?? -1]
                          ?.text ?? '--'
                      }}
                    </Tag>
                  </Space>
                  <div
                    v-if="getReceipt(record.blNum)?.resMessage"
                    class="text-xs text-gray-500"
                  >
                    {{ getReceipt(record.blNum)?.resMessage }}
                    {{ formatTime(getReceipt(record.blNum)?.noticeTime) }}
                  </div>
                  <div
                    v-if="getReceipt(record.blNum)?.loadingMessage"
                    class="text-xs text-gray-500"
                  >
                    装载：{{ getReceipt(record.blNum)?.loadingMessage }}
                    {{ formatTime(getReceipt(record.blNum)?.loadingTime) }}
                  </div>
                </template>
                <span v-else class="text-gray-400">未发送</span>
              </template>
            </template>
          </Table>
        </Card>
      </Space>
    </Spin>

    <Modal
      v-model:open="deleteVisible"
      title="舱单删单"
      ok-text="删单"
      :ok-button-props="{ danger: true }"
      @ok="onDelete"
    >
      <Space direction="vertical" class="w-full">
        <div>不勾选分提单时整票删除，删完可以重发。</div>
        <CheckboxGroup v-model:value="deleteBlNums" :options="sentBlNums" />
        <Textarea
          v-model:value="deleteReason"
          :maxlength="255"
          :auto-size="{ minRows: 2, maxRows: 4 }"
          placeholder="删单原因（必填）"
        />
      </Space>
    </Modal>

    <Modal
      v-model:open="addSubVisible"
      title="补发分票"
      ok-text="补发"
      @ok="onAddSub"
    >
      <Space direction="vertical" class="w-full">
        <div>勾选要补发的分提单，内容取海运出口当前的分单数据。</div>
        <CheckboxGroup v-model:value="addSubBlNums" :options="unsentBlNums" />
        <div v-if="unsentBlNums.length === 0" class="text-gray-400">
          没有未发送的分提单
        </div>
      </Space>
    </Modal>
  </div>
</template>

<style scoped>
.manifest-tab {
  background: #f2f2f7;
}

.manifest-errors {
  padding-left: 18px;
  margin: 0;
  list-style: disc;
}
</style>
