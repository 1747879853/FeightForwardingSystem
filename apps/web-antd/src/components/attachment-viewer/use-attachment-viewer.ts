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

function formatUploadTime(value?: null | string) {
  if (!value) return '';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : value;
}

function pickFileUrl(target: AttachmentViewerTarget) {
  return String(target.fileUrl || target.url || '').trim();
}

function pickFileName(target: AttachmentViewerTarget) {
  return (
    String(target.fileName || target.friendlyFileName || '').trim() ||
    pickFileUrl(target).split('/').pop()?.split('?')[0] ||
    ''
  );
}

/**
 * 打开全站附件查看器。可传入附件 DTO、部分字段，或直接传 URL 字符串。
 * 相对路径会按当前品牌后端根补全；Office 走微软在线嵌入，PDF/图片在弹窗内预览。
 */
export function openAttachmentViewer(
  target?: AttachmentViewerTarget | null | string,
) {
  const params: AttachmentViewerTarget =
    typeof target === 'string' ? { url: target } : (target ?? {});
  const fileUrl = pickFileUrl(params);
  if (!fileUrl) {
    message.warning($t('component.filePreview.missingUrl'));
    return false;
  }

  current.value = {
    fileUrl,
    fileName: pickFileName(params),
    uploader: String(params.uploader || params.creatorUserName || '').trim(),
    uploadTime: formatUploadTime(params.uploadTime || params.creationTime),
    title: String(params.title || '').trim(),
  };
  visible.value = true;
  return true;
}

export function closeAttachmentViewer() {
  visible.value = false;
  current.value = { ...EMPTY_STATE };
}

export function useAttachmentViewer() {
  return {
    visible,
    current,
    open: openAttachmentViewer,
    close: closeAttachmentViewer,
  };
}
