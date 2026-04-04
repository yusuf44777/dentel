import { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../lib/auth";
import { supabase, type ListingStatus } from "../../../lib/supabase";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { CATEGORIES } from "../../../constants/categories";
import { Colors } from "../../../constants/colors";

const STATUS_OPTIONS: { value: ListingStatus; label: string }[] = [
  { value: "active", label: "Aktif" },
  { value: "sold", label: "Satıldı" },
  { value: "deleted", label: "Silinen" },
];

export default function ListingEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  const [sellerId, setSellerId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<string>("other");
  const [status, setStatus] = useState<ListingStatus>("active");

  const loadListing = useCallback(async () => {
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      Alert.alert("Hata", "İlan bilgisi yüklenemedi.");
      router.back();
      return;
    }

    setSellerId(data.seller_id);
    setTitle(data.title ?? "");
    setDescription(data.description ?? "");
    setPrice(String(data.price ?? ""));
    setCategory(data.category ?? "other");
    setStatus(data.status ?? "active");
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    void loadListing();
  }, [loadListing]);

  const canEdit = useMemo(() => Boolean(user?.id && sellerId && user.id === sellerId), [sellerId, user?.id]);

  async function handleSave() {
    if (!canEdit) {
      Alert.alert("Yetkisiz", "Bu ilanı düzenleme yetkin yok.");
      return;
    }

    if (!title.trim()) {
      Alert.alert("Eksik Bilgi", "Başlık alanı zorunludur.");
      return;
    }

    if (!price.trim() || Number.isNaN(Number(price)) || Number(price) <= 0) {
      Alert.alert("Eksik Bilgi", "Geçerli bir fiyat gir.");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("listings")
      .update({
        title: title.trim(),
        description: description.trim() || null,
        price: Number(price),
        category,
        status,
      })
      .eq("id", id)
      .eq("seller_id", user!.id);
    setSaving(false);

    if (error) {
      Alert.alert("Hata", "İlan güncellenemedi.");
      return;
    }

    Alert.alert("Başarılı", "İlan güncellendi.", [
      {
        text: "Tamam",
        onPress: () => router.replace(`/listing/${id}`),
      },
    ]);
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!canEdit) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center px-6">
        <Text className="text-slate-700 text-center">
          Bu ilanı düzenleme yetkin bulunmuyor.
        </Text>
      </SafeAreaView>
    );
  }

  const selectedCategoryLabel =
    CATEGORIES.find((item) => item.value === category)?.label ?? "Kategori seçin";
  const selectedStatusLabel =
    STATUS_OPTIONS.find((item) => item.value === status)?.label ?? "Durum seçin";

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <ScrollView className="flex-1 px-4 pt-2" contentContainerStyle={{ paddingBottom: 30 }}>
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => router.back()} className="mr-2">
            <Ionicons name="chevron-back" size={22} color={Colors.text.secondary} />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-900">İlanı Düzenle</Text>
        </View>

        <Input
          label="Başlık"
          value={title}
          onChangeText={setTitle}
          placeholder="İlan başlığı"
        />

        <Input
          label="Açıklama"
          value={description}
          onChangeText={setDescription}
          placeholder="İlan açıklaması"
          multiline
          numberOfLines={4}
        />

        <Input
          label="Fiyat (₺)"
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
          placeholder="0"
        />

        <View className="mb-4">
          <Text className="text-sm font-medium text-slate-700 mb-1.5">Kategori</Text>
          <TouchableOpacity
            onPress={() => setShowCategoryPicker((prev) => !prev)}
            className="flex-row items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3"
          >
            <Text className="text-slate-800">{selectedCategoryLabel}</Text>
            <Ionicons
              name={showCategoryPicker ? "chevron-up" : "chevron-down"}
              size={18}
              color={Colors.muted}
            />
          </TouchableOpacity>

          {showCategoryPicker && (
            <View className="bg-white border border-slate-200 rounded-xl mt-1 overflow-hidden">
              {CATEGORIES.filter((item) => item.value !== "all").map((item, index, arr) => (
                <TouchableOpacity
                  key={item.value}
                  onPress={() => {
                    setCategory(item.value);
                    setShowCategoryPicker(false);
                  }}
                  className={`px-4 py-3 flex-row items-center justify-between ${
                    index < arr.length - 1 ? "border-b border-slate-100" : ""
                  }`}
                >
                  <Text className={category === item.value ? "text-primary font-semibold" : "text-slate-800"}>
                    {item.label}
                  </Text>
                  {category === item.value && (
                    <Ionicons name="checkmark" size={18} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View className="mb-6">
          <Text className="text-sm font-medium text-slate-700 mb-1.5">Durum</Text>
          <TouchableOpacity
            onPress={() => setShowStatusPicker((prev) => !prev)}
            className="flex-row items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3"
          >
            <Text className="text-slate-800">{selectedStatusLabel}</Text>
            <Ionicons
              name={showStatusPicker ? "chevron-up" : "chevron-down"}
              size={18}
              color={Colors.muted}
            />
          </TouchableOpacity>

          {showStatusPicker && (
            <View className="bg-white border border-slate-200 rounded-xl mt-1 overflow-hidden">
              {STATUS_OPTIONS.map((item, index) => (
                <TouchableOpacity
                  key={item.value}
                  onPress={() => {
                    setStatus(item.value);
                    setShowStatusPicker(false);
                  }}
                  className={`px-4 py-3 flex-row items-center justify-between ${
                    index < STATUS_OPTIONS.length - 1 ? "border-b border-slate-100" : ""
                  }`}
                >
                  <Text className={status === item.value ? "text-primary font-semibold" : "text-slate-800"}>
                    {item.label}
                  </Text>
                  {status === item.value && (
                    <Ionicons name="checkmark" size={18} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <Button label="Kaydet" loading={saving} onPress={handleSave} />
      </ScrollView>
    </SafeAreaView>
  );
}
