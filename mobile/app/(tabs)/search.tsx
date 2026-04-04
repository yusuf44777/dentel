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
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const selectedCategory =
    CATEGORIES.find((cat) => cat.value === activeCategory) ?? CATEGORIES[0];

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

      {/* Category dropdown */}
      <View className="px-4 pb-3">
        <TouchableOpacity
          onPress={() => setIsCategoryDropdownOpen((prev) => !prev)}
          className="flex-row items-center justify-between bg-white border border-slate-200 rounded-2xl px-3 py-3"
        >
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <Ionicons
              name={selectedCategory.icon as any}
              size={16}
              color={Colors.text.secondary}
            />
            <Text className="text-sm font-medium text-slate-800">
              {selectedCategory.label}
            </Text>
          </View>
          <Ionicons
            name={isCategoryDropdownOpen ? "chevron-up-outline" : "chevron-down-outline"}
            size={18}
            color={Colors.muted}
          />
        </TouchableOpacity>

        {isCategoryDropdownOpen && (
          <View className="mt-2 bg-white border border-slate-200 rounded-2xl overflow-hidden">
            {CATEGORIES.map((item: CategoryMeta, index) => {
              const active = activeCategory === item.value;
              const showDivider = index !== CATEGORIES.length - 1;
              return (
                <TouchableOpacity
                  key={item.value}
                  onPress={() => {
                    setActiveCategory(item.value);
                    setIsCategoryDropdownOpen(false);
                  }}
                  className={`flex-row items-center justify-between px-3 py-3 ${
                    showDivider ? "border-b border-slate-100" : ""
                  }`}
                >
                  <View className="flex-row items-center" style={{ gap: 8 }}>
                    <Ionicons
                      name={item.icon as any}
                      size={16}
                      color={active ? Colors.primary : Colors.text.secondary}
                    />
                    <Text
                      className={`text-sm ${
                        active ? "text-primary font-semibold" : "text-slate-700 font-medium"
                      }`}
                    >
                      {item.label}
                    </Text>
                  </View>
                  {active && (
                    <Ionicons name="checkmark" size={18} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Results */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : !searched ? (
        <View className="flex-1 items-center justify-center">
          <Ionicons name="search-outline" size={36} color={Colors.muted} />
          <Text className="text-slate-500 mt-3 text-sm">
            Aramak istediğin ürünü yaz
          </Text>
        </View>
      ) : listings.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Ionicons name="medkit-outline" size={36} color={Colors.muted} />
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
