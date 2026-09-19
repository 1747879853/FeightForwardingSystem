import type { LoadingPhotoLocation } from '../../../shared/loading-photo-location';

import { nextTick, ref } from 'vue';

import { loadingPhotoWatermark } from '../../../shared/loading-photo-watermark';

/** 同一画布必须串行使用，调用期间不能卸载组件。 */
export function useLoadingPhotoWatermark(instance: any) {
  const canvasWidth = ref(1);
  const canvasHeight = ref(1);
  async function watermark(
    filePath: string,
    uploader: string,
    location: LoadingPhotoLocation & { address: string },
  ) {
    if (!location?.address?.trim())
      throw new Error('未获取当前位置地址，请重新上传');
    const info = await new Promise<UniApp.GetImageInfoSuccessData>(
      (resolve, reject) => {
        uni.getImageInfo({
          src: filePath,
          success: resolve,
          fail: () => reject(new Error('无法读取图片，请重新选择')),
        });
      },
    );
    const layout = loadingPhotoWatermark(
      info.width,
      info.height,
      uploader,
      location,
    );
    canvasWidth.value = layout.width;
    canvasHeight.value = layout.height;
    await nextTick();
    const ctx = uni.createCanvasContext('loading-photo-watermark', instance);
    ctx.setFillStyle('#fff');
    ctx.fillRect(0, 0, layout.width, layout.height);
    ctx.drawImage(info.path || filePath, 0, 0, layout.width, layout.height);
    ctx.setFillStyle('rgba(0, 0, 0, 0.55)');
    ctx.fillRect(
      0,
      layout.height - layout.bandHeight,
      layout.width,
      layout.bandHeight,
    );
    ctx.setFillStyle('#fff');
    ctx.setTextBaseline('middle');
    for (const [index, line] of layout.lines.entries()) {
      ctx.setFontSize(layout.fontSize);
      const available = layout.width - layout.padding * 2;
      ctx.setFontSize(
        layout.fontSize *
          Math.min(1, available / Math.max(1, ctx.measureText(line).width)),
      );
      ctx.fillText(
        line,
        layout.padding,
        layout.height -
          layout.bandHeight +
          layout.padding +
          layout.fontSize / 2 +
          index * layout.lineHeight,
      );
    }
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('生成水印超时，请重试')),
        15000,
      );
      ctx.draw(false, () => {
        clearTimeout(timer);
        resolve();
      });
    });
    return new Promise<string>((resolve, reject) =>
      uni.canvasToTempFilePath(
        {
          canvasId: 'loading-photo-watermark',
          width: layout.width,
          height: layout.height,
          destWidth: layout.width,
          destHeight: layout.height,
          fileType: 'jpg',
          quality: 0.9,
          success: (result) => resolve(result.tempFilePath),
          fail: () => reject(new Error('生成图片水印失败，请重试')),
        },
        instance,
      ),
    );
  }
  return { canvasWidth, canvasHeight, watermark };
}
