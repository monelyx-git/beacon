import { relative, sep } from 'node:path';

/** Link to `file` in the author's repo: `editUrl` plus the file's path inside `contentDir`. */
export const editHref = (editUrl, contentDir, file) =>
  `${editUrl.replace(/\/+$/, '')}/${relative(contentDir, file).split(sep).map(encodeURIComponent).join('/')}`;
