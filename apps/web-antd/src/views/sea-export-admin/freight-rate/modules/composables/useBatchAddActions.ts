import { ref, computed } from 'vue';
import { message, Modal } from 'ant-design-vue';
import { batchAddSimpleSeFreiPrice } from '#/api/sea-export/freight-rate-admin';

/**
 * 批量新增运价 - 操作逻辑 Composable
 */
export function useBatchAddActions(
  dataSource: any,
  selectedRowKeys: any,
  addedCtnTypes: any,
  allCtnOptions: any,
  validateForm: () => boolean,
  prepareSubmitData: (labelToIdMap?: {
    carriers: Map<string, string>;
    ports: Map<string, string>;
    currencies: Map<string, string>;
    clients: Map<string, string>;
  }) => any[],
  reset: () => void,
  emit: (event: 'success') => void,
) {
  const loading = ref(false);
  const customRowCountVisible = ref(false);
  const customRowCount = ref<number>(1);
  const selectedCtnId = ref<number | string | undefined>(undefined);

  /**
   * 新增行
   */
  function handleAddRow(count: number = 1) {
    // 由父组件调用 dataSource.addRow(count)
  }

  /**
   * 显示自定义行数弹窗
   */
  function showCustomRowCountModal() {
    customRowCount.value = 1;
    customRowCountVisible.value = true;
  }

  /**
   * 确认自定义行数
   */
  async function handleConfirmCustomRowCount(
    addRowFn: (count: number) => void,
  ) {
    if (!customRowCount.value || customRowCount.value <= 0) {
      message.warning('请输入有效的行数');
      return;
    }

    if (customRowCount.value > 100) {
      message.warning('单次最多新增100行');
      return;
    }

    customRowCountVisible.value = false;
    addRowFn(customRowCount.value);
  }

  /**
   * 删除选中行
   */
  function handleDeleteRows(deleteFn: () => boolean) {
    if (selectedRowKeys.value.length === 0) {
      message.warning('请先选择要删除的行');
      return;
    }

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedRowKeys.value.length} 行数据吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        deleteFn();
      },
    });
  }

  /**
   * 复制选中行
   */
  function handleCopyRows(copyFn: () => void) {
    if (selectedRowKeys.value.length === 0) {
      message.warning('请先选择要复制的行');
      return;
    }

    copyFn();
  }

  /**
   * 添加箱型列
   */
  function handleAddCtnType(value: any) {
    if (!value) return;

    const ctnCodeId = value;

    // 检查是否已添加
    if (
      addedCtnTypes.value.some(
        (ctn: any) => String(ctn.ctnCodeId) === String(ctnCodeId),
      )
    ) {
      message.warning('该箱型已添加');
      return;
    }

    // 查找箱型
    const ctn = allCtnOptions.value.find(
      (c: any) => String(c.ctnCodeId) === String(ctnCodeId),
    );

    if (!ctn) {
      message.error('未找到箱型信息');
      return;
    }

    addedCtnTypes.value.push({ ...ctn });

    // ⚠️ 关键修复：为所有行添加该箱型的空值，并创建新数组引用触发 shallowRef 响应式
    const updatedDataSource = dataSource.value.map((row: any) => {
      // 添加 seFreiPriceCtns 项
      row.seFreiPriceCtns.push({
        ctnCodeId: ctn.ctnCodeId,
        cost: undefined,
      });
      
      // 添加动态字段
      const dynamicField = `ctn_${String(ctn.ctnCodeId)}`;
      if (!(dynamicField in row)) {
        row[dynamicField] = undefined;
      }
      
      return row;
    });
    
    // 更新 dataSource 引用，触发 shallowRef 响应式
    dataSource.value = updatedDataSource;

    // 清空选中的箱型ID
    selectedCtnId.value = undefined;

    message.success('添加箱型成功');
  }

  /**
   * 获取可用的箱型选项（排除已添加的）
   */
  const availableCtnOptions = computed(() => {
    const addedIds = new Set(
      addedCtnTypes.value.map((c: any) => String(c.ctnCodeId)),
    );
    return allCtnOptions.value.filter(
      (c: any) => !addedIds.has(String(c.ctnCodeId)),
    );
  });

  /**
   * 箱型选项模糊搜索过滤函数
   */
  function filterCtnOption(input: string, option: any) {
    if (!input) return true;
    const ctnName = option?.ctnName || '';
    return ctnName.toLowerCase().includes(input.toLowerCase());
  }

  /**
   * 提交表单
   */
  async function handleSubmit(labelToIdMap?: {
    carriers: Map<string, string>;
    ports: Map<string, string>;
    currencies: Map<string, string>;
    clients: Map<string, string>;
  }) {
    if (!validateForm()) {
      return;
    }

    loading.value = true;
    try {
      const submitData = prepareSubmitData(labelToIdMap);

      console.log('提交数据:', submitData);

      await batchAddSimpleSeFreiPrice(submitData);

      message.success('批量新增成功');
      emit('success');
    } catch (error) {
      console.error('批量新增失败:', error);
      message.error('批量新增失败');
    } finally {
      loading.value = false;
    }
  }

  /**
   * 重置表单
   */
  function handleReset() {
    reset();
  }

  return {
    loading,
    customRowCountVisible,
    customRowCount,
    selectedCtnId,
    availableCtnOptions,
    handleAddRow,
    showCustomRowCountModal,
    handleConfirmCustomRowCount,
    handleDeleteRows,
    handleCopyRows,
    handleAddCtnType,
    filterCtnOption,
    handleSubmit,
    handleReset,
  };
}
