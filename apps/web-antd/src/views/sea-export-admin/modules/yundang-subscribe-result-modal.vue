<script lang="ts" setup>
import type { SeaExportSubscribeRowInfo } from '../use-yundang-ocean-subscribe';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Table, Tag } from 'ant-design-vue';

import type { YundangAdminApi } from '#/api/yundang/yundang-admin';
import { $t } from '#/locales';

interface ResultTableRow
  extends YundangAdminApi.YundangOceanSubscribeItemResultDto {
  orderLabel: string;
}

const summary = ref({
  totalCount: 0,
  successCount: 0,
  failCount: 0,
});
const tableRows = ref<ResultTableRow[]>([]);

const columns = computed(() => [
  {
    dataIndex: 'orderLabel',
    title: $t('seaExport.yundang.result.orderLabel'),
    width: 160,
    ellipsis: true,
  },
  {
    dataIndex: 'referenceNo',
    title: $t('seaExport.yundang.result.referenceNo'),
    width: 140,
    ellipsis: true,
  },
  {
    dataIndex: 'ctnrNo',
    title: $t('seaExport.yundang.result.ctnrNo'),
    width: 130,
    ellipsis: true,
  },
  {
    dataIndex: 'isSuccess',
    title: $t('seaExport.yundang.result.status'),
    width: 90,
  },
  {
    dataIndex: 'resultType',
    title: $t('seaExport.yundang.result.resultType'),
    width: 120,
    ellipsis: true,
  },
  {
    dataIndex: 'errorMessage',
    title: $t('seaExport.yundang.result.errorMessage'),
    ellipsis: true,
  },
]);

function resolveOrderLabel(
  seaExportId: string,
  rowMap: Map<string, SeaExportSubscribeRowInfo>,
): string {
  const row = rowMap.get(seaExportId);
  if (!row) {
    return seaExportId;
  }
  return (
    row.commissionNum?.trim() ||
    row.mblNum?.trim() ||
    row.bookingNum?.trim() ||
    seaExportId
  );
}

const [Modal, modalApi] = useVbenModal({
  showConfirmButton: false,
  cancelText: $t('seaExport.yundang.result.close'),
  onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    const data = modalApi.getData<{
      result: YundangAdminApi.YundangOceanBatchSubscribeResultDto;
      rows: SeaExportSubscribeRowInfo[];
    }>();
    const result = data?.result;
    const rowMap = new Map<string, SeaExportSubscribeRowInfo>(
      (data?.rows ?? []).map((row) => [row.id, row]),
    );

    summary.value = {
      totalCount: result?.totalCount ?? 0,
      successCount: result?.successCount ?? 0,
      failCount: result?.failCount ?? 0,
    };
    tableRows.value = (result?.items ?? []).map((item) => ({
      ...item,
      orderLabel: resolveOrderLabel(String(item.seaExportId), rowMap),
    }));
  },
});
</script>

<template>
  <Modal :title="$t('seaExport.yundang.result.title')" class="w-[960px]">
    <p class="mb-4 text-sm">
      {{
        $t('seaExport.yundang.result.summary', [
          summary.totalCount,
          summary.successCount,
          summary.failCount,
        ])
      }}
    </p>
    <Table
      :columns="columns"
      :data-source="tableRows"
      :pagination="false"
      :scroll="{ y: 360 }"
      :row-key="
        (record, index) =>
          `${record.seaExportId}-${record.referenceNo ?? ''}-${record.ctnrNo ?? ''}-${index}`
      "
      size="small"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'isSuccess'">
          <Tag :color="record.isSuccess ? 'success' : 'error'">
            {{
              record.isSuccess
                ? $t('seaExport.yundang.result.success')
                : $t('seaExport.yundang.result.failed')
            }}
          </Tag>
        </template>
        <template v-else-if="column.dataIndex === 'errorMessage'">
          <span
            :class="
              record.isSuccess ? 'text-[rgba(0,0,0,0.45)]' : 'text-[#ff4d4f]'
            "
          >
            {{ record.errorMessage || record.resultType || '--' }}
          </span>
        </template>
      </template>
    </Table>
  </Modal>
</template>
