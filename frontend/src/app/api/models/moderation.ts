import { PageQuery } from './paging';
import { ReportStatus } from './report';

export type ModerationItemType = 'recipe' | 'comment' | 'report';

export interface ModerationQueueQuery extends PageQuery {
  type?: ModerationItemType;
  status?: ReportStatus;
}

