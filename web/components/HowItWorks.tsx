const steps = [
  {
    step: "01",
    title: "Hesap Oluştur",
    description:
      "E-posta adresin ve öğrenci belgenle ücretsiz kayıt ol. 30 saniye sürer.",
    iconClass: "fa-graduation-cap",
    color: "bg-blue-600",
  },
  {
    step: "02",
    title: "İlan Ver ya da Keşfet",
    description:
      "Kullanmadığın aleti ya da kitabı ilanla. Ya da kategoriye göre filtrele, aradığını bul.",
    iconClass: "fa-search",
    color: "bg-emerald-500",
  },
  {
    step: "03",
    title: "Satıcıyla İletişime Geç",
    description:
      "Beğendiğin ilanın altındaki butona bas, WhatsApp üzerinden satıcıyla doğrudan konuş.",
    iconClass: "fa-comments",
    color: "bg-violet-500",
  },
  {
    step: "04",
    title: "Kampüste Buluş, Teslim Al",
    description:
      "Yüz yüze buluşun, ürünü inceleyin, nakit ödeyin. Komisyon yok, aracı yok.",
    iconClass: "fa-handshake-o",
    color: "bg-amber-500",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-28 bg-surface">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-primary font-semibold text-sm uppercase tracking-widest">
            Nasıl Çalışır
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mt-3 mb-4 tracking-tight">
            4 adımda
            <br />
            <span className="gradient-text">al ya da sat.</span>
          </h2>
          <p className="text-slate-500 text-lg max-w-lg mx-auto">
            Karmaşık süreç yok, ödeme sistemi yok. Sadece bul, iletişime
            geç, teslim al.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line — desktop */}
          <div className="hidden lg:block absolute top-12 left-[calc(12.5%-1px)] right-[calc(12.5%-1px)] h-0.5 bg-gradient-to-r from-blue-200 via-emerald-200 to-amber-200" />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <div key={s.step} className="relative flex flex-col items-center text-center">
                {/* Step number circle */}
                <div
                  className={`${s.color} w-24 h-24 rounded-3xl flex flex-col items-center justify-center mb-6 shadow-lg relative z-10`}
                >
                  <i className={`fa ${s.iconClass} text-white text-2xl mb-1`} aria-hidden="true" />
                  <span className="text-white/70 text-xs font-bold">{s.step}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {s.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Problem/Solution callout */}
        <div className="mt-20 bg-white border border-slate-100 rounded-3xl p-8 md:p-12 grid md:grid-cols-2 gap-10 shadow-sm">
          <div>
            <div className="inline-block bg-red-50 text-red-600 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
              Problem
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-4">
              Pahalı malzemenin yatırım olmaktan çıkma vakti.
            </h3>
            <ul className="space-y-3 text-slate-600 text-sm">
              {[
                "5. sınıf öğrencilerinin aletleri çekmecede bekliyor",
                "1. sınıf öğrencileri tam fiyat ödüyor",
                "Facebook gruplarında aramak çok zaman alıyor",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <i className="fa fa-times text-red-400 mt-1" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="inline-block bg-emerald-50 text-emerald-600 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
              Çözüm
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-4">
              dentel ile herkes kazanıyor.
            </h3>
            <ul className="space-y-3 text-slate-600 text-sm">
              {[
                "Üst sınıflar kullanmadığı aleti satar, cebine para girer",
                "Alt sınıflar indirimli, güvenilir malzeme bulur",
                "Öğrenci topluluğu — hızlı, güvenilir, kolay",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <i className="fa fa-check text-emerald-500 mt-1" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
