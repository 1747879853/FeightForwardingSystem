<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { IconifyIcon } from '@vben/icons';
import { getSeaExportDetail } from '#/api/sea-export/sea-export-admin';
import {
  Button,
  Card,
  message,
  Space,
  Spin,
  Tabs,
  TabPane,
} from 'ant-design-vue';

import dayjs from 'dayjs';
import { $t } from '#/locales';
const route = useRoute();
const router = useRouter();

const editId = computed(() => {
  const id = route.params.id;
  return id ? Number(id) : undefined;
});
const pageLoading = ref(false);
const isEdit = computed(() => !!editId.value);

/** ISO 字符串转正常日期格式 */
const formatNormalDate = (
  val: string | null | undefined,
  format = 'YYYY-MM-DD',
) => {
  if (!val) return '--';
  const d = dayjs(val);
  return d.isValid() ? d.format(format) : '--';
};

const displayList = ref<
  { name: string; icon: string; key: string; value: string }[]
>([]);
const feeLocking = ref($t('seaExport.export.noFeeLocking'));
const businessLocking = ref($t('seaExport.export.noBusinessLocking'));
const getData = async () => {
  if (!editId.value) return;

  pageLoading.value = true;
  try {
    const detail = await getSeaExportDetail(editId.value);
    let commissionNum = {
      name: $t('seaExport.export.commissionNum'),
      icon: 'ant-design:layout-outlined',
      key: 'commissionNum',
      value: detail.transportOrder?.commissionNum || '--',
    };
    displayList.value.push(commissionNum);
    let mblNum = {
      key: 'mblNum',
      name: $t('seaExport.export.mblNum'),
      value: detail.transportOrder?.mblNum || '--',
      icon: 'ant-design:book-outlined',
    };
    displayList.value.push(mblNum);
    let accountDate = {
      key: 'accountDate',
      name: $t('seaExport.export.accountDate'),
      value: formatNormalDate(detail.transportOrder?.accountDate),
      icon: 'ant-design:calendar-outlined',
    };
    displayList.value.push(accountDate);
    let settlementDate = {
      key: 'settlementDate',
      name: $t('seaExport.export.settlementDate'),
      value: formatNormalDate(detail.transportOrder?.settlementDate),
      icon: 'ant-design:carry-out-outlined',
    };
    displayList.value.push(settlementDate);

    if (detail.transportOrder?.isFeeLocking) {
      feeLocking.value = $t('seaExport.export.isFeeLocking');
    } else {
      feeLocking.value = $t('seaExport.export.noFeeLocking');
    }

    if (detail.transportOrder?.isBusinessLocking) {
      businessLocking.value = $t('seaExport.export.isBusinessLocking');
    } else {
      businessLocking.value = $t('seaExport.export.noBusinessLocking');
    }
  } finally {
    pageLoading.value = false;
  }
};
onMounted(() => {
  getData();
});
</script>

<template>
  <Page auto-content-height>
    <div class="default-info h-[100%]">
      <Card class="flex h-[100%] w-[240px] shrink-0 flex-col">
        <div class="flex flex-1 px-1 py-1" v-for="item in displayList">
          <span class="flex pr-1">
            <IconifyIcon :icon="item.icon || ''" class="size-5" />
          </span>
          <span class="flex w-[70px]"> {{ `${item.name} : ` }}</span>
          <span class="flex text-left">{{ item.value || '--' }}</span>
        </div>

        <div class="flex flex-1 px-1 py-1">
          <div class="mr-2 bg-gray-300 p-1 text-sm">{{ feeLocking }}</div>
          <div class="bg-gray-300 p-1 text-sm">{{ businessLocking }}</div>
        </div>
      </Card>
    </div>
  </Page>
</template>

<style lang="scss">
.default-info {
  .ant-card {
    .ant-card-body {
      padding: 10px;
    }
  }
}
</style>
