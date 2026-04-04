import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  supabase,
  type Listing,
  type ListingReportReason,
  type UserSettings,
} from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { Button } from "../../components/ui/Button";
import { getCategoryLabel, getConditionMeta } from "../../constants/categories";
import { Colors } from "../../constants/colors";
import { emitNotification } from "../../lib/notifications";
import { toggleFavorite } from "../../lib/favorites";
import { blockUser, reportListing } from "../../lib/moderation";
import { STRINGS } from "../../constants/strings";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const YEAR_LABELS: Record<string, string> = {
  prep: "Hazırlık",
  "1": "1. Sınıf",
  "2": "2. Sınıf",
  "3": "3. Sınıf",
  "4": "4. Sınıf",
  "5": "5. Sınıf",
};

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingSold, setMarkingSold] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [sellerSettings, setSellerSettings] = useState<UserSettings | null>(null);

  const fetchListing = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("listings")
      .select(
        "*, profiles(id, full_name, avatar_url, university_year, whatsapp, email, created_at), listing_images(id, listing_id, image_url, position)"
      )
      .eq("id", id)
      .single();

    if (!error && data) {
      const sorted = {
        ...data,
        listing_images: (data.listing_images ?? []).sort(
          (a: any, b: any) => a.position - b.position
        ),
      };
      setListing(sorted as Listing);

      if (user?.id) {
        const { data: favoriteRow } = await supabase
          .from("favorites")
          .select("id")
          .eq("user_id", user.id)
          .eq("listing_id", data.id)
          .maybeSingle();
        setIsFavorited(Boolean(favoriteRow?.id));
      } else {
        setIsFavorited(false);
      }

      const { data: settingsRow } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", data.seller_id)
        .maybeSingle();
      setSellerSettings((settingsRow ?? null) as UserSettings | null);
    }
    setLoading(false);
  }, [id, user?.id]);

  useEffect(() => {
    void fetchListing();
  }, [fetchListing]);

  async function handleMarkSold() {
    Alert.alert(
      "Satıldı Olarak İşaretle",
      "Bu ilanı satıldı olarak işaretlemek istediğine emin misin?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Evet, Satıldı",
          style: "destructive",
          onPress: async () => {
            setMarkingSold(true);
            await supabase
              .from("listings")
              .update({ status: "sold" })
              .eq("id", id);
            if (user?.id && listing) {
              const { data: watchers } = await supabase
                .from("favorites")
                .select("user_id")
                .eq("listing_id", listing.id)
                .neq("user_id", user.id);

              if (watchers?.length) {
                await Promise.all(
                  watchers.map((watcher) =>
                    emitNotification({
                      eventType: "listing_marked_sold",
                      recipientUserId: watcher.user_id,
                      listingId: listing.id,
                      title: "Favorilediğin ilan satıldı",
                      body: `"${listing.title}" ilanı satıldı olarak işaretlendi.`,
                    })
                  )
                );
              }
            }
            setMarkingSold(false);
            Alert.alert("Başarılı", "İlanın satıldı olarak işaretlendi.", [
              { text: "Tamam", onPress: () => router.back() },
            ]);
          },
        },
      ]
    );
  }

  async function handleDelete() {
    Alert.alert("İlanı Sil", "Bu ilanı kalıcı olarak silmek istiyor musun?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          await supabase.from("listings").update({ status: "deleted" }).eq("id", id);
          router.back();
        },
      },
    ]);
  }

  async function handleFavoriteToggle() {
    if (!user?.id || !listing) return;
    const next = !isFavorited;
    setFavoriteLoading(true);
    setIsFavorited(next);
    try {
      const actual = await toggleFavorite(user.id, listing.id, next);
      setIsFavorited(actual);
      if (actual && listing.seller_id !== user.id) {
        await emitNotification({
          eventType: "favorite_added",
          recipientUserId: listing.seller_id,
          listingId: listing.id,
          title: "İlanın favorilere eklendi",
          body: `"${listing.title}" ilanını bir kullanıcı favorilerine ekledi.`,
        });
      }
    } catch {
      setIsFavorited(!next);
      Alert.alert("Hata", "Favori işlemi gerçekleştirilemedi.");
    } finally {
      setFavoriteLoading(false);
    }
  }

  function handleContact() {
    const seller = listing?.profiles as any;
    const phone =
      seller?.whatsapp != null
        ? String(seller.whatsapp).replace(/\D/g, "")
        : "";
    const email = typeof seller?.email === "string" ? seller.email.trim() : "";
    const listingTitle =
      typeof listing?.title === "string" ? listing.title : "ilan";

    if (typeof Linking.openURL !== "function") {
      Alert.alert("Hata", "Cihazda bağlantı açma özelliği bulunamadı.");
      return;
    }

    const whatsappAllowed = sellerSettings?.contact_whatsapp ?? true;
    const emailAllowed = sellerSettings?.contact_email ?? true;

    if (whatsappAllowed && phone) {
      const message = encodeURIComponent(
        `Merhaba! dentel uygulamasında "${listingTitle}" ilanınla ilgileniyorum.`
      );
      void Linking.openURL(`https://wa.me/${phone}?text=${message}`);
      return;
    }

    if (emailAllowed && email) {
      const subject = encodeURIComponent(`İlan Hakkında: ${listingTitle}`);
      void Linking.openURL(`mailto:${email}?subject=${subject}`);
      return;
    }

    if (!phone && emailAllowed && email) {
      const subject = encodeURIComponent(`İlan Hakkında: ${listingTitle}`);
      void Linking.openURL(`mailto:${email}?subject=${subject}`);
      return;
    }

    if (!phone) {
      Alert.alert(
        "WhatsApp Bulunamadı",
        email
          ? `Satıcıya e-posta ile ulaşabilirsiniz:\n${email}`
          : "Satıcının iletişim bilgisi bulunamadı.",
        [
          {
            text: "E-posta Gönder",
            onPress: () => {
              if (!email) return;
              void Linking.openURL(`mailto:${email}`);
            },
          },
          { text: "Tamam" },
        ]
      );
      return;
    }

    Alert.alert(
      "İletişim Kısıtlı",
      "Satıcı iletişim tercihleri nedeniyle şu an iletişim kurulamıyor."
    );
  }

  async function submitReport(reason: ListingReportReason) {
    if (!user?.id || !listing) return;
    try {
      await reportListing({
        reporterId: user.id,
        listingId: listing.id,
        sellerId: listing.seller_id,
        reason,
      });
      await emitNotification({
        eventType: "report_submitted",
        recipientUserId: listing.seller_id,
        listingId: listing.id,
        title: "İlanın hakkında şikayet var",
        body: `"${listing.title}" ilanı için bir kullanıcı şikayet gönderdi.`,
        metadata: { reason },
      });
      Alert.alert(STRINGS.common.success, STRINGS.reports.submitted);
    } catch {
      Alert.alert(STRINGS.common.error, "Şikayet gönderilemedi.");
    }
  }

  function handleReport() {
    Alert.alert(STRINGS.reports.reportTitle, STRINGS.reports.reportPrompt, [
      {
        text: STRINGS.reports.spam,
        onPress: () => {
          void submitReport("spam");
        },
      },
      {
        text: STRINGS.reports.misleading,
        onPress: () => {
          void submitReport("misleading");
        },
      },
      {
        text: STRINGS.reports.inappropriate,
        onPress: () => {
          void submitReport("inappropriate");
        },
      },
      {
        text: STRINGS.reports.other,
        onPress: () => {
          void submitReport("other");
        },
      },
      { text: STRINGS.common.cancel, style: "cancel" },
    ]);
  }

  function handleBlockSeller() {
    if (!user?.id || !listing) return;
    Alert.alert("Satıcıyı Engelle", "Bu satıcıyı engellersen ilanlarını artık görmeyeceksin.", [
      { text: "İptal", style: "cancel" },
      {
        text: "Engelle",
        style: "destructive",
        onPress: async () => {
          try {
            await blockUser(user.id, listing.seller_id);
            Alert.alert("Başarılı", "Satıcı engellendi.");
            router.replace("/(tabs)");
          } catch {
            Alert.alert("Hata", "Satıcı engellenemedi.");
          }
        },
      },
    ]);
  }

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const slide = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveSlide(slide);
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!listing) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <Text className="text-slate-500">İlan bulunamadı.</Text>
      </View>
    );
  }

  const images = listing.listing_images ?? [];
  const seller = listing.profiles as any;
  const condition = listing.condition ? getConditionMeta(listing.condition) : null;
  const isOwner = user?.id === listing.seller_id;
  const isSold = listing.status === "sold";
  const canContactViaWhatsapp = sellerSettings?.contact_whatsapp ?? true;
  const canContactViaEmail = sellerSettings?.contact_email ?? true;
  const sellerPhone = seller?.whatsapp != null ? String(seller.whatsapp).replace(/\D/g, "") : "";
  const sellerEmail = typeof seller?.email === "string" ? seller.email.trim() : "";
  const canShowContactButton =
    !isOwner && !isSold && (
      (canContactViaWhatsapp && Boolean(sellerPhone)) ||
      (canContactViaEmail && Boolean(sellerEmail)) ||
      (!sellerPhone && canContactViaEmail && Boolean(sellerEmail))
    );
  const contactButtonLabel =
    canContactViaWhatsapp && sellerPhone
      ? "WhatsApp ile İletişime Geç"
      : "E-posta ile İletişime Geç";

  const sellerInitials = (seller?.full_name ?? "?")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <View className="flex-1 bg-surface">
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* ── Image carousel ─────────────────────────────── */}
        <View style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }}
          >
            {images.length > 0 ? (
              images.map((img, i) => (
                <Image
                  key={img.id}
                  source={{ uri: img.image_url }}
                  style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }}
                  resizeMode="cover"
                />
              ))
            ) : (
              <View
                style={{
                  width: SCREEN_WIDTH,
                  height: SCREEN_WIDTH,
                  backgroundColor: "#F1F5F9",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="medkit-outline" size={68} color="#94A3B8" />
              </View>
            )}
          </ScrollView>

          {/* Sold overlay */}
          {isSold && (
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0,0,0,0.45)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  paddingHorizontal: 24,
                  paddingVertical: 10,
                }}
              >
                <Text
                  style={{ color: Colors.danger, fontSize: 20, fontWeight: "800" }}
                >
                  SATILDI
                </Text>
              </View>
            </View>
          )}

          {/* Pagination dots */}
          {images.length > 1 && (
            <View
              style={{
                position: "absolute",
                bottom: 12,
                left: 0,
                right: 0,
                flexDirection: "row",
                justifyContent: "center",
                gap: 6,
              }}
            >
              {images.map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: activeSlide === i ? 20 : 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: activeSlide === i ? "#fff" : "rgba(255,255,255,0.5)",
                  }}
                />
              ))}
            </View>
          )}

          {/* Image count badge */}
          {images.length > 1 && (
            <View
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                backgroundColor: "rgba(0,0,0,0.5)",
                borderRadius: 12,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
                {activeSlide + 1}/{images.length}
              </Text>
            </View>
          )}
        </View>

        {/* ── Content ────────────────────────────────────── */}
        <View className="px-4 pt-4">
          {/* Price + condition row */}
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-3xl font-extrabold text-primary">
              ₺{Number(listing.price).toLocaleString("tr-TR")}
            </Text>
            <View className="flex-row items-center" style={{ gap: 8 }}>
              {!isOwner && (
                <TouchableOpacity
                  onPress={() => {
                    void handleFavoriteToggle();
                  }}
                  disabled={favoriteLoading}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    borderWidth: 1,
                    borderColor: "#E2E8F0",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#FFFFFF",
                  }}
                >
                  {favoriteLoading ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <Ionicons
                      name={isFavorited ? "heart" : "heart-outline"}
                      size={16}
                      color={isFavorited ? "#EF4444" : Colors.text.secondary}
                    />
                  )}
                </TouchableOpacity>
              )}
              {condition && (
                <View
                  style={{
                    backgroundColor: condition.bg,
                    borderRadius: 20,
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                  }}
                >
                  <Text
                    style={{ color: condition.color, fontSize: 13, fontWeight: "700" }}
                  >
                    {condition.label}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Title */}
          <Text className="text-xl font-bold text-slate-900 leading-tight mb-1">
            {listing.title}
          </Text>

          {/* Category + date */}
          <View className="flex-row items-center gap-2 mb-4">
            <View className="bg-blue-50 px-3 py-1 rounded-full">
              <Text className="text-primary text-xs font-semibold">
                {getCategoryLabel(listing.category)}
              </Text>
            </View>
            <Text className="text-muted text-xs">
              {new Date(listing.created_at).toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Text>
          </View>

          {/* Description */}
          {listing.description ? (
            <View className="mb-5">
              <Text className="text-sm font-semibold text-slate-700 mb-1">
                Açıklama
              </Text>
              <Text className="text-slate-600 text-sm leading-relaxed">
                {listing.description}
              </Text>
            </View>
          ) : null}

          {/* Seller card */}
          <View className="bg-white border border-slate-100 rounded-2xl p-4 mb-5 flex-row items-center">
            {seller?.avatar_url ? (
              <Image
                source={{ uri: seller.avatar_url }}
                style={{ width: 48, height: 48, borderRadius: 24 }}
              />
            ) : (
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: Colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>
                  {sellerInitials}
                </Text>
              </View>
            )}
            <View className="ml-3 flex-1">
              <Text className="font-semibold text-slate-900 text-base">
                {seller?.full_name ?? "Kullanıcı"}
              </Text>
              {seller?.university_year && (
                <Text className="text-muted text-sm">
                  {YEAR_LABELS[seller.university_year] ?? seller.university_year} •{" "}
                  Üsküdar Üniversitesi
                </Text>
              )}
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={Colors.muted}
            />
          </View>

          {/* ── CTA buttons ──────────────────────────────── */}
          {canShowContactButton && (
            <Button
              label={contactButtonLabel}
              onPress={handleContact}
              style={{ marginBottom: 12 }}
            />
          )}

          {!isOwner && !isSold && (
            <View className="flex-row mb-4" style={{ gap: 10 }}>
              <TouchableOpacity
                onPress={handleReport}
                className="flex-1 bg-amber-100 rounded-xl py-3 items-center"
              >
                <Text className="text-amber-700 text-xs font-semibold">İlanı Şikayet Et</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleBlockSeller}
                className="flex-1 bg-red-100 rounded-xl py-3 items-center"
              >
                <Text className="text-red-700 text-xs font-semibold">Satıcıyı Engelle</Text>
              </TouchableOpacity>
            </View>
          )}

          {isOwner && !isSold && (
            <View className="gap-3 mb-6">
              <Button
                label="Ana Sayfaya Dön"
                onPress={() => router.replace("/(tabs)")}
              />
              <Button
                label="Satıldı Olarak İşaretle"
                variant="secondary"
                loading={markingSold}
                onPress={handleMarkSold}
              />
              <Button
                label="İlanı Sil"
                variant="danger"
                onPress={handleDelete}
              />
            </View>
          )}

          {isSold && (
            <View className="bg-slate-100 rounded-xl py-4 items-center mb-6">
              <Text className="text-slate-500 font-medium">
                Bu ilan satılmıştır.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
