import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ─── Typed DB helpers ────────────────────────────────────────────────────────

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  university_year: string | null;
  avatar_url: string | null;
  whatsapp: string | null;
  created_at: string;
};

export type ListingCategory =
  | "pre_clinic"
  | "clinic"
  | "books"
  | "consumables"
  | "models"
  | "instruments"
  | "other";

export type ListingCondition = "new" | "like_new" | "good" | "fair";
export type ListingStatus = "active" | "sold" | "deleted";

export type Listing = {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price: number;
  category: ListingCategory;
  condition: ListingCondition | null;
  status: ListingStatus;
  created_at: string;
  updated_at: string;
  is_favorited?: boolean;
  unreadNotificationCount?: number;
  // joined fields
  profiles?: Profile;
  listing_images?: ListingImage[];
};

export type ListingImage = {
  id: string;
  listing_id: string;
  image_url: string;
  position: number;
};

export type Favorite = {
  id: string;
  user_id: string;
  listing_id: string;
  created_at: string;
};

export type NotificationEventType =
  | "favorite_added"
  | "listing_marked_sold"
  | "report_submitted";

export type Notification = {
  id: string;
  user_id: string;
  actor_user_id: string | null;
  listing_id: string | null;
  event_type: NotificationEventType;
  title: string;
  body: string;
  is_read: boolean;
  read_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type UserSettings = {
  user_id: string;
  contact_whatsapp: boolean;
  contact_email: boolean;
  push_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type UserBlock = {
  id: string;
  blocker_id: string;
  blocked_user_id: string;
  created_at: string;
};

export type ListingReportReason = "spam" | "misleading" | "inappropriate" | "other";

export type ListingReport = {
  id: string;
  reporter_id: string;
  listing_id: string;
  seller_id: string;
  reason: ListingReportReason;
  note: string | null;
  status: "submitted" | "resolved" | "rejected";
  created_at: string;
};

export type PushPlatform = "ios" | "android" | "web" | "unknown";

export type PushToken = {
  id: string;
  user_id: string;
  token: string;
  platform: PushPlatform;
  enabled: boolean;
  last_registered_at: string;
  created_at: string;
  updated_at: string;
};
