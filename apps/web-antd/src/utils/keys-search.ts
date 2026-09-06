import type { VbenFormSchema } from '#/adapter/form';

/**
 * Keys 精确搜索 —— 跨模块通用能力。
 *
 * 后端在多个查询入参上新增 `List<string> Keys`，语义为「精确相等（SQL IN）」，
 * 与 `keyword` 的模糊 Contains 不同；列表内部 OR，与 keyword 及其它筛选 AND。
 * GET 传参必须用重复键名：`keys=MBL001&keys=CO20260001`
 * （ABP `[FromQuery] List<T>` 绑定要求 repeat 格式，不能用逗号拼成一个值）。
 *
 * 前端约定：搜索表单字段名统一为 `Keys`，组件为普通 antd Input，
 * 值是一个字符串；用户可用分隔符一次输入多个，提交前经
 * {@link normalizeKeysParam} 按分隔符拆分、去空白、去重后变成 `string[]`。
 */

/**
 * 多值分隔符：中英文逗号、顿号、分号、竖线，以及空格/制表符/换行等空白字符。
 * 覆盖手动输入与从 Excel、聊天工具粘贴两种来源。
 */
const KEYS_SPLIT_REGEXP = /[,，、;；|\s]+/;

/**
 * 把 Keys 表单值归一化为「拆分 + 去空白 + 去重」后的字符串数组。
 * - 支持字符串（Input 输入/粘贴，按 {@link KEYS_SPLIT_REGEXP} 拆分）
 *   与数组（历史 Select tags 值、外部传入）两种输入；
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
  /** 字段标签旁的问号提示，用于说明该接口 keys 覆盖的精确匹配字段 */
  help?: string;
  /** 栅格占位，默认跨 2 列，输入框宽一些便于粘贴多个值 */
  formItemClass?: string;
}

/**
 * 生成「Keys 精确搜索」表单字段（普通 antd Input）。
 *
 * 单行输入框，多个值直接用分隔符（中英文逗号、顿号、分号、空格、换行）连写，
 * 也可从 Excel 一次性粘贴；回车即提交查询，无需先「打成标签」。
 * 值的拆分/去重在提交阶段由 {@link normalizeKeysParam} 统一完成。
 * 覆盖字段随接口不同，通过 `help` 传入模块专属说明。
 */
export function createKeysSearchSchema(
  options: KeysSearchSchemaOptions = {},
): VbenFormSchema {
  const {
    fieldName = 'Keys',
    label = '精确搜索',
    placeholder = '多个值用逗号/空格/分号分隔，可直接粘贴',
    help,
    formItemClass = 'col-span-2',
  } = options;

  return {
    component: 'Input',
    fieldName,
    label,
    formItemClass,
    help,
    componentProps: {
      allowClear: true,
      class: 'w-full',
      placeholder,
    },
  };
}
