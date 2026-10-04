import { IUser } from "@/features/user/types/user.types";
import { QueryParams } from "@/lib/types.ts";

export interface IComment {
  id: string;
  content: string;
  selection?: string;
  type?: string;
  creatorId: string;
  pageId: string;
  parentCommentId?: string;
  resolvedById?: string;
  resolvedAt?: Date;
  workspaceId: string;
  createdAt: Date;
  editedAt?: Date;
  deletedAt?: Date;
  creator: IUser;
  resolvedBy?: IUser;
  yjsSelection?: {
    anchor: any;
    head: any;
  };
  page?: {
    id: string;
    slugId?: string;
    title: string;
    icon?: string;
    spaceId?: string;
    spaceSlug?: string;
  };
}

export interface ICommentData {
  id: string;
  pageId: string;
  parentCommentId?: string;
  content: any;
  selection?: string;
}

export interface IResolveComment {
  commentId: string;
  pageId: string;
  resolved: boolean;
}

export interface ICommentParams extends QueryParams {
  pageId: string;
}
