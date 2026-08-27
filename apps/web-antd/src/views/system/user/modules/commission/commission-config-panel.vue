<script lang="ts" setup>
import { CommissionConfigAdminApi } from '#/api/commission/commission-config-admin';

import { computed, onMounted, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import {
  Button,
  message,
  Popconfirm,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'ant-design-vue';

import {
  deleteCommissionConfig,
  getCommissionConfigPagedList,
} from '#/api/commission/commission-config-admin';
import { $t } from '#/locales';
import { createAbpPermission } from '#/utils/abp-permission';

import {
  buildRuleSummary,
  formatBaseSalary,
  formatDateTime,
  formatEffectivePeriod,
  getBizTypeLabels,
  useCommissionConfigColumns,
} from './commission-data';
import CommissionConfigModal from './commission-config-modal.vue';

defineOptions({ name: 'UserCommissionConfigPanel' });

const props = defineProps<{
  userId: number;
  commissionType: CommissionConfigAdminApi.CommissionType;
}>();

const perm = createAbpPermission('Admin.CommissionConfig');

const typeLabel = computed(() =>
  $t(
    props.commissionType === CommissionConfigAdminApi.CommissionType.Sales
      ? 'commission.salesTab'
      : 'commission.operationTab',
  ),
);

const loading = ref(false);
const list = ref<CommissionConfigAdminApi.CommissionConfigDto[]>([]);
const pageIndex = ref(1);
const pageSize = ref(10);
const total = ref(0);

const columns = computed(() => useCommissionConfigColumns());

async function load() {
  if (props.userId == null) {
    list.value = [];
    total.value = 0;
    return;
  }
  loading.value = true;
  try {
    const res = await getCommissionConfigPagedList({
      commissionType: props.commissionType,
      userId: props.userId,
      pageIndex: pageIndex.value,
      pageSize: pageSize.value,
    });
    list.value = res.items ?? [];
    total.value = res.totalCount ?? 0;
  } finally {
    loading.value = false;
  }
}

const pagination = computed(() => ({
  current: pageIndex.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: true,
  showTotal: (count: number) => $t('commission.totalCount', { count }),
  onChange: (page: number, size: number) => {
    pageIndex.value = page;
    pageSize.value = size;
    void load();
  },
}));

const [CommissionConfigModalComponent, commissionConfigModalApi] = useVbenModal(
  {
    connectedComponent: CommissionConfigModal,
    destroyOnClose: true,
  },
);

function onAdd() {
  commissionConfigModalApi
    .setData({ userId: props.userId, commissionType: props.commissionType })
    .open();
}

function onEdit(record: CommissionConfigAdminApi.CommissionConfigDto) {
  commissionConfigModalApi
    .setData({
      userId: props.userId,
      commissionType: props.commissionType,
      id: record.id,
    })
    .open();
}

async function onDelete(record: CommissionConfigAdminApi.CommissionConfigDto) {
  try {
    await deleteCommissionConfig(record.id);
    message.success($t('ui.actionMessage.operationSuccess'));
    // 当前页删空时回退一页
    if (list.value.length === 1 && pageIndex.value > 1) {
      pageIndex.value -= 1;
    }
    await load();
  } catch {
    // 错误已由请求拦截器统一处理
  }
}

onMounted(() => {
  if (props.userId != null) {
    void load();
  }
});
</script>

<template>
  <div class="p-4">
    <CommissionConfigModalComponent @success="load" />

    <div class="mb-3 flex items-center justify-between gap-2">
      <Typography.Text type="secondary" class="text-xs">
        {{ $t('commission.listHint') }}
      </Typography.Text>
      <Button
        v-access:code="perm.add"
        type="primary"
        size="small"
        @click="onAdd"
      >
        {{ $t('ui.actionTitle.create', [typeLabel]) }}
      </Button>
    </div>

    <Table
      :columns="columns"
      :data-source="list"
      :loading="loading"
      :pagination="pagination"
      row-key="id"
      size="small"
      :scroll="{ x: 1150 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'isEnabled'">
          <Tag
            :color="
              (record as CommissionConfigAdminApi.CommissionConfigDto).isEnabled
                ? 'green'
                : 'default'
            "
          >
            {{
              (record as CommissionConfigAdminApi.CommissionConfigDto).isEnabled
                ? $t('commission.enabled')
                : $t('commission.disabled')
            }}
          </Tag>
        </template>
        <template v-else-if="column.key === 'effectivePeriod'">
          {{
            formatEffectivePeriod(
              record as CommissionConfigAdminApi.CommissionConfigDto,
            )
          }}
        </template>
        <template v-else-if="column.key === 'bizTypes'">
          {{
            getBizTypeLabels(
              (record as CommissionConfigAdminApi.CommissionConfigDto).bizTypes,
            )
          }}
        </template>
        <template v-else-if="column.key === 'baseSalary'">
          {{
            formatBaseSalary(
              record as CommissionConfigAdminApi.CommissionConfigDto,
            )
          }}
        </template>
        <template v-else-if="column.key === 'creationTime'">
          {{
            formatDateTime(
              (record as CommissionConfigAdminApi.CommissionConfigDto)
                .creationTime,
            )
          }}
        </template>
        <template v-else-if="column.key === 'ruleSummary'">
          <Tooltip
            :title="
              buildRuleSummary(
                record as CommissionConfigAdminApi.CommissionConfigDto,
              ).full
            "
          >
            <span>
              {{
                buildRuleSummary(
                  record as CommissionConfigAdminApi.CommissionConfigDto,
                ).short
              }}
            </span>
          </Tooltip>
        </template>
        <template v-else-if="column.key === 'action'">
          <Button
            v-access:code="perm.edit"
            type="link"
            size="small"
            @click="
              onEdit(record as CommissionConfigAdminApi.CommissionConfigDto)
            "
          >
            {{ $t('common.edit') }}
          </Button>
          <span v-access:code="perm.delete">
            <Popconfirm
              :title="
                $t('commission.deleteConfirm', {
                  name: (record as CommissionConfigAdminApi.CommissionConfigDto)
                    .name,
                })
              "
              @confirm="
                onDelete(record as CommissionConfigAdminApi.CommissionConfigDto)
              "
            >
              <Button type="link" danger size="small">
                {{ $t('common.delete') }}
              </Button>
            </Popconfirm>
          </span>
        </template>
      </template>
    </Table>
  </div>
</template>
