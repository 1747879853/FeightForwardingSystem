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
    /** field → 无具名插槽的列配置（走 permission_${field}） */
    const slotColumns = new Map<string, any>();
    /**
     * 具名业务插槽（如 ctnEditableCell）保持原名，在 Grid 层统一包装。
     * 运价箱型等后补动态列若改成 permission_ctn_*，VXE 会在父级插槽挂上前渲染导致空白。
     */
    const namedSlots = new Set<string>();
    const slotColumnsVersion = shallowRef(0);

    const renderColumns = (items: any[] = columns): any[] => {
      const next = items
        .filter((column) => !column.field || !permission.always(column.field))
        .map((column) => {
          if (column.children)
            return { ...column, children: renderColumns(column.children) };
          if (!column.field) return column;

          const originalDefault = column.slots?.default;
          // 已有具名插槽：保留原名，仅登记以便 Grid 包装
          if (
            typeof originalDefault === 'string' &&
            !originalDefault.startsWith('permission_')
          ) {
            namedSlots.add(originalDefault);
            return column;
          }

          const slot = `permission_${column.field}`;
          const original =
            originalDefault === slot ? slotColumns.get(slot) : column;
          slotColumns.set(slot, original ?? column);
          return { ...column, slots: { ...column.slots, default: slot } };
        });
      slotColumnsVersion.value += 1;
      return next;
    };

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
        // 此处调用的是原始 setGridOptions，需先 renderColumns
        setGridOptions({ columns: renderColumns(columns) });
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
        return () => {
          slotColumnsVersion.value;

          const permissionSlotEntries = [...slotColumns].map(
            ([name, column]) => [
              name,
              (params: any) => {
                if (permission.masked(column.field, params.row))
                  return [h('span', '***')];
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
            ],
          );

          // 包装页面提供的具名插槽：按 column.field 做权限判定后转发
          const namedSlotEntries = [...namedSlots].map((name) => [
            name,
            (params: any) => {
              const field = params?.column?.field;
              if (field && permission.masked(field, params.row))
                return [h('span', '***')];
              return slots[name]?.(params);
            },
          ]);

          return h(result[0], attrs, {
            ...slots,
            ...Object.fromEntries(permissionSlotEntries),
            ...Object.fromEntries(namedSlotEntries),
          });
        };
      },
    });
    return [Grid, result[1]] as unknown as typeof result;
  };
  return { ...permission, rawDetail, usePermissionForm, usePermissionGrid };
}
