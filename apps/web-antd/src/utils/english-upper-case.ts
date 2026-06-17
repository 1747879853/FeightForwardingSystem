/**
 * 将字符串中的英文小写字母转为大写，其他字符保持不变。
 */
export function toEnglishUpperCase(value: string | null | undefined): string {
  if (value == null || value === '') return value ?? '';
  return value.replaceAll(/[a-z]/g, (char) => char.toUpperCase());
}
