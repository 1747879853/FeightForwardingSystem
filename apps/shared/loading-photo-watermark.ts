import type { LoadingPhotoLocation } from './loading-photo-location';

import { formatLoadingPhotoLocation } from './loading-photo-location';

/** 两端统一使用北京时间；记录开始生成上传图片的时刻。 */
export function loadingPhotoWatermark(
  width: number,
  height: number,
  uploader: string,
  location: LoadingPhotoLocation | null,
  time = new Date(),
) {
  if (!uploader.trim()) throw new Error('无法获取上传人，请重新登录后上传');
  if (width <= 0 || height <= 0) throw new Error('图片尺寸无效');
  const scale = Math.min(1, 2048 / Math.max(width, height));
  const outputWidth = Math.max(1, Math.round(width * scale));
  const outputHeight = Math.max(1, Math.round(height * scale));
  const timestamp = new Date(time.getTime() + 8 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');
  const lines = [
    `上传人：${uploader.trim()}`,
    `上传时间：${timestamp}（北京时间）`,
  ];
  // PC 明确传 null 省略位置；小程序仍必须提供有效坐标。
  if (location !== null) {
    const coordinates = formatLoadingPhotoLocation(location);
    const text = `上传位置：${location.address?.trim() || coordinates}`;
    // 中文地址换行展示完整内容，避免把长地址缩成难以辨认的小字。
    if (location.address?.trim()) {
      const characters = Array.from(text);
      for (let index = 0; index < characters.length; index += 26) {
        lines.push(characters.slice(index, index + 26).join(''));
      }
    } else {
      lines.push(text);
    }
  }
  const fontSize = Math.max(
    1,
    Math.min(
      outputWidth / 30,
      outputHeight /
        (location?.address ? Math.max(12, (lines.length * 1.5 + 1.2) * 3) : 12),
    ),
  );
  const padding = fontSize * 0.6;
  const lineHeight = fontSize * 1.5;
  return {
    width: outputWidth,
    height: outputHeight,
    fontSize,
    padding,
    lineHeight,
    // 行距仅计算行与行之间，末行之后不再额外留半行空白。
    bandHeight: fontSize + lineHeight * (lines.length - 1) + padding * 2,
    lines,
  };
}
