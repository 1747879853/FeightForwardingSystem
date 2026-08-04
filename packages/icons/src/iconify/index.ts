import { createIconifyIcon } from '@vben-core/icons';

export * from '@vben-core/icons';

export const MdiKeyboardEsc = createIconifyIcon('mdi:keyboard-esc');

/** 海运出口：船头朝右 */
export const SeaExportShipIcon = createIconifyIcon(
  'fluent-emoji-high-contrast:ship',
);

/** 海运进口：船头朝左 */
export const SeaImportShipIcon = createIconifyIcon(
  'fluent-emoji-high-contrast:ship',
  { hFlip: true },
);
