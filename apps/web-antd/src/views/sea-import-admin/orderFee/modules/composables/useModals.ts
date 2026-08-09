import { ref } from 'vue';
import type OrderFeeEditorModal from '../order-fee-editor-modal.vue';
import type OrderFeeAuditHistoryModal from '../order-fee-audit-history-modal.vue';
import type BatchImportFeeModal from '../batch-import-fee-modal.vue';
import type { OrderFeeAdminApi } from '#/api/sea-import/order-fee-admin';

/**
 * 模态框管理 Composable
 */
export function useModals() {
  const modifyModalRef = ref<InstanceType<typeof OrderFeeEditorModal>>();
  const auditHistoryModalRef =
    ref<InstanceType<typeof OrderFeeAuditHistoryModal>>();
  const batchImportModalRef = ref<InstanceType<typeof BatchImportFeeModal>>();

  /**
   * 打开审核历史弹窗
   */
  const openAuditHistoryModal = (row: OrderFeeAdminApi.OrderFeeDto) => {
    if (!row) return;
    auditHistoryModalRef.value?.modalApi.setData(row);
    auditHistoryModalRef.value?.modalApi.open();
  };

  /**
   * 打开修改费用模态框
   */
  const openModifyModal = (
    feeData: OrderFeeAdminApi.OrderFeeDto,
    orderBaseData?: any,
  ) => {
    if (!feeData) return;
    modifyModalRef.value?.modalApi.setData({
      feeData: feeData,
      orderBaseData: orderBaseData,
    });
    modifyModalRef.value?.modalApi.open();
  };

  /**
   * 处理模态框确认
   */
  const handleModalConfirm = (data: {
    originalData: OrderFeeAdminApi.OrderFeeDto | null;
    updatedData: OrderFeeAdminApi.OrderFeeDto | null;
  }) => {
    // 这里应该调用 actions 中的处理方法
    console.log('Modal confirmed:', data);
  };

  return {
    modifyModalRef,
    auditHistoryModalRef,
    batchImportModalRef,
    openAuditHistoryModal,
    openModifyModal,
    handleModalConfirm,
  };
}
