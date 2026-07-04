<script lang="ts" setup>
import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';
import { computed, ref, watch } from 'vue';
import { Button, message, Modal, Space, Table, Input } from 'ant-design-vue';
import { $t } from '#/locales';
import { useVbenModal } from '@vben/common-ui';
import {
  getSeaExportFees,
  importOrderFeesToTransportOrder,
} from '#/api/sea-export/order-fee-admin';
import { CarrierSelect, PortSelect } from '#/adapter/component/biz-select';

const emit = defineEmits(['confirm']);

// 弹窗状态
const [modal, modalApi] = useVbenModal({
  onOpenChange: async (isOpen) => {
    if (isOpen) {
      // 获取传入的参数
      const data = modalApi.getData() as {
        transportOrderId: string;
        paySide: number;
        carrierId?: number;
        polId?: number;
        podId?: number;
      };

      if (data) {
        currentTransportOrderId.value = data.transportOrderId;
        currentPaySide.value = data.paySide;

        // 设置默认检索条件
        searchForm.value.carrierId = data.carrierId;
        searchForm.value.pOLId = data.polId;
        searchForm.value.pODId = data.podId;

        // 自动执行搜索，使用默认条件查询业务列表
        await handleSearch();
      }
    } else {
      // 关闭时重置状态
      resetState();
    }
  },
});

// 当前业务ID和收付类型
const currentTransportOrderId = ref<string>('');
const currentPaySide = ref<number>(0);

// 搜索表单
const searchForm = ref<OrderFeeAdminApi.SeaExportFeeQueryInputDto>({
  clientId: undefined,
  carrierId: undefined,
  pOLId: undefined,
  pODId: undefined,
  keyword: '',
  paySide: undefined,
});

// 海运出口列表数据
const seaExportList = ref<OrderFeeAdminApi.SeaExportFeeListDto[]>([]);
const selectedSeaExport = ref<OrderFeeAdminApi.SeaExportFeeListDto | null>(
  null,
);
const selectedFeeIds = ref<string[]>([]);
const loading = ref(false);

// 搜索海运出口
const handleSearch = async () => {
  loading.value = true;
  try {
    const params: OrderFeeAdminApi.SeaExportFeeQueryInputDto = {
      ...searchForm.value,
      paySide: currentPaySide.value, // 强制使用当前收付类型
    };

    const res = await getSeaExportFees(params);
    seaExportList.value = res || [];

    // 清空之前的选择
    selectedSeaExport.value = null;
    selectedFeeIds.value = [];

    message.success({
      content: `查询到 ${seaExportList.value.length} 条符合条件的业务`,
      key: 'search_msg',
    });
  } catch (error) {
    console.error('查询失败:', error);
    message.error({
      content: '查询失败，请稍后重试',
      key: 'search_msg',
    });
  } finally {
    loading.value = false;
  }
};

// 选择海运出口（单选）
const handleSelectSeaExport = (
  record: OrderFeeAdminApi.SeaExportFeeListDto,
) => {
  console.log('👆 [handleSelectSeaExport] 点击业务:', record);
  console.log(
    '📋 [handleSelectSeaExport] 该业务的费用数量:',
    record.orderFees?.length || 0,
  );

  selectedSeaExport.value = record;
  selectedFeeIds.value = []; // 清空已选费用

  console.log(
    '✅ [handleSelectSeaExport] 已选中业务，selectedSeaExport:',
    selectedSeaExport.value,
  );
};

// 复选框变化处理
const handleFeeSelectionChange = (selectedRowKeys: any[]) => {
  console.log('☑️ [handleFeeSelectionChange] 选中的费用ID:', selectedRowKeys);
  selectedFeeIds.value = selectedRowKeys as string[];
};

// 选择费用（多选）- 保留此函数用于兼容
const handleSelectFee = (feeId: string) => {
  const index = selectedFeeIds.value.indexOf(feeId);
  if (index > -1) {
    selectedFeeIds.value.splice(index, 1);
  } else {
    selectedFeeIds.value.push(feeId);
  }
};

// 判断费用是否被选中
const isFeeSelected = (feeId: string) => {
  return selectedFeeIds.value.includes(feeId);
};

// 导入费用
const handleImport = async () => {
  if (!selectedSeaExport.value) {
    message.warning('请先选择一笔业务');
    return;
  }

  if (selectedFeeIds.value.length === 0) {
    message.warning('请至少选择一个费用');
    return;
  }

  Modal.confirm({
    title: '确认导入',
    content: `确定要导入选中的 ${selectedFeeIds.value.length} 条费用吗？`,
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      try {
        const params: OrderFeeAdminApi.ImportOrderFeesToTransportOrderInputDto =
          {
            transportOrderId: currentTransportOrderId.value,
            orderFeeIds: selectedFeeIds.value,
            changeOrderId: undefined, // 暂不支持更改单
            importOriginalSettlement: false, // 默认不保留原结算对象
          };

        const result = await importOrderFeesToTransportOrder(params);

        message.success({
          content: `成功导入 ${result.length} 条费用`,
          key: 'import_msg',
        });

        // 触发确认事件，通知父组件刷新
        emit('confirm');

        // 关闭弹窗
        modalApi.close();
      } catch (error) {
        console.error('导入失败:', error);
        message.error({
          content: '导入失败，请稍后重试',
          key: 'import_msg',
        });
      }
    },
  });
};

// 重置状态
const resetState = () => {
  searchForm.value = {
    clientId: undefined,
    carrierId: undefined,
    pOLId: undefined,
    pODId: undefined,
    keyword: '',
    paySide: undefined,
  };
  seaExportList.value = [];
  selectedSeaExport.value = null;
  selectedFeeIds.value = [];
};

// 暴露modalApi供父组件调用
defineExpose({
  modalApi,
});
</script>

<template>
  <modal
    :title="$t('seaExport.export.orderFee.batchImportFee')"
    class="h-[780px] w-[1600px]"
    :footer="null"
    :bodyStyle="{ padding: '24px' }"
  >
    <div class="batch-import-container">
      <!-- 搜索区域 -->
      <div class="search-section">
        <Space size="middle" class="search-form">
          <div class="form-item">
            <span class="label">{{ $t('seaExport.export.carrierId') }}:</span>
            <CarrierSelect
              v-model="searchForm.carrierId"
              placeholder="请选择船公司"
              style="width: 200px"
              allow-clear
            />
          </div>

          <div class="form-item">
            <span class="label">{{ $t('seaExport.export.polId') }}:</span>
            <PortSelect
              v-model="searchForm.pOLId"
              placeholder="请选择起运港"
              style="width: 200px"
              allow-clear
              label-key="portName"
            />
          </div>

          <div class="form-item">
            <span class="label">{{ $t('seaExport.export.podId') }}:</span>
            <PortSelect
              v-model="searchForm.pODId"
              placeholder="请选择目的港"
              style="width: 200px"
              allow-clear
              label-key="portName"
            />
          </div>

          <div class="form-item">
            <span class="label">编号:</span>
            <Input
              v-model:value="searchForm.keyword"
              placeholder="委托编号/提单号"
              style="width: 200px"
              allow-clear
            />
          </div>

          <Button type="primary" @click="handleSearch" :loading="loading">
            查询
          </Button>
        </Space>
      </div>

      <!-- 海运出口列表 -->
      <div class="sea-export-section">
        <h3 class="section-title">
          海运出口业务列表 <span class="hint-text">（点击行选择）</span>
        </h3>
        <Table
          :dataSource="seaExportList"
          :columns="[
            {
              title: '委托编号',
              dataIndex: ['transportOrder', 'commissionNum'],
              key: 'commissionNum',
              width: 120,
              fixed: 'left',
            },
            {
              title: '主提单号',
              dataIndex: ['transportOrder', 'mblNum'],
              key: 'mblNum',
              width: 160,
            },
            {
              title: '委托单位',
              dataIndex: ['transportOrder', 'clientName'],
              key: 'clientName',
              width: 150,
            },
            {
              title: '船公司',
              dataIndex: 'carrierName',
              key: 'carrierName',
              width: 170,
            },
            {
              title: '起运港',
              dataIndex: 'pOLName',
              key: 'pOLName',
              width: 130,
            },
            {
              title: '目的港',
              dataIndex: 'pODName',
              key: 'pODName',
              width: 130,
            },
            { title: '船名', dataIndex: 'vessel', key: 'vessel', width: 120 },
            {
              title: '航次',
              dataIndex: 'innerVoyno',
              key: 'innerVoyno',
              width: 80,
            },
            {
              title: '箱型箱量',
              dataIndex: ['transportOrder', 'totalCtn'],
              key: 'totalCtn',
              width: 150,
            },
          ]"
          :rowKey="(record) => record.id"
          :pagination="false"
          :scroll="{ x: 1200, y: 200 }"
          :rowClassName="
            (record) =>
              selectedSeaExport?.id === record.id ? 'selected-row' : ''
          "
          :customRow="
            (record) => ({
              onClick: () => handleSelectSeaExport(record),
            })
          "
        />
      </div>

      <!-- 费用列表 -->
      <div class="fee-section" v-if="selectedSeaExport">
        <div class="fee-header">
          <h3 class="section-title">
            费用列表 <span class="hint-text">（点击行选择/取消）</span>
          </h3>
          <Button
            type="primary"
            @click="handleImport"
            :disabled="selectedFeeIds.length === 0"
          >
            导入选中费用 ({{ selectedFeeIds.length }})
          </Button>
        </div>

        <Table
          :dataSource="selectedSeaExport.orderFees"
          :row-selection="{
            selectedRowKeys: selectedFeeIds,
            onChange: handleFeeSelectionChange,
            getCheckboxProps: (record) => ({
              disabled: false,
            }),
            columnWidth: 50,
          }"
          :columns="[
            {
              title: '收付类型',
              dataIndex: 'paySide',
              key: 'paySide',
              width: 80,
              customRender: ({ text }) => (text === 0 ? '应收' : '应付'),
            },
            {
              title: '费用名称',
              dataIndex: 'feeCodeName',
              key: 'feeCodeName',
              width: 120,
            },
            {
              title: '结算对象',
              dataIndex: 'settlementName',
              key: 'settlementName',
              width: 150,
            },
            {
              title: '币别',
              dataIndex: 'currencyCode',
              key: 'currencyCode',
              width: 80,
            },
            {
              title: '汇率',
              dataIndex: 'exchangeRate',
              key: 'exchangeRate',
              width: 80,
            },
            {
              title: '含税单价',
              dataIndex: 'unitPrice',
              key: 'unitPrice',
              width: 100,
            },
            { title: '金额', dataIndex: 'amount', key: 'amount', width: 100 },
            { title: '单位', dataIndex: 'unit', key: 'unit', width: 60 },
            {
              title: '数量',
              dataIndex: 'quantity',
              key: 'quantity',
              width: 80,
            },
            {
              title: '税率(%)',
              dataIndex: 'taxRate',
              key: 'taxRate',
              width: 80,
            },
            {
              title: '备注',
              dataIndex: 'remark',
              key: 'remark',
              ellipsis: true,
            },
          ]"
          :rowKey="(record) => record.id"
          :pagination="false"
          :scroll="{ x: 1400, y: 250 }"
        />
      </div>
    </div>
  </modal>
</template>

<style scoped lang="scss">
.batch-import-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: 700px;
  padding: 4px;
  overflow-y: auto;
}

.search-section {
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 6%);

  .search-form {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;

    .form-item {
      display: flex;
      gap: 8px;
      align-items: center;

      .label {
        font-size: 14px;
        font-weight: 500;
        color: #4a5568;
        white-space: nowrap;
      }

      :deep(.ant-select),
      :deep(.ant-input) {
        min-width: 180px;

        &:hover {
          border-color: #4096ff;
        }

        &:focus {
          border-color: #4096ff;
          box-shadow: 0 0 0 2px rgb(24 144 255 / 20%);
        }
      }
    }
  }
}

.sea-export-section,
.fee-section {
  .section-title {
    padding-left: 12px;
    margin-bottom: 16px;
    font-size: 16px;
    font-weight: 600;
    color: #1f2937;
    border-left: 4px solid #4096ff;

    .hint-text {
      margin-left: 8px;
      font-size: 12px;
      font-weight: normal;
      color: #9ca3af;
    }
  }
}

.fee-section {
  .fee-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    margin-bottom: 16px;
    background: #fafafa;
    border: 1px solid #e5e7eb;
    border-radius: 6px;

    .section-title {
      padding-left: 0;
      margin-bottom: 0;
      border-left: none;
    }
  }
}

:deep(.selected-row) {
  cursor: pointer;
  background-color: #e6f7ff !important;
  transition: all 0.3s ease;

  &:hover {
    background-color: #bae7ff !important;
  }
}

:deep(.selected-fee-row) {
  cursor: pointer;
  background-color: #fff7e6 !important;
  transition: all 0.3s ease;

  &:hover {
    background-color: #ffe7ba !important;
  }
}

:deep(.ant-table-tbody > tr) {
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: #f0f5ff;
  }
}

:deep(.ant-table-wrapper) {
  .ant-table {
    overflow: hidden;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgb(0 0 0 / 6%);
  }

  .ant-table-thead > tr > th {
    font-weight: 600;
    color: #374151;
    background: linear-gradient(to bottom, #fafafa, #f5f5f5);
    border-bottom: 2px solid #e5e7eb;
  }

  .ant-table-tbody > tr > td {
    border-bottom: 1px solid #f0f0f0;
  }

  // 复选框列样式优化
  .ant-table-selection-column {
    width: 50px !important;
    min-width: 50px !important;

    .ant-checkbox-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;

      .ant-checkbox {
        .ant-checkbox-inner {
          width: 16px;
          height: 16px;

          &:hover {
            border-color: #4096ff;
          }
        }

        &.ant-checkbox-checked {
          .ant-checkbox-inner {
            background-color: #4096ff;
            border-color: #4096ff;
          }
        }
      }
    }
  }
}

:deep(.ant-btn-primary) {
  background: linear-gradient(135deg, #4096ff 0%, #1677ff 100%);
  border: none;
  box-shadow: 0 2px 4px rgb(24 144 255 / 30%);

  &:hover {
    background: linear-gradient(135deg, #69b1ff 0%, #4096ff 100%);
    box-shadow: 0 4px 8px rgb(24 144 255 / 40%);
  }

  &:disabled {
    background: #d9d9d9;
    box-shadow: none;
  }
}

/* 滚动条美化 */
.batch-import-container::-webkit-scrollbar {
  width: 8px;
}

.batch-import-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.batch-import-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;

  &:hover {
    background: #a8a8a8;
  }
}
</style>
