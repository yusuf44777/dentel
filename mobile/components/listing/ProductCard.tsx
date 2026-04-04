import { View, Text, Image, TouchableOpacity, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { getConditionMeta, getCategoryLabel } from "../../constants/categories";
import type { Listing } from "../../lib/supabase";

const CARD_MARGIN = 6;
const NUM_COLUMNS = 2;
const SCREEN_WIDTH = Dimensions.get("window").width;
export const CARD_WIDTH =
  (SCREEN_WIDTH - 16 * 2 - CARD_MARGIN * (NUM_COLUMNS + 1)) / NUM_COLUMNS;

type Props = {
  listing: Listing;
};

export function ProductCard({ listing }: Props) {
  const router = useRouter();
  const condition = listing.condition ? getConditionMeta(listing.condition) : null;
  const coverImage = listing.listing_images?.[0]?.image_url;

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
            <Text style={{ fontSize: 36 }}>🦷</Text>
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
      </View>
    </TouchableOpacity>
  );
}
