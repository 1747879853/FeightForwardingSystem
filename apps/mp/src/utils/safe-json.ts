/**
 * 后端主键是雪花 ID，直接 JSON.parse 会丢精度（超出 2^53-1）。
 * web-antd 用 json-bigint 解决，但它依赖 bignumber.js，小程序打包会外部化成
 * require('bignumber.js') 而运行时找不到，所以这里改成零依赖实现：
 * 先把超出安全范围的整数字面量加引号，再交给 JSON.parse。
 *
 * 与 web-antd 同一口径：这类 ID 到前端就是 string，禁止再 Number() 回去。
 */

function isDigit(char: string) {
  return char >= '0' && char <= '9';
}

/** 只在字符串字面量之外改写数字，字符串里的数字原样保留 */
function quoteUnsafeIntegers(text: string) {
  let out = '';
  let index = 0;
  let inString = false;

  while (index < text.length) {
    const char = text[index] as string;

    if (inString) {
      if (char === '\\') {
        out += char + (text[index + 1] ?? '');
        index += 2;
        continue;
      }
      if (char === '"') inString = false;
      out += char;
      index += 1;
      continue;
    }

    if (char === '"') {
      inString = true;
      out += char;
      index += 1;
      continue;
    }

    if (char === '-' || isDigit(char)) {
      const start = index;
      if (char === '-') index += 1;
      while (index < text.length && isDigit(text[index] as string)) index += 1;

      let isInteger = true;
      if (text[index] === '.') {
        isInteger = false;
        index += 1;
        while (index < text.length && isDigit(text[index] as string))
          index += 1;
      }
      if (text[index] === 'e' || text[index] === 'E') {
        isInteger = false;
        index += 1;
        if (text[index] === '+' || text[index] === '-') index += 1;
        while (index < text.length && isDigit(text[index] as string))
          index += 1;
      }

      const token = text.slice(start, index);
      out +=
        isInteger && !Number.isSafeInteger(Number(token))
          ? `"${token}"`
          : token;
      continue;
    }

    out += char;
    index += 1;
  }

  return out;
}

export function parseJsonSafe<T>(text: string): T {
  return JSON.parse(quoteUnsafeIntegers(text)) as T;
}
