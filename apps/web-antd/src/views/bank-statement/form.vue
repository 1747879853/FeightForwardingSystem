<script lang="ts" setup>
import type { BankStatementAdminApi } from '#/api/settlement-management/bank-statement-admin';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import dayjs from 'dayjs';

import { Page } from '@vben/common-ui';
import { useAccess } from '@vben/access';
import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Card,
  DatePicker,
  Input,
  InputNumber,
  message,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  ClientSelect,
  CurrencySelect,
  OrgBankAccountSelect,
  ClientBankAccountSelect,
  UserSelect,
} from '#/adapter/component';
import {
  addBankStatement,
  editBankStatement,
  getBankStatementDetail,
  getBankStatementReceiveSettlementPagedList,
} from '#/api/settlement-management/bank-statement-admin';
import { createAbpPermission } from '#/utils/abp-permission';
import { markListShouldRefresh } from '#/utils/list-refresh-flag';

import {
  getReceiveSettlementStatusColor,
  getReceiveSettlementStatusLabel,
  useReceiveSettlementColumns,
} from './form-data';

const perm = createAbpPermission('Admin.BankStatement');
const receiveSettlementPerm = createAbpPermission('Admin.ReceiveSettlement');
const route = useRoute();
const router = useRouter();
const { hasAccessByCodes } = useAccess();

const canEdit = computed(() => hasAccessByCodes([perm.edit]));
const canAddReceiveSettlement = computed(() =>
  hasAccessByCodes([receiveSettlementPerm.add]),
);

const editId = computed<string | undefined>(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0];
  return id ? String(id) : undefined;
});
const isEdit = computed(() => !!editId.value);

// ==================== 表单字段 ====================
const pageLoading = ref(false);
const submitting = ref(false);

const bankStatementNo = ref<string>('');
const statementTime = ref(dayjs());
const amount = ref<number | undefined>(undefined);
const currencyId = ref<number | undefined>(undefined);
const transactionFee = ref<number | undefined>(undefined);
const statementRemark = ref('');
const remark = ref('');
const messageText = ref('');
const orgBankAccountId = ref<string | undefined>(undefined);
const settlementId = ref<string>('');
const clientInvoiceBankId = ref<string | undefined>(undefined);

// 操作人列表
interface OperatorRow {
  _key: string;
  operationId?: number;
  operationName?: string;
  remark?: string;
}
let rowKeyCounter = 0;
const makeRowKey = () => `op_${++rowKeyCounter}_${Date.now()}`;
const operatorRows = ref<OperatorRow[]>([]);

// ==================== 收费结算子表 ====================
const settlementList = ref<BankStatementAdminApi.ReceiveSettlementListDto[]>(
  [],
);
const settlementLoading = ref(false);
const settlementTotal = ref(0);
const settlementPage = ref(1);
const settlementPageSize = ref(10);
const settlementNoFilter = ref('');

const receiveSettlementColumns = useReceiveSettlementColumns();

async function loadReceiveSettlements() {
  if (!editId.value) return;
  settlementLoading.value = true;
  try {
    const res = await getBankStatementReceiveSettlementPagedList({
      bankStatementId: editId.value,
      settlementNo: settlementNoFilter.value || undefined,
      pageIndex: settlementPage.value,
      pageSize: settlementPageSize.value,
    });
    settlementList.value = res.items || [];
    settlementTotal.value = res.totalCount || 0;
  } finally {
    settlementLoading.value = false;
  }
}

function handleSettlementPageChange(page: number, pageSize: number) {
  settlementPage.value = page;
  settlementPageSize.value = pageSize;
  loadReceiveSettlements();
}

function handleSettlementSearch() {
  settlementPage.value = 1;
  loadReceiveSettlements();
}

function handleCreateReceiveSettlement() {
  if (!editId.value) return;
  router.push({
    path: '/settlement-management/receive-settlement/add',
    query: { bankStatementId: editId.value },
  });
}

function handleReceiveSettlementRowDblClick(
  row: BankStatementAdminApi.ReceiveSettlementListDto,
) {
  router.push(`/settlement-management/receive-settlement/edit/${row.id}`);
}

// ==================== 操作人行操作 ====================
function addOperatorRow() {
  operatorRows.value = [...operatorRows.value, { _key: makeRowKey() }];
}

function removeOperatorRow(key: string) {
  operatorRows.value = operatorRows.value.filter((r) => r._key !== key);
}

function updateOperatorRow(key: string, patch: Partial<OperatorRow>) {
  operatorRows.value = operatorRows.value.map((r) =>
    r._key === key ? { ...r, ...patch } : r,
  );
}

const operatorColumns = [
  { key: 'operationId', title: '操作人', width: 130 },
  { key: 'remark', title: '备注' },
  { key: 'action', title: '', width: 40, align: 'center' as const },
];

// ==================== 联动：结算对象变更清空对方银行 ====================
watch(settlementId, () => {
  clientInvoiceBankId.value = undefined;
});

// ==================== 加载编辑数据 ====================
async function loadEditData() {
  if (!editId.value) return;
  pageLoading.value = true;
  try {
    const detail = await getBankStatementDetail(editId.value);
    bankStatementNo.value = detail.bankStatementNo || '';
    statementTime.value = detail.statementTime
      ? dayjs(detail.statementTime)
      : dayjs();
    amount.value = detail.amount;
    currencyId.value = detail.currencyId;
    transactionFee.value = detail.transactionFee;
    statementRemark.value = detail.statementRemark || '';
    remark.value = detail.remark || '';
    messageText.value = detail.message || '';
    orgBankAccountId.value = detail.orgBankAccountId;
    settlementId.value = detail.settlementId;
    clientInvoiceBankId.value = detail.clientInvoiceBankId;

    operatorRows.value = (detail.bankStatementUsers || []).map((u) => ({
      _key: makeRowKey(),
      operationId: u.operationId,
      operationName: u.operationName,
      remark: u.remark,
    }));

    await loadReceiveSettlements();
  } finally {
    pageLoading.value = false;
  }
}

// ==================== 保存 ====================
async function handleSave() {
  if (!amount.value && amount.value !== 0) {
    message.warning('请输入总金额');
    return;
  }
  if (!currencyId.value) {
    message.warning('请选择币别');
    return;
  }
  if (!statementTime.value) {
    message.warning('请选择交易时间');
    return;
  }
  if (!settlementId.value) {
    message.warning('请选择付款方');
    return;
  }

  const bankStatementUsers = operatorRows.value
    .filter((r) => r.operationId)
    .map((r) => ({ operationId: r.operationId!, remark: r.remark || '' }));

  submitting.value = true;
  try {
    if (isEdit.value) {
      await editBankStatement({
        id: editId.value!,
        amount: amount.value!,
        currencyId: currencyId.value!,
        statementTime: statementTime.value.toISOString(),
        transactionFee: transactionFee.value,
        statementRemark: statementRemark.value || undefined,
        remark: remark.value || undefined,
        orgBankAccountId: orgBankAccountId.value,
        settlementId: settlementId.value,
        clientInvoiceBankId: clientInvoiceBankId.value,
        message: messageText.value || undefined,
        bankStatementUsers,
      });
      message.success('保存成功');
      markListShouldRefresh('BankStatementList');
    } else {
      const newId = await addBankStatement({
        amount: amount.value!,
        currencyId: currencyId.value!,
        statementTime: statementTime.value.toISOString(),
        transactionFee: transactionFee.value,
        statementRemark: statementRemark.value || undefined,
        remark: remark.value || undefined,
        orgBankAccountId: orgBankAccountId.value,
        settlementId: settlementId.value,
        clientInvoiceBankId: clientInvoiceBankId.value,
        message: messageText.value || undefined,
        bankStatementUsers,
      });
      message.success('创建成功');
      markListShouldRefresh('BankStatementList');
      router.replace(`/bank-statement/edit/${newId}`);
    }
  } finally {
    submitting.value = false;
  }
}

function handleBack() {
  router.push('/bank-statement');
}

onMounted(() => {
  if (isEdit.value) {
    loadEditData();
  }
});
</script>

<template>
  <Page :title="isEdit ? '编辑银行流水' : '新建银行流水'">
    <template #extra>
      <Space>
        <Button @click="handleBack">返回</Button>
        <Button
          v-if="canEdit || !isEdit"
          type="primary"
          :loading="submitting"
          @click="handleSave"
        >
          保存
        </Button>
      </Space>
    </template>

    <div v-loading="pageLoading" class="bank-statement-page flex flex-col">
      <!-- 左主右辅：流水信息 + 操作人 -->
      <div class="form-main-layout pb-4">
        <div class="form-main-layout__left">
          <Card title="流水信息" size="small" class="form-panel-card">
            <div class="bank-statement-form grid grid-cols-3 gap-x-4 gap-y-3">
              <template v-if="isEdit">
                <!-- 流水号：纯文本展示 -->
                <div>
                  <div class="mb-1 text-xs text-gray-500">流水号</div>
                  <div class="flex h-8 items-center text-sm text-gray-600">
                    {{ bankStatementNo || '-' }}
                  </div>
                </div>

                <div>
                  <div class="mb-1 text-xs text-gray-500">
                    交易时间 <span class="text-red-500">*</span>
                  </div>
                  <DatePicker
                    v-model:value="statementTime"
                    :show-time="false"
                    format="YYYY-MM-DD"
                    :disabled="!canEdit && isEdit"
                    class="w-full"
                  />
                </div>

                <div>
                  <div class="mb-1 text-xs text-gray-500">
                    币别 <span class="text-red-500">*</span>
                  </div>
                  <CurrencySelect
                    v-model="currencyId"
                    :disabled="!canEdit && isEdit"
                    placeholder="请选择币别"
                    allow-clear
                    class="w-full"
                  />
                </div>

                <div>
                  <div class="mb-1 text-xs text-gray-500">
                    总金额 <span class="text-red-500">*</span>
                  </div>
                  <InputNumber
                    v-model:value="amount"
                    :min="0"
                    :precision="2"
                    :disabled="!canEdit && isEdit"
                    class="w-full"
                    placeholder="请输入金额"
                  />
                </div>

                <div>
                  <div class="mb-1 text-xs text-gray-500">
                    付款方 <span class="text-red-500">*</span>
                  </div>
                  <ClientSelect
                    v-model="settlementId"
                    :disabled="!canEdit && isEdit"
                    placeholder="请选择付款方"
                    allow-clear
                    class="w-full"
                  />
                </div>

                <div>
                  <div class="mb-1 text-xs text-gray-500">手续费</div>
                  <InputNumber
                    v-model:value="transactionFee"
                    :min="0"
                    :precision="2"
                    :disabled="!canEdit && isEdit"
                    class="w-full"
                    placeholder="请输入手续费"
                  />
                </div>

                <div>
                  <div class="mb-1 text-xs text-gray-500">我司银行</div>
                  <OrgBankAccountSelect
                    :value="orgBankAccountId"
                    :disabled="!canEdit && isEdit"
                    placeholder="请选择我司银行"
                    allow-clear
                    class="w-full"
                    @update:value="(v) => (orgBankAccountId = v)"
                  />
                </div>

                <div>
                  <div class="mb-1 text-xs text-gray-500">对方银行</div>
                  <ClientBankAccountSelect
                    :value="clientInvoiceBankId"
                    :client-id="settlementId"
                    :disabled="(!canEdit && isEdit) || !settlementId"
                    placeholder="请先选择付款方"
                    allow-clear
                    class="w-full"
                    @update:value="(v) => (clientInvoiceBankId = v)"
                  />
                </div>
              </template>

              <template v-else>
                <div>
                  <div class="mb-1 text-xs text-gray-500">
                    交易时间 <span class="text-red-500">*</span>
                  </div>
                  <DatePicker
                    v-model:value="statementTime"
                    :show-time="false"
                    format="YYYY-MM-DD"
                    class="w-full"
                  />
                </div>

                <div>
                  <div class="mb-1 text-xs text-gray-500">
                    币别 <span class="text-red-500">*</span>
                  </div>
                  <CurrencySelect
                    v-model="currencyId"
                    placeholder="请选择币别"
                    allow-clear
                    class="w-full"
                  />
                </div>

                <div>
                  <div class="mb-1 text-xs text-gray-500">
                    付款方 <span class="text-red-500">*</span>
                  </div>
                  <ClientSelect
                    v-model="settlementId"
                    placeholder="请选择付款方"
                    allow-clear
                    class="w-full"
                  />
                </div>

                <div>
                  <div class="mb-1 text-xs text-gray-500">
                    总金额 <span class="text-red-500">*</span>
                  </div>
                  <InputNumber
                    v-model:value="amount"
                    :min="0"
                    :precision="2"
                    class="w-full"
                    placeholder="请输入金额"
                  />
                </div>

                <div>
                  <div class="mb-1 text-xs text-gray-500">手续费</div>
                  <InputNumber
                    v-model:value="transactionFee"
                    :min="0"
                    :precision="2"
                    class="w-full"
                    placeholder="请输入手续费"
                  />
                </div>

                <div>
                  <div class="mb-1 text-xs text-gray-500">我司银行</div>
                  <OrgBankAccountSelect
                    :value="orgBankAccountId"
                    placeholder="请选择我司银行"
                    allow-clear
                    class="w-full"
                    @update:value="(v) => (orgBankAccountId = v)"
                  />
                </div>

                <div>
                  <div class="mb-1 text-xs text-gray-500">对方银行</div>
                  <ClientBankAccountSelect
                    :value="clientInvoiceBankId"
                    :client-id="settlementId"
                    :disabled="!settlementId"
                    placeholder="请先选择付款方"
                    allow-clear
                    class="w-full"
                    @update:value="(v) => (clientInvoiceBankId = v)"
                  />
                </div>
              </template>

              <div>
                <div class="mb-1 text-xs text-gray-500">交易备注</div>
                <Input
                  v-model:value="statementRemark"
                  :disabled="!canEdit && isEdit"
                  placeholder="请输入交易备注"
                  allow-clear
                />
              </div>

              <div>
                <div class="mb-1 text-xs text-gray-500">留言</div>
                <Input
                  v-model:value="messageText"
                  :disabled="!canEdit && isEdit"
                  placeholder="请输入留言"
                  allow-clear
                />
              </div>

              <div>
                <div class="mb-1 text-xs text-gray-500">备注</div>
                <Input
                  v-model:value="remark"
                  :disabled="!canEdit && isEdit"
                  placeholder="请输入备注"
                  allow-clear
                />
              </div>
            </div>
          </Card>
        </div>

        <div class="form-main-layout__right">
          <Card title="操作人" size="small" class="form-panel-card">
            <div class="operator-panel-body">
              <Table
                class="operator-table"
                :columns="operatorColumns"
                :data-source="operatorRows"
                :pagination="false"
                row-key="_key"
                size="small"
                :bordered="false"
                :locale="{
                  emptyText: '未配置操作人，所有人均可在非 Admin 端查看该流水',
                }"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'operationId'">
                    <UserSelect
                      :model-value="record.operationId"
                      :selected-items="
                        record.operationId
                          ? [
                              {
                                id: record.operationId,
                                userName:
                                  record.operationName ||
                                  String(record.operationId),
                              },
                            ]
                          : []
                      "
                      :disabled="!canEdit && isEdit"
                      placeholder="请选择"
                      size="small"
                      class="w-full"
                      @update:model-value="
                        (v) =>
                          updateOperatorRow(record._key, { operationId: v })
                      "
                    />
                  </template>
                  <template v-else-if="column.key === 'remark'">
                    <Input
                      :value="record.remark"
                      :disabled="!canEdit && isEdit"
                      placeholder="备注"
                      size="small"
                      allow-clear
                      @update:value="
                        (v) => updateOperatorRow(record._key, { remark: v })
                      "
                    />
                  </template>
                  <template v-else-if="column.key === 'action'">
                    <Button
                      v-if="canEdit || !isEdit"
                      type="text"
                      danger
                      size="small"
                      title="删除"
                      @click="removeOperatorRow(record._key)"
                    >
                      <IconifyIcon
                        icon="mdi:trash-can-outline"
                        class="size-4"
                      />
                    </Button>
                  </template>
                </template>
              </Table>

              <Button
                v-if="canEdit || !isEdit"
                type="dashed"
                block
                class="operator-add-btn"
                @click="addOperatorRow"
              >
                <IconifyIcon
                  icon="ant-design:plus-outlined"
                  class="mr-1 size-4"
                />
                添加操作人
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <!-- 关联收费结算（仅编辑页） -->
      <Card v-if="isEdit" title="关联收费结算" size="small">
        <template #extra>
          <Space>
            <Input
              v-model:value="settlementNoFilter"
              placeholder="结算单号模糊搜索"
              allow-clear
              style="width: 200px"
              @press-enter="handleSettlementSearch"
            />
            <Button size="small" @click="handleSettlementSearch">查询</Button>
            <Button
              v-if="canAddReceiveSettlement"
              size="small"
              type="primary"
              @click="handleCreateReceiveSettlement"
            >
              新建收费结算
            </Button>
          </Space>
        </template>

        <Table
          :columns="receiveSettlementColumns"
          :data-source="settlementList"
          :loading="settlementLoading"
          :pagination="{
            current: settlementPage,
            pageSize: settlementPageSize,
            total: settlementTotal,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: handleSettlementPageChange,
          }"
          row-key="id"
          size="small"
          bordered
          :scroll="{ x: 1100 }"
          :custom-row="
            (record) => ({
              onDblclick: () => handleReceiveSettlementRowDblClick(record),
            })
          "
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'status'">
              <Tag :color="getReceiveSettlementStatusColor(record.status)">
                {{ getReceiveSettlementStatusLabel(record.status) }}
              </Tag>
            </template>
            <template v-if="column.dataIndex === 'locked'">
              <Tag :color="record.locked ? 'red' : 'green'">
                {{ record.locked ? '已锁定' : '未锁定' }}
              </Tag>
            </template>
          </template>
        </Table>
      </Card>
    </div>
  </Page>
</template>

<style scoped lang="scss">
.form-main-layout {
  display: grid;
  grid-template-columns: minmax(0, 14fr) minmax(0, 10fr);
  gap: 12px;
  align-items: stretch;
}

.form-main-layout__left,
.form-main-layout__right {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.form-panel-card {
  display: flex;
  flex: 1;
  flex-direction: column;

  :deep(.ant-card-body) {
    display: flex;
    flex: 1;
    flex-direction: column;
  }
}

.operator-panel-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.bank-statement-form {
  :deep(.ant-picker),
  :deep(.ant-input-number),
  :deep(.ant-select) {
    width: 100%;
  }
}

.operator-table {
  flex: 1;
  margin-bottom: 8px;

  :deep(.ant-table) {
    font-size: 13px;
  }

  :deep(.ant-table-container) {
    border: 1px solid #f0f0f0;
    border-radius: 4px;
  }

  :deep(.ant-table-thead > tr > th) {
    padding: 6px 8px;
    font-size: 12px;
    font-weight: 500;
    color: #8c8c8c;
    background: #fafafa;
  }

  :deep(.ant-table-tbody > tr > td) {
    padding: 4px 6px;
  }

  :deep(.ant-table-tbody > tr:last-child > td) {
    border-bottom: none;
  }

  :deep(.ant-empty) {
    margin: 12px 0;
  }

  :deep(.ant-empty-description) {
    font-size: 12px;
    color: #bfbfbf;
  }
}

.operator-add-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 1280px) {
  .form-main-layout {
    grid-template-columns: 1fr;
  }
}
</style>
