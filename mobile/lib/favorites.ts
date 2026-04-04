import { supabase } from "./supabase";

export async function toggleFavorite(userId: string, listingId: string, nextValue?: boolean) {
  let shouldFavorite = nextValue;

  if (shouldFavorite == null) {
    const { data } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", userId)
      .eq("listing_id", listingId)
      .maybeSingle();

    shouldFavorite = !Boolean(data?.id);
  }

  if (shouldFavorite) {
    const { error } = await supabase
      .from("favorites")
      .upsert({ user_id: userId, listing_id: listingId }, { onConflict: "user_id,listing_id" });
    if (error) throw error;
    return true;
  }

  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("listing_id", listingId);
  if (error) throw error;
  return false;
}

export async function getFavoriteListingIds(userId: string, listingIds: string[]) {
  if (!listingIds.length) return new Set<string>();
  const { data } = await supabase
    .from("favorites")
    .select("listing_id")
    .eq("user_id", userId)
    .in("listing_id", listingIds);

  return new Set((data ?? []).map((row) => row.listing_id));
}
