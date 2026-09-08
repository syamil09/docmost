import { Test, TestingModule } from '@nestjs/testing';
import { CommentRepo } from './comment.repo';

describe('CommentRepo', () => {
  let repo: CommentRepo;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentRepo,
        {
          provide: 'KyselyDB',
          useValue: { __fakeRepo: true },
        },
      ],
    }).compile();
    repo = module.get<CommentRepo>(CommentRepo);
  });

  it('is defined', () => {
    expect(repo).toBeDefined();
  });

  it('exposes withPage as a function', () => {
    expect(typeof (repo as any).withPage).toBe('function');
  });

  it('exposes findAggregatedComments as a function', () => {
    expect(typeof (repo as any).findAggregatedComments).toBe('function');
  });
});
