export type ReportTargetType = 'recipe' | 'comment';
export type ReportStatus = 'open' | 'resolved' | 'removed';

export interface Report {
  id: string;
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  details?: string;
  status: ReportStatus;
  createdAt: string;
  reviewedById?: string;
  reviewedAt?: string;
}

export interface ReportCreate {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  details?: string;
}

