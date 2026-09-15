import { defineComponent, h, shallowRef, watch } from 'vue';
import { useVbenForm } from '#/adapter/form';
import {
  renderOriginalPermissionCell,
  useVbenVxeGrid,
} from '#/adapter/vxe-table';
import {
  createFieldPermission,
  type FieldPermissionProfile,
} from './field-permission';
import { useMaskedFields } from './use-masked-fields';

/** 页面显式选择 DTO 配置；不依赖路由猜测模块。 */
export function useFieldPermission(profile: FieldPermissionProfile) {
  const rawDetail = shallowRef<any>();
  const permission = createFieldPermission(profile);
  const { maskedFieldIndex, loadMaskedFields } = useMaskedFields();
  void loadMaskedFields();

  const usePermissionForm: typeof useVbenForm = (options) => {
    const result = useVbenForm(options);
    const schema = options.schema ?? [];
    watch(
      [maskedFieldIndex, rawDetail],
      () => {
        result[1].setState({
          schema: schema.filter(
            (item) => !permission.formMasked(item.fieldName, rawDetail.value),
          ),
        });
      },
      { immediate: true, flush: 'sync' },
    );
    return result;
  };

  const usePermissionGrid: typeof useVbenVxeGrid = (options, ...rest) => {
    let columns = options.gridOptions?.columns ?? [];
    const schema = options.formOptions?.schema ?? [];
    const slotColumns = new Map<string, any>();
    const renderColumns = (items: any[] = columns): any[] =>
      items
        .filter((column) => !column.field || !permission.always(column.field))
        .map((column) => {
          if (column.children)
            return { ...column, children: renderColumns(column.children) };
          if (!column.field) return column;
          const slot = `permission_${column.field}`;
          const original =
            column.slots?.default === slot ? slotColumns.get(slot) : column;
          slotColumns.set(slot, original ?? column);
          return { ...column, slots: { ...column.slots, default: slot } };
        });
    const filterSearchSchema = () =>
      schema.filter((item) => !permission.searchAlways(item.fieldName));
    const result = useVbenVxeGrid(
      {
        ...options,
        gridOptions: {
          ...options.gridOptions,
          columns: renderColumns(),
        },
        formOptions: options.formOptions
          ? { ...options.formOptions, schema: filterSearchSchema() }
          : options.formOptions,
      },
      ...rest,
    );
    const setGridOptions = result[1].setGridOptions.bind(result[1]);
    result[1].setGridOptions = (patch) => {
      if (patch?.columns) {
        columns = patch.columns;
        return setGridOptions({ ...patch, columns: renderColumns() });
      }
      return setGridOptions(patch);
    };
    watch(
      maskedFieldIndex,
      () => {
        setGridOptions({ columns: renderColumns() });
        if (!options.formOptions) return;
        const nextSchema = filterSearchSchema();
        // Grid 的 formApi 要等表格 onMounted 才挂上，setup 阶段是空对象。
        result[1].formApi.setState?.({ schema: nextSchema });
        result[1].setState?.({
          formOptions: { ...options.formOptions, schema: nextSchema },
        });
      },
      { immediate: true },
    );
    const Grid = defineComponent({
      inheritAttrs: false,
      setup(_, { attrs, slots }) {
        return () =>
          h(result[0], attrs, {
            ...slots,
            ...Object.fromEntries(
              [...slotColumns].map(([name, column]) => [
                name,
                (params: any) => {
                  if (permission.masked(column.field, params.row))
                    return [h('span', '***')];
                  const original = column.slots?.default;
                  if (typeof original === 'string')
                    return slots[original]?.(params);
                  if (typeof original === 'function') return original(params);
                  if (column.cellRender)
                    return renderOriginalPermissionCell(
                      column.cellRender,
                      params,
                    );
                  return [
                    h(
                      'span',
                      String(
                        params.$table.getCellLabel(params.row, params.column) ??
                          '',
                      ),
                    ),
                  ];
                },
              ]),
            ),
          });
      },
    });
    return [Grid, result[1]] as unknown as typeof result;
  };
  return { ...permission, rawDetail, usePermissionForm, usePermissionGrid };
}
