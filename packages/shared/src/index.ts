import { z } from 'zod';

// ─── Auth ────────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string().min(6).optional(),
}).refine(d => d.email || d.phone, { message: 'Email or phone required' });

export const OtpRequestSchema = z.object({
  phone: z.string().min(10),
});

export const OtpVerifySchema = z.object({
  phone: z.string().min(10),
  otp: z.string().length(6),
});

export const RegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(8),
  salonName: z.string().min(2),
  city: z.string().min(2),
  state: z.string().min(2),
  address: z.string().min(5),
});

// ─── Salon ───────────────────────────────────────────────────────────────────

export const UpdateSalonSchema = z.object({
  name: z.string().min(2).optional(),
  ownerName: z.string().optional(),
  phone: z.string().optional(),
  gstNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  logoUrl: z.string().url().optional(),
});

export const CreateBranchSchema = z.object({
  name: z.string().min(2),
  address: z.string().min(5),
  isPrimary: z.boolean().optional(),
});

// ─── Staff ───────────────────────────────────────────────────────────────────

export const CreateStaffSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().min(10),
  password: z.string().min(8),
  joiningDate: z.string(),
  salaryType: z.enum(['fixed', 'commission', 'hybrid']),
  commissionPercent: z.number().min(0).max(100).optional(),
  branchId: z.string().uuid().optional(),
  serviceIds: z.array(z.string().uuid()).optional(),
});

export const UpdateStaffSchema = CreateStaffSchema.partial();

// ─── Services ────────────────────────────────────────────────────────────────

export const CreateServiceCategorySchema = z.object({
  name: z.string().min(2),
});

export const CreateServiceSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(2),
  durationMinutes: z.number().int().min(5),
  pricePaise: z.number().int().min(0),
  taxPercent: z.number().min(0).max(100).optional().default(0),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const UpdateServiceSchema = CreateServiceSchema.partial();

// ─── Customers ────────────────────────────────────────────────────────────────

export const CreateCustomerSchema = z.object({
  name: z.string().min(2),
  mobile: z.string().min(10),
  birthday: z.string().optional(),
  anniversary: z.string().optional(),
  preferredBarberId: z.string().uuid().optional(),
});

export const UpdateCustomerSchema = CreateCustomerSchema.partial();

// ─── Appointments ────────────────────────────────────────────────────────────

export const CreateAppointmentSchema = z.object({
  customerId: z.string().uuid().optional(),
  barberId: z.string().uuid(),
  serviceId: z.string().uuid(),
  scheduledStart: z.string().datetime(),
  branchId: z.string().uuid().optional(),
});

export const UpdateAppointmentStatusSchema = z.object({
  status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled']),
});

// ─── Walk-ins ────────────────────────────────────────────────────────────────

export const CreateWalkInSchema = z.object({
  customerId: z.string().uuid().optional(),
  barberId: z.string().uuid(),
  serviceIds: z.array(z.string().uuid()).min(1),
  branchId: z.string().uuid().optional(),
});

// ─── Billing ─────────────────────────────────────────────────────────────────

export const CreateInvoiceSchema = z.object({
  appointmentId: z.string().uuid().optional(),
  walkInId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  items: z.array(z.object({
    serviceId: z.string().uuid().optional(),
    inventoryItemId: z.string().uuid().optional(),
    barberId: z.string().uuid(),
    description: z.string(),
    quantity: z.number().int().min(1),
    unitPricePaise: z.number().int().min(0),
    taxPercent: z.number().min(0).max(100),
  })).min(1),
});

export const CapturePaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  payments: z.array(z.object({
    method: z.enum(['cash', 'upi', 'card', 'wallet']),
    amountPaise: z.number().int().min(1),
    razorpayPaymentId: z.string().optional(),
  })).min(1),
  loyaltyPointsRedeem: z.number().int().min(0).optional(),
});

// ─── Expenses ────────────────────────────────────────────────────────────────

export const CreateExpenseCategorySchema = z.object({
  name: z.string().min(2),
});

export const CreateExpenseSchema = z.object({
  categoryId: z.string().uuid(),
  amountPaise: z.number().int().min(1),
  note: z.string().optional(),
  spentOn: z.string(),
  branchId: z.string().uuid().optional(),
});

// ─── Inventory ───────────────────────────────────────────────────────────────

export const CreateInventoryItemSchema = z.object({
  name: z.string().min(2),
  unit: z.string().min(1),
  currentStock: z.number().min(0),
  lowStockThreshold: z.number().min(0),
  branchId: z.string().uuid().optional(),
});

export const StockMovementSchema = z.object({
  inventoryItemId: z.string().uuid(),
  type: z.enum(['stock_in', 'stock_out']),
  quantity: z.number().positive(),
  referenceInvoiceItemId: z.string().uuid().optional(),
});

// ─── Attendance ──────────────────────────────────────────────────────────────

export const ClockInSchema = z.object({
  barberId: z.string().uuid(),
});

export const ClockOutSchema = z.object({
  attendanceId: z.string().uuid(),
});

// ─── Loyalty ─────────────────────────────────────────────────────────────────

export const RedeemLoyaltySchema = z.object({
  customerId: z.string().uuid(),
  points: z.number().int().positive(),
  invoiceId: z.string().uuid(),
});

// ─── Notifications ───────────────────────────────────────────────────────────

export const UpdateNotificationPreferenceSchema = z.object({
  channel: z.enum(['push', 'sms', 'whatsapp', 'email']),
  eventType: z.string(),
  enabled: z.boolean(),
});

// ─── Subscription ────────────────────────────────────────────────────────────

export const UpgradeSubscriptionSchema = z.object({
  planId: z.string().uuid(),
});

// ─── Common response types ───────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
  error?: {
    code: string;
    message: string;
  } | null;
}

export type Role = 'super_admin' | 'owner' | 'staff';
export type SalonStatus = 'pending' | 'active' | 'suspended';
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'wallet';
export type SalaryType = 'fixed' | 'commission' | 'hybrid';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled';
