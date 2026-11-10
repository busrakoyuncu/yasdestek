export interface FireflyOptions {
  /** Fireflies per 10,000 CSS px² of canvas. Default 1.5. */
  density?: number;
  /** Minimum count. Default 35. */
  min?: number;
  /** Maximum count. Default 260. */
  max?: number;
  /** Vertical band they hover in, as fractions of height. Default [0.58, 0.96]. */
  band?: [number, number];
  /** Glow colors (hex). Default warm yellows. */
  colors?: string[];
  /** Reaction to the pointer. Default "attract". */
  mode?: 'attract' | 'repel';
  /** Pointer influence radius in CSS px. Default 230. */
  radius?: number;
  /** Pointer force multiplier. Default 1. */
  strength?: number;
  /** Global speed multiplier. Default 1. */
  speed?: number;
  /** Soft warm light around the pointer. Default true. */
  cursorGlow?: boolean;
  /** Click/tap scatters nearby fireflies. Default true. */
  clickBurst?: boolean;
  /** Where pointer events are read. Default window. */
  eventTarget?: Window | HTMLElement;
}

export interface FirefliesHandle {
  setOptions(next: Partial<Omit<FireflyOptions, 'eventTarget'>>): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}

export function createFireflies(
  canvas: HTMLCanvasElement,
  options?: FireflyOptions,
): FirefliesHandle;
