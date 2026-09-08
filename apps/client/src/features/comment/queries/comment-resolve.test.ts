import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/api-client', () => ({
  default: {
    post: vi.fn().mockResolvedValue({
      data: {
        id: 'c1',
        resolvedAt: new Date(),
        resolvedById: 'u1',
        resolvedBy: { id: 'u1', name: 'syamil', avatarUrl: null },
      },
    }),
  },
}));

import { useResolveCommentMutation } from './comment-query';

describe('useResolveCommentMutation', () => {
  it('is exported from comment-query.ts', () => {
    expect(typeof useResolveCommentMutation).toBe('function');
  });
});
