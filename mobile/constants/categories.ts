import type { ListingCategory, ListingCondition } from "../lib/supabase";

export type CategoryMeta = {
  value: ListingCategory | "all";
  label: string;
  icon: string; // Ionicons name
};

export const CATEGORIES: CategoryMeta[] = [
  { value: "all",         label: "Tümü",          icon: "grid-outline" },
  { value: "pre_clinic",  label: "Klinik Öncesi", icon: "medical-outline" },
  { value: "clinic",      label: "Klinik",        icon: "pulse-outline" },
  { value: "books",       label: "Kitaplar",      icon: "book-outline" },
  { value: "consumables", label: "Sarf Malzeme",  icon: "cube-outline" },
  { value: "models",      label: "Modeller",      icon: "shapes-outline" },
  { value: "instruments", label: "Aletler",       icon: "build-outline" },
  { value: "other",       label: "Diğer",         icon: "ellipsis-horizontal-outline" },
];

export type ConditionMeta = {
  value: ListingCondition;
  label: string;
  color: string;
  bg: string;
};

export const CONDITIONS: ConditionMeta[] = [
  { value: "new",      label: "Sıfır",            color: "#059669", bg: "#D1FAE5" },
  { value: "like_new", label: "Sıfır Gibi",       color: "#2563EB", bg: "#DBEAFE" },
  { value: "good",     label: "İyi",               color: "#D97706", bg: "#FEF3C7" },
  { value: "fair",     label: "Makul",             color: "#DC2626", bg: "#FEE2E2" },
];

export function getCategoryLabel(value: string) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function getConditionMeta(value: string): ConditionMeta {
  return CONDITIONS.find((c) => c.value === value) ?? CONDITIONS[2];
}
