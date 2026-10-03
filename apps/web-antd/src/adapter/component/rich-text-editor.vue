<script lang="ts" setup>
import type {
  IDomEditor,
  IEditorConfig,
  IToolbarConfig,
} from '@wangeditor/editor';

import '@wangeditor/editor/dist/css/style.css';

import { onBeforeUnmount, shallowRef, watch } from 'vue';

import { Editor, Toolbar } from '@wangeditor/editor-for-vue';

import { uploadFile } from '#/api/common/upload';
import { $t } from '#/locales';

const EMPTY_HTML = '<p><br></p>';

interface Props {
  autoHeight?: boolean;
  disabled?: boolean;
  /** 铺满父级剩余高度，供写信窗使用 */
  fill?: boolean;
  /** upload：走系统附件；base64：插成 data URI，供个人邮箱正文使用 */
  imageInsert?: 'base64' | 'upload';
  placeholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
  autoHeight: false,
  disabled: false,
  fill: false,
  imageInsert: 'upload',
  placeholder: undefined,
});

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result || '')));
    reader.addEventListener('error', () => {
      reject(reader.error ?? new Error('读取图片失败'));
    });
    reader.readAsDataURL(file);
  });
}

const modelValue = defineModel<string>({ default: '' });

const editorRef = shallowRef<IDomEditor>();
const toolbarConfig: Partial<IToolbarConfig> = {
  toolbarKeys: [
    'headerSelect',
    '|',
    'bold',
    'italic',
    'underline',
    'through',
    '|',
    'color',
    'bgColor',
    'fontSize',
    '|',
    'bulletedList',
    'numberedList',
    '|',
    'justifyLeft',
    'justifyCenter',
    'justifyRight',
    '|',
    'insertLink',
    'uploadImage',
    'blockquote',
    'divider',
    '|',
    'undo',
    'redo',
  ],
};

const editorConfig: Partial<IEditorConfig> = {
  autoFocus: false,
  placeholder: props.placeholder || $t('system.announcement.textPlaceholder'),
  scroll: !props.autoHeight,
  MENU_CONF: {
    uploadImage: {
      async customUpload(
        file: File,
        insertFn: (url: string, alt?: string, href?: string) => void,
      ) {
        if (props.imageInsert === 'base64') {
          const dataUrl = await readFileAsDataUrl(file);
          insertFn(dataUrl, file.name, dataUrl);
          return;
        }
        const formData = new FormData();
        formData.append('file', file);
        const resultList = await uploadFile(formData);
        const item = resultList[0];
        if (!item?.fileUrl) {
          throw new Error('upload failed');
        }
        insertFn(
          item.fileUrl,
          item.friendlyFileName || item.fileName,
          item.fileUrl,
        );
      },
    },
  },
};

const normalizeHtml = (html?: string | null) => {
  if (!html || html === '<p></p>') {
    return EMPTY_HTML;
  }
  return html;
};

const handleCreated = (editor: IDomEditor) => {
  editorRef.value = editor;
  editor.setHtml(normalizeHtml(modelValue.value));
  if (props.disabled) {
    editor.disable();
  } else {
    editor.enable();
  }
};

watch(
  () => props.disabled,
  (disabled) => {
    const editor = editorRef.value;
    if (!editor) {
      return;
    }
    if (disabled) {
      editor.disable();
    } else {
      editor.enable();
    }
  },
);

watch(
  () => modelValue.value,
  (value) => {
    const editor = editorRef.value;
    if (!editor) {
      return;
    }
    const nextHtml = normalizeHtml(value);
    const currentHtml = editor.getHtml();
    if (nextHtml !== currentHtml) {
      editor.setHtml(nextHtml);
    }
  },
);

onBeforeUnmount(() => {
  editorRef.value?.destroy();
});

function insertText(text: string) {
  const editor = editorRef.value;
  if (!editor || props.disabled || !text) {
    return;
  }
  editor.focus();
  editor.insertText(text);
}

defineExpose({ insertText });
</script>

<template>
  <div
    class="rich-text-editor rounded-md border border-[#d9d9d9] bg-white"
    :class="{
      'rich-text-editor--auto-height': autoHeight,
      'rich-text-editor--fill': fill,
    }"
    @mousedown.stop
    @pointerdown.stop
  >
    <Toolbar
      :editor="editorRef"
      :default-config="toolbarConfig"
      mode="default"
      class="border-b border-[#d9d9d9]"
    />
    <Editor
      v-model="modelValue"
      :default-config="editorConfig"
      mode="default"
      class="rich-text-editor__body"
      @on-created="handleCreated"
    />
  </div>
</template>

<style scoped>
.rich-text-editor__body {
  height: 320px;
  overflow-y: auto;
}

.rich-text-editor--auto-height .rich-text-editor__body {
  height: auto;
  min-height: 280px;
  overflow-y: visible;
}

.rich-text-editor :deep(.w-e-text-container) {
  height: 320px !important;
}

.rich-text-editor--auto-height :deep(.w-e-text-container) {
  height: auto !important;
  min-height: 280px !important;
}

.rich-text-editor--fill {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: transparent;
  border: 0;
  border-radius: 0;
}

.rich-text-editor--fill .rich-text-editor__body,
.rich-text-editor--fill :deep(.w-e-text-container) {
  flex: 1;
  height: auto !important;
  min-height: 220px;
}

.rich-text-editor--fill :deep(.w-e-text-container [data-slate-editor]) {
  min-height: 180px;
}

.rich-text-editor :deep(.w-e-toolbar) {
  z-index: 2;
}

.rich-text-editor :deep(.w-e-text-container [data-slate-editor]) {
  min-height: 280px;
}
</style>

<style>
/* wangEditor 下拉/弹层需高于 Drawer(z-index:1000) */
.w-e-select-list,
.w-e-bar-item-menus-container,
.w-e-drop-panel,
.w-e-modal,
.w-e-full-screen-container {
  z-index: 3000 !important;
}
</style>
