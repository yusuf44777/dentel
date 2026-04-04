import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as LegacyFS from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { useRouter } from "expo-router";
// react-native-get-random-values is polyfilled in _layout.tsx (root entry)
import { v4 as uuidv4 } from "uuid";
import { supabase, type ListingCategory, type ListingCondition } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { CATEGORIES, CONDITIONS } from "../../constants/categories";
import { Colors } from "../../constants/colors";

const MAX_IMAGES = 4;

type PickedImage = {
  uri: string;
  mimeType: string;
  fileName: string;
};

function createListingId(): string {
  const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } })
    .crypto;
  if (typeof cryptoApi?.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  if (typeof uuidv4 === "function") {
    return uuidv4();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Uploads one image to Supabase Storage, returns public URL
async function uploadImage(
  image: PickedImage,
  userId: string,
  listingId: string,
  index: number
): Promise<string> {
  const ext = image.fileName.split(".").pop() ?? "jpg";
  const path = `${userId}/${listingId}/${index}.${ext}`;

  const base64 = await LegacyFS.readAsStringAsync(image.uri, {
    encoding: LegacyFS.EncodingType.Base64,
  });
  const arrayBuffer = decode(base64);

  const { error } = await supabase.storage
    .from("listing-images")
    .upload(path, arrayBuffer, { contentType: image.mimeType, upsert: true });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage
    .from("listing-images")
    .getPublicUrl(path);

  return data.publicUrl;
}

export default function SellScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Form state
  const [images, setImages] = useState<PickedImage[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<ListingCategory | null>(null);
  const [condition, setCondition] = useState<ListingCondition | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [uploadStep, setUploadStep] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function addPickedAssets(
    assets: ImagePicker.ImagePickerAsset[],
    source: "gallery" | "camera"
  ) {
    const picked: PickedImage[] = assets.map((a, i) => ({
      uri: a.uri,
      mimeType: a.mimeType ?? "image/jpeg",
      fileName: a.fileName ?? `${source}_${Date.now()}_${i}.jpg`,
    }));
    setImages((prev) => [...prev, ...picked].slice(0, MAX_IMAGES));
  }

  async function pickFromGallery() {
    if (images.length >= MAX_IMAGES) {
      Alert.alert("Limit Doldu", `En fazla ${MAX_IMAGES} fotoğraf ekleyebilirsiniz.`);
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("İzin Gerekli", "Fotoğraflara erişim izni vermeniz gerekmektedir.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: MAX_IMAGES - images.length,
    });

    if (!result.canceled) {
      addPickedAssets(result.assets, "gallery");
    }
  }

  async function captureFromCamera() {
    if (images.length >= MAX_IMAGES) {
      Alert.alert("Limit Doldu", `En fazla ${MAX_IMAGES} fotoğraf ekleyebilirsiniz.`);
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("İzin Gerekli", "Kamera erişim izni vermeniz gerekmektedir.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      addPickedAssets(result.assets, "camera");
    }
  }

  function handleAddImagePress() {
    Alert.alert("Fotoğraf Ekle", "Kaynak seçin", [
      {
        text: "Kamera",
        onPress: () => {
          void captureFromCamera();
        },
      },
      {
        text: "Galeri",
        onPress: () => {
          void pickFromGallery();
        },
      },
      { text: "İptal", style: "cancel" },
    ]);
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (images.length === 0) e.images = "En az 1 fotoğraf ekleyin.";
    if (!title.trim()) e.title = "Başlık zorunludur.";
    if (!category) e.category = "Kategori seçin.";
    if (!condition) e.condition = "Ürün durumu seçin.";
    if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0)
      e.price = "Geçerli bir fiyat girin.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    if (!user) return;

    setLoading(true);
    try {
      const listingId = createListingId();

      // 1. Upload images
      setUploadStep("Fotoğraflar yükleniyor...");
      const imageUrls: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const url = await uploadImage(images[i], user.id, listingId, i);
        imageUrls.push(url);
      }

      // 2. Insert listing
      setUploadStep("İlan oluşturuluyor...");
      const { error: listingError } = await supabase.from("listings").insert({
        id: listingId,
        seller_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        price: Number(price),
        category,
        condition,
        status: "active",
      });
      if (listingError) throw new Error(listingError.message);

      // 3. Insert listing_images
      const imageRows = imageUrls.map((url, i) => ({
        listing_id: listingId,
        image_url: url,
        position: i,
      }));
      const { error: imgError } = await supabase.from("listing_images").insert(imageRows);
      if (imgError) throw new Error(imgError.message);

      // 4. Navigate to the new listing
      router.replace(`/listing/${listingId}`);
    } catch (err: any) {
      Alert.alert("Hata", err.message ?? "Bir hata oluştu, tekrar deneyin.");
    } finally {
      setLoading(false);
      setUploadStep("");
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View className="px-4 pt-2 pb-3 border-b border-slate-100 flex-row items-center">
          <Text className="text-xl font-bold text-slate-900 flex-1">İlan Ver</Text>
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        >
          {/* ── Image picker ───────────────────────────────── */}
          <Text className="text-sm font-medium text-slate-700 mb-2">
            Fotoğraflar{" "}
            <Text className="text-muted font-normal">
              ({images.length}/{MAX_IMAGES})
            </Text>
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-1">
            <View className="flex-row gap-3">
              {images.map((img, idx) => (
                <View key={idx} style={{ position: "relative" }}>
                  <Image
                    source={{ uri: img.uri }}
                    style={{ width: 90, height: 90, borderRadius: 12 }}
                    resizeMode="cover"
                  />
                  {/* Cover badge on first image */}
                  {idx === 0 && (
                    <View
                      style={{
                        position: "absolute",
                        bottom: 4,
                        left: 4,
                        backgroundColor: "rgba(0,0,0,0.55)",
                        borderRadius: 6,
                        paddingHorizontal: 5,
                        paddingVertical: 2,
                      }}
                    >
                      <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>
                        KAPAK
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => removeImage(idx)}
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      backgroundColor: Colors.danger,
                      borderRadius: 10,
                      width: 20,
                      height: 20,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="close" size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}

              {images.length < MAX_IMAGES && (
                <TouchableOpacity
                  onPress={handleAddImagePress}
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: Colors.border,
                    borderStyle: "dashed",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#fff",
                  }}
                >
                  <Ionicons name="camera-outline" size={28} color={Colors.muted} />
                  <Text style={{ fontSize: 11, color: Colors.muted, marginTop: 4 }}>
                    Ekle
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
          {errors.images && (
            <Text className="text-danger text-xs mb-3">{errors.images}</Text>
          )}

          {/* ── Title ──────────────────────────────────────── */}
          <View className="mt-4">
            <Input
              label="Başlık"
              placeholder="ör. Plantar Cihazı, Histoloji Kitabı"
              value={title}
              onChangeText={setTitle}
              error={errors.title}
              autoCapitalize="sentences"
            />
          </View>

          {/* ── Category picker ────────────────────────────── */}
          <Text className="text-sm font-medium text-slate-700 mb-2">Kategori</Text>
          <View className="flex-row flex-wrap gap-2 mb-1">
            {CATEGORIES.filter((c) => c.value !== "all").map((cat) => {
              const active = category === cat.value;
              return (
                <TouchableOpacity
                  key={cat.value}
                  onPress={() => setCategory(cat.value as ListingCategory)}
                  className={`px-3 py-2 rounded-xl border flex-row items-center gap-1 ${
                    active ? "bg-primary border-primary" : "bg-white border-slate-200"
                  }`}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={14}
                    color={active ? "#FFFFFF" : Colors.text.secondary}
                  />
                  <Text
                    className={`text-sm font-medium ${active ? "text-white" : "text-slate-700"}`}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {errors.category && (
            <Text className="text-danger text-xs mb-3">{errors.category}</Text>
          )}

          {/* ── Condition picker ───────────────────────────── */}
          <Text className="text-sm font-medium text-slate-700 mb-2 mt-4">
            Ürün Durumu
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-1">
            {CONDITIONS.map((cond) => {
              const active = condition === cond.value;
              return (
                <TouchableOpacity
                  key={cond.value}
                  onPress={() => setCondition(cond.value)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: active ? cond.color : "#E2E8F0",
                    backgroundColor: active ? cond.bg : "#fff",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: active ? cond.color : "#475569",
                    }}
                  >
                    {cond.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {errors.condition && (
            <Text className="text-danger text-xs mb-3">{errors.condition}</Text>
          )}

          {/* ── Price ──────────────────────────────────────── */}
          <View className="mt-4 mb-2">
            <Text className="text-sm font-medium text-slate-700 mb-1.5">Fiyat</Text>
            <View
              className={`flex-row items-center bg-white border rounded-xl px-4 ${
                errors.price ? "border-danger" : "border-slate-200"
              }`}
            >
              <Text className="text-slate-500 text-base mr-1">₺</Text>
              <TextInput
                className="flex-1 py-3.5 text-slate-900 text-base"
                placeholder="0"
                placeholderTextColor={Colors.muted}
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
              />
            </View>
            {errors.price && (
              <Text className="text-danger text-xs mt-1">{errors.price}</Text>
            )}
          </View>

          {/* ── Description ────────────────────────────────── */}
          <View className="mt-4">
            <Text className="text-sm font-medium text-slate-700 mb-1.5">
              Açıklama{" "}
              <Text className="text-muted font-normal">(İsteğe bağlı)</Text>
            </Text>
            <View className="bg-white border border-slate-200 rounded-xl px-4 py-3">
              <TextInput
                className="text-slate-900 text-base"
                placeholder="Ürün hakkında detay verin..."
                placeholderTextColor={Colors.muted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                style={{ minHeight: 90, textAlignVertical: "top" }}
                autoCapitalize="sentences"
              />
            </View>
          </View>

          {/* ── Submit ─────────────────────────────────────── */}
          <View className="mt-6">
            {loading ? (
              <View className="bg-primary rounded-xl py-4 items-center">
                <ActivityIndicator color="#fff" />
                <Text className="text-white text-sm mt-2 font-medium">
                  {uploadStep}
                </Text>
              </View>
            ) : (
              <Button label="İlanı Yayınla" onPress={handleSubmit} />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
