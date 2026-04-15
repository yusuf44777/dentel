# dentel

`dentel`, Üsküdar Üniversitesi Diş Hekimliği öğrencileri için ikinci el dental malzeme alım-satım platformudur.

## Proje Yapısı

```text
.
├── mobile/      # React Native / Expo mobil uygulama kaynakları
├── web/         # Next.js landing page
└── supabase/    # Supabase CLI config ve migration dosyaları
```

## Gereksinimler

- Node.js 20+
- npm 10+
- Supabase CLI (`supabase --version`)

## Kurulum

### 1) Repo'yu klonla

```bash
git clone <YOUR_GITHUB_REPO_URL>
cd dentel
```

### 2) Ortam değişkenlerini hazırla

`mobile/.env.example` dosyasını `mobile/.env.local` olarak kopyala ve doldur:

```bash
cp mobile/.env.example mobile/.env.local
```

`mobile/.env.local` içinde auth redirect adresini de belirt:

```bash
EXPO_PUBLIC_AUTH_EMAIL_REDIRECT_TO=dentel://auth/callback
```

Supabase migration/push için `supabase/.env.example` dosyasını `supabase/.env.local` olarak kopyala ve doldur:

```bash
cp supabase/.env.example supabase/.env.local
```

`supabase/.env.local` içinde Google Drive değişkenlerini de doldur:

```bash
GOOGLE_DRIVE_OAUTH_CLIENT_ID=
GOOGLE_DRIVE_OAUTH_CLIENT_SECRET=
GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN=
GOOGLE_DRIVE_FOLDER_ID=
```

### 3) Bağımlılıkları yükle

Web:

```bash
cd web
npm install
```

Mobil:

```bash
cd ../mobile
npm install
```

## Geliştirme

### Web (Next.js)

```bash
cd web
npm run dev
```

### Mobile iOS Preview Build (EAS)

```bash
cd mobile
npm run build:ios:preview
```

İlk kullanımda EAS hesabınla giriş yapman gerekebilir:

```bash
npx eas login
```

### Mobile Android Release APK (arm64-v8a)

Direct indirme için daha küçük APK üretmek adına Android build varsayılanı `arm64-v8a` olarak ayarlı.

```bash
cd mobile/android
./gradlew clean
./gradlew assembleRelease
```

Oluşan dosya:

```text
mobile/android/app/build/outputs/apk/release/app-arm64-v8a-release.apk
```

Not: Bu APK sadece `arm64` cihazlarda çalışır. Eski 32-bit (`armeabi-v7a`) cihazlar için `reactNativeArchitectures` değerini genişletmelisin.

### Supabase Migration Push

```bash
cd ..
set -a
source supabase/.env.local
set +a
supabase link --project-ref "$SUPABASE_PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"
supabase db push
```

Not: Drive eşleşmesi için `listing_images` tablosuna `drive_file_id`, `storage_path`, `storage_provider` alanları migration ile eklenir.

### Supabase Edge Function Deploy (Drive Upload)

`upload-listing-image` fonksiyonu ile fotoğraflar Google Drive'a yüklenir.

```bash
cd supabase
set -a
source .env.local
set +a
supabase secrets set --project-ref "$SUPABASE_PROJECT_REF" --env-file .env.local
supabase functions deploy upload-listing-image --project-ref "$SUPABASE_PROJECT_REF"
```

## Deploy

### Vercel (web)

```bash
cd web
npx vercel --prod
```

## GitHub'a Push

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

## Güvenlik Notu

- `.env.local` dosyaları `.gitignore` içinde, commit edilmez.
- `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` gibi gizli değerleri sadece local ortamda tut.
