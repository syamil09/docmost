import { Node } from '@tiptap/pm/model';
import { FILES_PATH_REGEX } from '../../common/helpers/prosemirror/utils';

export function updateAttachmentAttr(
  node: Node,
  attr: 'src' | 'url',
  token: string,
) {
  const attrVal = node.attrs[attr];
  if (typeof attrVal !== 'string') return;

  const match = attrVal.match(FILES_PATH_REGEX);
  if (!match) return;

  // @ts-ignore
  node.attrs[attr] = updateAttachmentUrl(attrVal, token, match[0]);
}

export function updateAttachmentUrl(
  src: string,
  jwtToken: string,
  matchedFilesSegment?: string,
) {
  const segment = matchedFilesSegment ?? src.match(FILES_PATH_REGEX)?.[0];
  const updatedSrc = segment
    ? src.replace(segment, segment.replace('/files/', '/files/public/'))
    : src.replace('/files/', '/files/public/');
  const separator = updatedSrc.includes('?') ? '&' : '?';
  return `${updatedSrc}${separator}jwt=${jwtToken}`;
}
