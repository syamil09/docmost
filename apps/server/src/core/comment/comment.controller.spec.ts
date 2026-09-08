import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { CommentRepo } from '@docmost/db/repos/comment/comment.repo';
import { PageRepo } from '@docmost/db/repos/page/page.repo';
import SpaceAbilityFactory from '../casl/abilities/space-ability.factory';
import { PageAccessService } from '../page/page-access/page-access.service';
import { WsService } from '../../ws/ws.service';
import { EnvironmentService } from '../../integrations/environment/environment.service';
import { AUDIT_SERVICE } from '../../integrations/audit/audit.service';

describe('CommentController', () => {
  let controller: CommentController;

  const commentServiceStub = {
    findByPageId: jest.fn(),
    findByPageAndDescendants: jest.fn(),
  };

  const pageRepoStub = {
    findById: jest.fn(),
  };

  const pageAccessStub = {
    validateCanView: jest.fn().mockResolvedValue(undefined),
    validateCanComment: jest.fn().mockResolvedValue(undefined),
  };

  const commentRepoStub = {
    findById: jest.fn(),
    deleteComment: jest.fn(),
    findPageComments: jest.fn(),
  };

  const spaceAbilityStub = {
    createForUser: jest.fn(),
  };

  const wsStub = { emitCommentEvent: jest.fn() };
  const auditStub = { log: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentController],
      providers: [
        { provide: CommentService, useValue: commentServiceStub },
        { provide: PageRepo, useValue: pageRepoStub },
        { provide: PageAccessService, useValue: pageAccessStub },
        { provide: CommentRepo, useValue: commentRepoStub },
        { provide: SpaceAbilityFactory, useValue: spaceAbilityStub },
        { provide: WsService, useValue: wsStub },
        { provide: AUDIT_SERVICE, useValue: auditStub },
        { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
        { provide: EnvironmentService, useValue: { isCloud: () => false } },
      ],
    }).compile();

    controller = module.get<CommentController>(CommentController);
  });

  it('delegates findAggregatedComments to the service after access check', async () => {
    pageRepoStub.findById.mockResolvedValue({ id: 'p1', deletedAt: null });
    commentServiceStub.findByPageAndDescendants.mockResolvedValue({
      items: [],
      meta: { nextCursor: null, hasNextPage: false, total: 0 },
    });

    const result = await (controller as any).findAggregatedComments(
      { pageId: 'p1' },
      { limit: 50 },
      {} as any,
    );

    expect(pageAccessStub.validateCanView).toHaveBeenCalled();
    expect(commentServiceStub.findByPageAndDescendants)
      .toHaveBeenCalledWith('p1', { limit: 50 });
    expect(result).toEqual({ items: [], meta: { nextCursor: null, hasNextPage: false, total: 0 } });
  });
});
