import type { VbenFormSchema } from '#/adapter/form';

/**
 * Keys 精确搜索 —— 跨模块通用能力。
 *
 * 后端在多个查询入参上新增 `List<string> Keys`，语义为「精确相等（SQL IN）」，
 * 与 `keyword` 的模糊 Contains 不同；列表内部 OR，与 keyword 及其它筛选 AND。
 * GET 传参必须用重复键名：`keys=MBL001&keys=CO20260001`
 * （ABP `[FromQuery] List<T>` 绑定要求 repeat 格式，不能用逗号拼成一个值）。
 *
 * 前端约定：搜索表单字段名统一为 `Keys`，组件为 antd Select 的 tags 模式，
 * 值天然是 `string[]`；提交前经 {@link normalizeKeysParam} 去空白、去重。
 */

/** 多值分隔符：换行、中英文逗号、空格、制表符、分号 */
const KEYS_SPLIT_REGEXP = /[\n\r,，;；\s]+/;

/**
 * 把 Keys 表单值归一化为「去空白 + 去重」后的字符串数组。
 * - 支持数组（Select tags 模式）与字符串（粘贴/兼容旧值）两种输入；
 * - 全为空白项、空数组、null/undefined → 返回 `undefined`（后端视为不筛）。
 */
export function normalizeKeysParam(value: unknown): string[] | undefined {
  let raw: unknown[];
  if (Array.isArray(value)) {
    raw = value;
  } else if (typeof value === 'string') {
    raw = value.split(KEYS_SPLIT_REGEXP);
  } else {
    return undefined;
  }

  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') {
      continue;
    }
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result.length > 0 ? result : undefined;
}

export interface KeysSearchSchemaOptions {
  /** 表单字段名，默认 `Keys`（与后端入参对齐） */
  fieldName?: string;
  /** 字段标签，默认「精确搜索」 */
  label?: string;
  /** 输入占位提示 */
  placeholder?: string;
  /** 标签旁的问号提示，用于说明该接口 keys 覆盖的精确匹配字段 */
  help?: string;
  /** 栅格占位，默认跨 2 列，便于展示多个标签 */
  formItemClass?: string;
}

/**
 * 生成「Keys 精确搜索」表单字段（antd Select tags 模式）。
 *
 * 支持逐个输入回车成标签，或直接粘贴多个（逗号/空格/换行分隔自动拆分）。
 * 覆盖字段随接口不同，通过 `help` 传入模块专属说明。
 */
export function createKeysSearchSchema(
  options: KeysSearchSchemaOptions = {},
): VbenFormSchema {
  const {
    fieldName = 'Keys',
    label = '精确搜索',
    placeholder = '输入后回车，可粘贴多个（逗号/空格/换行分隔）',
    help,
    formItemClass = 'col-span-2',
  } = options;

  return {
    component: 'Select',
    fieldName,
    label,
    formItemClass,
    help,
    componentProps: {
      mode: 'tags',
      allowClear: true,
      class: 'w-full',
      placeholder,
      // 粘贴时按分隔符自动拆成多个标签
      tokenSeparators: [',', '，', ';', '；', ' ', '\n', '\r', '\t'],
      // 无候选项，纯自由输入；标签超出宽度时响应式折叠为 +N
      options: [],
      notFoundContent: null,
      maxTagCount: 'responsive',
    },
  };
}
