/** 两端统一使用北京时间；记录开始生成上传图片的时刻。 */
export function loadingPhotoWatermark(
  width: number,
  height: number,
  uploader: string,
  time = new Date(),
) {
  if (!uploader.trim()) throw new Error('无法获取上传人，请重新登录后上传');
  if (width <= 0 || height <= 0) throw new Error('图片尺寸无效');
  const scale = Math.min(1, 2048 / Math.max(width, height));
  const outputWidth = Math.max(1, Math.round(width * scale));
  const outputHeight = Math.max(1, Math.round(height * scale));
  const fontSize = Math.max(1, Math.min(outputWidth / 30, outputHeight / 12));
  const padding = fontSize * 0.6;
  const timestamp = new Date(time.getTime() + 8 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');
  return {
    width: outputWidth,
    height: outputHeight,
    fontSize,
    padding,
    bandHeight: fontSize * 3 + padding * 2,
    lines: [`上传人：${uploader.trim()}`, `上传时间：${timestamp}（北京时间）`],
  };
}
