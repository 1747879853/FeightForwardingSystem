import { describe, expect, it } from 'vitest';

import {
  clampMascotPosition,
  getDefaultMascotPosition,
  shouldShowJhtMascot,
} from './jht-mascot-state';

const viewport = { height: 800, width: 1200 };
const mascotSize = { height: 276, width: 220 };

describe('jht mascot visibility', () => {
  it('only shows after login on a JHT business page', () => {
    expect(
      shouldShowJhtMascot({
        accessToken: 'token',
        brandIsJht: true,
        routePath: '/workbench',
      }),
    ).toBe(true);

    expect(
      shouldShowJhtMascot({
        accessToken: null,
        brandIsJht: true,
        routePath: '/auth/login',
      }),
    ).toBe(false);

    expect(
      shouldShowJhtMascot({
        accessToken: 'token',
        brandIsJht: false,
        routePath: '/workbench',
      }),
    ).toBe(false);
  });
});

describe('jht mascot position', () => {
  it('keeps a valid position unchanged', () => {
    expect(
      clampMascotPosition({ x: 500, y: 300 }, viewport, mascotSize),
    ).toEqual({ x: 500, y: 300 });
  });

  it('keeps the mascot inside every viewport edge', () => {
    expect(
      clampMascotPosition({ x: -100, y: 900 }, viewport, mascotSize),
    ).toEqual({ x: 12, y: 512 });
  });

  it('falls back from invalid persisted coordinates', () => {
    expect(
      clampMascotPosition(
        { x: Number.NaN, y: Number.POSITIVE_INFINITY },
        viewport,
        mascotSize,
      ),
    ).toEqual({ x: 968, y: 512 });
  });

  it('places a new mascot near the lower-right corner', () => {
    expect(getDefaultMascotPosition(viewport, mascotSize)).toEqual({
      x: 952,
      y: 496,
    });
  });

  it('still returns a reachable position on a tiny viewport', () => {
    expect(
      getDefaultMascotPosition({ height: 200, width: 180 }, mascotSize),
    ).toEqual({ x: 12, y: 12 });
  });
});
