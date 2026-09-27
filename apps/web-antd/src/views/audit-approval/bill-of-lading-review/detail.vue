<script setup lang="ts">
import type {
  BillAttachment,
  BillOfLading,
  BillTaskDetail,
  BillTaskItem,
} from '#/api/bill-of-lading';
import { computed, ref } from 'vue';
import {
  Alert,
  Button,
  Descriptions,
  DescriptionsItem,
  Drawer,
  Empty,
  Input,
  Modal,
  Space,
  Spin,
  Table,
  Tabs,
  TabPane,
  Timeline,
  TimelineItem,
  message,
} from 'ant-design-vue';
import { auditBills, getBillTask } from '#/api/bill-of-lading';
import { openAttachmentViewer } from '#/components/attachment-viewer';
import { billStatusOptions, canAudit } from '#/views/bill-of-lading/rules';
const emit = defineEmits<{ success: [] }>();
const visible = ref(false);
const loading = ref(false);
const saving = ref(false);
const detail = ref<BillTaskDetail>();
const selectedKeys = ref<string[]>([]);
const confirmVisible = ref(false);
const success = ref(true);
const remark = ref('');
const selected = computed(
  () =>
    detail.value?.billOfLadingTasks.filter((item) =>
      selectedKeys.value.includes(item.billOfLading.id),
    ) ?? [],
);
const allowed = (pass: boolean) =>
  selected.value.length > 0 &&
  selected.value.every((item) => canAudit(item, pass));
const selection = computed(() => ({
  selectedRowKeys: selectedKeys.value,
  onChange: (keys: (number | string)[]) => {
    selectedKeys.value = keys.map(String);
  },
  getCheckboxProps: (row: BillTaskItem) => ({
    disabled: saving.value || !(canAudit(row, true) || canAudit(row, false)),
  }),
}));
const states = ['审核中', '全部驳回', '全部通过', '部分通过'];
const myStates = ['待审核', '已驳回', '已通过'];
const baseColumns = [
  {
    title: '主提单号',
    dataIndex: ['seaExport', 'transportOrder', 'mblNum'],
    width: 170,
  },
  { title: '分提单号', dataIndex: ['seaExportSeparate', 'blNum'], width: 150 },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    customRender: ({ text }: { text: number }) =>
      billStatusOptions[text]?.label,
  },
  { title: '签单方式', dataIndex: ['codeIssueType', 'billType'], width: 100 },
  { title: '结算对象', dataIndex: ['settlement', 'name'], width: 150 },
  {
    title: '开船日期',
    dataIndex: ['seaExport', 'transportOrder', 'etd'],
    width: 110,
  },
  { title: '未收金额', dataIndex: 'unReceivedAmount', width: 110 },
  { title: '应结日期', dataIndex: 'settlementDate', width: 110 },
  { title: '承诺付款日期', dataIndex: 'promisePayDate', width: 120 },
  { title: '超期备注', dataIndex: 'overdueRemark', width: 180 },
];
const overdueProofColumn = {
  title: '超期证明',
  key: 'proof',
  width: 180,
};
const billColumns = [...baseColumns, overdueProofColumn];
const applyColumns = [
  ...baseColumns.map((column) => ({
    ...column,
    dataIndex: [
      'billOfLading',
      ...(Array.isArray(column.dataIndex)
        ? column.dataIndex
        : [column.dataIndex]),
    ],
  })),
  {
    title: '是否压单',
    dataIndex: ['billOfLading', 'isHeldUp'],
    width: 90,
    customRender: ({ text }: { text: boolean | null }) =>
      text == null ? '—' : text ? '是' : '否',
  },
  {
    title: '我的审核状态',
    dataIndex: 'myTaskStatus',
    width: 115,
    customRender: ({ text }: { text?: number | null }) =>
      text == null ? '未到当前步骤' : myStates[text],
  },
  { title: '审核人', dataIndex: 'auditUserName', width: 100 },
  { title: '审核意见', dataIndex: 'remark', width: 160 },
  overdueProofColumn,
];
const overdueColumns = [
  {
    title: '主提单号',
    dataIndex: ['seaExport', 'transportOrder', 'mblNum'],
    width: 160,
  },
  {
    title: '分提单号',
    dataIndex: 'blNums',
    width: 150,
    customRender: ({ text }: { text?: string[] }) => text?.join('、'),
  },
  ...[
    ['settlementDate', '应结日期'],
    ['historyOverdueDays', '历史超期天数'],
    ['overdueDays', '当前超期天数'],
    ['promiseOverdueDays', '承诺超期天数'],
    ['unReceivedAmount', '未结金额'],
    ['promisePayDate', '承诺付款日期'],
    ['finalSettlementTime', '实际结算日期'],
    ['overdueRemark', '超期备注'],
  ].map(([dataIndex, title]) => ({ dataIndex, title, width: 130 })),
  { title: '证明文件', key: 'proof', width: 150 },
];
const arrearsColumns = [
  { title: '主提单号', dataIndex: ['transportOrder', 'mblNum'], width: 170 },
  { title: '结算对象', dataIndex: ['settlement', 'name'], width: 160 },
  ...[
    ['overdueDays', '超期天数'],
    ['localCurrencyCode', '本位币'],
    ['totalReceivable', '应收金额'],
    ['totalReceived', '已收金额'],
    ['totalUnReceived', '未收金额'],
  ].map(([dataIndex, title]) => ({ dataIndex, title, width: 120 })),
];
let request = 0;
async function open(id: string) {
  const token = ++request;
  visible.value = true;
  loading.value = true;
  detail.value = undefined;
  selectedKeys.value = [];
  try {
    const value = await getBillTask(id);
    if (token === request) detail.value = value;
  } finally {
    if (token === request) loading.value = false;
  }
}
function confirm(pass: boolean) {
  if (!allowed(pass)) {
    message.warning('所选提单中包含当前不能执行此审核操作的记录');
    return;
  }
  success.value = pass;
  remark.value = '';
  confirmVisible.value = true;
}
async function submit() {
  if (saving.value || !allowed(success.value) || !detail.value) return;
  const taskId = detail.value.id;
  saving.value = true;
  try {
    await auditBills(
      selected.value.map((item) => item.billOfLading.id),
      success.value,
      remark.value.trim(),
    );
    message.success('审核成功');
    confirmVisible.value = false;
    emit('success');
    await open(taskId);
  } finally {
    saving.value = false;
  }
}
function proofFiles(record: {
  billOfLading?: Pick<BillOfLading, 'overdueAttachments'> | null;
  overdueAttachments?: BillAttachment[] | null;
}) {
  return (
    record.billOfLading?.overdueAttachments ?? record.overdueAttachments ?? []
  );
}
function proofName(file: BillAttachment) {
  return file.friendlyFileName || file.fileName || '查看';
}
defineExpose({ open });
</script>
<template>
  <Drawer
    v-model:open="visible"
    title="提单签出审核详情"
    width="92vw"
    :closable="!saving"
    :mask-closable="!saving"
  >
    <Spin :spinning="loading">
      <template v-if="detail">
        <Descriptions bordered size="small" :column="3" class="mb-4">
          <DescriptionsItem label="结算对象">{{
            detail.settlement?.name
          }}</DescriptionsItem>
          <DescriptionsItem label="申请人">{{
            detail.creatorUserName
          }}</DescriptionsItem>
          <DescriptionsItem label="申请时间">{{
            detail.creationTime.replace('T', ' ').slice(0, 19)
          }}</DescriptionsItem>
          <DescriptionsItem label="任务状态">{{
            states[detail.taskStatus ?? -1]
          }}</DescriptionsItem>
          <DescriptionsItem label="提单数量 / 未完成"
            >{{ detail.itemCount }} /
            {{ detail.pendingItemCount }}</DescriptionsItem
          >
          <DescriptionsItem label="未收金额（本位币）">{{
            detail.totalUnReceivedAmount
          }}</DescriptionsItem>
        </Descriptions>
        <div class="flex flex-col gap-5 xl:flex-row">
          <div class="min-w-0 flex-1">
            <Tabs>
              <TabPane key="application" tab="申请放单业务">
                <Space class="mb-3"
                  ><Button
                    v-access:code="'Admin.BillOfLading.Audit'"
                    type="primary"
                    :disabled="!allowed(true) || saving"
                    @click="confirm(true)"
                    >通过所选提单</Button
                  ><Button
                    v-access:code="'Admin.BillOfLading.Audit'"
                    danger
                    :disabled="!allowed(false) || saving"
                    @click="confirm(false)"
                    >驳回 / 通过后驳回</Button
                  ><span>已选 {{ selected.length }} 张</span></Space
                >
                <Table
                  :data-source="detail.billOfLadingTasks"
                  :columns="applyColumns"
                  :row-key="(row: BillTaskItem) => row.billOfLading.id"
                  :row-selection="selection"
                  :pagination="false"
                  size="small"
                  :scroll="{ x: 2100 }"
                >
                  <template #bodyCell="{ column, record }"
                    ><template v-if="column.key === 'proof'"
                      ><div class="flex flex-col items-start">
                        <Button
                          v-for="file in proofFiles(record)"
                          :key="String(file.attachmentId)"
                          type="link"
                          class="h-auto px-0"
                          @click="openAttachmentViewer(file)"
                          >{{ proofName(file) }}</Button
                        >
                      </div></template
                    ></template
                  >
                </Table>
              </TabPane>
              <TabPane
                key="held"
                :tab="`压单业务（${detail.heldUpBillOfLadings.length}）`"
                ><Table
                  :data-source="detail.heldUpBillOfLadings"
                  :columns="billColumns"
                  row-key="id"
                  size="small"
                  :scroll="{ x: 1530 }"
                  ><template #bodyCell="{ column, record }"
                    ><template v-if="column.key === 'proof'"
                      ><div class="flex flex-col items-start">
                        <Button
                          v-for="file in proofFiles(record)"
                          :key="String(file.attachmentId)"
                          type="link"
                          class="h-auto px-0"
                          @click="openAttachmentViewer(file)"
                          >{{ proofName(file) }}</Button
                        >
                      </div></template
                    ></template
                  ></Table
                ></TabPane
              >
              <TabPane
                key="following"
                :tab="`后续新单（${detail.followingBillOfLadings.length}）`"
                ><Table
                  :data-source="detail.followingBillOfLadings"
                  :columns="billColumns"
                  row-key="id"
                  size="small"
                  :scroll="{ x: 1530 }"
                  ><template #bodyCell="{ column, record }"
                    ><template v-if="column.key === 'proof'"
                      ><div class="flex flex-col items-start">
                        <Button
                          v-for="file in proofFiles(record)"
                          :key="String(file.attachmentId)"
                          type="link"
                          class="h-auto px-0"
                          @click="openAttachmentViewer(file)"
                          >{{ proofName(file) }}</Button
                        >
                      </div></template
                    ></template
                  ></Table
                ></TabPane
              >
              <TabPane key="client" tab="客户信息">
                <Descriptions v-if="detail.clientDetail" bordered :column="2">
                  <DescriptionsItem label="简称">{{
                    detail.clientDetail.name
                  }}</DescriptionsItem
                  ><DescriptionsItem label="全称">{{
                    detail.clientDetail.fullName
                  }}</DescriptionsItem>
                  <DescriptionsItem label="电话">{{
                    detail.clientDetail.phone
                  }}</DescriptionsItem
                  ><DescriptionsItem label="邮箱">{{
                    detail.clientDetail.email
                  }}</DescriptionsItem>
                  <DescriptionsItem label="信用额度">{{
                    detail.clientDetail.clientAllowAmount
                  }}</DescriptionsItem
                  ><DescriptionsItem label="结算币种">{{
                    detail.clientDetail.clientCurrency?.code
                  }}</DescriptionsItem>
                  <DescriptionsItem label="首次合作">{{
                    detail.clientDetail.clientCoopSince
                  }}</DescriptionsItem
                  ><DescriptionsItem label="最近交易">{{
                    detail.clientDetail.clientLastTxnTime
                  }}</DescriptionsItem>
                  <DescriptionsItem label="年票数">{{
                    detail.clientDetail.clientYearTicketCount
                  }}</DescriptionsItem
                  ><DescriptionsItem label="年 TEU">{{
                    detail.clientDetail.clientYearTeu
                  }}</DescriptionsItem>
                  <DescriptionsItem label="地址" :span="2">{{
                    detail.clientDetail.address
                  }}</DescriptionsItem
                  ><DescriptionsItem label="备注" :span="2">{{
                    detail.clientDetail.remark
                  }}</DescriptionsItem> </Descriptions
                ><Empty v-else description="客户详情不可查看或暂无数据" />
              </TabPane>
              <TabPane key="arrears" tab="应收欠费"
                ><Table
                  v-if="detail.arrearsReports"
                  :data-source="detail.arrearsReports"
                  :columns="arrearsColumns"
                  :row-key="
                    (row: {
                      transportOrderId: string;
                      changeOrderId?: string;
                    }) => `${row.transportOrderId}-${row.changeOrderId ?? ''}`
                  "
                  size="small"
                  :scroll="{ x: 1000 }" /><Empty
                  v-else
                  description="无欠费报表查看权限或暂无数据"
              /></TabPane>
              <TabPane key="overdues" tab="客户历史异常">
                <Alert
                  class="mb-3"
                  type="info"
                  message="按本批结算对象汇总历史超期、当前超期、历史承诺超期及超承诺时间未结，金额为本位币。"
                />
                <Table
                  :data-source="detail.clientOverdues"
                  :columns="overdueColumns"
                  row-key="transportOrderId"
                  size="small"
                  :scroll="{ x: 1650 }"
                  ><template #bodyCell="{ column, record }"
                    ><template v-if="column.key === 'proof'"
                      ><Button
                        v-for="file in record.overdueAttachments"
                        :key="String(file.attachmentId)"
                        type="link"
                        @click="openAttachmentViewer(file)"
                        >{{
                          file.friendlyFileName || file.fileName || '查看'
                        }}</Button
                      ></template
                    ></template
                  ></Table
                >
              </TabPane>
            </Tabs>
          </div>
          <aside class="w-full shrink-0 rounded border p-4 xl:w-64">
            <h3 class="mb-4 font-medium">审批流程</h3>
            <Timeline v-if="detail.workFlowInstance?.levelGroup?.length"
              ><TimelineItem
                v-for="level in detail.workFlowInstance.levelGroup"
                :key="level.level"
                ><p>
                  第 {{ level.level }} 级 ·
                  {{ ['直接通过', '或签', '会签'][level.passMethod] }}
                </p>
                <div v-for="item in level.itemList" :key="item.id" class="mt-2">
                  <p>
                    {{ item.userNickName }} ·
                    {{
                      item.taskStatus == null
                        ? '未到当前步骤'
                        : myStates[item.taskStatus]
                    }}
                  </p>
                  <p>{{ item.comment }}</p>
                  <small>{{
                    item.auditTime?.replace('T', ' ').slice(0, 19)
                  }}</small>
                </div></TimelineItem
              ></Timeline
            ><Empty v-else description="暂无审批流程" />
          </aside>
        </div>
      </template>
    </Spin>
  </Drawer>
  <Modal
    v-model:open="confirmVisible"
    :title="success ? '确认通过所选提单' : '确认驳回所选提单'"
    :confirm-loading="saving"
    :mask-closable="false"
    :closable="!saving"
    :cancel-button-props="{ disabled: saving }"
    @ok="submit"
    ><p class="mb-3">
      本次处理 {{ selected.length }} 张提单，其余提单保持原状。
    </p>
    <Input.TextArea
      v-model:value="remark"
      placeholder="审核意见（选填）"
      :maxlength="1024"
      :rows="4"
      :disabled="saving"
  /></Modal>
</template>
