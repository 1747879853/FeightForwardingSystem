/**
 * Handsontable Autocomplete / Dropdown IME 补丁。
 *
 * 根因：AutocompleteEditor.onBeforeKeyDown 把 keyCode 229 当成可打印字符
 *（isPrintableChar 含 `keyCode >= 226`），中文等 IME 组字过程中会用仍含拼音/
 * 组字缓冲的 TEXTAREA.value 去 queryChoices。业务里自定义 source 与 HOT 内置
 * filter 都会按该值过滤 → 候选变空；上屏后若不触发 Backspace/Delete，不会再次
 * queryChoices，列表一直空。不同输入法组字/上屏事件序列不同，故有的能用、有的不行。
 *
 * 做法：组字期间跳过 keydown 过滤；在 compositionend / 非组字 input 后再按最终值过滤。
 * 对 AutocompleteEditor.prototype 打补丁，DropdownEditor 一并生效。
 */
import { AutocompleteEditor } from 'handsontable/editors/autocompleteEditor';

type AutocompleteEditorLike = {
  TEXTAREA: HTMLTextAreaElement;
  hot: {
    _registerTimeout: (callback: () => void, delay?: number) => void;
  };
  isOpened: () => boolean;
  queryChoices: (query: string) => void;
  open: (...args: unknown[]) => void;
  close: (...args: unknown[]) => void;
  onBeforeKeyDown: (event: KeyboardEvent) => void;
};

type ImeListenerState = {
  onCompositionEnd: () => void;
  onInput: (event: Event) => void;
  bound: boolean;
};

const imeState = new WeakMap<object, ImeListenerState>();

let patched = false;

function scheduleQueryChoices(editor: AutocompleteEditorLike) {
  editor.hot._registerTimeout(() => {
    if (editor.isOpened()) {
      editor.queryChoices(editor.TEXTAREA.value);
    }
  }, 10);
}

function isImeComposingKey(event: KeyboardEvent): boolean {
  return event.isComposing || event.keyCode === 229 || event.key === 'Process';
}

export function patchHandsontableAutocompleteIme() {
  if (patched) {
    return;
  }
  patched = true;

  const proto =
    AutocompleteEditor.prototype as unknown as AutocompleteEditorLike;
  const originalOpen = proto.open;
  const originalClose = proto.close;
  const originalOnBeforeKeyDown = proto.onBeforeKeyDown;

  proto.open = function (this: AutocompleteEditorLike, ...args: unknown[]) {
    originalOpen.apply(this, args);

    let state = imeState.get(this);
    if (!state) {
      state = {
        onCompositionEnd: () => scheduleQueryChoices(this),
        onInput: (event: Event) => {
          if ((event as InputEvent).isComposing) {
            return;
          }
          scheduleQueryChoices(this);
        },
        bound: false,
      };
      imeState.set(this, state);
    }

    if (!state.bound && this.TEXTAREA) {
      this.TEXTAREA.addEventListener('compositionend', state.onCompositionEnd);
      this.TEXTAREA.addEventListener('input', state.onInput);
      state.bound = true;
    }
  };

  proto.close = function (this: AutocompleteEditorLike, ...args: unknown[]) {
    const state = imeState.get(this);
    if (state?.bound && this.TEXTAREA) {
      this.TEXTAREA.removeEventListener(
        'compositionend',
        state.onCompositionEnd,
      );
      this.TEXTAREA.removeEventListener('input', state.onInput);
      state.bound = false;
    }
    originalClose.apply(this, args);
  };

  proto.onBeforeKeyDown = function (
    this: AutocompleteEditorLike,
    event: KeyboardEvent,
  ) {
    if (isImeComposingKey(event)) {
      return;
    }
    originalOnBeforeKeyDown.call(this, event);
  };
}
