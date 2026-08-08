<script lang="ts" setup>
import type { AirExportSubscribeRowInfo } from '../use-yundang-air-subscribe';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Table, Tag, Tooltip } from 'ant-design-vue';

import type { YundangAirAdminApi } from '#/api/yundang/yundang-air-admin';
import { $t } from '#/locales';

interface ResultTableRow
  extends YundangAirAdminApi.YundangAirSubscribeItemResultDto {
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
    title: $t('airExport.yundang.result.orderLabel'),
    width: 160,
    ellipsis: true,
  },
  {
    dataIndex: 'referenceNo',
    title: $t('airExport.yundang.result.referenceNo'),
    width: 140,
    ellipsis: true,
  },
  {
    dataIndex: 'carrierCd',
    title: $t('airExport.yundang.result.carrierCd'),
    width: 90,
    ellipsis: true,
  },
  {
    dataIndex: 'isSuccess',
    title: $t('airExport.yundang.result.status'),
    width: 90,
  },
  {
    dataIndex: 'itemCodeDesc',
    title: $t('airExport.yundang.result.resultType'),
    width: 120,
    ellipsis: true,
  },
  {
    dataIndex: 'itemMessage',
    title: $t('airExport.yundang.result.errorMessage'),
    minWidth: 280,
  },
]);

function resolveOrderLabel(
  airExportId: string,
  rowMap: Map<string, AirExportSubscribeRowInfo>,
): string {
  const row = rowMap.get(airExportId);
  if (!row) {
    return airExportId;
  }
  return row.commissionNum?.trim() || row.mblNum?.trim() || airExportId;
}

const [Modal, modalApi] = useVbenModal({
  showConfirmButton: false,
  cancelText: $t('airExport.yundang.result.close'),
  onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    const data = modalApi.getData<{
      result: YundangAirAdminApi.YundangAirBatchSubscribeResultDto;
      rows: AirExportSubscribeRowInfo[];
    }>();
    const result = data?.result;
    const rowMap = new Map<string, AirExportSubscribeRowInfo>(
      (data?.rows ?? []).map((row) => [row.id, row]),
    );

    summary.value = {
      totalCount: result?.totalCount ?? 0,
      successCount: result?.successCount ?? 0,
      failCount: result?.failCount ?? 0,
    };
    tableRows.value = (result?.items ?? []).map((item) => ({
      ...item,
      orderLabel: resolveOrderLabel(String(item.airExportId), rowMap),
    }));
  },
});
</script>

<template>
  <Modal :title="$t('airExport.yundang.result.title')" class="w-[960px]">
    <p class="mb-4 text-sm">
      {{
        $t('airExport.yundang.result.summary', [
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
          `${record.airExportId}-${record.referenceNo ?? ''}-${index}`
      "
      size="small"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'isSuccess'">
          <Tag :color="record.isSuccess ? 'success' : 'error'">
            {{
              record.isSuccess
                ? $t('airExport.yundang.result.success')
                : $t('airExport.yundang.result.failed')
            }}
          </Tag>
        </template>
        <template v-else-if="column.dataIndex === 'itemMessage'">
          <Tooltip
            :title="
              record.itemMessage || record.itemCodeDesc
                ? String(record.itemMessage || record.itemCodeDesc)
                : undefined
            "
          >
            <span
              class="inline-block max-w-full whitespace-normal break-words"
              :class="
                record.isSuccess ? 'text-[rgba(0,0,0,0.45)]' : 'text-[#ff4d4f]'
              "
            >
              {{ record.itemMessage || record.itemCodeDesc || '--' }}
            </span>
          </Tooltip>
        </template>
      </template>
    </Table>
  </Modal>
</template>
