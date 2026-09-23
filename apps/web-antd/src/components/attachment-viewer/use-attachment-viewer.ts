import { ref } from 'vue';

import { $t } from '@vben/locales';

import { message } from 'ant-design-vue';
import dayjs from 'dayjs';

export interface AttachmentViewerTarget {
  /** 文件访问地址（相对或绝对均可，内部会补全） */
  fileUrl?: null | string;
  /** 与 fileUrl 同义，兼容业务 DTO 的 url 字段 */
  url?: null | string;
  /** 文件名，用于识别类型与标题 */
  fileName?: null | string;
  /** 友好文件名 */
  friendlyFileName?: null | string;
  /** 上传人 */
  uploader?: null | string;
  /** 与 uploader 同义，兼容 creatorUserName */
  creatorUserName?: null | string;
  /** 已格式化或原始的上传时间 */
  uploadTime?: null | string;
  /** 与 uploadTime 同义，兼容 creationTime */
  creationTime?: null | string;
  /** 弹窗标题 */
  title?: null | string;
}

export interface AttachmentViewerState {
  fileUrl: string;
  fileName: string;
  uploader: string;
  uploadTime: string;
  title: string;
}

const EMPTY_STATE: AttachmentViewerState = {
  fileUrl: '',
  fileName: '',
  uploader: '',
  uploadTime: '',
  title: '',
};

const visible = ref(false);
const current = ref<AttachmentViewerState>({ ...EMPTY_STATE });
const playlist = ref<AttachmentViewerState[]>([]);
const playlistIndex = ref(0);

function formatUploadTime(value?: null | string) {
  if (!value) return '';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : value;
}

function pickFileUrl(target: AttachmentViewerTarget) {
  return String(target.fileUrl || target.url || '').trim();
}

/** 下载/标题优先友好名，避免落到存储侧 fileName（如 GUID） */
function pickFileName(target: AttachmentViewerTarget) {
  return (
    String(target.friendlyFileName || target.fileName || '').trim() ||
    pickFileUrl(target).split('/').pop()?.split('?')[0] ||
    ''
  );
}

export interface AttachmentViewerOpenOptions {
  /** 同一批附件。多于一个时，预览弹窗可前后翻页 */
  files?: Array<AttachmentViewerTarget | string>;
}

function toViewerState(
  target: AttachmentViewerTarget | string,
): AttachmentViewerState | null {
  const params: AttachmentViewerTarget =
    typeof target === 'string' ? { url: target } : target;
  const fileUrl = pickFileUrl(params);
  if (!fileUrl) return null;
  return {
    fileUrl,
    fileName: pickFileName(params),
    uploader: String(params.uploader || params.creatorUserName || '').trim(),
    uploadTime: formatUploadTime(params.uploadTime || params.creationTime),
    title: String(params.title || '').trim(),
  };
}

/**
 * 打开全站附件查看器。可传入附件 DTO、部分字段，或直接传 URL 字符串。
 * 传入 files 后，预览弹窗可翻到上一张 / 下一张。
 * 相对路径会按当前品牌后端根补全；图片/PDF/OFD/Office 在弹窗内预览。
 */
export function openAttachmentViewer(
  target?: AttachmentViewerTarget | null | string,
  options?: AttachmentViewerOpenOptions,
) {
  const primary = target ? toViewerState(target) : null;
  const fromList = (options?.files ?? [])
    .map((item) => toViewerState(item))
    .filter((item): item is AttachmentViewerState => item !== null);
  const list = fromList.length > 0 ? fromList : primary ? [primary] : [];
  if (!primary && list.length === 0) {
    message.warning($t('component.filePreview.missingUrl'));
    return false;
  }

  const currentItem = primary ?? list[0]!;
  let index = list.findIndex((item) => item.fileUrl === currentItem.fileUrl);
  if (index < 0) {
    list.unshift(currentItem);
    index = 0;
  }

  playlist.value = list;
  playlistIndex.value = index;
  current.value = { ...list[index]! };
  visible.value = true;
  return true;
}

export function showAttachmentAt(index: number) {
  const item = playlist.value[index];
  if (!item) return;
  playlistIndex.value = index;
  current.value = { ...item };
}

export function showPrevAttachment() {
  if (playlistIndex.value <= 0) return;
  showAttachmentAt(playlistIndex.value - 1);
}

export function showNextAttachment() {
  if (playlistIndex.value >= playlist.value.length - 1) return;
  showAttachmentAt(playlistIndex.value + 1);
}

export function closeAttachmentViewer() {
  visible.value = false;
  current.value = { ...EMPTY_STATE };
  playlist.value = [];
  playlistIndex.value = 0;
}

export function useAttachmentViewer() {
  return {
    visible,
    current,
    playlist,
    playlistIndex,
    open: openAttachmentViewer,
    close: closeAttachmentViewer,
    showPrev: showPrevAttachment,
    showNext: showNextAttachment,
  };
}
