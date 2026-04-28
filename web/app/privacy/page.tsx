import type { Metadata } from "next";
import Link from "next/link";

const LAST_UPDATED = "11 Nisan 2026";

export const metadata: Metadata = {
  title: "Gizlilik Politikası | dentel",
  description:
    "dentel uygulaması için gizlilik politikası: hangi verileri topladığımız, neden işlediğimiz, nasıl koruduğumuz ve kullanıcı hakları.",
  alternates: {
    canonical: "/privacy",
  },
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8">
      <h2 className="text-xl md:text-2xl font-black text-slate-900 mb-4">
        {title}
      </h2>
      <div className="space-y-3 text-slate-700 leading-relaxed text-sm md:text-base">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-10 md:py-14">
      <div className="max-w-4xl mx-auto px-5 md:px-6">
        <div className="mb-8 md:mb-10">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
          >
            Ana sayfaya dön
          </Link>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 mt-3 tracking-tight">
            Gizlilik Politikası
          </h1>
          <p className="text-slate-500 mt-3 text-sm md:text-base">
            Son güncelleme: <strong>{LAST_UPDATED}</strong>
          </p>
        </div>

        <div className="space-y-5 md:space-y-6">
          <Section title="1) Amaç ve Kapsam">
            <p>
              Bu politika, <strong>dentel</strong> mobil uygulaması ve{" "}
              <strong>denteluskudar.vercel.app</strong> alan adı altında sunulan
              hizmetlerde kişisel verilerin nasıl işlendiğini açıklar.
            </p>
            <p>
              dentel; diş hekimliği öğrencileri arasında ikinci el dental
              malzeme alım-satımını kolaylaştırmak amacıyla geliştirilmiş bir
              platformdur. Platform, Üsküdar Üniversitesi öğrencileri tarafından
              geliştirilmiştir.
            </p>
            <p>
              Bu metin; uygulama içi kayıt, giriş, ilan oluşturma, favorileme,
              bildirim, şikayet, engelleme ve iletişim özelliklerinin tamamı
              için geçerlidir.
            </p>
          </Section>

          <Section title="2) Veri Sorumlusu ve İletişim">
            <p>
              Hizmetin veri işleme faaliyetleri <strong>dentel</strong> tarafından
              yürütülür.
            </p>
            <p>
              Gizlilik, kişisel veri talepleri ve başvurular için iletişim
              adresi:
            </p>
            <p>
              <strong>E-posta:</strong>{" "}
              <a className="text-primary font-semibold" href="mailto:dentelapp@st.uskudar.edu.tr">
                E-posta ile iletişime geçin
              </a>
            </p>
          </Section>

          <Section title="3) Toplanan Veriler">
            <p>Uygulama kapsamında aşağıdaki veri kategorileri işlenebilir:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Hesap verileri:</strong> E-posta adresi, ad-soyad,
                sınıf bilgisi, WhatsApp numarası.
              </li>
              <li>
                <strong>Kimlik doğrulama verileri:</strong> Şifre ve oturum
                bilgileri (kimlik doğrulama altyapısı üzerinden güvenli şekilde
                işlenir).
              </li>
              <li>
                <strong>Profil verileri:</strong> Profil görseli bağlantısı
                (varsa), iletişim tercihleri (WhatsApp/e-posta görünürlüğü).
              </li>
              <li>
                <strong>İlan verileri:</strong> Başlık, açıklama, fiyat,
                kategori, ürün durumu, ilan görselleri, oluşturma/güncelleme
                tarihleri ve ilan durumu (aktif/satıldı/silinen).
              </li>
              <li>
                <strong>Etkileşim verileri:</strong> Favoriler, bildirim kayıtları,
                ilan şikayetleri, engelleme kayıtları.
              </li>
              <li>
                <strong>Bildirim verileri:</strong> Push bildirim tokeni,
                platform bilgisi (iOS/Android/web), bildirim tercihi.
              </li>
              <li>
                <strong>Teknik veriler:</strong> Hizmet sürekliliği ve güvenlik
                amacıyla altyapı servislerinin ürettiği sınırlı log/veri
                (örneğin istek zamanı, hata kaydı, IP tabanlı güvenlik kayıtları).
              </li>
            </ul>
          </Section>

          <Section title="4) Verileri Toplama Yöntemleri">
            <ul className="list-disc pl-5 space-y-2">
              <li>Kullanıcının doğrudan girdiği bilgiler (kayıt/profil/ilan).</li>
              <li>
                Kullanıcı eylemleriyle oluşan bilgiler (favorileme, şikayet,
                bildirim okuma vb.).
              </li>
              <li>
                Cihaz izinleri ile sağlanan bilgiler (kamera ve galeri erişimi,
                yalnızca kullanıcı izin verirse).
              </li>
              <li>
                Teknik altyapı ve güvenlik sistemlerinin ürettiği operasyonel
                kayıtlar.
              </li>
            </ul>
          </Section>

          <Section title="5) İşleme Amaçları ve Hukuki Sebepler">
            <p>Kişisel veriler aşağıdaki amaçlarla işlenir:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Hesap açma, oturum yönetimi ve kullanıcı doğrulaması.</li>
              <li>İlan yayınlama, görüntüleme, düzenleme ve listeleme.</li>
              <li>Kullanıcılar arası iletişimi kolaylaştırma.</li>
              <li>
                Favori, bildirim ve kullanıcı tercihleri gibi fonksiyonları
                sunma.
              </li>
              <li>
                Kötüye kullanımın önlenmesi, şikayet yönetimi, güvenlik ve
                denetim süreçlerinin yürütülmesi.
              </li>
              <li>
                Yasal yükümlülüklerin yerine getirilmesi ve olası uyuşmazlıklarda
                hakların korunması.
              </li>
            </ul>
            <p>
              İşleme faaliyetleri, niteliğine göre sözleşmenin kurulması/ifa
              edilmesi, hukuki yükümlülük, meşru menfaat ve gerektiğinde açık
              rıza dayanaklarına dayanır.
            </p>
          </Section>

          <Section title="6) Cihaz İzinleri">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Kamera:</strong> İlan fotoğrafı çekebilmek için istenir.
              </li>
              <li>
                <strong>Fotoğraf Galerisi:</strong> Mevcut fotoğrafları ilana
                ekleyebilmek için istenir.
              </li>
              <li>
                <strong>Bildirim İzni:</strong> Push bildirimleri alabilmek için
                istenir.
              </li>
            </ul>
            <p>
              Bu izinler zorunlu değildir; ancak reddedilmesi durumunda ilgili
              özellikler kısmen veya tamamen çalışmayabilir.
            </p>
          </Section>

          <Section title="7) Verilerin Paylaşımı ve Aktarım">
            <p>
              Kişisel veriler kural olarak satılmaz veya reklam amaçlı üçüncü
              taraflara devredilmez.
            </p>
            <p>
              Hizmetin teknik olarak sunulabilmesi için veriler; barındırma,
              kimlik doğrulama, veritabanı, dosya saklama ve bildirim gönderimi
              sağlayan altyapı servisleriyle sınırlı olarak işlenebilir.
            </p>
            <p>
              Kullanıcı tarafından yayınlanan ilan içerikleri ve ilan görselleri,
              uygulamanın işleyişi gereği diğer yetkili kullanıcılar tarafından
              görülebilir.
            </p>
            <p>
              Kullanılan bulut altyapısına bağlı olarak veriler yurt dışında
              bulunan sunucularda işlenebilir.
            </p>
          </Section>

          <Section title="8) Saklama Süreleri">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Hesap ve profil verileri, hesap aktif olduğu sürece veya yasal
                yükümlülük kapsamında gerekli olduğu müddetçe saklanır.
              </li>
              <li>
                İlan kayıtları, işlem güvenliği ve uyuşmazlık yönetimi amacıyla
                makul sürelerle saklanabilir.
              </li>
              <li>
                Bildirim, favori ve ayar kayıtları hizmetin sürdürülebilirliği
                için gerekli olduğu sürece tutulur.
              </li>
              <li>
                Teknik loglar, güvenlik ve mevzuat gereksinimleri kadar saklanır
                ve süre sonunda silinir/anonimleştirilir.
              </li>
            </ul>
          </Section>

          <Section title="9) Güvenlik Tedbirleri">
            <p>
              dentel; verilerin gizliliği ve bütünlüğünü korumak için makul
              teknik ve idari tedbirler uygular.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Yetkilendirme ve oturum yönetimi kontrolleri.</li>
              <li>Veri erişiminde rol bazlı kısıtlamalar.</li>
              <li>Taşıma sırasında şifreli iletişim (TLS/HTTPS).</li>
              <li>Yetkisiz erişimi önlemeye yönelik politika ve izleme adımları.</li>
            </ul>
            <p>
              Hiçbir sistem %100 risksiz değildir; bu nedenle kullanıcıların da
              hesap güvenliği (güçlü şifre, cihaz güvenliği vb.) konusunda özen
              göstermesi gerekir.
            </p>
          </Section>

          <Section title="10) Kullanıcı Hakları">
            <p>
              İlgili mevzuat kapsamında kullanıcılar; verilerine erişim, düzeltme,
              silme, işleme faaliyetleri hakkında bilgi alma ve itiraz etme gibi
              haklara sahiptir.
            </p>
            <p>
              Bu haklara ilişkin taleplerinizi{" "}
              <a className="text-primary font-semibold" href="mailto:dentelapp@st.uskudar.edu.tr">
                E-posta ile iletişime geçin
              </a>{" "}
              bağlantısı üzerinden iletebilirsiniz.
              Başvurular, yürürlükteki mevzuat çerçevesinde değerlendirilir.
            </p>
          </Section>

          <Section title="11) Üçüncü Taraf İçerik ve Kullanıcı Sorumluluğu">
            <p>
              Uygulama, kullanıcıların oluşturduğu ilan ve görselleri gösterebilir.
              Kullanıcı, platforma yüklediği içerik üzerinde gerekli haklara sahip
              olduğunu ve hukuka aykırı içerik paylaşmayacağını kabul eder.
            </p>
            <p>
              Telif hakkı, kişilik hakkı veya diğer mevzuat ihlallerine ilişkin
              şikayetler değerlendirilir; ihlal tespiti halinde içerik kaldırma,
              hesap kısıtlama veya yasal süreç başlatma adımları uygulanabilir.
            </p>
          </Section>

          <Section title="12) Politika Güncellemeleri">
            <p>
              Bu politika, hizmet kapsamı veya yasal yükümlülükler doğrultusunda
              güncellenebilir. Güncel metin her zaman bu sayfada yayınlanır.
            </p>
            <p>
              Önemli değişiklikler halinde kullanıcılar uygulama içi veya uygun
              iletişim kanallarıyla ayrıca bilgilendirilebilir.
            </p>
          </Section>
        </div>
      </div>
    </main>
  );
}
