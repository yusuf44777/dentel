import { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, Dimensions, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getConditionMeta, getCategoryLabel } from "../../constants/categories";
import type { Listing } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { toggleFavorite } from "../../lib/favorites";
import { emitNotification } from "../../lib/notifications";

export const CARD_MARGIN = 6;
const NUM_COLUMNS = 2;
const SCREEN_WIDTH = Dimensions.get("window").width;
export const CARD_WIDTH =
  (SCREEN_WIDTH - 16 * 2 - CARD_MARGIN * (NUM_COLUMNS + 1)) / NUM_COLUMNS;

type Props = {
  listing: Listing;
  onFavoriteChange?: (listingId: string, isFavorited: boolean) => void;
};

export function ProductCard({ listing, onFavoriteChange }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const condition = listing.condition ? getConditionMeta(listing.condition) : null;
  const coverImage = listing.listing_images?.[0]?.image_url;
  const [isFavorited, setIsFavorited] = useState(Boolean(listing.is_favorited));

  useEffect(() => {
    setIsFavorited(Boolean(listing.is_favorited));
  }, [listing.id, listing.is_favorited]);

  async function handleFavoriteToggle() {
    if (!user?.id) {
      Alert.alert("Favoriler", "Favorilere eklemek için giriş yapmalısın.");
      return;
    }

    const next = !isFavorited;
    setIsFavorited(next);

    try {
      const actual = await toggleFavorite(user.id, listing.id, next);
      setIsFavorited(actual);
      onFavoriteChange?.(listing.id, actual);

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
    }
  }

  return (
    <TouchableOpacity
      onPress={() => router.push(`/listing/${listing.id}`)}
      activeOpacity={0.92}
      style={{
        width: CARD_WIDTH,
        margin: CARD_MARGIN,
        borderRadius: 16,
        backgroundColor: "#FFFFFF",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 3,
        overflow: "hidden",
      }}
    >
      {/* Image */}
      <View style={{ width: "100%", aspectRatio: 1, backgroundColor: "#F1F5F9" }}>
        {coverImage ? (
          <Image
            source={{ uri: coverImage }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="medkit-outline" size={34} color="#94A3B8" />
          </View>
        )}

        {/* Condition badge */}
        {condition && (
          <View
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              backgroundColor: condition.bg,
              borderRadius: 20,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <Text style={{ color: condition.color, fontSize: 10, fontWeight: "700" }}>
              {condition.label}
            </Text>
          </View>
        )}

        {/* Favorite button */}
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            void handleFavoriteToggle();
          }}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: "rgba(255,255,255,0.92)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={isFavorited ? "heart" : "heart-outline"}
            size={15}
            color={isFavorited ? "#EF4444" : "#64748B"}
          />
        </Pressable>
      </View>

      {/* Info */}
      <View style={{ padding: 10 }}>
        <Text
          numberOfLines={2}
          style={{ fontSize: 13, fontWeight: "600", color: "#0F172A", lineHeight: 18 }}
        >
          {listing.title}
        </Text>
        <Text
          numberOfLines={1}
          style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}
        >
          {getCategoryLabel(listing.category)}
        </Text>
        <Text style={{ fontSize: 15, fontWeight: "800", color: "#2563EB", marginTop: 6 }}>
          ₺{Number(listing.price).toLocaleString("tr-TR")}
        </Text>
        {listing.status === "sold" && (
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#DC2626", marginTop: 4 }}>
            SATILDI
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}
