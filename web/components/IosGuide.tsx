export default function IosGuide() {
  return (
    <section id="ios-guide" className="py-24 bg-slate-50 border-t border-slate-100">
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-3xl mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            iOS Kurulum Rehberi
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 leading-tight">
            IPA dosyasını iPhone'a nasıl yüklersin?
          </h2>
          <p className="text-slate-600 leading-relaxed">
            Dentel iOS sürümü App Store dışında dağıtıldığı için kurulumu
            <span className="font-semibold text-slate-900"> AltStore </span>
            veya
            <span className="font-semibold text-slate-900"> Sideloadly </span>
            ile yapman gerekir. Aşağıdaki adımları sırayla izlersen kurulum
            sorunsuz tamamlanır.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 mb-8">
          <h3 className="text-xl font-black text-slate-900 mb-4">Başlamadan Önce</h3>
          <ul className="grid md:grid-cols-2 gap-3 text-sm text-slate-700">
            <li className="rounded-xl bg-slate-50 px-4 py-3">
              iPhone/iPad ve aktif internet bağlantısı
            </li>
            <li className="rounded-xl bg-slate-50 px-4 py-3">
              Bir bilgisayar (Mac veya Windows)
            </li>
            <li className="rounded-xl bg-slate-50 px-4 py-3">
              Apple ID hesabı (kişisel hesabın)
            </li>
            <li className="rounded-xl bg-slate-50 px-4 py-3">
              Dentel IPA dosyası (iOS indirme butonundan)
            </li>
          </ul>
          <p className="text-xs text-slate-500 mt-4">
            Not: Ücretsiz Apple ID ile yüklenen uygulamalar genelde 7 günde bir
            yenilenmelidir.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <article className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8">
            <h3 className="text-2xl font-black text-slate-900 mb-2">
              Yöntem 1: AltStore (Önerilen)
            </h3>
            <p className="text-sm text-slate-500 mb-5">
              Düzenli kullanım için daha stabil ve kullanıcı dostu.
            </p>
            <ol className="space-y-4 text-sm text-slate-700">
              <li>
                1. Bilgisayarına AltServer kur, iPhone'u USB ile bağla.
              </li>
              <li>
                2. Mac'te Finder, Windows'ta iTunes/Apple Devices üzerinden
                cihazını gör ve gerekli izinleri ver.
              </li>
              <li>
                3. AltServer menüsünden
                <span className="font-semibold text-slate-900">
                  {" "}
                  Install AltStore
                </span>{" "}
                seçip telefonuna AltStore'u yükle.
              </li>
              <li>
                4. Telefonda
                <span className="font-semibold text-slate-900">
                  {" "}
                  Ayarlar &gt; Genel &gt; VPN ve Aygıt Yönetimi
                </span>{" "}
                bölümüne gir, Apple ID profilini
                <span className="font-semibold text-slate-900"> Güven </span>
                olarak işaretle.
              </li>
              <li>
                5. iPhone'da Dentel IPA dosyasını indir. AltStore'u aç,
                <span className="font-semibold text-slate-900"> My Apps </span>
                sekmesinde
                <span className="font-semibold text-slate-900"> + </span>
                butonuna dokunup IPA'yı seç.
              </li>
              <li>
                6. Kurulum bitince uygulamayı aç. 7 gün dolmadan AltStore'dan
                yenileyerek kullanmaya devam et.
              </li>
            </ol>
          </article>

          <article className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8">
            <h3 className="text-2xl font-black text-slate-900 mb-2">
              Yöntem 2: Sideloadly
            </h3>
            <p className="text-sm text-slate-500 mb-5">
              Hızlı tek seferlik kurulum için pratik bir yöntem.
            </p>
            <ol className="space-y-4 text-sm text-slate-700">
              <li>
                1. Bilgisayarına Sideloadly kur, iPhone'u USB ile bağla.
              </li>
              <li>
                2. Uygulamada cihazını seç, Apple ID e-postanı gir.
              </li>
              <li>
                3. Dentel IPA dosyasını Sideloadly penceresine sürükle.
              </li>
              <li>
                4.{" "}
                <span className="font-semibold text-slate-900">Start</span>
                butonuna bas ve yükleme tamamlanana kadar bekle.
              </li>
              <li>
                5. Telefonda
                <span className="font-semibold text-slate-900">
                  {" "}
                  Ayarlar &gt; Genel &gt; VPN ve Aygıt Yönetimi
                </span>{" "}
                yolundan profilini
                <span className="font-semibold text-slate-900"> Güven </span>
                yap.
              </li>
              <li>
                6. Dentel'i açarak giriş yap. Uygulama açılmazsa yeniden
                imzalama yapman gerekebilir.
              </li>
            </ol>
          </article>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8">
          <h3 className="text-xl font-black text-slate-900 mb-4">
            Sık Karşılaşılan Sorunlar
          </h3>
          <ul className="space-y-3 text-sm text-slate-700">
            <li>
              <span className="font-semibold text-slate-900">
                "Untrusted Developer" hatası:
              </span>{" "}
              Profili Ayarlar menüsünden güvenilir yap.
            </li>
            <li>
              <span className="font-semibold text-slate-900">
                Uygulama açılıp hemen kapanıyor:
              </span>{" "}
              Sertifika süresi dolmuş olabilir, AltStore/Sideloadly ile tekrar
              imzala.
            </li>
            <li>
              <span className="font-semibold text-slate-900">
                Yükleme başarısız:
              </span>{" "}
              USB kablosunu değiştir, cihaz kilidini aç, internet bağlantısını
              kontrol et ve yeniden dene.
            </li>
            <li>
              <span className="font-semibold text-slate-900">
                Apple ID sınırı:
              </span>{" "}
              Ücretsiz hesaplarda aynı anda sınırlı sayıda uygulama
              imzalanabilir.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
