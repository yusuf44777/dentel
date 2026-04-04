import { Platform } from "react-native";
import Constants from "expo-constants";
import { supabase, type PushPlatform, type UserSettings } from "./supabase";

export const DEFAULT_USER_SETTINGS: Pick<
  UserSettings,
  "contact_whatsapp" | "contact_email" | "push_enabled"
> = {
  contact_whatsapp: true,
  contact_email: true,
  push_enabled: true,
};

export async function getSettings(userId: string): Promise<UserSettings> {
  const { data } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (data) return data as UserSettings;

  const { data: inserted, error } = await supabase
    .from("user_settings")
    .upsert({
      user_id: userId,
      ...DEFAULT_USER_SETTINGS,
    })
    .select("*")
    .single();

  if (error) throw error;
  return inserted as UserSettings;
}

export async function updateSettings(
  userId: string,
  patch: Partial<Pick<UserSettings, "contact_whatsapp" | "contact_email" | "push_enabled">>
) {
  const { data, error } = await supabase
    .from("user_settings")
    .upsert({
      user_id: userId,
      ...DEFAULT_USER_SETTINGS,
      ...patch,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as UserSettings;
}

export async function registerPushToken(
  userId: string,
  token: string,
  platform: PushPlatform = "unknown"
) {
  if (!token) return null;

  const { data, error } = await supabase
    .from("push_tokens")
    .upsert(
      {
        user_id: userId,
        token,
        platform,
        enabled: true,
        last_registered_at: new Date().toISOString(),
      },
      { onConflict: "token" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function setPushTokensEnabled(userId: string, enabled: boolean) {
  const { error } = await supabase
    .from("push_tokens")
    .update({
      enabled,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) throw error;
}

async function loadNotificationsModule() {
  // Expo Go'da remote push kaydı desteklenmiyor.
  if (Constants.appOwnership === "expo") return null;
  try {
    return await import("expo-notifications");
  } catch (error) {
    console.warn("expo-notifications yüklenemedi:", error);
    return null;
  }
}

export async function tryRegisterExpoPushToken(userId: string) {
  try {
    const Notifications = await loadNotificationsModule();
    if (!Notifications) return null;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return null;

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId ??
      undefined;

    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResponse?.data;
    if (!token) return null;

    const platform: PushPlatform =
      Platform.OS === "ios"
        ? "ios"
        : Platform.OS === "android"
          ? "android"
          : Platform.OS === "web"
            ? "web"
            : "unknown";

    await registerPushToken(userId, token, platform);
    return token;
  } catch (error) {
    console.warn("Push token alınamadı:", error);
    return null;
  }
}
