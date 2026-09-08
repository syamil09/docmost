import { Test, TestingModule } from '@nestjs/testing';
import { CommentService } from './comment.service';
import { CommentRepo } from '@docmost/db/repos/comment/comment.repo';
import { PageRepo } from '@docmost/db/repos/page/page.repo';
import { WsService } from '../../ws/ws.service';
import { CollaborationGateway } from '../../collaboration/collaboration.gateway';
import { QueueName } from '../../integrations/queue/constants';

describe('CommentService', () => {
  let service: CommentService;

  const commentRepoStub = {
    findAggregatedComments: jest.fn(),
    findPageComments: jest.fn(),
  };
  const pageRepoStub = {
    getPageAndDescendantsExcludingRestricted: jest.fn(),
  };
  const wsServiceStub = { emitCommentEvent: jest.fn() };
  const collabStub = { handleYjsEvent: jest.fn() };
  const generalQueueStub = { add: jest.fn().mockResolvedValue(undefined) };
  const notifQueueStub = { add: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        { provide: CommentRepo, useValue: commentRepoStub },
        { provide: PageRepo, useValue: pageRepoStub },
        { provide: WsService, useValue: wsServiceStub },
        { provide: CollaborationGateway, useValue: collabStub },
        { provide: `BullQueue_${QueueName.GENERAL_QUEUE}`, useValue: generalQueueStub },
        { provide: `BullQueue_${QueueName.NOTIFICATION_QUEUE}`, useValue: notifQueueStub },
      ],
    }).compile();

    service = module.get<CommentService>(CommentService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByPageAndDescendants', () => {
    it('returns descendants query result directly when descendants exist', async () => {
      pageRepoStub.getPageAndDescendantsExcludingRestricted.mockResolvedValue([
        { id: 'parent-id' },
        { id: 'child-id' },
      ]);
      commentRepoStub.findAggregatedComments.mockResolvedValue({
        items: [],
        meta: { nextCursor: null, hasNextPage: false, total: 0 },
      });

      const result = await (service as any).findByPageAndDescendants('parent-id', { limit: 50 });

      expect(pageRepoStub.getPageAndDescendantsExcludingRestricted)
        .toHaveBeenCalledWith('parent-id', { includeContent: false });
      expect(commentRepoStub.findAggregatedComments)
        .toHaveBeenCalledWith(['parent-id', 'child-id'], { limit: 50 });
      expect(result).toEqual({ items: [], meta: { nextCursor: null, hasNextPage: false, total: 0 } });
    });

    it('returns an empty cursor result when no descendants exist', async () => {
      pageRepoStub.getPageAndDescendantsExcludingRestricted.mockResolvedValue([]);
      const result = await (service as any).findByPageAndDescendants('lonely-id', { limit: 50 });

      expect(commentRepoStub.findAggregatedComments).not.toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.items).toEqual([]);
    });
  });
});
