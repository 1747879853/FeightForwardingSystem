/** 识别结果只取箱号，截到输入框上限；空串 / null 视为没认出 */
export function applyRecognizedCtnNo(raw?: null | string) {
  const value = String(raw ?? '').trim();
  if (!value || value.toLowerCase() === 'null') return null;
  return value.slice(0, 32);
}

/** 兼容 ABP camelCase / PascalCase */
export function pickCtnNoFromUpload(result: {
  CtnNo?: null | string;
  ctnNo?: null | string;
}) {
  return applyRecognizedCtnNo(result.ctnNo ?? result.CtnNo);
}
