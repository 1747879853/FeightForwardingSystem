import { describe, expect, it } from 'vitest';

import {
  getTrackingWarningAccentColor,
  getTrackingWarningAlertType,
  isSevereTrackingWarningCategory,
  TRACKING_WARNING_DEFAULT_COLOR,
  TRACKING_WARNING_SEVERE_COLOR,
} from './warning-category';

describe('运踪异常类型着色', () => {
  it.each(['DUMPING', 'DETENTION', 'DELAY', 'OVERDUE', 'delay', ' dumping '])(
    '%s 视为严重并走红色',
    (category) => {
      expect(isSevereTrackingWarningCategory(category)).toBe(true);
      expect(getTrackingWarningAccentColor(category)).toBe(
        TRACKING_WARNING_SEVERE_COLOR,
      );
      expect(getTrackingWarningAlertType(category)).toBe('error');
    },
  );

  it.each(['CHANGE', 'WCYOP', '', undefined, null])(
    '%s 不视为严重，保持原黄',
    (category) => {
      expect(isSevereTrackingWarningCategory(category)).toBe(false);
      expect(getTrackingWarningAccentColor(category)).toBe(
        TRACKING_WARNING_DEFAULT_COLOR,
      );
      expect(getTrackingWarningAlertType(category)).toBe('warning');
    },
  );
});
