import type { CommentNode } from '../../components/CommentThread';

/** Comentário de post — superset de CommentNode (threading + reações, item 4). */
export interface Comment extends CommentNode {
  postId: string;
}
