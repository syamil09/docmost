import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/api-client', () => ({
  default: {
    post: vi.fn().mockResolvedValue({
      data: { items: [{ id: 'c1' }], meta: { nextCursor: null, hasNextPage: false, total: 1 } },
    }),
  },
}));

import { getAggregatedComments } from './comment-service';
import api from '@/lib/api-client';

describe('getAggregatedComments', () => {
  it('POSTs to /comments/aggregated with the input params', async () => {
    const result = await getAggregatedComments({
      pageId: 'p1',
      cursor: 'cur',
      limit: 50,
    });

    expect(api.post).toHaveBeenCalledWith('/comments/aggregated', {
      pageId: 'p1',
      cursor: 'cur',
      limit: 50,
    });
    expect(result.items).toEqual([{ id: 'c1' }]);
  });
});
