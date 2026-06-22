import DOMPurify from 'dompurify';

export function sanitizeAnnouncementHtml(html?: string | null) {
  if (!html) {
    return '';
  }
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'rel'],
  });
}

export function isRichTextEmpty(html?: string | null) {
  const text = sanitizeAnnouncementHtml(html)
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();
  return !text;
}
