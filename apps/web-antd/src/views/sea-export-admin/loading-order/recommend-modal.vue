<script lang="ts" setup>
import type { CarrierAdminApi } from '#/api/system/base-data/carrier-admin';
import type { SystemUserAdminApi } from '#/api/system/user-admin';

import { computed, ref, watch } from 'vue';

import { Empty, Modal, Spin, Table, message } from 'ant-design-vue';

import { userSimpleListCache } from '#/adapter/component/biz-select/cache/user-simple-cache';
import { getLoadingOrderYardUsers } from '#/api/sea-export/loading-order-admin';
import { UserAttribute } from '#/api/system/user-admin';
import { $t } from '#/locales';

defineOptions({
  name: 'LoadingOrderRecommendModal',
});

const props = defineProps<{
  carrierId: string;
  estimatedArrivalDate?: string;
  open: boolean;
  yards: CarrierAdminApi.CarrierYardDto[];
}>();

const emit = defineEmits<{
  confirm: [
    payload: {
      carrierYardId: string;
      userIds: (number | string)[];
      users: SystemUserAdminApi.UserSimpleDto[];
    },
  ];
  'update:open': [value: boolean];
}>();

interface RecommendRow {
  key: string;
  userNames: string[];
  yardName: string;
}

const loading = ref(false);
const rows = ref<RecommendRow[]>([]);
const selectedKey = ref<string>();

const close = () => emit('update:open', false);

const selectedRowKeys = computed(() =>
  selectedKey.value ? [selectedKey.value] : [],
);

const loadRows = async () => {
  if (!props.estimatedArrivalDate || !props.carrierId) return;
  loading.value = true;
  selectedKey.value = undefined;
  try {
    const list = await getLoadingOrderYardUsers({
      carrierId: props.carrierId,
      estimatedArrivalDate: props.estimatedArrivalDate,
    });
    const grouped = new Map<string, Set<string>>();
    for (const item of list ?? []) {
      const yardName = item.yardName?.trim();
      const userName = item.userName?.trim();
      if (!yardName) continue;
      const names = grouped.get(yardName) ?? new Set<string>();
      if (userName) names.add(userName);
      grouped.set(yardName, names);
    }
    rows.value = [...grouped.entries()].map(([yardName, names]) => ({
      key: yardName,
      yardName,
      userNames: [...names],
    }));
    selectedKey.value = rows.value[0]?.key;
  } catch {
    rows.value = [];
  } finally {
    loading.value = false;
  }
};

watch(
  () => props.open,
  (open) => {
    if (open) void loadRows();
  },
);

const resolveYardId = (yardName: string) => {
  const yard = props.yards.find(
    (item) => (item.name ?? '').trim() === yardName,
  );
  return yard ? String(yard.id) : '';
};

const matchesSupervisor = (
  user: SystemUserAdminApi.UserSimpleDto,
  name: string,
) => {
  if ((user.nickName ?? '').trim() !== name) return false;
  const attr = user.userAttribute;
  if (attr == null) return true;
  return (
    (Number(attr) & UserAttribute.LoadingSupervision) ===
    UserAttribute.LoadingSupervision
  );
};

const resolveUsers = async (userNames: string[]) => {
  const all = await userSimpleListCache.ensure();
  const picked: SystemUserAdminApi.UserSimpleDto[] = [];
  const missing: string[] = [];
  for (const name of userNames) {
    const user = all.find((item) => matchesSupervisor(item, name));
    if (user) picked.push(user);
    else missing.push(name);
  }
  return { missing, picked };
};

const handleConfirm = async () => {
  const row = rows.value.find((item) => item.key === selectedKey.value);
  if (!row) {
    message.warning($t('seaExport.loadingOrder.recommendSelectFirst'));
    return;
  }
  const yardId = resolveYardId(row.yardName);
  if (!yardId) {
    message.warning(
      $t('seaExport.loadingOrder.recommendYardMissing', [row.yardName]),
    );
    return;
  }
  const { missing, picked } = await resolveUsers(row.userNames);
  if (missing.length > 0) {
    message.warning(
      $t('seaExport.loadingOrder.recommendUserMissing', [missing.join('、')]),
    );
  }
  emit('confirm', {
    carrierYardId: yardId,
    userIds: picked.map((user) => user.id),
    users: picked,
  });
  close();
};

const onRowClick = (record: RecommendRow) => {
  selectedKey.value = record.key;
};

const onSelectChange = (keys: (number | string)[]) => {
  selectedKey.value = keys[0] == null ? undefined : String(keys[0]);
};
</script>

<template>
  <Modal
    :open="open"
    :title="$t('seaExport.loadingOrder.recommendModalTitle')"
    :ok-text="$t('common.confirm')"
    :cancel-text="$t('common.cancel')"
    :ok-button-props="{ disabled: rows.length === 0 }"
    width="560px"
    destroy-on-close
    @cancel="close"
    @ok="handleConfirm"
  >
    <p class="recommend-modal__tip">
      {{ $t('seaExport.loadingOrder.recommendTip') }}
    </p>
    <Spin :spinning="loading">
      <Table
        v-if="rows.length > 0"
        :data-source="rows"
        :pagination="false"
        :row-key="(row: RecommendRow) => row.key"
        :row-selection="{
          type: 'radio',
          selectedRowKeys,
          onChange: onSelectChange,
        }"
        size="small"
        :custom-row="
          (record: RecommendRow) => ({
            onClick: () => onRowClick(record),
            onDblclick: () => {
              onRowClick(record);
              void handleConfirm();
            },
          })
        "
      >
        <Table.Column
          :title="$t('seaExport.loadingOrder.carrierYard')"
          data-index="yardName"
        />
        <Table.Column
          :title="$t('seaExport.loadingOrder.supervisors')"
          key="userNames"
        >
          <template #default="{ record }">
            {{
              record.userNames.join('、') ||
              $t('seaExport.loadingOrder.recommendNoSupervisor')
            }}
          </template>
        </Table.Column>
      </Table>
      <Empty
        v-else-if="!loading"
        :description="$t('seaExport.loadingOrder.recommendEmpty')"
      />
    </Spin>
  </Modal>
</template>

<style scoped>
.recommend-modal__tip {
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 18px;
  color: #8c95a3;
}
</style>
