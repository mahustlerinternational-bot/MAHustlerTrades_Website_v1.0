// ============================================================
// MAHustler Trades — TypeScript Types
// Auto-synced with Supabase schema
// ============================================================

// ── Enums ────────────────────────────────────────────────────
export type UserRole        = 'admin' | 'member' | 'ib_member';
export type IbStatus        = 'none' | 'pending' | 'active' | 'rejected';
export type BillingPeriod   = 'monthly' | 'quarterly' | 'annual' | 'lifetime';
export type DiscountType    = 'percent' | 'full' | 'fixed';
export type PaymentMethod   = 'stripe' | 'coupon' | 'admin_grant' | 'ib_grant';
export type EnrollStatus    = 'active' | 'revoked' | 'expired';
export type EventType       = 'webinar' | 'live_trading' | 'summit' | 'review' | 'masterclass';
export type EventBadge      = 'Live' | 'VIP' | 'In-Person' | 'Free';
export type TicketType      = 'free' | 'standard' | 'vip';
export type RegStatus       = 'confirmed' | 'cancelled' | 'waitlist' | 'pending_payment';
export type SignalStatus    = 'active' | 'closed_tp' | 'closed_sl' | 'cancelled';
export type SignalType      = 'long' | 'short';
export type SignalSource    = 'live' | 'manual';
export type RegimeType      = 'Accumulation' | 'Trending' | 'Distribution' | 'Ranging';
export type IbReviewStatus  = 'pending' | 'approved' | 'rejected';

// ── Database Row Types ────────────────────────────────────────

export interface Profile {
  id:                 string;
  full_name:          string | null;
  avatar_url:         string | null;
  role:               UserRole;
  package_id:         string | null;
  ib_status:          IbStatus;
  ib_broker_name:     string | null;
  ib_account_ref:     string | null;
  stripe_customer_id: string | null;
  created_at:         string;
  updated_at:         string;
  // joined
  package?:           Package;
}

export interface Package {
  id:             string;
  name:           string;
  slug:           string;
  description:    string | null;
  price:          number;
  billing_period: BillingPeriod;
  is_active:      boolean;
  is_featured:    boolean;
  sort_order:     number;
  created_at:     string;
  updated_at:     string;
  // joined
  features?:      PackageFeature[];
}

export interface PackageFeature {
  id:           string;
  package_id:   string;
  feature_text: string;
  is_highlight: boolean;
  sort_order:   number;
}

export interface Course {
  id:              string;
  title:           string;
  slug:            string;
  description:     string | null;
  logo_url:        string | null;
  cover_image_url: string | null;
  price:           number;
  level:           string;
  market:          string | null;
  duration_hours:  number | null;
  lesson_count:    number | null;
  is_published:    boolean;
  sort_order:      number;
  created_by:      string | null;
  created_at:      string;
  updated_at:      string;
}

export interface Coupon {
  id:             string;
  code:           string;
  description:    string | null;
  discount_type:  DiscountType;
  discount_value: number;
  course_id:      string | null;
  max_uses:       number | null;
  uses_count:     number;
  expires_at:     string | null;
  is_active:      boolean;
  created_by:     string | null;
  created_at:     string;
}

export interface Enrollment {
  id:                string;
  user_id:           string;
  course_id:         string;
  enrolled_at:       string;
  payment_method:    PaymentMethod;
  coupon_id:         string | null;
  amount_paid:       number;
  payment_intent_id: string | null;
  status:            EnrollStatus;
  granted_by:        string | null;
  revoked_at:        string | null;
  // joined
  course?:           Course;
  profile?:          Profile;
}

export interface TradeEvent {
  id:               string;
  title:            string;
  slug:             string;
  description:      string | null;
  event_type:       EventType;
  event_date:       string;
  duration_minutes: number | null;
  location:         string | null;
  is_virtual:       boolean;
  cover_image_url:  string | null;
  capacity:         number | null;
  registered_count: number;
  ticket_price:     number;
  vip_ticket_price: number | null;
  badge:            EventBadge | null;
  host_name:        string | null;
  is_published:     boolean;
  created_by:       string | null;
  created_at:       string;
  updated_at:       string;
}

export interface EventRegistration {
  id:                string;
  event_id:          string;
  user_id:           string;
  registered_at:     string;
  ticket_type:       TicketType;
  amount_paid:       number;
  payment_intent_id: string | null;
  status:            RegStatus;
  cancelled_at:      string | null;
  // joined
  event?:            TradeEvent;
  profile?:          Profile;
}

export interface QuantSignal {
  id:              string;
  instrument:      string;
  signal_type:     SignalType;
  entry_price:     number;
  tp_price:        number;
  sl_price:        number;
  rr_ratio:        number | null;
  risk_pct:        number | null;
  analysis_notes:  string | null;
  status:          SignalStatus;
  source:          SignalSource;
  broadcasted_at:  string;
  closed_at:       string | null;
  closed_price:    number | null;
  created_by:      string | null;
}

export interface QuantRegime {
  id:               string;
  recorded_at:      string;
  accumulation_pct: number;
  trending_pct:     number;
  distribution_pct: number;
  ranging_pct:      number;
  active_regime:    RegimeType;
  source:           SignalSource;
  created_by:       string | null;
}

export interface IbRegistration {
  id:             string;
  user_id:        string;
  broker_name:    string;
  account_number: string;
  submitted_at:   string;
  status:         IbReviewStatus;
  reviewed_by:    string | null;
  reviewed_at:    string | null;
  admin_notes:    string | null;
  // joined
  profile?:       Profile;
}

export interface SiteSettings {
  id:          string;
  key:         string;
  value:       Record<string, unknown>;
  description: string | null;
  updated_at:  string;
  updated_by:  string | null;
}

// ── API Request / Response shapes ─────────────────────────────

export interface EnrollRequest {
  course_id:    string;
  coupon_code?: string;
}

export interface CouponValidateResponse {
  valid:         boolean;
  discount_type: DiscountType;
  discount_value: number;
  final_price:   number;
  message?:      string;
}

export interface EventRegisterRequest {
  event_id:     string;
  ticket_type:  TicketType;
  payment_ref?: string;
}

export interface AdminGrantEnrollRequest {
  user_id:   string;
  course_id: string;
  notes?:    string;
}

export interface AdminMembersFilter {
  page?:     number;
  limit?:    number;
  search?:   string;
  role?:     UserRole;
  package?:  string;
}

export interface PaginatedResponse<T> {
  data:  T[];
  total: number;
  page:  number;
  limit: number;
}

// ── Zustand Store Types ────────────────────────────────────────

export interface AuthState {
  user:        Profile | null;
  isLoading:   boolean;
  isAdmin:     boolean;
  setUser:     (user: Profile | null) => void;
  setLoading:  (v: boolean) => void;
  logout:      () => void;
}

export interface QuantState {
  activeSignal:   QuantSignal | null;
  currentRegime:  QuantRegime | null;
  isConnected:    boolean;
  setSignal:      (s: QuantSignal | null) => void;
  setRegime:      (r: QuantRegime | null) => void;
  setConnected:   (v: boolean) => void;
}
