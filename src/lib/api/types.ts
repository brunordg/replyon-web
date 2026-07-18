// TypeScript mirrors of the replyon-api DTOs.
// Source of truth: com.codeteam.replyonapi.adapters.in.web.* records.
// IDs are Long -> number. Timestamps are LocalDateTime ISO strings without offset
// (e.g. "2026-07-17T14:30:00"). Status fields serialize as the enum name string.

export type EntityStatus = "ACTIVE" | "INACTIVE";

export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

/** Standard list wrapper used by customers/services/staff/companies (key: `content`). */
export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Common query params for the paginated list endpoints. */
export interface ListParams {
  page?: number;
  size?: number;
  name?: string;
  status?: EntityStatus;
}

// ---- Auth ----
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  expires_in: number; // seconds
  tenant_id: number;
}

// ---- Users ----
export interface RegisterUserRequest {
  email: string;
  password: string;
}

export interface UserResponse {
  id: number;
  email: string;
}

// ---- Companies ----
export interface CompanyResponse {
  id: number;
  tenantId: number;
  name: string;
  document: string;
  email: string;
  phone: string;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyRequest {
  name: string;
  document: string;
  email: string;
  phone: string;
}

export interface UpdateCompanyRequest {
  name: string;
  email: string;
  phone: string;
}

export interface SignUpRequest {
  companyName: string;
  companyDocument: string;
  companyEmail: string;
  companyPhone: string;
  adminEmail: string;
  adminPassword: string;
}

export interface SignUpResponse {
  companyId: number;
  tenantId: number;
  userId: number;
  userEmail: string;
}

// ---- Customers ----
export interface CustomerResponse {
  id: number;
  tenantId: number;
  name: string;
  email: string;
  phone: string;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerRequest {
  name: string;
  email: string;
  phone?: string;
}

export interface UpdateCustomerRequest {
  name?: string;
  email?: string;
  phone?: string;
}

// ---- Services ----
export interface ServiceResponse {
  id: number;
  tenantId: number;
  name: string;
  description: string;
  price: number; // BigDecimal serialized as JSON number
  durationMinutes: number;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceRequest {
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
}

export interface UpdateServiceRequest {
  name?: string;
  description?: string;
  price?: number;
  durationMinutes?: number;
}

// ---- Staff ----
export interface StaffResponse {
  id: number;
  tenantId: number;
  name: string;
  email: string;
  phone: string;
  specialties: string[];
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffRequest {
  name: string;
  email: string;
  phone?: string;
  specialties?: string[];
}

export interface UpdateStaffRequest {
  name?: string;
  email?: string;
  phone?: string;
  specialties?: string[];
}

/** Returned by GET /services/{id}/staff and GET /staff/{id}/services. */
export interface StaffServiceResponse {
  serviceIds: number[];
}

export interface AssignServicesRequest {
  serviceIds: number[];
}

// ---- Appointments ----
export interface AppointmentResponse {
  id: number;
  customerId: number;
  staffId: number;
  serviceId: number;
  appointmentDateTime: string;
  endDateTime: string;
  status: AppointmentStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

/** List wrapper for appointments (key: `appointments`, not `content`). */
export interface AppointmentPage {
  appointments: AppointmentResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface CreateAppointmentRequest {
  customerId: number;
  staffId: number;
  serviceId: number;
  appointmentDateTime: string;
  notes?: string;
}

export interface UpdateAppointmentRequest {
  notes: string;
}

// ---- Time Blocks (per staff) ----
export interface TimeBlockResponse {
  id: number;
  staffId: number;
  type: string;
  startDateTime: string;
  endDateTime: string;
  reason: string;
  isRecurring: boolean;
  recurrencePattern: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeBlockPage {
  timeBlocks: TimeBlockResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// ---- Availability ----
export interface AvailableSlotsResponse {
  staffId: number;
  date: string; // YYYY-MM-DD
  serviceId: number;
  serviceDurationMinutes: number;
  availableSlots: string[];
  totalAvailableSlots: number;
}

export interface AgendaSlot {
  time: string;
  status: string;
  details: string;
}

export interface DailyAgendaResponse {
  staffId: number;
  date: string;
  slots: AgendaSlot[];
}
