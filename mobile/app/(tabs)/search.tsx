import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase, type Listing } from "../../lib/supabase";
import { ProductCard, CARD_MARGIN } from "../../components/listing/ProductCard";
import { CATEGORIES, type CategoryMeta } from "../../constants/categories";
import { Colors } from "../../constants/colors";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function doSearch(text: string, category: string) {
    setLoading(true);
    setSearched(true);

    let q = supabase
      .from("listings")
      .select(
        "*, profiles(id, full_name, avatar_url, university_year, whatsapp, email, created_at), listing_images(id, listing_id, image_url, position)"
      )
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (category !== "all") q = q.eq("category", category);
    if (text.trim()) q = q.ilike("title", `%${text.trim()}%`);

    const { data } = await q;
    if (data) {
      setListings(
        data.map((l: any) => ({
          ...l,
          listing_images: (l.listing_images ?? []).sort(
            (a: any, b: any) => a.position - b.position
          ),
        }))
      );
    }
    setLoading(false);
  }

  // Re-search when category changes (if already have a query or browsing all)
  useEffect(() => {
    if (searched) doSearch(query, activeCategory);
  }, [activeCategory]);

  function handleSubmit() {
    doSearch(query, activeCategory);
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      {/* Search bar */}
      <View className="px-4 pt-4 pb-3">
        <Text className="text-xl font-bold text-slate-900 mb-3">Arama</Text>
        <View className="flex-row items-center bg-white border border-slate-200 rounded-2xl px-3 py-2.5 gap-2">
          <Ionicons name="search-outline" size={18} color={Colors.muted} />
          <TextInput
            className="flex-1 text-slate-900 text-sm"
            placeholder="Alet, kitap, malzeme ara..."
            placeholderTextColor={Colors.muted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setQuery("");
                setListings([]);
                setSearched(false);
              }}
            >
              <Ionicons name="close-circle" size={18} color={Colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category filter */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(item) => item.value}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 12 }}
        renderItem={({ item }: { item: CategoryMeta }) => {
          const active = activeCategory === item.value;
          return (
            <TouchableOpacity
              onPress={() => setActiveCategory(item.value)}
              className={`flex-row items-center px-3 py-1.5 rounded-full border ${
                active ? "bg-primary border-primary" : "bg-white border-slate-200"
              }`}
              style={{ gap: 4 }}
            >
              <Text style={{ fontSize: 12 }}>{item.emoji}</Text>
              <Text
                className={`text-xs font-medium ${active ? "text-white" : "text-slate-700"}`}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Results */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : !searched ? (
        <View className="flex-1 items-center justify-center">
          <Text style={{ fontSize: 40 }}>🔍</Text>
          <Text className="text-slate-500 mt-3 text-sm">
            Aramak istediğin ürünü yaz
          </Text>
        </View>
      ) : listings.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text style={{ fontSize: 40 }}>🦷</Text>
          <Text className="text-slate-700 font-semibold mt-4">Sonuç bulunamadı</Text>
          <Text className="text-muted text-sm mt-1">Farklı bir arama dene</Text>
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
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
