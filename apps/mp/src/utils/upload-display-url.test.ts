import { describe, expect, it } from 'vitest';

import { resolveUploadDisplayUrl } from './upload-display-url';

describe('resolveUploadDisplayUrl', () => {
  it('上传没返回地址时用本地临时路径', () => {
    expect(
      resolveUploadDisplayUrl(
        '',
        'wxfile://tmp/a.jpg',
        'https://api.example.com',
      ),
    ).toBe('wxfile://tmp/a.jpg');
  });

  it('已是绝对地址时原样使用', () => {
    expect(
      resolveUploadDisplayUrl(
        'https://cdn.example.com/a.jpg',
        'wxfile://tmp/a.jpg',
        'https://api.example.com',
      ),
    ).toBe('https://cdn.example.com/a.jpg');
  });

  it('相对路径拼上 origin，避免小程序 image 空白', () => {
    expect(
      resolveUploadDisplayUrl(
        '/upload/a.jpg',
        'wxfile://tmp/a.jpg',
        'https://api.example.com',
      ),
    ).toBe('https://api.example.com/upload/a.jpg');
  });

  it('没有 origin 时不把相对路径塞给 image', () => {
    expect(
      resolveUploadDisplayUrl('/upload/a.jpg', 'wxfile://tmp/a.jpg', ''),
    ).toBe('wxfile://tmp/a.jpg');
  });
});
