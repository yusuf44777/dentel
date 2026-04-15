import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase, type Listing } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { getFavoriteListingIds } from "../../lib/favorites";
import { ProductCard, CARD_MARGIN } from "../../components/listing/ProductCard";
import { CATEGORIES, type CategoryMeta } from "../../constants/categories";
import { Colors } from "../../constants/colors";

type StatusFilter = "all" | "active" | "sold";
type SortFilter = "newest" | "price_asc" | "price_desc";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "active", label: "Aktif" },
  { value: "sold", label: "Satıldı" },
];

const SORT_OPTIONS: { value: SortFilter; label: string }[] = [
  { value: "newest", label: "En Yeni" },
  { value: "price_asc", label: "Fiyat Artan" },
  { value: "price_desc", label: "Fiyat Azalan" },
];

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeStatus, setActiveStatus] = useState<StatusFilter>("all");
  const [activeSort, setActiveSort] = useState<SortFilter>("newest");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const selectedCategory =
    CATEGORIES.find((cat) => cat.value === activeCategory) ?? CATEGORIES[0];

  const doSearch = useCallback(async (forceSearched = true) => {
    setLoading(true);
    if (forceSearched) setSearched(true);

    let q = supabase
      .from("listings")
      .select(
        "*, profiles(id, full_name, avatar_url, university_year, whatsapp, email, created_at), listing_images(id, listing_id, image_url, position)"
      )
      .neq("status", "deleted");

    if (activeCategory !== "all") q = q.eq("category", activeCategory);
    if (activeStatus !== "all") q = q.eq("status", activeStatus);
    if (query.trim()) q = q.ilike("title", `%${query.trim()}%`);
    if (minPrice.trim() && !Number.isNaN(Number(minPrice))) q = q.gte("price", Number(minPrice));
    if (maxPrice.trim() && !Number.isNaN(Number(maxPrice))) q = q.lte("price", Number(maxPrice));

    if (activeSort === "newest") q = q.order("created_at", { ascending: false });
    if (activeSort === "price_asc") q = q.order("price", { ascending: true });
    if (activeSort === "price_desc") q = q.order("price", { ascending: false });

    const { data } = await q;
    if (data) {
      const normalized = data.map((l: any) => ({
        ...l,
        listing_images: (l.listing_images ?? []).sort(
          (a: any, b: any) => a.position - b.position
        ),
      }));

      if (user?.id) {
        const favoriteIds = await getFavoriteListingIds(
          user.id,
          normalized.map((item: any) => item.id)
        );
        setListings(
          normalized.map((item: any) => ({
            ...item,
            is_favorited: favoriteIds.has(item.id),
          }))
        );
      } else {
        setListings(normalized);
      }
    }
    setLoading(false);
  }, [activeCategory, activeSort, activeStatus, maxPrice, minPrice, query, user?.id]);

  useEffect(() => {
    if (searched) void doSearch(false);
  }, [doSearch, searched]);

  function handleSubmit() {
    Keyboard.dismiss();
    void doSearch(true);
  }

  function handleResetFilters() {
    setActiveStatus("all");
    setActiveSort("newest");
    setMinPrice("");
    setMaxPrice("");
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 8 : 0}
      >
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

      <View className="px-4 pb-2">
        <TouchableOpacity
          onPress={() => setShowAdvancedFilters((prev) => !prev)}
          className="flex-row items-center justify-between bg-white border border-slate-200 rounded-xl px-3 py-2.5"
        >
          <Text className="text-slate-700 text-sm font-medium">Gelişmiş Filtre</Text>
          <Ionicons
            name={showAdvancedFilters ? "chevron-up-outline" : "chevron-down-outline"}
            size={18}
            color={Colors.muted}
          />
        </TouchableOpacity>
      </View>

      {showAdvancedFilters && (
        <View className="px-4 pb-3" style={{ gap: 8 }}>
          <View className="bg-white border border-slate-200 rounded-xl p-3" style={{ gap: 10 }}>
            <Text className="text-xs font-semibold text-slate-500">Durum</Text>
            <View className="flex-row" style={{ gap: 8 }}>
              {STATUS_OPTIONS.map((option) => {
                const active = activeStatus === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setActiveStatus(option.value)}
                    className={`px-3 py-2 rounded-full border ${
                      active ? "bg-primary border-primary" : "bg-white border-slate-200"
                    }`}
                  >
                    <Text className={`text-xs font-medium ${active ? "text-white" : "text-slate-600"}`}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text className="text-xs font-semibold text-slate-500">Sıralama</Text>
            <View className="flex-row" style={{ gap: 8, flexWrap: "wrap" }}>
              {SORT_OPTIONS.map((option) => {
                const active = activeSort === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setActiveSort(option.value)}
                    className={`px-3 py-2 rounded-full border ${
                      active ? "bg-primary border-primary" : "bg-white border-slate-200"
                    }`}
                  >
                    <Text className={`text-xs font-medium ${active ? "text-white" : "text-slate-600"}`}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View className="flex-row" style={{ gap: 8 }}>
              <View className="flex-1">
                <Text className="text-xs font-semibold text-slate-500 mb-1.5">Min ₺</Text>
                <TextInput
                  value={minPrice}
                  onChangeText={setMinPrice}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={Colors.muted}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900"
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-semibold text-slate-500 mb-1.5">Max ₺</Text>
                <TextInput
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={Colors.muted}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900"
                />
              </View>
            </View>

            <View className="flex-row justify-end" style={{ gap: 8 }}>
              <TouchableOpacity onPress={handleResetFilters} className="px-3 py-2">
                <Text className="text-slate-500 text-sm">Sıfırla</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  void doSearch(true);
                }}
                className="px-4 py-2 bg-primary rounded-lg"
              >
                <Text className="text-white text-sm font-semibold">Uygula</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

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
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={{
            paddingHorizontal: 16 - CARD_MARGIN,
            paddingBottom: Math.max(insets.bottom + 16, 24),
          }}
          columnWrapperStyle={{ justifyContent: "flex-start" }}
          renderItem={({ item }) => <ProductCard listing={item} />}
          showsVerticalScrollIndicator={false}
        />
      )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
