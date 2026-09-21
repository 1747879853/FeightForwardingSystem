<script setup lang="ts">
import type { BillHistory, BillOfLading } from '#/api/bill-of-lading';
import { ref } from 'vue';
import {
  Descriptions,
  DescriptionsItem,
  Drawer,
  Empty,
  Spin,
  Timeline,
  TimelineItem,
  Button,
} from 'ant-design-vue';
import { getBill, getBillHistory } from '#/api/bill-of-lading';
import { openAttachmentViewer } from '#/components/attachment-viewer';
import { billNumber, billStatusOptions, signOutOptions } from './rules';
const visible = ref(false);
const loading = ref(false);
const bill = ref<BillOfLading>();
const history = ref<BillHistory[]>([]);
const labels = [
  '签入',
  '取消签入',
  '签出',
  '取消签出',
  '换签',
  '取消换签',
  '扣单',
  '取消扣单',
];
let request = 0;
async function open(row: BillOfLading) {
  const token = ++request;
  visible.value = true;
  loading.value = true;
  bill.value = undefined;
  history.value = [];
  try {
    const [detail, items] = await Promise.all([
      getBill(row.id),
      getBillHistory(row.id),
    ]);
    if (token !== request) return;
    bill.value = detail;
    history.value = items;
  } finally {
    if (token === request) loading.value = false;
  }
}
defineExpose({ open });
</script>
<template>
  <Drawer v-model:open="visible" title="提单详情与操作历史" :width="640">
    <Spin :spinning="loading">
      <template v-if="bill">
        <Descriptions :column="2" bordered size="small" class="mb-6">
          <DescriptionsItem label="提单号" :span="2">{{
            billNumber(bill)
          }}</DescriptionsItem>
          <DescriptionsItem label="状态">{{
            billStatusOptions[bill.status]?.label
          }}</DescriptionsItem>
          <DescriptionsItem label="签单方式">{{
            bill.codeIssueType?.billType
          }}</DescriptionsItem>
          <DescriptionsItem label="结算对象">{{
            bill.settlement?.name
          }}</DescriptionsItem>
          <DescriptionsItem label="委托单位">{{
            bill.seaExport.transportOrder.client?.name
          }}</DescriptionsItem>
          <DescriptionsItem label="未收金额">{{
            bill.unReceivedAmount
          }}</DescriptionsItem>
          <DescriptionsItem label="承诺付款日期">{{
            bill.promisePayDate?.slice(0, 10)
          }}</DescriptionsItem>
          <DescriptionsItem label="超期备注" :span="2">{{
            bill.overdueRemark || '—'
          }}</DescriptionsItem>
          <DescriptionsItem label="超期证明" :span="2"
            ><Button
              v-for="file in bill.overdueAttachments"
              :key="String(file.attachmentId)"
              type="link"
              @click="openAttachmentViewer(file)"
              >{{
                file.friendlyFileName || file.fileName || '查看附件'
              }}</Button
            ></DescriptionsItem
          >
        </Descriptions>
        <Timeline>
          <TimelineItem v-for="item in history" :key="item.id">
            <p class="font-medium">
              {{ labels[item.actionType ?? -1] }} · {{ item.creatorUserName }}
            </p>
            <p class="text-muted-foreground">
              操作时间：{{ item.creationTime.replace('T', ' ').slice(0, 19) }}
            </p>
            <p v-if="item.actionDate">
              业务日期：{{ item.actionDate.slice(0, 10) }}
            </p>
            <p>
              {{ billStatusOptions[item.beforeStatus ?? -1]?.label }} →
              {{ billStatusOptions[item.afterStatus ?? -1]?.label }}
            </p>
            <p v-if="item.codeIssueType">
              签单方式：{{ item.codeIssueType.billType }}
            </p>
            <p v-if="item.signOutType != null">
              签出方式：{{ signOutOptions[item.signOutType]?.label }}
            </p>
            <p v-if="item.remark">{{ item.remark }}</p>
            <Button
              v-for="file in item.attachments"
              :key="String(file.attachmentId)"
              type="link"
              @click="openAttachmentViewer(file)"
              >{{
                file.friendlyFileName || file.fileName || '查看扫描件'
              }}</Button
            >
          </TimelineItem>
        </Timeline>
        <Empty v-if="!history.length" description="暂无操作历史" />
      </template>
    </Spin>
  </Drawer>
</template>
