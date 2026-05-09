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

  const feeItems: string[] = [];

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

    let contentHtml = '';

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

      // 构建条件模式的显示文本12
      const conditionParts: string[] = [];
      conditionGroups.forEach((items, condition) => {
        const ctnPrices = items
          .map((item) => {
            const priceStr =
              item.otherPrice !== null
                ? `${item.price}/${item.otherPrice}`
                : `${item.price}`;
            return `<span class="inline-block px-1 py-0.5 mx-0.5 bg-blue-50 text-blue-700 rounded text-xs leading-none">${item.ctnName}: ${priceStr}</span>`;
          })
          .join('');

        if (condition === '') {
          conditionParts.push(ctnPrices);
        } else {
          conditionParts.push(
            `<div class="mb-0.5 leading-none"><span class="inline-block px-1 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium mr-1 leading-none">【${condition}】</span>${ctnPrices}</div>`,
          );
        }
      });

      contentHtml = `<div class="px-1.5 py-0.5 mb-0.5 bg-gray-50 rounded border-l-2 border-blue-400 leading-none">
        <div class="text-xs font-semibold text-gray-700 leading-none">${feeName} <span class="text-xs text-gray-500 ml-1">${currencyName.toLowerCase()}</span></div>
        <div class="leading-none">${conditionParts.join('')}</div>
      </div>`;
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
          return `<span class="inline-block px-1 py-0.5 mx-0.5 bg-green-50 text-green-700 rounded text-xs leading-none">${ctnName}: ${ctnFee.price}</span>`;
        })
        .join('');

      contentHtml = `<div class="px-1.5 py-0.5 mb-0.5 bg-gray-50 rounded border-l-2 border-green-400 leading-none">
        <div class="text-xs font-semibold text-gray-700 leading-none">${feeName} <span class="text-xs text-gray-500 ml-1">${currencyName.toLowerCase()}</span></div>
        <div class="leading-none">${ctnPrices}</div>
      </div>`;
    }

    feeItems.push(contentHtml);
  });

  return feeItems.length > 0 ? feeItems.join('') : '-';
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
        allowClear: true,
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
        allowClear: true,
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
        allowClear: true,
        placeholder: $t('common.pleaseSelect'),
      },
    },
    {
      component: 'Select',
      fieldName: 'recommend',
      label: $t('seaExport.freightRate.recommend'),
      componentProps: {
        options: [
          { label: $t('common.all'), value: null },
          { label: $t('common.yes'), value: true },
          { label: $t('common.no'), value: false },
        ],
        placeholder: $t('common.pleaseSelect'),
        allowClear: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'isValid',
      label: $t('seaExport.freightRate.isValid'),
      componentProps: {
        options: [
          { label: $t('common.all'), value: null },
          { label: $t('common.valid'), value: true },
          { label: $t('common.invalid'), value: false },
        ],
        placeholder: $t('common.pleaseSelect'),
        allowClear: true,
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
      field: 'recommend',
      title: $t('seaExport.freightRate.recommend'),
      width: 80,
      slots: { default: 'recommend' },
    },
    {
      field: 'carrier.enName',
      title: $t('seaExport.freightRate.carrierId'),
      width: 100,
      formatter: ({ row }) => {
        return row.carrier?.code || '-';
      },
    },
    {
      field: 'currency.code',
      title: $t('seaExport.freightRate.currencyId'),
      width: 80,
      formatter: ({ row }) => {
        return row.currency?.code || '-';
      },
    },
    {
      field: 'pol.portName',
      title: $t('seaExport.freightRate.polId'),
      width: 120,
      formatter: ({ row }) => {
        return row.pol?.portName || '-';
      },
    },
    {
      field: 'pod.portName',
      title: $t('seaExport.freightRate.podId'),
      width: 120,
      formatter: ({ row }) => {
        return row.pod?.portName || '-';
      },
    },
    {
      field: 'country.countryName',
      title: $t('seaExport.freightRate.countryId'),
      width: 120,
      formatter: ({ row }) => {
        return row.country.countryName || '-';
      },
    },
    {
      field: 'poT1.portName',
      title: $t('seaExport.freightRate.pot1Id'),
      width: 120,
      formatter: ({ row }) => {
        return row.poT1?.portName || '-';
      },
    },
    {
      field: 'poT2.portName',
      title: $t('seaExport.freightRate.pot2Id'),
      width: 120,
      formatter: ({ row }) => {
        return row.poT2?.portName || '-';
      },
    },
    {
      field: 'isDirect',
      title: $t('seaExport.freightRate.isDirect'),
      width: 80,
      cellRender: {
        name: 'CellTag',
        options: [
          { color: '#52c41a', label: $t('common.yes'), value: true },
          { color: '#8c8c8c', label: $t('common.no'), value: false },
        ],
      },
    },
    {
      field: 'polFreeDays',
      title: '起运港免用箱',
      width: 110,
    },
    {
      field: 'podFreeDays',
      title: '目的港免用箱',
      width: 110,
    },
    {
      field: 'poddem',
      title: '目的港免堆期',
      width: 110,
    },
    {
      field: 'poddet',
      title: '目的港免箱期',
      width: 110,
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
      formatter: ({ row }) => {
        if (row.etd) {
          return formatDateStr(row.etd);
        }
        if (row.etdDayOfWeek !== undefined && row.etdDayOfWeek !== null) {
          const weekDays = [
            '周日',
            '周一',
            '周二',
            '周三',
            '周四',
            '周五',
            '周六',
          ];
          const dayTime = row.etdDayTime ? ` ${row.etdDayTime}` : '';
          return `${weekDays[row.etdDayOfWeek]}${dayTime}`;
        }
        return '-';
      },
    },
    {
      field: 'closeDocTime',
      title: '截单时间',
      width: 150,
      formatter: ({ row }) => {
        if (row.closeDocTime) {
          return row.closeDocTime;
        }
        if (
          row.closeDocDayOfWeek !== undefined &&
          row.closeDocDayOfWeek !== null
        ) {
          const weekDays = [
            '周日',
            '周一',
            '周二',
            '周三',
            '周四',
            '周五',
            '周六',
          ];
          const dayTime = row.closeDocDayTime ? ` ${row.closeDocDayTime}` : '';
          return `${weekDays[row.closeDocDayOfWeek]}${dayTime}`;
        }
        return '-';
      },
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
          { color: '#389e0d', label: $t('common.valid'), value: true },
          { color: '#cf1322', label: $t('common.invalid'), value: false },
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
      minWidth: 400,
      align: 'left',
      showOverflow: false,
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

  // 合并所有列：基础列 + 动态箱型列
  return [...baseColumns, ...dynamicCtnColumns];
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
