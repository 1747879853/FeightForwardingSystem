import { loadingPhotoWatermark } from '../../../shared/loading-photo-watermark';

/** 水印固化到上传文件，分享和下载使用同一份图片。 */
export async function watermarkLoadingPhoto(file: File, uploader: string) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const layout = loadingPhotoWatermark(
      image.naturalWidth,
      image.naturalHeight,
      uploader,
      null,
    );
    const canvas = document.createElement('canvas');
    canvas.width = layout.width;
    canvas.height = layout.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法生成图片水印，请更换浏览器重试');
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
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) =>
          result ? resolve(result) : reject(new Error('生成图片水印失败')),
        'image/jpeg',
        0.9,
      ),
    );
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, {
      type: 'image/jpeg',
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
