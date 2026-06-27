/**
 * 全角英数字、标点与空格转为半角；中文及其他字符保持不变。
 */
export function toHalfWidth(value: string): string {
  return value
    .replaceAll('\u3000', ' ')
    .replaceAll(/[\uFF01-\uFF5E]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xfee0),
    );
}

/**
 * 提单类文本规范化：全角转半角后，将英文小写字母转为大写。
 */
export function toEnglishUpperCase(value: string | null | undefined): string {
  if (value == null || value === '') return value ?? '';
  return toHalfWidth(value).replaceAll(/[a-z]/g, (char) => char.toUpperCase());
}
