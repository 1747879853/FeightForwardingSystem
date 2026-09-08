import { describe, expect, it } from 'vitest';

import {
  getAttachmentFileExtension,
  resolveAttachmentPreviewCategory,
  resolveOfficePreviewKind,
} from './attachment-preview-category';

describe('attachment-preview-category', () => {
  it('从友好文件名取扩展名，忽略 query', () => {
    expect(getAttachmentFileExtension('发票OFD-123.ofd?x=1')).toBe('ofd');
    expect(getAttachmentFileExtension('/Uploads/a/b.PDF#toolbar=0')).toBe(
      'pdf',
    );
  });

  it('把 ofd 分到可预览类别，而不是 other', () => {
    expect(
      resolveAttachmentPreviewCategory('发票OFD-蓝票号.ofd', '/Uploads/a.ofd'),
    ).toBe('ofd');
    expect(resolveAttachmentPreviewCategory('', 'https://api/x.ofd')).toBe(
      'ofd',
    );
  });

  it('其它常见类型保持原分流', () => {
    expect(resolveAttachmentPreviewCategory('a.png')).toBe('image');
    expect(resolveAttachmentPreviewCategory('a.pdf')).toBe('pdf');
    expect(resolveAttachmentPreviewCategory('a.xlsx')).toBe('office');
    expect(resolveAttachmentPreviewCategory('a.doc')).toBe('office');
    expect(resolveAttachmentPreviewCategory('a.zip')).toBe('other');
  });

  it('旧版 doc/ppt 不能走 vue-office', () => {
    expect(resolveOfficePreviewKind('docx')).toBe('docx');
    expect(resolveOfficePreviewKind('xlsx')).toBe('excel');
    expect(resolveOfficePreviewKind('doc')).toBe('');
    expect(resolveOfficePreviewKind('ppt')).toBe('');
  });
});
