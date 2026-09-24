import { rowTextColumn } from '#/utils/row-text-column';
import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SeFreiPriceOutDto } from '#/api/sea-export/freight-rate-admin';
import { getEnumItems } from '#/utils/init-enum';
import { $t } from '#/locales';

/** 运价列表列配置持久化 key（与 gridOptions.id 对应） */
export const FREIGHT_RATE_LIST_TABLE_ID = 'FreightRateList';
/** 批量编辑弹窗 / Tab 表格列配置持久化 key（与 UserSetting table_config_ 对应） */
export const FREIGHT_RATE_BATCH_EDIT_TABLE_ID = 'FreightRateBatchEdit';
/** 批量新增弹窗 / Tab 表格列配置持久化 key（与 UserSetting table_config_ 对应） */
export const FREIGHT_RATE_BATCH_ADD_TABLE_ID = 'FreightRateBatchAdd';

/**
 * 运价列表默认可见列（其余列 `visible: false`）。
 * 箱型动态列 `ctn_*`、checkbox 始终默认可见。
 */
export const FREIGHT_RATE_LIST_DEFAULT_VISIBLE_FIELDS = new Set<string>([
  'validTimeRange',
  'carrier.enName',
  'pol.portName',
  'country.countryName',
  'pod.portName',
  'etd',
  'isDirect',
  'poT1.portName',
  'podFreeDaysCombined',
  'voyage',
  'remark',
  'creatorUserName',
  'creationTime',
]);

/**
 * 批量新增/编辑 Handsontable 默认可见列（按 data 字段）。
 * `ctn_*` / `ctnSug_*` 箱型列始终默认可见；列表专有列（国家/录入人等）此处不存在。
 * 目的港免箱使：批量页拆为 DEM / DET / 免箱使期三列，均默认显示。
 */
export const FREIGHT_RATE_BATCH_DEFAULT_VISIBLE_FIELDS = new Set<string>([
  'validTimeStart',
  'carrierId',
  'polId',
  'podId',
  'etd',
  'isDirect',
  'poT1Id',
  'poddem',
  'podFreeDays',
  'poddet',
  'voyage',
  'remark',
]);

/** 箱型价列（成本/指导）默认可见 */
export function isFreightRateBatchCtnColumnKey(key: string) {
  return key.startsWith('ctn_') || key.startsWith('ctnSug_');
}

export function isFreightRateBatchDefaultVisibleColumn(key: string) {
  return (
    isFreightRateBatchCtnColumnKey(key) ||
    FREIGHT_RATE_BATCH_DEFAULT_VISIBLE_FIELDS.has(key)
  );
}

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
      component: 'CarrierSelect',
      fieldName: 'carrierId',
      label: $t('seaExport.freightRate.carrierId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'PortSelect',
      fieldName: 'POLId',
      label: $t('seaExport.export.polId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'PortSelect',
      fieldName: 'PODId',
      label: $t('seaExport.export.podId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'ClientSelect',
      fieldName: 'bookingAgentId',
      label: '订舱代理',
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        // 只展示行业类别包含"o"（订舱代理）的客户
        industryCategory: 'o',
      },
    },
    {
      component: 'Select',
      fieldName: 'isValid',
      label: $t('seaExport.freightRate.isValid'),
      defaultValue: [0, 1], // 默认选择"已生效"，过滤掉无效数据
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        maxTagCount: 3,
        mode: 'multiple', // 启用多选模式
        options: [
          { label: '已生效', value: 0 },
          { label: '未生效', value: 1 },
          { label: '已过期', value: 2 },
        ],
      },
    },
    {
      component: 'Select',
      fieldName: 'isDirect',
      label: '是否直达',
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        options: [
          { label: $t('common.all'), value: null },
          { label: '直达', value: true },
          { label: '中转', value: false },
        ],
      },
    },
    {
      component: 'Input',
      fieldName: 'contractNo',
      label: '约号',
      componentProps: {
        placeholder: '请输入约号',
        allowClear: true,
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'creationTimeRange',
      label: '录入时间',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        placeholder: ['开始日期', '结束日期'],
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
      },
    },
    {
      component: 'UserSelect',
      fieldName: 'creatorUserId',
      label: '录入人',
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'remark',
      label: '备注',
      componentProps: {
        placeholder: '请输入备注',
        allowClear: true,
      },
    },
  ];
}

/** 附加费名称（逗号分隔，列表单元格） */
export function getSurchargeFeeNames(row: SeFreiPriceOutDto): string {
  if (!row.seFreiPriceFees || row.seFreiPriceFees.length === 0) {
    return '-';
  }
  return row.seFreiPriceFees
    .map(
      (fee) =>
        fee.feeCode?.cnName || fee.feeCode?.enName || `费用${fee.feeCodeId}`,
    )
    .join(', ');
}

function getFeeDetails(fee: any, row: SeFreiPriceOutDto): string[] {
  if (fee.priceFeeType === 1 && fee.price !== undefined && fee.price !== null) {
    return [`按票: ${fee.price}`];
  }
  if (!fee.seFreiPriceCtnFees || fee.seFreiPriceCtnFees.length === 0) {
    return [];
  }

  return fee.seFreiPriceCtnFees.map((ctnFee: any) => {
    const ctnInfo = row.seFreiPriceCtns?.find(
      (ctn) => ctn.id === ctnFee.seFreiPriceCtnId,
    );
    const ctnName =
      ctnInfo?.ctnCode?.ctnName || `箱型${ctnInfo?.ctnCodeId || '?'}`;

    if (ctnFee.value !== undefined && ctnFee.value !== null) {
      const condition =
        freightConditionItemOptions.find(
          (o) => o.value === ctnFee.conditionType,
        )?.label || '';
      const suffix =
        ctnFee.otherPrice !== null && ctnFee.otherPrice !== undefined
          ? `${ctnFee.price}/${ctnFee.otherPrice}`
          : `${ctnFee.price}`;
      return `${ctnName}:(毛重>=${ctnFee.value}${condition}) ${suffix}`;
    }
    return `${ctnName}: ${ctnFee.price}`;
  });
}

/** 附加费详情（Tooltip） */
export function getSurchargeFeeTooltip(row: SeFreiPriceOutDto): string {
  if (!row.seFreiPriceFees || row.seFreiPriceFees.length === 0) {
    return '无附加费';
  }

  return row.seFreiPriceFees
    .map((fee) => {
      const feeName =
        fee.feeCode?.cnName || fee.feeCode?.enName || `费用${fee.feeCodeId}`;
      const currency =
        fee.currency?.name || fee.currency?.code || `币种${fee.currencyId}`;
      const details = getFeeDetails(fee, row);
      return details.length > 0
        ? `${feeName} (${currency}): ${details.join(', ')}`
        : `${feeName} (${currency})`;
    })
    .join('\n');
}

/**
 * 表格列配置
 */
export function useColumns(
  data?: SeFreiPriceOutDto[],
  maskedFields?: string[],
): VxeTableGridOptions['columns'] {
  // 基础固定列（不包含动态箱型列）
  const baseColumnsBeforeCtn: VxeTableGridOptions['columns'] = [
    {
      type: 'checkbox',
      width: 60,
      fixed: 'left',
      align: 'center',
    },
    {
      field: 'carrier.enName',
      title: $t('seaExport.freightRate.carrierId'),
      width: 200,
      align: 'left',
      sortable: true,
      // showOverflow: true,
      slots: { default: 'carrierId' },
      formatter: ({ row }) => {
        return row.carrier?.code || '-';
      },
    },
    {
      field: 'pol.portName',
      title: $t('seaExport.freightRate.polId'),
      width: 240,
      align: 'left',
      sortable: true,
      // showOverflow: true,
      slots: { default: 'polId' },
      formatter: ({ row }) => {
        return row.pol?.portName || '-';
      },
    },
    {
      field: 'country.countryName',
      title: $t('seaExport.freightRate.countryId'),
      width: 120,
      align: 'left',
      formatter: ({ row }) => {
        return row.country?.countryName || '-';
      },
    },
    {
      field: 'pod.portName',
      title: $t('seaExport.freightRate.podId'),
      width: 240,
      align: 'left',
      sortable: true,
      //showOverflow: true,
      slots: { default: 'podId' },
      formatter: ({ row }) => {
        return row.pod?.portName || '-';
      },
    },
    {
      field: 'currency.code',
      title: $t('seaExport.freightRate.currencyId'),
      width: 80,
      align: 'left',
      sortable: true,
      slots: { default: 'currencyId' },
      formatter: ({ row }) => {
        return row.currency?.code || '-';
      },
    },

    {
      field: 'bookingAgent.name',
      title: '订舱代理',
      width: 150,
      align: 'left',
      slots: { default: 'bookingAgentId' },
      showOverflow: true,
      formatter: ({ row }) => {
        return row.bookingAgentName || '-';
      },
    },
    {
      field: 'contractNo',
      title: '约号',
      width: 200,
      align: 'left',
      showOverflow: true,
      slots: { default: 'contractNo' },
      formatter: ({ row }) => {
        return row.contractNo || '-';
      },
    },
  ];

  // 动态生成箱型报价列
  let dynamicCtnColumns: VxeTableGridOptions['columns'] = [];
  if (data && data.length > 0) {
    const ctnNames = extractUniqueCtnNames(data);
    dynamicCtnColumns = ctnNames.map((ctnName) => ({
      field: `ctn_${ctnName}`,
      // 集合展开的展示列没有对应的后端排序字段。
      sortable: false,
      title: ctnName,
      width: 180,
      align: 'left',
      showOverflow: false,
      slots: { default: 'ctnEditableCell' },
      params: {
        ctnName,
      },
      formatter: ({ row }) => {
        const ctn = (row as SeFreiPriceOutDto).seFreiPriceCtns?.find(
          (item) => item.ctnCode?.ctnName === ctnName,
        );
        if (!ctn) return '-';
        const parts: string[] = [];
        if (Object.prototype.hasOwnProperty.call(ctn, 'cost')) {
          parts.push(
            ctn.cost === undefined || ctn.cost === null
              ? '-'
              : Number(ctn.cost).toFixed(2),
          );
        }
        if (Object.prototype.hasOwnProperty.call(ctn, 'sugPrice')) {
          parts.push(
            ctn.sugPrice === undefined || ctn.sugPrice === null
              ? '-'
              : Number(ctn.sugPrice).toFixed(2),
          );
        }
        return parts.length > 0 ? parts.join(' / ') : '-';
      },
    }));
  }

  // 币别之后的其他列
  const baseColumnsAfterCtn: VxeTableGridOptions['columns'] = [
    {
      field: 'surchargeFees',
      title: $t('seaExport.freightRate.surchargeFees'),
      minWidth: 300,
      align: 'left',
      showOverflow: true,
      slots: { default: 'surchargeFees' },
    },

    {
      field: 'isDirect',
      title: $t('seaExport.freightRate.isDirect'),
      width: 100,
      align: 'center',
      sortable: true,
      cellRender: {
        name: 'CellTag',
        options: [
          { color: '#52c41a', label: '直达', value: true },
          { color: '#8c8c8c', label: '中转', value: false },
        ],
      },
    },
    {
      field: 'poT1.portName',
      title: $t('seaExport.freightRate.pot1Id'),
      width: 120,
      align: 'left',
      // showOverflow: true,
      ...rowTextColumn(({ row }) => {
        return row.poT1
          ? `${row.poT1?.portName},${row.poT1?.country.countryEnName}`
          : '-';
      }),
    },
    {
      field: 'poT2.portName',
      title: $t('seaExport.freightRate.pot2Id'),
      width: 120,
      align: 'left',
      //showOverflow: true,
      ...rowTextColumn(({ row }) => {
        return row.poT2
          ? `${row.poT2?.portName},${row.poT2?.country.countryEnName}`
          : '-';
      }),
    },
    {
      field: 'voyage',
      title: $t('seaExport.freightRate.voyage'),
      width: 100,
      align: 'left',
    },
    {
      field: 'etd',
      title: '开船日期',
      width: 150,
      align: 'left',
      ...rowTextColumn(({ row }) => {
        // 优先显示日期模式数据
        if (row.seFreiPriceDays && row.seFreiPriceDays.length > 0) {
          const dates = row.seFreiPriceDays
            .map((day: any) => day.etd?.substring(0, 10))
            .filter(Boolean);
          return dates.length > 0 ? dates.join(', ') : '-';
        }
        // 显示星期模式数据
        if (row.seFreiPriceWeekDays && row.seFreiPriceWeekDays.length > 0) {
          const weekDays = [
            '周日',
            '周一',
            '周二',
            '周三',
            '周四',
            '周五',
            '周六',
          ];
          const days = row.seFreiPriceWeekDays
            .map((weekDay: any) => {
              if (
                weekDay.etdDayOfWeek !== undefined &&
                weekDay.etdDayOfWeek !== null
              ) {
                const dayTime = weekDay.etdDayTime
                  ? ` ${weekDay.etdDayTime.substring(0, 5)}`
                  : '';
                return `${weekDays[weekDay.etdDayOfWeek]}${dayTime}`;
              }
              return null;
            })
            .filter(Boolean);
          return days.length > 0 ? days.join(', ') : '-';
        }
        return '-';
      }),
    },
    {
      field: 'closeDocTime',
      title: '截单时间',
      width: 150,
      align: 'left',
      ...rowTextColumn(({ row }) => {
        // 优先显示日期模式数据
        if (row.seFreiPriceDays && row.seFreiPriceDays.length > 0) {
          const times = row.seFreiPriceDays
            .map((day: any) => day.closeDocTime?.substring(0, 10))
            .filter(Boolean);
          return times.length > 0 ? times.join(', ') : '-';
        }
        // 显示星期模式数据
        if (row.seFreiPriceWeekDays && row.seFreiPriceWeekDays.length > 0) {
          const weekDays = [
            '周日',
            '周一',
            '周二',
            '周三',
            '周四',
            '周五',
            '周六',
          ];
          const times = row.seFreiPriceWeekDays
            .map((weekDay: any) => {
              if (
                weekDay.closeDocDayOfWeek !== undefined &&
                weekDay.closeDocDayOfWeek !== null
              ) {
                const dayTime = weekDay.closeDocDayTime
                  ? ` ${weekDay.closeDocDayTime.substring(0, 5)}`
                  : '';
                return `${weekDays[weekDay.closeDocDayOfWeek]}${dayTime}`;
              }
              return null;
            })
            .filter(Boolean);
          return times.length > 0 ? times.join(', ') : '-';
        }
        return '-';
      }),
    },
    {
      field: 'closingTime',
      title: '截关时间',
      width: 150,
      align: 'left',
      ...rowTextColumn(({ row }) => {
        // 优先显示日期模式数据
        if (row.seFreiPriceDays && row.seFreiPriceDays.length > 0) {
          const times = row.seFreiPriceDays
            .map((day: any) => day.closingTime?.substring(0, 10))
            .filter(Boolean);
          return times.length > 0 ? times.join(', ') : '-';
        }
        // 显示星期模式数据
        if (row.seFreiPriceWeekDays && row.seFreiPriceWeekDays.length > 0) {
          const weekDays = [
            '周日',
            '周一',
            '周二',
            '周三',
            '周四',
            '周五',
            '周六',
          ];
          const times = row.seFreiPriceWeekDays
            .map((weekDay: any) => {
              if (
                weekDay.closingDayOfWeek !== undefined &&
                weekDay.closingDayOfWeek !== null
              ) {
                const dayTime = weekDay.closingDayTime
                  ? ` ${weekDay.closingDayTime.substring(0, 5)}`
                  : '';
                return `${weekDays[weekDay.closingDayOfWeek]}${dayTime}`;
              }
              return null;
            })
            .filter(Boolean);
          return times.length > 0 ? times.join(', ') : '-';
        }
        return '-';
      }),
    },
    {
      field: 'validTimeRange',
      title: $t('seaExport.freightRate.validTimeStart'),
      width: 220,
      align: 'left',
      ...rowTextColumn(({ row }) => {
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
      }),
    },
    {
      field: 'polFreeDays',
      title: '起运港免用箱',
      width: 110,
      align: 'left',
    },
    {
      field: 'podFreeDaysCombined',
      title: '目的港免箱使天数',
      width: 280,
      align: 'left',
      // slots: {
      //   default: 'podFreeDaysCombined',
      //   header: 'podFreeDaysCombinedHeader',
      // },
    },
    {
      field: 'remark',
      title: $t('seaExport.freightRate.remark'),
      minWidth: 300,
      align: 'left',
      showOverflow: true,
    },
    {
      field: 'creatorUserName',
      title: '录入人',
      width: 120,
      align: 'left',
    },
    {
      field: 'creationTime',
      title: '录入时间',
      width: 160,
      align: 'left',
      sortable: true,
      formatter: ({ row }) => {
        if (!row.creationTime) return '-';

        const date = new Date(row.creationTime);
        if (isNaN(date.getTime())) return '-';

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      },
    },
  ];

  // 合并所有列：基础列（前） + 动态箱型列 + 基础列（后）
  const allColumns = [
    ...baseColumnsBeforeCtn,
    ...dynamicCtnColumns,
    ...baseColumnsAfterCtn,
  ];

  // 默认显隐：仅白名单列 + checkbox + 箱型列可见，其余隐藏（用户列配置可覆盖）
  for (const column of allColumns ?? []) {
    if (!column || column.type === 'checkbox') continue;
    const field = String(column.field ?? '');
    if (!field || field.startsWith('ctn_')) continue;
    if (!FREIGHT_RATE_LIST_DEFAULT_VISIBLE_FIELDS.has(field)) {
      column.visible = false;
    }
  }

  // 根据字段权限过滤列
  return filterColumnsByPermission(allColumns, maskedFields || []);
}

/**
 * 运价模块字段映射（前端 field -> 后端 PropName）
 * 用于字段权限控制，将表格列的 field 映射到后端的 PascalCase 属性名
 */
export const FREIGHT_RATE_FIELD_MAP: Record<string, string> = {
  // 基础字段
  'carrier.enName': 'CarrierId',
  'pol.portName': 'PolId',
  'country.countryName': 'CountryId',
  'pod.portName': 'PodId',
  'currency.code': 'CurrencyId',
  bookingAgentName: 'BookingAgentId',
  contractNo: 'ContractNo',
  surchargeFees: 'SeFreiPriceFees',
  creatorUserName: 'CreatorUserId',
  isDirect: 'IsDirect',
  'poT1.portName': 'PoT1Id',
  'poT2.portName': 'PoT2Id',
  voyage: 'Voyage',
  etd: 'SeFreiPriceDays',
  closeDocTime: 'SeFreiPriceDays',
  closingTime: 'SeFreiPriceDays',
  validTimeRange: 'ValidTimeStart',
  polFreeDays: 'PolFreeDays',
  podFreeDaysCombined: 'PodFreeDays',
  remark: 'Remark',
  creationTime: 'CreationTime',
};

/**
 * 根据字段权限过滤列配置
 * @param columns 原始列配置
 * @param maskedFields 被屏蔽的字段列表（PascalCase 格式）
 * @returns 过滤后的列配置
 */
export function filterColumnsByPermission(
  columns: VxeTableGridOptions['columns'],
  maskedFields: string[],
): VxeTableGridOptions['columns'] {
  if (!maskedFields || maskedFields.length === 0) {
    return columns;
  }

  // 如果 columns 为 undefined，返回空数组
  if (!columns) {
    return [];
  }

  return columns.filter((col) => {
    if (!col || !col.field) {
      // 保留没有 field 的列（如 checkbox、操作列等）
      return true;
    }

    // 获取对应的后端字段名
    const backendFieldName = FREIGHT_RATE_FIELD_MAP[col.field];

    // 如果找不到映射，使用原始 field
    const fieldNameToCheck = backendFieldName || col.field;

    // 检查是否在被屏蔽列表中（不区分大小写）
    const isMasked = maskedFields.some(
      (masked) => masked.toLowerCase() === fieldNameToCheck.toLowerCase(),
    );

    return !isMasked;
  });
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

/**
 * 动态箱型列签名：仅当集合变化时才允许整表换列，避免冲掉列持久化。
 */
export function getFreightRateCtnColumnSignature(
  columns: VxeTableGridOptions['columns'] | undefined,
): string {
  if (!columns?.length) return '';
  return columns
    .map((col) => String(col?.field ?? ''))
    .filter((field) => field.startsWith('ctn_'))
    .sort()
    .join('|');
}

type FreightRateColumnPersistSetting = {
  visibleColumnKeys?: string[];
  columnVisibility?: Record<string, boolean>;
  columnFixed?: Record<string, string>;
  columnWidths?: Record<string, number>;
};

function freightRateColumnPersistKey(column: {
  field?: string;
  type?: string;
}): string {
  if (column.type === 'checkbox') return 'type:checkbox';
  const field = String(column.field ?? '').trim();
  return field ? `field:${field}` : '';
}

/**
 * 把 UserSetting 中的列配置合并进新列定义（动态换箱型列后用）。
 * 认不出的列保留 useColumns 默认显隐，避免整表被旧配置误藏。
 */
export function mergeFreightRateListPersistedColumns(
  columns: VxeTableGridOptions['columns'],
  rawSetting: string | null | undefined,
): VxeTableGridOptions['columns'] {
  if (!columns?.length || !rawSetting) {
    return columns ?? [];
  }

  let parsed: FreightRateColumnPersistSetting;
  try {
    parsed = JSON.parse(rawSetting) as FreightRateColumnPersistSetting;
  } catch {
    return columns;
  }

  const visibility = parsed.columnVisibility ?? {};
  const fixedMap = parsed.columnFixed ?? {};
  const widthMap = parsed.columnWidths ?? {};
  const visibleKeys = Array.isArray(parsed.visibleColumnKeys)
    ? parsed.visibleColumnKeys
    : [];
  const visibleKeySet = new Set(visibleKeys);
  const knownKeys = new Set([
    ...visibleKeys,
    ...Object.keys(visibility),
    ...Object.keys(fixedMap),
    ...Object.keys(widthMap),
  ]);
  const visibilityValues = Object.values(visibility);
  const useVisibleKeysAsCompact =
    visibilityValues.length > 0 &&
    visibilityValues.every((val) => val === true);

  const next = columns.map((column) => {
    if (!column) return column;
    const key = freightRateColumnPersistKey(column);
    if (!key) return { ...column };

    const cloned: Record<string, any> = { ...column };

    if (Object.prototype.hasOwnProperty.call(visibility, key)) {
      cloned.visible = visibility[key] !== false;
    } else if (knownKeys.has(key) && useVisibleKeysAsCompact) {
      cloned.visible = visibleKeySet.has(key);
    } else if (knownKeys.has(key) && visibleKeys.length > 0) {
      // 有 keys 但无该键 visibility：按是否在可见列表
      cloned.visible = visibleKeySet.has(key);
    }
    // 配置完全不认识的列：保留 useColumns 默认 visible

    if (Object.prototype.hasOwnProperty.call(fixedMap, key)) {
      const fixed = String(fixedMap[key] ?? '')
        .trim()
        .toLowerCase();
      cloned.fixed = fixed === 'left' || fixed === 'right' ? fixed : undefined;
    }

    if (Object.prototype.hasOwnProperty.call(widthMap, key)) {
      const width = Number(widthMap[key]);
      if (Number.isFinite(width) && width > 0) {
        cloned.width = width;
      }
    }

    return cloned;
  });

  if (visibleKeys.length === 0) {
    return next;
  }

  const byKey = new Map<string, any>();
  next.forEach((column) => {
    const key = freightRateColumnPersistKey(column ?? {});
    if (key && column) byKey.set(key, column);
  });

  const ordered: any[] = [];
  const used = new Set<any>();
  visibleKeys.forEach((rawKey) => {
    const column = byKey.get(String(rawKey ?? '').trim());
    if (column && column.visible !== false && !used.has(column)) {
      ordered.push(column);
      used.add(column);
    }
  });

  const restVisible = next.filter(
    (column) => column && column.visible !== false && !used.has(column),
  );
  const hidden = next.filter((column) => column && column.visible === false);

  const merged = [...ordered, ...restVisible, ...hidden];
  if (merged.length > 0 && merged.every((col) => col.visible === false)) {
    return columns;
  }
  return merged;
}
