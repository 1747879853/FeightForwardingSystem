/** 再次点选当前港口时 Select 不触发 change，PortSelect 补发 change 并带上此标记 */
export function isSameValuePortReselect(option: unknown) {
  const target = Array.isArray(option) ? option[0] : option;
  if (!target || typeof target !== 'object') return false;
  return Boolean((target as { sameValueReselect?: boolean }).sameValueReselect);
}
