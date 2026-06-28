export interface DbTechnician {
  id: string;
  name: string;
  role: string | null;
  is_active: boolean;
  display_order: number;
  bio?: string | null;
  avatar_url?: string | null;
}

export interface TechnicianScheduleRow {
  technician_id: string;
  day_of_week: number;
  is_working: boolean;
  start_time: string | null;
  end_time: string | null;
}

export interface TechnicianScheduleInput {
  dayOfWeek: number;
  isWorking: boolean;
  startTime: string | null;
  endTime: string | null;
}

export interface ResolvedTechnicianSchedule {
  technicianId: string;
  isWorking: boolean;
  startTime: string | null;
  endTime: string | null;
}

export interface EmployeeWithSchedule extends DbTechnician {
  schedule: TechnicianScheduleRow[];
}

export interface BookingTechnicianOption {
  id: string;
  name: string;
  role: string | null;
}

export interface TechnicianScheduleOverrideRow {
  id: string;
  technician_id: string;
  override_date: string;
  is_working: boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
}

export interface TechnicianScheduleOverrideInput {
  overrideDate: string;
  isWorking: boolean;
  startTime: string | null;
  endTime: string | null;
  reason?: string | null;
}

export const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const WEEKDAY_INDICES = [1, 2, 3, 4, 5] as const;
