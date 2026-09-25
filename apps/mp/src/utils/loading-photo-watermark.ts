import type { Ref } from 'vue';

import type { LoadingPhotoLocation } from '../../../shared/loading-photo-location';

import { loadingPhotoWatermark } from '../../../shared/loading-photo-watermark';

export interface LoadingPhotoPainter {
  render: (board: object) => Promise<unknown>;
  canvasToTempFilePathSync: (options: {
    fail?: (error: unknown) => void;
    fileType: string;
    pathType: string;
    quality: number;
    success: (result: { tempFilePath: string }) => void;
  }) => void;
}

/** 同一块画板串行绘制，调用期间不能卸载。 */
let queue: Promise<unknown> = Promise.resolve();

function readImage(filePath: string) {
  return new Promise<UniApp.GetImageInfoSuccessData>((resolve, reject) => {
    uni.getImageInfo({
      src: filePath,
      success: resolve,
      fail: () => reject(new Error('无法读取图片，请重新选择')),
    });
  });
}

function photoBoard(
  src: string,
  layout: ReturnType<typeof loadingPhotoWatermark>,
) {
  return {
    css: {
      width: `${layout.width}px`,
      height: `${layout.height}px`,
      background: '#fff',
    },
    views: [
      {
        type: 'image',
        src,
        css: {
          width: `${layout.width}px`,
          height: `${layout.height}px`,
          objectFit: 'fill',
        },
      },
      {
        type: 'view',
        css: {
          position: 'absolute',
          left: '0px',
          bottom: '0px',
          width: `${layout.width}px`,
          background: 'rgba(0,0,0,0.55)',
          padding: `${layout.padding}px`,
        },
        views: layout.lines.map((line) => ({
          type: 'text',
          text: line,
          css: {
            display: 'block',
            color: '#ffffff',
            fontSize: `${layout.fontSize}px`,
            lineHeight: `${layout.lineHeight}px`,
            width: `${layout.width - layout.padding * 2}px`,
          },
        })),
      },
    ],
  };
}

async function drawWatermark(
  painter: LoadingPhotoPainter,
  filePath: string,
  uploader: string,
  location: LoadingPhotoLocation & { address: string },
) {
  if (!location?.address?.trim()) {
    throw new Error('未获取当前位置地址，请重新上传');
  }
  const info = await readImage(filePath);
  const layout = loadingPhotoWatermark(
    info.width,
    info.height,
    uploader,
    location,
  );
  const exported = new Promise<string>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('生成水印超时，请重试')),
      15000,
    );
    // render 会先把 done 置回 false。导出任务必须排在这之后，避免把上一张图导出去。
    const rendered = painter.render(photoBoard(info.path || filePath, layout));
    painter.canvasToTempFilePathSync({
      fileType: 'jpg',
      pathType: 'url',
      quality: 0.9,
      success: (result) => {
        clearTimeout(timer);
        resolve(result.tempFilePath);
      },
      fail: () => {
        clearTimeout(timer);
        reject(new Error('生成图片水印失败，请重试'));
      },
    });
    rendered.catch((error) => {
      clearTimeout(timer);
      reject(
        error instanceof Error ? error : new Error('生成图片水印失败，请重试'),
      );
    });
  });
  return exported;
}

export function useLoadingPhotoWatermark(
  painter: Ref<LoadingPhotoPainter | null | undefined>,
) {
  function watermark(
    filePath: string,
    uploader: string,
    location: LoadingPhotoLocation & { address: string },
  ) {
    const run = queue.then(() => {
      if (!painter.value) throw new Error('水印画板未就绪，请重试');
      return drawWatermark(painter.value, filePath, uploader, location);
    });
    queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
  return { watermark };
}
