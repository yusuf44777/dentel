import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../lib/auth";
import { supabase, type Listing } from "../lib/supabase";
import { ProductCard, CARD_MARGIN } from "../components/listing/ProductCard";
import { Colors } from "../constants/colors";
import { STRINGS } from "../constants/strings";

export default function FavoritesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFavorites = useCallback(async (showRefresh = false) => {
    if (!user?.id) return;

    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    const { data: favorites } = await supabase
      .from("favorites")
      .select("listing_id")
      .eq("user_id", user.id);

    const listingIds = (favorites ?? []).map((row) => row.listing_id);
    if (!listingIds.length) {
      setListings([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const { data } = await supabase
      .from("listings")
      .select(
        "*, profiles(id, full_name, avatar_url, university_year, whatsapp, email, created_at), listing_images(id, listing_id, image_url, position)"
      )
      .in("id", listingIds)
      .neq("status", "deleted")
      .order("created_at", { ascending: false });

    const normalized = (data ?? []).map((listing: any) => ({
      ...listing,
      is_favorited: true,
      listing_images: (listing.listing_images ?? []).sort(
        (a: any, b: any) => a.position - b.position
      ),
    }));

    setListings(normalized);
    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <View className="px-4 pt-2 pb-3 border-b border-slate-100 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-2">
          <Ionicons name="chevron-back" size={22} color={Colors.text.secondary} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900">{STRINGS.favorites.title}</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : listings.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-slate-500 text-sm text-center">{STRINGS.favorites.empty}</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{
            paddingHorizontal: 16 - CARD_MARGIN,
            paddingBottom: 24,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void loadFavorites(true);
              }}
              tintColor={Colors.primary}
            />
          }
          columnWrapperStyle={{ justifyContent: "flex-start" }}
          renderItem={({ item }) => (
            <ProductCard
              listing={item}
              onFavoriteChange={(_, isFavorited) => {
                if (!isFavorited) {
                  setListings((prev) => prev.filter((l) => l.id !== item.id));
                }
              }}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
