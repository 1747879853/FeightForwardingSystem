import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SeFreiPriceOutDto } from '#/api/sea-export/freight-rate-admin';
import { getEnumItems } from '#/utils/init-enum';
import { $t } from '#/locales';

// 定义明确的接口类型
interface FreightConditionItemOption {
  label: string;
  value: number | string;
  description?: string;
}

interface ConditionComparisonTypeOption {
  label: string;
  value: number | string;
}
// 订单状态下拉框
let freightConditionItemOptions: FreightConditionItemOption[] = [];
let conditionComparisonTypeOptions: ConditionComparisonTypeOption[] = [];
(async () => {
  // 从缓存获取枚举项（如果缓存不存在会自动加载）
  const freightConditionItems = await getEnumItems('freightConditionItem');
  freightConditionItemOptions = freightConditionItems.map((item) => {
    return {
      label: item.displayName || '',
      value: item.value,
      description: item.description, // 可选：如果需要在选项中显示描述信息
    };
  });

  const conditionComparisonTypeItems = await getEnumItems(
    'ConditionComparisonType',
  );
  conditionComparisonTypeOptions = conditionComparisonTypeItems.map((item) => {
    return {
      label: item.displayName || '',
      value: item.value,
    };
  });
})();
/**
 * 从数据中提取所有唯一的箱型名称
 */
function extractUniqueCtnNames(data: SeFreiPriceOutDto[]): string[] {
  const ctnNames = new Set<string>();
  data.forEach((row) => {
    row.seFreiPriceCtns?.forEach((ctn) => {
      if (ctn.ctnCode?.ctnName) {
        ctnNames.add(ctn.ctnCode.ctnName);
      }
    });
  });
  return Array.from(ctnNames).sort();
}

/**
 * 获取指定箱型名称的成本值
 */
function getCtnCost(row: SeFreiPriceOutDto, ctnName: string): number | string {
  const ctn = row.seFreiPriceCtns?.find(
    (item) => item.ctnCode?.ctnName === ctnName,
  );
  return ctn?.cost ?? '-';
}

/**
 * 格式化附加费显示
 * 格式示例：
 * - 简单模式（只有value）：文件费 rmb： 20gp:100   40gp:200  40hc:300
 * - 条件模式（有price和otherPrice）：超重费 usd：【毛重≥22500】20gp:100/200   【毛重＞22500】40gp:200/300
 */
export function formatSurchargeFees(row: SeFreiPriceOutDto): string {
  if (!row.seFreiPriceFees || row.seFreiPriceFees.length === 0) {
    return '-';
  }

  const feeLines: string[] = [];

  row.seFreiPriceFees.forEach((fee) => {
    if (!fee.seFreiPriceCtnFees || fee.seFreiPriceCtnFees.length === 0) {
      return;
    }

    // 获取费用名称和币别
    const feeName =
      fee.feeCode?.cnName || fee.feeCode?.enName || `费用${fee.feeCodeId}`;
    const currencyName =
      fee.currency?.name || fee.currency?.code || `币种${fee.currencyId}`;

    // 检查是否有条件费用（value 或 otherPrice 有值）
    const hasCondition = fee.seFreiPriceCtnFees.some(
      (ctnFee) => ctnFee.value !== undefined && ctnFee.value !== null,
    );

    if (hasCondition) {
      // 条件模式：按条件分组显示
      // 将相同条件的箱型费用分组
      const conditionGroups = new Map<
        string,
        Array<{ ctnName: string; price: number; otherPrice?: number }>
      >();

      fee.seFreiPriceCtnFees.forEach((ctnFee) => {
        // 构建条件描述
        let conditionDesc = '';
        if (ctnFee.value !== undefined && ctnFee.value !== null) {
          const matchedOperator = conditionComparisonTypeOptions.find(
            (o) => o.value === ctnFee.operatorType,
          );
          const matchedCondition = freightConditionItemOptions.find(
            (o) => o.value === ctnFee.conditionType,
          );
          const operator = matchedOperator ? matchedOperator.label : '';
          const condition = matchedCondition ? matchedCondition.label : '';
          conditionDesc = `${condition}${operator}${ctnFee.value}`;
        }

        // 通过 seFreiPriceCtnId 查找对应的箱型信息
        const ctnInfo = row.seFreiPriceCtns?.find(
          (ctn) => ctn.id === ctnFee.seFreiPriceCtnId,
        );
        const ctnName =
          ctnInfo?.ctnCode?.ctnName || `箱型${ctnInfo?.ctnCodeId || '?'}`;

        if (!conditionGroups.has(conditionDesc)) {
          conditionGroups.set(conditionDesc, []);
        }
        conditionGroups.get(conditionDesc)?.push({
          ctnName,
          price: ctnFee.price,
          otherPrice: ctnFee.otherPrice,
        });
      });

      // 构建条件模式的显示文本
      const conditionParts: string[] = [];
      conditionGroups.forEach((items, condition) => {
        const ctnPrices = items
          .map((item) => {
            const priceStr =
              item.otherPrice !== null
                ? `${item.price}/${item.otherPrice}`
                : `${item.price}`;
            return `${item.ctnName}:${priceStr}`;
          })
          .join('   ');
        if (condition === '') {
          conditionParts.push(ctnPrices);
        } else {
          conditionParts.push(`【${condition}】${ctnPrices}`);
        }
      });

      feeLines.push(
        `${feeName} ${currencyName.toLowerCase()}：${conditionParts.join('   ')}\n`,
      );
    } else {
      // 简单模式：直接显示所有箱型的价格
      const ctnPrices = fee.seFreiPriceCtnFees
        .map((ctnFee) => {
          // 通过 seFreiPriceCtnId 查找对应的箱型信息
          const ctnInfo = row.seFreiPriceCtns?.find(
            (ctn) => ctn.id === ctnFee.seFreiPriceCtnId,
          );
          const ctnName =
            ctnInfo?.ctnCode?.ctnName || `箱型${ctnInfo?.ctnCodeId || '?'}`;
          return `${ctnName}:${ctnFee.price}`;
        })
        .join('   ');

      feeLines.push(`${feeName} ${currencyName.toLowerCase()}：${ctnPrices}`);
    }
  });

  return feeLines.length > 0 ? feeLines.join('<br/>') : '-';
}

/**
 * 表格搜索表单配置
 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
      fieldName: 'carrierId',
      label: $t('seaExport.freightRate.carrierId'),
      componentProps: {
        api: async () => {
          const { getCarrierPagedList } =
            await import('#/api/system/base-data/carrier-admin');
          const res = await getCarrierPagedList({ PageSize: 1000 });
          return (res.items || []).map((item: any) => ({
            label: item.cnName || item.enName,
            value: item.id,
          }));
        },
        showSearch: true,
        filterOption: true,
        placeholder: $t('common.pleaseSelect'),
      },
    },
    {
      component: 'ApiSelect',
      fieldName: 'polId',
      label: $t('seaExport.freightRate.polId'),
      componentProps: {
        api: async () => {
          const { getPortCodePagedList } =
            await import('#/api/system/base-data/port-code-admin');
          const res = await getPortCodePagedList({ PageSize: 1000 });
          return (res.items || []).map((item: any) => ({
            label: `${item.cnName}(${item.portName})`,
            value: item.id,
          }));
        },
        showSearch: true,
        filterOption: true,
        placeholder: $t('common.pleaseSelect'),
      },
    },
    {
      component: 'ApiSelect',
      fieldName: 'podId',
      label: $t('seaExport.freightRate.podId'),
      componentProps: {
        api: async () => {
          const { getPortCodePagedList } =
            await import('#/api/system/base-data/port-code-admin');
          const res = await getPortCodePagedList({ PageSize: 1000 });
          return (res.items || []).map((item: any) => ({
            label: `${item.cnName}(${item.portName})`,
            value: item.id,
          }));
        },
        showSearch: true,
        filterOption: true,
        placeholder: $t('common.pleaseSelect'),
      },
    },
    {
      component: 'RadioGroup',
      fieldName: 'recommend',
      label: $t('seaExport.freightRate.recommend'),
      componentProps: {
        options: [
          { label: $t('common.yes'), value: true },
          { label: $t('common.no'), value: false },
        ],
        buttonStyle: 'solid',
        optionType: 'button',
      },
    },
    {
      component: 'RadioGroup',
      fieldName: 'isValid',
      label: $t('seaExport.freightRate.isValid'),
      componentProps: {
        options: [
          { label: $t('common.valid'), value: true },
          { label: $t('common.invalid'), value: false },
        ],
        buttonStyle: 'solid',
        optionType: 'button',
      },
    },
  ];
}

/**
 * 表格列配置
 */
export function useColumns<T = SeFreiPriceOutDto>(
  onActionClick: OnActionClickFn<T>,
  data?: SeFreiPriceOutDto[], // 添加数据参数用于生成动态列
): VxeTableGridOptions['columns'] {
  // 基础固定列
  const baseColumns: VxeTableGridOptions['columns'] = [
    {
      type: 'checkbox',
      width: 60,
      fixed: 'left',
    },

    {
      field: 'carrier.cnShortName',
      title: $t('seaExport.freightRate.carrierId'),
      width: 100,
      formatter: ({ row }) => {
        return row.carrier?.cnShortName || row.carrier?.code || '-';
      },
    },
    {
      field: 'currency.cnName',
      title: $t('seaExport.freightRate.currencyId'),
      width: 80,
      formatter: ({ row }) => {
        return row.currency?.cnName || row.currency?.code || '-';
      },
    },
    {
      field: 'pol.cnName',
      title: $t('seaExport.freightRate.polId'),
      width: 120,
      formatter: ({ row }) => {
        return row.pol?.cnName || row.pol?.portName || '-';
      },
    },
    {
      field: 'pod.cnName',
      title: $t('seaExport.freightRate.podId'),
      width: 120,
      formatter: ({ row }) => {
        return row.pod?.cnName || row.pod?.portName || '-';
      },
    },
    {
      field: 'isDirect',
      title: $t('seaExport.freightRate.isDirect'),
      width: 80,
      cellRender: {
        name: 'CellTag',
        options: [
          { color: 'success', label: $t('common.yes'), value: true },
          { color: 'default', label: $t('common.no'), value: false },
        ],
      },
    },
    {
      field: 'voyage',
      title: $t('seaExport.freightRate.voyage'),
      width: 100,
    },
    {
      field: 'etd',
      title: $t('seaExport.freightRate.etd'),
      width: 120,
      formatter: 'formatDate',
    },
    {
      field: 'freeDays',
      title: $t('seaExport.freightRate.freeDays'),
      width: 110,
    },
    {
      field: 'validTimeRange',
      title: $t('seaExport.freightRate.validTimeStart'),
      width: 220,
      formatter: ({ row }) => {
        const startDate = row.validTimeStart;
        const endDate = row.validTimeEnd;

        // 格式化日期
        const formatStartDate = startDate ? formatDateStr(startDate) : '';
        const formatEndDate = endDate ? formatDateStr(endDate) : '';

        if (formatStartDate && formatEndDate) {
          return `${formatStartDate}~${formatEndDate}`;
        } else if (formatStartDate) {
          return `${formatStartDate}~`;
        } else if (formatEndDate) {
          return `~${formatEndDate}`;
        } else {
          return '-';
        }
      },
    },
    {
      field: 'isValid',
      title: $t('seaExport.freightRate.isValid'),
      width: 80,
      cellRender: {
        name: 'CellTag',
        options: [
          { color: 'success', label: $t('common.valid'), value: true },
          { color: 'error', label: $t('common.invalid'), value: false },
        ],
      },
    },
    {
      field: 'recommend',
      title: $t('seaExport.freightRate.recommend'),
      width: 80,
      cellRender: {
        name: 'CellTag',
        options: [
          { color: 'warning', label: $t('common.yes'), value: true },
          { color: 'default', label: $t('common.no'), value: false },
        ],
      },
    },
    {
      field: 'remark',
      title: $t('seaExport.freightRate.remark'),
      minWidth: 150,
      showOverflow: true,
    },
    {
      field: 'surchargeFees',
      title: $t('seaExport.freightRate.surchargeFees'),
      minWidth: 300,
      align: 'left',
      showOverflow: true,
      slots: { default: 'surchargeFees' },
    },
  ];

  // 动态生成箱型报价列
  let dynamicCtnColumns: VxeTableGridOptions['columns'] = [];
  if (data && data.length > 0) {
    const ctnNames = extractUniqueCtnNames(data);
    dynamicCtnColumns = ctnNames.map((ctnName) => ({
      field: `ctn_${ctnName}`,
      title: ctnName,
      width: 100,
      align: 'right',
      formatter: ({ row }) => {
        const cost = getCtnCost(row as SeFreiPriceOutDto, ctnName);
        return cost === '-' ? '-' : Number(cost).toFixed(2);
      },
    }));
  }

  // 操作列
  const operationColumn: VxeTableGridOptions['columns'] = [
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'id',
          nameTitle: $t('seaExport.freightRate.name'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          { code: 'addCtn', text: '添加箱型' },
          { code: 'edit', text: $t('common.edit') },
          { code: 'delete', danger: true, text: $t('common.delete') },
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('seaExport.freightRate.operation'),
      width: 200,
    },
  ];

  // 合并所有列：基础列 + 动态箱型列 + 操作列
  return [...baseColumns, ...dynamicCtnColumns, ...operationColumn];
}

/**
 * 格式化日期字符串
 */
function formatDateStr(dateValue: string | Date | undefined): string {
  if (!dateValue) return '';

  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
