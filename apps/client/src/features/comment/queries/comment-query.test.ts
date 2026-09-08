import { describe, it, expect } from 'vitest';
import { RQ_KEY, RQ_KEY_AGG } from './comment-query';

describe('comment query keys', () => {
  it('RQ_KEY scopes by page id only', () => {
    expect(RQ_KEY('page-1')).toEqual(['comments', 'page-1']);
  });

  it('RQ_KEY_AGG scopes by "aggregated" namespace + page id', () => {
    expect(RQ_KEY_AGG('page-1')).toEqual(['comments', 'aggregated', 'page-1']);
  });

  it('aggregated key differs from the per-page key', () => {
    expect(RQ_KEY_AGG('page-1')).not.toEqual(RQ_KEY('page-1'));
  });
});
