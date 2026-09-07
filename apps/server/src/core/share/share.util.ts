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
  node.attrs[attr] = updateAttachmentUrl(attrVal, match[0], token);
}

function updateAttachmentUrl(
  src: string,
  matchedFilesSegment: string,
  jwtToken: string,
) {
  const publicSegment = matchedFilesSegment.replace(
    '/files/',
    '/files/public/',
  );
  const updatedSrc = src.replace(matchedFilesSegment, publicSegment);
  const separator = updatedSrc.includes('?') ? '&' : '?';
  return `${updatedSrc}${separator}jwt=${jwtToken}`;
}
