import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock mermaid for testing
vi.mock('mermaid', () => ({
  default: {
    parse: vi.fn().mockResolvedValue(true),
    render: vi.fn().mockResolvedValue({
      svg: '<svg width="100" height="100"><g class="node"><rect /></g></svg>'
    })
  }
}));

// Mock d3 for testing
vi.mock('d3', () => ({
  line: vi.fn().mockReturnValue(() => 'M0,0L10,10'),
  curveBasis: {},
  select: vi.fn().mockReturnValue({
    selectAll: vi.fn().mockReturnValue({
      data: vi.fn().mockReturnValue({
        enter: vi.fn().mockReturnValue({
          append: vi.fn().mockReturnValue({
            attr: vi.fn().mockReturnValue({
              style: vi.fn(),
              text: vi.fn()
            })
          })
        }),
        remove: vi.fn()
      })
    }),
    attr: vi.fn().mockReturnThis(),
    style: vi.fn().mockReturnThis(),
    text: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis()
  })
}));

// Setup global test utilities
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));