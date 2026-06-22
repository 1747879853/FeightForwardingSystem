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
  disabled?: boolean;
  placeholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  placeholder: undefined,
});

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
  MENU_CONF: {
    uploadImage: {
      async customUpload(
        file: File,
        insertFn: (url: string, alt?: string, href?: string) => void,
      ) {
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
</script>

<template>
  <div
    class="rich-text-editor rounded-md border border-[#d9d9d9] bg-white"
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

.rich-text-editor :deep(.w-e-text-container) {
  height: 320px !important;
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
