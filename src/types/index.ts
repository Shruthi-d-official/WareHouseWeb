export interface User {
  id: string;
  user_id: string;
  role: 'admin' | 'vendor' | 'team_leader' | 'worker';
  password_hash: string;
  email?: string;
  warehouse_name?: string;
  vendor_id?: string;
  team_leader_id?: string;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface BinMaster {
  id: string;
  bin_no: string;
  warehouse_name: string;
  qty_as_per_books: number;
  created_at: string;
}

export interface CountingSession {
  id: string;
  worker_id: string;
  team_leader_id: string;
  warehouse_name: string;
  start_time: string;
  end_time?: string;
  status: 'active' | 'completed';
  created_at: string;
}

export interface CountingData {
  id: string;
  session_id: string;
  wh_name: string;
  date: string;
  tl_name: string;
  username: string;
  bin_no: string;
  qty_counted: number;
  qty_recounted_tl?: number;
  qty_as_per_books: number;
  difference: number;
  reason_for_difference?: string;
  created_at: string;
}

export interface WorkerPerformance {
  id: string;
  wh_name: string;
  date: string;
  username: string;
  no_of_bins_counted: number;
  no_of_qty_counted: number;
  time_taken_minutes: number;
  efficiency: number;
  ranking?: number;
  created_at: string;
}

export interface OTPRequest {
  id: string;
  worker_id: string;
  team_leader_id: string;
  otp_code: string;
  is_approved: boolean;
  expires_at: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  details: string;
  ip_address?: string;
  created_at: string;
}