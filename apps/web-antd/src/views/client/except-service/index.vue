<script lang="ts" setup>
import type { ClientExceptServiceAdminApi } from '#/api/sea-export/client-except-service-admin';

import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  Empty,
  message,
  Space,
  Spin,
  Switch,
  Table,
} from 'ant-design-vue';

import {
  editClientExceptServices,
  getClientExceptServices,
} from '#/api/sea-export/client-except-service-admin';
import { $t } from '#/locales';
import { loadSeServiceTypeOptions } from '#/views/sea-export-admin/service-type';
import {
  getSeaExportOrderUserRoleOptions,
  parseSeaExportUserAttribute,
} from '#/views/system/user/data';

import {
  buildEditPayload,
  buildServiceTypeLabelMap,
  formatPolLabel,
  getPortGroupKey,
  isNotEntrustingUnitApiError,
  normalizePortGroups,
  type SelectOption,
} from './data';

defineOptions({ name: 'ClientExceptService' });

const route = useRoute();

const clientId = computed(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0] || '';
  return id ? String(id) : '';
});

const loading = ref(false);
const saving = ref(false);
const isEntrustingUnit = ref(false);
const portGroups = ref<
  ClientExceptServiceAdminApi.ClientExceptServicePolGroupDto[]
>([]);
const serviceTypeOptions = ref<SelectOption[]>([]);

const serviceTypeLabelMap = computed(() =>
  buildServiceTypeLabelMap(serviceTypeOptions.value),
);

const userRoleOptions = getSeaExportOrderUserRoleOptions();

function formatUserAttribute(value?: number) {
  const flags = parseSeaExportUserAttribute(Number(value || 0));
  if (flags.length === 0) return '-';
  const labelMap = new Map(
    userRoleOptions.map((item) => [item.value, item.label]),
  );
  return flags.map((flag) => labelMap.get(flag) || String(flag)).join('、');
}

function getServiceTypeLabel(serviceType?: number) {
  if (serviceType === undefined || serviceType === null) return '-';
  return (
    serviceTypeLabelMap.value.get(Number(serviceType)) || String(serviceType)
  );
}

async function loadServiceTypeOptions() {
  serviceTypeOptions.value = await loadSeServiceTypeOptions();
}

async function loadData() {
  if (!clientId.value) {
    message.warning($t('seaExport.client.exceptService.missingClientId'));
    return;
  }

  loading.value = true;
  try {
    const result = await getClientExceptServices(clientId.value);
    isEntrustingUnit.value = true;
    portGroups.value = normalizePortGroups(result || []);
  } catch (error) {
    if (isNotEntrustingUnitApiError(error)) {
      isEntrustingUnit.value = false;
      portGroups.value = [];
      return;
    }
    throw error;
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  if (!clientId.value || !isEntrustingUnit.value) return;

  saving.value = true;
  try {
    await editClientExceptServices(
      buildEditPayload(clientId.value, portGroups.value),
    );
    message.success($t('ui.actionMessage.operationSuccess'));
    await loadData();
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await loadServiceTypeOptions();
  await loadData();
});
</script>

<template>
  <Page auto-content-height>
    <Spin :spinning="loading">
      <Alert
        v-if="!loading && !isEntrustingUnit"
        type="warning"
        show-icon
        class="mb-4"
        :message="$t('seaExport.client.exceptService.notEntrustingUnit')"
      />

      <template v-else-if="isEntrustingUnit">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div class="text-sm text-gray-500">
            {{ $t('seaExport.client.exceptService.hint') }}
          </div>
          <Space>
            <Button @click="loadData">
              {{ $t('common.refresh') }}
            </Button>
            <Button type="primary" :loading="saving" @click="handleSave">
              {{ $t('common.save') }}
            </Button>
          </Space>
        </div>

        <Empty
          v-if="!loading && portGroups.length === 0"
          :description="$t('seaExport.client.exceptService.emptyConfig')"
        />

        <div v-else class="space-y-4">
          <Card
            v-for="group in portGroups"
            :key="getPortGroupKey(group.polId)"
            size="small"
            :title="formatPolLabel(group.pol, group.polId)"
          >
            <Table
              :data-source="group.items"
              :pagination="false"
              row-key="id"
              size="small"
              :columns="[
                {
                  title: $t('seaExport.client.exceptService.serviceType'),
                  dataIndex: 'serviceType',
                  key: 'serviceType',
                  width: 140,
                },
                {
                  title: $t('seaExport.client.exceptService.userAttribute'),
                  dataIndex: 'userAttribute',
                  key: 'userAttribute',
                  width: 180,
                },
                {
                  title: $t('seaExport.client.exceptService.autoComplete'),
                  dataIndex: 'autoComplete',
                  key: 'autoComplete',
                  width: 100,
                  align: 'center',
                },
                {
                  title: $t('seaExport.client.exceptService.manualAllowed'),
                  dataIndex: 'manualAllowed',
                  key: 'manualAllowed',
                  width: 110,
                  align: 'center',
                },
                {
                  title: $t('seaExport.client.exceptService.reminder'),
                  dataIndex: 'reminder',
                  key: 'reminder',
                  width: 100,
                  align: 'center',
                },
                {
                  title: $t('seaExport.client.exceptService.remark'),
                  dataIndex: 'remark',
                  key: 'remark',
                  ellipsis: true,
                },
                {
                  title: $t('seaExport.client.exceptService.enabled'),
                  dataIndex: 'isChecked',
                  key: 'isChecked',
                  width: 100,
                  align: 'center',
                  fixed: 'right',
                },
              ]"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'serviceType'">
                  {{ getServiceTypeLabel(record.serviceType) }}
                </template>
                <template v-else-if="column.key === 'userAttribute'">
                  {{ formatUserAttribute(record.userAttribute) }}
                </template>
                <template v-else-if="column.key === 'autoComplete'">
                  {{ record.autoComplete ? $t('common.yes') : $t('common.no') }}
                </template>
                <template v-else-if="column.key === 'manualAllowed'">
                  {{
                    record.manualAllowed ? $t('common.yes') : $t('common.no')
                  }}
                </template>
                <template v-else-if="column.key === 'reminder'">
                  {{ record.reminder ? $t('common.yes') : $t('common.no') }}
                </template>
                <template v-else-if="column.key === 'remark'">
                  {{ record.remark || '-' }}
                </template>
                <template v-else-if="column.key === 'isChecked'">
                  <Switch v-model:checked="record.isChecked" />
                </template>
              </template>
            </Table>
          </Card>
        </div>
      </template>
    </Spin>
  </Page>
</template>
