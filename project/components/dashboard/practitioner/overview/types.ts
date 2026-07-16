export interface DashboardData {
  upcomingCount: number;
  upcomingTrend?: number;
  totalVisitors?: number;
  visitorsTrend?: number;
  canceledThisWeek?: number;
  riskAlerts: any[];
  queue: ScheduleItem[];
  pendingRequests: PendingRequest[];
  chartData: ChartDataPoint[];
  isNewUser?: boolean;
  practitioner?: { name: string };
}

export interface ScheduleItem {
  consultationId: string;
  patientId: string;
  patientName: string;
  scheduledStart: string;
  scheduledEnd: string;
  type: 'video' | 'phone' | 'in_person';
  status: string;
}

export interface PendingRequest {
  consultationId: string;
  patientId: string;
  patientName: string;
  scheduledStart: string;
  type: 'video' | 'phone' | 'in_person';
  createdAt: string;
  reason?: string;
  /** False when this practitioner created the request themselves — the
   * patient must accept it, not the practitioner. */
  canAccept?: boolean;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  max: number;
}