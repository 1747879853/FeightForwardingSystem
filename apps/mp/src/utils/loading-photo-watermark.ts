import type { LoadingPhotoLocation } from '../../../shared/loading-photo-location';

import { nextTick } from 'vue';

import { loadingPhotoWatermark } from '../../../shared/loading-photo-watermark';

const CANVAS_SELECTOR = '#loading-photo-watermark';
const CANVAS_ID = 'loading-photo-watermark';

/** 同一画布必须串行使用，调用期间不能卸载组件。 */
let queue: Promise<unknown> = Promise.resolve();

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readImage(filePath: string) {
  return new Promise<UniApp.GetImageInfoSuccessData>((resolve, reject) => {
    uni.getImageInfo({
      src: filePath,
      success: resolve,
      fail: () => reject(new Error('无法读取图片，请重新选择')),
    });
  });
}

/** 超大原图先缩小再画，避免画布内存不够时导出纯色图。 */
function shrinkHugeImage(src: string, width: number, height: number) {
  if (
    Math.max(width, height) <= 4096 ||
    typeof uni.compressImage !== 'function'
  ) {
    return Promise.resolve(src);
  }
  return new Promise<string>((resolve) => {
    uni.compressImage({
      src,
      quality: 80,
      success: (result) => resolve(result.tempFilePath || src),
      fail: () => resolve(src),
    });
  });
}

function queryCanvas(instance: any) {
  return new Promise<{ node?: any; width?: number; height?: number }>(
    (resolve) => {
      uni
        .createSelectorQuery()
        .in(instance)
        .select(CANVAS_SELECTOR)
        .fields({ node: true, size: true })
        .exec((result) => resolve(result?.[0] ?? {}));
    },
  );
}

function loadCanvasImage(canvas: any, src: string) {
  return new Promise<any>((resolve, reject) => {
    const image = canvas.createImage();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('无法读取图片，请重新选择'));
    image.src = src;
  });
}

/** 水印白字写进缓冲区才算画完；纯黑或纯红说明这次导出还是空画布。 */
function watermarkVisible(
  ctx: any,
  layout: {
    width: number;
    height: number;
    bandHeight: number;
    padding: number;
    fontSize: number;
  },
) {
  if (typeof ctx.getImageData !== 'function') return true;
  try {
    const y = Math.min(
      layout.height - 1,
      Math.max(
        0,
        Math.floor(
          layout.height -
            layout.bandHeight +
            layout.padding +
            layout.fontSize / 2,
        ),
      ),
    );
    const row = ctx.getImageData(
      Math.floor(layout.padding),
      y,
      Math.max(1, Math.floor(layout.width - layout.padding * 2)),
      1,
    ).data as Uint8ClampedArray;
    for (let index = 0; index < row.length; index += 4) {
      if (row[index]! > 200 && row[index + 1]! > 200 && row[index + 2]! > 200) {
        return true;
      }
    }
    return false;
  } catch {
    return true;
  }
}

function paint(
  ctx: any,
  image: any,
  layout: ReturnType<typeof loadingPhotoWatermark>,
) {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, layout.width, layout.height);
  ctx.drawImage(image, 0, 0, layout.width, layout.height);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(
    0,
    layout.height - layout.bandHeight,
    layout.width,
    layout.bandHeight,
  );
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  for (const [index, line] of layout.lines.entries()) {
    ctx.font = `${layout.fontSize}px sans-serif`;
    const available = layout.width - layout.padding * 2;
    const fontSize =
      layout.fontSize *
      Math.min(1, available / Math.max(1, ctx.measureText(line).width));
    ctx.font = `${fontSize}px sans-serif`;
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
}

function exportCanvas(
  canvas: any,
  layout: { width: number; height: number },
  instance: any,
) {
  return new Promise<string>((resolve, reject) => {
    const options: UniApp.CanvasToTempFilePathOptions = {
      canvasId: CANVAS_ID,
      width: layout.width,
      height: layout.height,
      destWidth: layout.width,
      destHeight: layout.height,
      fileType: 'jpg',
      quality: 0.9,
      success: (result) => resolve(result.tempFilePath),
      fail: () => reject(new Error('生成图片水印失败，请重试')),
    };
    // 2d 画布必须带 canvas 节点。只传 canvasId 会导出还没画上的缓冲区。
    uni.canvasToTempFilePath(Object.assign(options, { canvas }), instance);
  });
}

async function drawWatermark(
  instance: any,
  filePath: string,
  uploader: string,
  location: LoadingPhotoLocation & { address: string },
) {
  if (!location?.address?.trim()) {
    throw new Error('未获取当前位置地址，请重新上传');
  }
  let info = await readImage(filePath);
  let src = info.path || filePath;
  const shrunk = await shrinkHugeImage(src, info.width, info.height);
  if (shrunk !== src) {
    src = shrunk;
    info = await readImage(src);
  }
  const layout = loadingPhotoWatermark(
    info.width,
    info.height,
    uploader,
    location,
  );
  await nextTick();
  let canvas: any;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const view = await queryCanvas(instance);
    if (view.node && (view.width ?? 0) > 1 && (view.height ?? 0) > 1) {
      canvas = view.node;
      break;
    }
    await delay(32);
  }
  if (!canvas) throw new Error('水印画布未就绪，请重试');
  // 只改缓冲区，不改页面上的画布尺寸。尺寸来回变时安卓会导出黑图或红图。
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext('2d');
  const image = await loadCanvasImage(canvas, src);
  const waits = [120, 240, 400];
  let visible = false;
  for (const wait of waits) {
    paint(ctx, image, layout);
    await delay(wait);
    visible = watermarkVisible(ctx, layout);
    if (visible) break;
  }
  if (!visible) throw new Error('照片生成异常，请重新拍摄');
  return exportCanvas(canvas, layout, instance);
}

export function useLoadingPhotoWatermark(instance: any) {
  function watermark(
    filePath: string,
    uploader: string,
    location: LoadingPhotoLocation & { address: string },
  ) {
    const run = queue.then(() =>
      drawWatermark(instance, filePath, uploader, location),
    );
    queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
  return { watermark };
}
