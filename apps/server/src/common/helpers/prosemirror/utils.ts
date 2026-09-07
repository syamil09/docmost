import { Node } from '@tiptap/pm/model';
import {
  jsonToNode,
  tiptapExtensions,
} from '../../../collaboration/collaboration.util';
import { validate as isValidUUID } from 'uuid';
import { Transform } from '@tiptap/pm/transform';
import { TiptapTransformer } from '@hocuspocus/transformer';
import * as Y from 'yjs';
import {
  INTERNAL_LINK_REGEX,
  extractPageSlugId,
} from '../../../integrations/export/utils';
import { isAttachmentNode } from './attachment-node-types';

export interface MentionNode {
  id: string;
  label: string;
  entityType: 'user' | 'page';
  entityId: string;
  creatorId: string;
}

export function extractMentions(prosemirrorJson: any) {
  const mentionList: MentionNode[] = [];
  const doc = jsonToNode(prosemirrorJson);

  doc.descendants((node: Node) => {
    if (node.type.name === 'mention') {
      if (
        node.attrs.id &&
        !mentionList.some((mention) => mention.id === node.attrs.id)
      ) {
        mentionList.push({
          id: node.attrs.id,
          label: node.attrs.label,
          entityType: node.attrs.entityType,
          entityId: node.attrs.entityId,
          creatorId: node.attrs.creatorId,
        });
      }
    }
  });
  return mentionList;
}

export function extractUserMentions(mentionList: MentionNode[]): MentionNode[] {
  const userList = [];
  for (const mention of mentionList) {
    if (mention.entityType === 'user') {
      userList.push(mention);
    }
  }
  return userList as MentionNode[];
}

export function extractPageMentions(mentionList: MentionNode[]): MentionNode[] {
  const pageMentionList = [];
  for (const mention of mentionList) {
    if (
      mention.entityType === 'page' &&
      !pageMentionList.some(
        (pageMention) => pageMention.entityId === mention.entityId,
      )
    ) {
      pageMentionList.push(mention);
    }
  }
  return pageMentionList as MentionNode[];
}

export function extractInternalLinkSlugIds(prosemirrorJson: any): string[] {
  const slugIds: string[] = [];
  const doc = jsonToNode(prosemirrorJson);

  doc.descendants((node: Node) => {
    for (const mark of node.marks) {
      if (mark.type.name === 'link' && mark.attrs.internal && mark.attrs.href) {
        const match = mark.attrs.href.match(INTERNAL_LINK_REGEX);
        if (match) {
          const slugId = extractPageSlugId(match[5]);
          if (slugId && !slugIds.includes(slugId)) {
            slugIds.push(slugId);
          }
        }
      }
    }
  });

  return slugIds;
}

export function extractUserMentionIdsFromJson(json: any): string[] {
  const userIds: string[] = [];

  function walk(node: any) {
    if (!node) return;
    if (
      node.type === 'mention' &&
      node.attrs?.entityType === 'user' &&
      node.attrs?.entityId &&
      !userIds.includes(node.attrs.entityId)
    ) {
      userIds.push(node.attrs.entityId);
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        walk(child);
      }
    }
  }

  walk(json);
  return userIds;
}

export function getProsemirrorContent(content: any) {
  return (
    content ?? {
      type: 'doc',
      content: [{ type: 'paragraph', attrs: { textAlign: 'left' } }],
    }
  );
}

export { isAttachmentNode };

// matches "/files/<uuid>" or "/api/files/<uuid>" in either a relative path
// or an absolute URL, so nodes whose attachmentId attr is absent (src-only)
// can still be resolved from their src/url. Exported so share.util.ts can
// anchor its public-URL rewrite on the same segment instead of matching
// "/files/" anywhere in the string.
export const FILES_PATH_REGEX =
  /\/(?:api\/)?files\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})(?=[/?]|$)/;

export function extractAttachmentIdFromUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  const match = url.match(FILES_PATH_REGEX);
  return match ? match[1] : null;
}

export function resolveAttachmentId(node: Node): string | null {
  if (node.attrs.attachmentId && isValidUUID(node.attrs.attachmentId)) {
    return node.attrs.attachmentId;
  }
  return (
    extractAttachmentIdFromUrl(node.attrs.src) ??
    extractAttachmentIdFromUrl(node.attrs.url)
  );
}

export function getAttachmentIds(prosemirrorJson: any) {
  const doc = jsonToNode(prosemirrorJson);
  const attachmentIds = [];

  doc?.descendants((node: Node) => {
    if (isAttachmentNode(node.type.name)) {
      if (node.attrs.attachmentId && isValidUUID(node.attrs.attachmentId)) {
        if (!attachmentIds.includes(node.attrs.attachmentId)) {
          attachmentIds.push(node.attrs.attachmentId);
        }
      }
    }
  });

  return attachmentIds;
}

export function removeMarkTypeFromDoc(doc: Node, markName: string): Node {
  const { schema } = doc.type;
  const markType = schema.marks[markName];

  if (!markType) {
    return doc;
  }

  const tr = new Transform(doc).removeMark(0, doc.content.size, markType);
  return tr.doc;
}

export function createYdocFromJson(prosemirrorJson: any): Buffer | null {
  if (prosemirrorJson) {
    const ydoc = TiptapTransformer.toYdoc(
      prosemirrorJson,
      'default',
      tiptapExtensions,
    );

    Y.encodeStateAsUpdate(ydoc);

    return Buffer.from(Y.encodeStateAsUpdate(ydoc));
  }
  return null;
}
