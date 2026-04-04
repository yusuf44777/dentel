import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase, type Listing } from "../../lib/supabase";
import { ProductCard, CARD_MARGIN } from "../../components/listing/ProductCard";
import { CATEGORIES, type CategoryMeta } from "../../constants/categories";
import { Colors } from "../../constants/colors";

export default function HomeScreen() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  async function fetchListings(category: string, searchText: string) {
    let query = supabase
      .from("listings")
      .select("*, profiles(id, full_name, avatar_url, university_year, whatsapp, email, created_at), listing_images(id, listing_id, image_url, position)")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (category !== "all") {
      query = query.eq("category", category);
    }
    if (searchText.trim()) {
      query = query.ilike("title", `%${searchText.trim()}%`);
    }

    const { data, error } = await query;
    if (!error && data) {
      // Sort listing_images by position
      const sorted = data.map((l: any) => ({
        ...l,
        listing_images: (l.listing_images ?? []).sort(
          (a: any, b: any) => a.position - b.position
        ),
      }));
      setListings(sorted);
    }
  }

  async function load(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    await fetchListings(activeCategory, search);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    load();
  }, [activeCategory]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => fetchListings(activeCategory, search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const onRefresh = useCallback(() => load(true), [activeCategory, search]);

  function renderEmpty() {
    if (loading) return null;
    return (
      <View className="flex-1 items-center justify-center py-20">
        <Text style={{ fontSize: 40 }}>🦷</Text>
        <Text className="text-slate-700 font-semibold text-base mt-4">
          Henüz ilan yok
        </Text>
        <Text className="text-muted text-sm mt-1">
          İlk ilanı sen ekle!
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      {/* Top bar */}
      <View className="px-4 pt-2 pb-3 flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-primary tracking-tight">dentel</Text>
        <TouchableOpacity
          className="w-9 h-9 bg-white border border-slate-200 rounded-full items-center justify-center"
          onPress={() => {}} // notifications — future phase
        >
          <Ionicons name="notifications-outline" size={18} color={Colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View className="px-4 mb-3">
        <View className="flex-row items-center bg-white border border-slate-200 rounded-2xl px-3 py-2.5">
          <Ionicons name="search-outline" size={18} color={Colors.muted} />
          <TextInput
            className="flex-1 ml-2 text-slate-900 text-sm"
            placeholder="Alet, kitap, malzeme ara..."
            placeholderTextColor={Colors.muted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={Colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-3"
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {CATEGORIES.map((cat: CategoryMeta) => {
          const active = activeCategory === cat.value;
          return (
            <TouchableOpacity
              key={cat.value}
              onPress={() => setActiveCategory(cat.value)}
              className={`flex-row items-center px-4 py-2 rounded-full border ${
                active
                  ? "bg-primary border-primary"
                  : "bg-white border-slate-200"
              }`}
              style={{ gap: 4 }}
            >
              <Text style={{ fontSize: 13 }}>{cat.emoji}</Text>
              <Text
                className={`text-sm font-medium ${active ? "text-white" : "text-slate-700"}`}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Listings grid */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.primary} />
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
          columnWrapperStyle={{ justifyContent: "flex-start" }}
          renderItem={({ item }) => <ProductCard listing={item} />}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
