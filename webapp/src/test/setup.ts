import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Canvas API
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  arc: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  scale: vi.fn(),
  createRadialGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
})) as unknown as typeof HTMLCanvasElement.prototype.getContext;

// Mock requestAnimationFrame
globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => setTimeout(cb, 0)) as unknown as (callback: FrameRequestCallback) => number;
globalThis.cancelAnimationFrame = vi.fn((id: number) => clearTimeout(id)) as unknown as (handle: number) => void;
