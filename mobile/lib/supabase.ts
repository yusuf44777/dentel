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
