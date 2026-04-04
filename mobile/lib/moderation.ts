import { supabase, type ListingReportReason } from "./supabase";

export async function blockUser(blockerId: string, blockedUserId: string) {
  const { error } = await supabase
    .from("user_blocks")
    .upsert(
      {
        blocker_id: blockerId,
        blocked_user_id: blockedUserId,
      },
      { onConflict: "blocker_id,blocked_user_id" }
    );

  if (error) throw error;
}

export async function reportListing(input: {
  reporterId: string;
  listingId: string;
  sellerId: string;
  reason: ListingReportReason;
  note?: string;
}) {
  const { error } = await supabase
    .from("listing_reports")
    .upsert(
      {
        reporter_id: input.reporterId,
        listing_id: input.listingId,
        seller_id: input.sellerId,
        reason: input.reason,
        note: input.note ?? null,
      },
      { onConflict: "reporter_id,listing_id" }
    );

  if (error) throw error;
}
