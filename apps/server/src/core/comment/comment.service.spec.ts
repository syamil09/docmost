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
    findById: jest.fn(),
    updateComment: jest.fn().mockResolvedValue(undefined),
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

  describe('resolveComment', () => {
    it('sets resolvedAt and resolvedById when resolving', async () => {
      commentRepoStub.findById.mockResolvedValue({
        id: 'c1',
        pageId: 'p1',
        spaceId: 's1',
        workspaceId: 'w1',
        resolvedAt: null,
        resolvedById: null,
        content: {},
        creatorId: 'u1',
      });
      commentRepoStub.updateComment.mockResolvedValue(undefined);
      commentRepoStub.findById.mockResolvedValueOnce({
        id: 'c1',
        pageId: 'p1',
        spaceId: 's1',
        workspaceId: 'w1',
        resolvedAt: new Date(),
        resolvedById: 'u2',
        content: {},
        creatorId: 'u1',
      });

      const result = await (service as any).resolveComment('c1', true, { id: 'u2', name: 'test', email: 'test@test.com', avatarUrl: null, createdAt: new Date(), updatedAt: new Date() } as any);

      expect(commentRepoStub.updateComment).toHaveBeenCalledWith(
        expect.objectContaining({ resolvedAt: expect.any(Date), resolvedById: 'u2' }),
        'c1',
      );
      expect(wsServiceStub.emitCommentEvent).toHaveBeenCalledWith('s1', 'p1', {
        operation: 'commentResolved',
        commentId: 'c1',
        resolved: true,
      });
    });

    it('clears resolvedAt and resolvedById when re-opening', async () => {
      commentRepoStub.findById.mockResolvedValue({
        id: 'c1',
        pageId: 'p1',
        spaceId: 's1',
        workspaceId: 'w1',
        resolvedAt: new Date(),
        resolvedById: 'u1',
        content: {},
        creatorId: 'u1',
      });
      commentRepoStub.updateComment.mockResolvedValue(undefined);
      commentRepoStub.findById.mockResolvedValueOnce({
        id: 'c1',
        pageId: 'p1',
        spaceId: 's1',
        workspaceId: 'w1',
        resolvedAt: null,
        resolvedById: null,
        content: {},
        creatorId: 'u1',
      });

      const result = await (service as any).resolveComment('c1', false, { id: 'u1', name: 'test', email: 'test@test.com', avatarUrl: null, createdAt: new Date(), updatedAt: new Date() } as any);

      expect(commentRepoStub.updateComment).toHaveBeenCalledWith(
        expect.objectContaining({ resolvedAt: null, resolvedById: null }),
        'c1',
      );
      expect(wsServiceStub.emitCommentEvent).toHaveBeenCalledWith('s1', 'p1', {
        operation: 'commentResolved',
        commentId: 'c1',
        resolved: false,
      });
    });
  });
});
