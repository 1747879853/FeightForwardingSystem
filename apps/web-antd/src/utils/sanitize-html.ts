import DOMPurify from 'dompurify';

import { buildAttachmentUrl } from './attachment-url';

const URL_ATTRIBUTES = [
  { selector: 'img[src]', attribute: 'src' },
  { selector: 'a[href]', attribute: 'href' },
  { selector: '[data-href]', attribute: 'data-href' },
] as const;

export function sanitizeAnnouncementHtml(html?: string | null) {
  if (!html) {
    return '';
  }
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'rel'],
  });
}

function rewriteAttachmentUrls(html: string) {
  if (typeof document === 'undefined') {
    return html;
  }

  const container = document.createElement('div');
  container.innerHTML = html;

  for (const { selector, attribute } of URL_ATTRIBUTES) {
    container.querySelectorAll(selector).forEach((element) => {
      const value = element.getAttribute(attribute);
      if (!value) {
        return;
      }
      element.setAttribute(attribute, buildAttachmentUrl(value));
    });
  }

  return container.innerHTML;
}

/** 消毒公告富文本 HTML，并将附件相对路径转为可访问的完整地址。 */
export function renderAnnouncementHtml(html?: string | null) {
  const sanitized = sanitizeAnnouncementHtml(html);
  if (!sanitized) {
    return '';
  }
  return rewriteAttachmentUrls(sanitized);
}

export function isRichTextEmpty(html?: string | null) {
  const text = sanitizeAnnouncementHtml(html)
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();
  return !text;
}
