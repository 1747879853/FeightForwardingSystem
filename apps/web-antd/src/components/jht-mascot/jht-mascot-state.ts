export interface MascotPosition {
  x: number;
  y: number;
}

export interface MascotSize {
  height: number;
  width: number;
}

export interface MascotViewport {
  height: number;
  width: number;
}

export const MASCOT_VIEWPORT_MARGIN = 12;

export function shouldShowJhtMascot(options: {
  accessToken: null | string;
  brandIsJht: boolean;
  routePath: string;
}) {
  return (
    options.brandIsJht &&
    Boolean(options.accessToken) &&
    !options.routePath.startsWith('/auth')
  );
}

function finiteOr(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

export function clampMascotPosition(
  position: MascotPosition,
  viewport: MascotViewport,
  size: MascotSize,
  margin = MASCOT_VIEWPORT_MARGIN,
): MascotPosition {
  const maxX = Math.max(margin, viewport.width - size.width - margin);
  const maxY = Math.max(margin, viewport.height - size.height - margin);

  return {
    x: Math.min(maxX, Math.max(margin, finiteOr(position.x, maxX))),
    y: Math.min(maxY, Math.max(margin, finiteOr(position.y, maxY))),
  };
}

export function getDefaultMascotPosition(
  viewport: MascotViewport,
  size: MascotSize,
  margin = MASCOT_VIEWPORT_MARGIN,
): MascotPosition {
  return clampMascotPosition(
    {
      x: viewport.width - size.width - 28,
      y: viewport.height - size.height - 28,
    },
    viewport,
    size,
    margin,
  );
}
