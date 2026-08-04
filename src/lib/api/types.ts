// Espelhos em TypeScript dos DTOs do replyon-api.
// Fonte da verdade: os records com.codeteam.replyonapi.adapters.in.web.*.
// IDs são Long -> number. Timestamps são strings ISO de LocalDateTime sem offset
// (ex.: "2026-07-17T14:30:00"). Campos de status serializam como a string do nome do enum.

export type EntityStatus = "ACTIVE" | "INACTIVE";

export type AppointmentStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

/** Só é definido (não nulo) quando um agendamento chega em COMPLETED. */
export type PaymentMethod = "CASH" | "PIX" | "CREDIT_CARD" | "DEBIT_CARD";
export type AppointmentOrigin = "MANUAL" | "WHATSAPP";

/** Wrapper de listagem padrão usado por customers/services/staff/companies (chave: `content`). */
export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Parâmetros de query comuns para os endpoints de listagem paginada. */
export interface ListParams {
  page?: number;
  size?: number;
  name?: string;
  status?: EntityStatus;
}

// ---- Autenticação ----
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  expires_in: number; // seconds
  tenant_id: number;
}

// ---- Usuários ----
export interface RegisterUserRequest {
  email: string;
  password: string;
}

export interface UserResponse {
  id: number;
  email: string;
}

// ---- Empresas ----
export interface CompanyResponse {
  id: number;
  tenantId: number;
  name: string;
  document: string;
  email: string;
  phone: string;
  address: string | null;
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
  address: string | null;
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

// ---- WhatsApp (conexão WAHA) ----
export type WahaConnectionStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "FAILED";

export interface WhatsAppConnectionResponse {
  sessionName: string | null;
  status: WahaConnectionStatus;
  qrCodeBase64: string | null;
  meNumber: string | null;
  pairingCode: string | null;
}

// ---- Clientes ----
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

// ---- Serviços ----
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

// ---- Profissionais ----
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

/** Retornado por GET /services/{id}/staff e GET /staff/{id}/services. */
export interface StaffServiceResponse {
  serviceIds: number[];
}

export interface AssignServicesRequest {
  serviceIds: number[];
}

/** Retornado por GET /staff/{id}/services/commissions. */
export interface StaffServiceAssignmentResponse {
  serviceId: number;
  commissionPercentage: number | null;
}

export interface SetServiceCommissionRequest {
  commissionPercentage: number;
}

// ---- Agendamentos ----
export interface AppointmentResponse {
  id: number;
  customerId: number;
  staffId: number;
  serviceId: number;
  appointmentDateTime: string;
  endDateTime: string;
  status: AppointmentStatus;
  notes: string;
  /** Nulo a menos que o status seja COMPLETED — definido uma vez, no momento da conclusão. */
  paymentMethod: PaymentMethod | null;
  /** Congelado a partir do preço do serviço no momento da conclusão; nulo a menos que COMPLETED. */
  amountCharged: number | null;
  /** Congelado no momento da conclusão; nulo se o par profissional×serviço nunca foi formalmente atribuído. */
  commissionPercentage: number | null;
  commissionAmount: number | null;
  createdAt: string;
  updatedAt: string;
  origin: AppointmentOrigin;
}

/** Wrapper de listagem para agendamentos (chave: `appointments`, não `content`). */
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

export interface CompleteAppointmentRequest {
  paymentMethod: PaymentMethod;
}

export interface UpdateAppointmentRequest {
  notes: string;
}

// ---- Busca global ----
/** `subtitle` é composto pela API: e-mail para pessoas, duração/preço para serviços. */
export interface SearchHit {
  id: number;
  name: string;
  subtitle: string | null;
  status: EntityStatus;
}

export interface GlobalSearchResponse {
  customers: SearchHit[];
  staff: SearchHit[];
  services: SearchHit[];
}

// ---- Bloqueios de horário (por profissional) ----
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

/** `staffId` também trafega no path; o backend valida ambos. */
export interface CreateTimeBlockRequest {
  staffId: number;
  type: string;
  startDateTime: string;
  endDateTime: string;
  reason?: string;
  isRecurring?: boolean;
  recurrencePattern?: string;
}

/** Todo campo é opcional — o backend só aplica o que é enviado. */
export type UpdateTimeBlockRequest = Partial<Omit<CreateTimeBlockRequest, "staffId">>;

export interface TimeBlockPage {
  timeBlocks: TimeBlockResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// ---- Agendas (por profissional) ----
// Uma agenda é uma lista plana de janelas de trabalho; um dia carrega quantas
// janelas forem necessárias (ex.: 09:00–12:00 + 13:00–18:00 ao redor do almoço)
// e dias sem janela simplesmente ficam ausentes. LocalTime serializa como
// "HH:mm:ss". O backend impõe uma agenda por (staffId, tenantId) via restrição
// de unicidade, então o endpoint de listagem retorna zero ou um item.

/** Chaves de dia da semana do lado da UI, na ordem de exibição. */
export const SCHEDULE_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type ScheduleDay = (typeof SCHEDULE_DAYS)[number];

/** java.time.DayOfWeek, serializado como o nome do enum. */
export type ApiDayOfWeek =
  "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

/** `SCHEDULE_DAYS` está ordenado começando na segunda-feira para combinar com o 1..7 de `DayOfWeek`. */
export const API_DAY_OF_WEEK: Record<ScheduleDay, ApiDayOfWeek> = {
  monday: "MONDAY",
  tuesday: "TUESDAY",
  wednesday: "WEDNESDAY",
  thursday: "THURSDAY",
  friday: "FRIDAY",
  saturday: "SATURDAY",
  sunday: "SUNDAY",
};

export const SCHEDULE_DAY_BY_API: Record<ApiDayOfWeek, ScheduleDay> = {
  MONDAY: "monday",
  TUESDAY: "tuesday",
  WEDNESDAY: "wednesday",
  THURSDAY: "thursday",
  FRIDAY: "friday",
  SATURDAY: "saturday",
  SUNDAY: "sunday",
};

/** Uma janela de trabalho contínua. Horários são "HH:mm:ss" na transmissão. */
export interface ScheduleWindowRequest {
  dayOfWeek: ApiDayOfWeek;
  startTime: string;
  endTime: string;
}

export type ScheduleWindowResponse = ScheduleWindowRequest;

export interface ScheduleResponse {
  id: number;
  staffId: number;
  /** Retornado ordenado por dia e depois horário de início, com sobreposições já rejeitadas. */
  windows: ScheduleWindowResponse[];
  intervalBetweenAppointments: number;
  /** Soma calculada pelo servidor da duração de cada janela. */
  weeklyMinutes: number;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleRequest {
  staffId: number;
  windows: ScheduleWindowRequest[];
  intervalBetweenAppointments: number;
}

export interface UpdateScheduleRequest {
  windows: ScheduleWindowRequest[];
  intervalBetweenAppointments: number;
}

/** Wrapper de listagem para agendas (chave: `schedules`, não `content`). */
export interface SchedulePage {
  schedules: ScheduleResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// ---- Disponibilidade ----
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

// ---- Dashboard ----
// Toda métrica carrega sua própria comparação de período anterior, calculada
// no servidor. `null` num campo de variação significa que não havia uma base
// de comparação (o período anterior era zero) — crescimento a partir do nada
// é indefinido, não 100%.

export interface DashboardCountMetric {
  value: number;
  previous: number;
  changePercent: number | null;
}

export interface DashboardNewCustomersMetric {
  month: number;
  week: number;
}

export interface DashboardRevenueMetric {
  month: number;
  previousMonth: number;
  changePercent: number | null;
}

/** As taxas são comparadas em pontos percentuais, nunca em percentual. */
export interface DashboardOccupancyMetric {
  rate: number | null;
  previousRate: number | null;
  changePoints: number | null;
}

export interface DashboardMetricsResponse {
  appointmentsToday: DashboardCountMetric;
  newCustomers: DashboardNewCustomersMetric;
  expectedRevenue: DashboardRevenueMetric;
  occupancy: DashboardOccupancyMetric;
  /** A única métrica que conta o que NÃO aconteceu. */
  noShowsMonth: DashboardCountMetric;
}

// ---- Notificações ----

/** "APPOINTMENT_CREATED" | "APPOINTMENT_CANCELLED" | "APPOINTMENT_RESCHEDULED" | "HUMAN_HANDOFF_REQUESTED" */
export type NotificationType =
  | "APPOINTMENT_CREATED"
  | "APPOINTMENT_CANCELLED"
  | "APPOINTMENT_RESCHEDULED"
  | "HUMAN_HANDOFF_REQUESTED";

/**
 * Feed informativo apenas de eventos de agendamento automatizados pelo
 * WhatsApp — ações manuais no dashboard nunca geram um. Sem estado de
 * lido/não lido: isso não é uma caixa de entrada, apenas um sinal ambiente
 * de "o bot fez isso".
 */
export interface NotificationResponse {
  id: number;
  type: NotificationType;
  message: string;
  appointmentId: number | null;
  createdAt: string;
}

/** Uma conversa do WhatsApp atualmente aguardando/em handoff humano. */
export interface HandoffConversationResponse {
  phone: string;
  customerId: number | null;
  customerName: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  humanHandoffExpiresAt: string;
}

/** "IN" | "OUT" */
export type MessageDirection = "IN" | "OUT";

/** "CUSTOMER" | "BOT" | "HUMAN" */
export type MessageSenderType = "CUSTOMER" | "BOT" | "HUMAN";

export interface ConversationMessageResponse {
  id: number;
  direction: MessageDirection;
  senderType: MessageSenderType;
  body: string;
  createdAt: string;
}
