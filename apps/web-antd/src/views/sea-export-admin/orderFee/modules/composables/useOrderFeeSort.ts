import { ref, computed } from 'vue';

/**
 * 可排序字段列表
 */
const SORTABLE_FIELDS = new Set([
  'invoiceStatus',
  'combinedFeeStatus',
  'feeCodeId',
  'industryCategory',
  'settlementId',
  'currencyId',
  'exchangeRate',
  'unitPrice',
  'amount',
  'unit',
  'quantity',
  'taxRate',
  'noTaxUnitPrice',
  'noTaxAmount',
  'rqstPaymentAmount',
  'invoicedAmount',
  'orderInvoiceAmount',
  'settledAmount',
  'invoiceBlocked',
  'isConfidential',
  'remark',
  'dataEntryMethod',
  'creatorUserName',
  'creationTime',
]);

/**
 * 排序功能 Composable
 */
export function useOrderFeeSort(getTableDate: () => void) {
  const sortState = ref<{
    field: string | null;
    order: 'asc' | 'desc' | null;
  }>({
    field: null,
    order: null,
  });

  /**
   * 获取排序图标
   */
  const getSortIcon = (field: string) => {
    if (sortState.value.field !== field) {
      return '▼';
    }
    if (sortState.value.order === 'asc') {
      return '▲';
    }
    return '▼';
  };

  /**
   * 可排序字段集合（计算属性）
   */
  const sortableFieldsSet = computed(() => SORTABLE_FIELDS);

  /**
   * 处理列头点击排序
   */
  const handleColumnSort = (field: string, dataSource: any[]) => {
    if (!field) return;

    let newOrder: 'asc' | 'desc' | null = 'asc';

    if (sortState.value.field === field) {
      if (sortState.value.order === 'asc') {
        newOrder = 'desc';
      } else if (sortState.value.order === 'desc') {
        newOrder = null;
      }
    }

    sortState.value = {
      field: newOrder ? field : null,
      order: newOrder,
    };

    if (newOrder && field) {
      sortDataSource(field, newOrder, dataSource);
    } else {
      getTableDate();
    }
  };

  /**
   * 对数据源进行排序
   */
  const sortDataSource = (
    field: string,
    order: 'asc' | 'desc',
    dataSource: any[],
  ) => {
    if (!dataSource || dataSource.length === 0) return;

    const sorted = [...dataSource].sort((a: any, b: any) => {
      let aValue = a[field];
      let bValue = b[field];

      if (field.includes('.')) {
        const keys = field.split('.');
        aValue = keys.reduce((obj: any, key: string) => obj?.[key], a);
        bValue = keys.reduce((obj: any, key: string) => obj?.[key], b);
      }

      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return order === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      if (aStr < bStr) return order === 'asc' ? -1 : 1;
      if (aStr > bStr) return order === 'asc' ? 1 : -1;
      return 0;
    });

    // 直接修改原数组
    dataSource.splice(0, dataSource.length, ...sorted);
  };

  return {
    sortState,
    sortableFieldsSet,
    getSortIcon,
    handleColumnSort,
  };
}
