import { supabase, type NotificationEventType } from "./supabase";

type EmitNotificationInput = {
  eventType: NotificationEventType;
  recipientUserId: string;
  listingId?: string | null;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
};

export async function emitNotification(input: EmitNotificationInput) {
  const { error } = await supabase.functions.invoke("notify", {
    body: {
      eventType: input.eventType,
      recipientUserId: input.recipientUserId,
      listingId: input.listingId ?? null,
      title: input.title,
      body: input.body,
      metadata: input.metadata ?? {},
    },
  });

  if (error) {
    // Bildirim gönderimi kritik akışı bozmasın.
    console.warn("Bildirim gönderilemedi:", error.message);
  }
}

export async function getUnreadNotificationCount(userId: string) {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) return 0;
  return count ?? 0;
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId);

  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) throw error;
}
