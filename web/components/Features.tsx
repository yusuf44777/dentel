const features = [
  {
    icon: "📸",
    title: "Kolayca İlan Ver",
    description:
      "Fotoğraf çek, fiyat yaz, ilanı yayınla. 60 saniyede ilanın hazır.",
    color: "from-blue-50 to-blue-100",
    iconBg: "bg-blue-100",
  },
  {
    icon: "🔍",
    title: "Kategoriyle Bul",
    description:
      "Klinik öncesi, klinik, kitaplar, sarf malzeme — aradığın kategoride filtrele.",
    color: "from-emerald-50 to-emerald-100",
    iconBg: "bg-emerald-100",
  },
  {
    icon: "💬",
    title: "WhatsApp ile Bağlan",
    description:
      "Beğendiğin ürünü bul, tek tuşla satıcıya WhatsApp'tan ulaş.",
    color: "from-violet-50 to-violet-100",
    iconBg: "bg-violet-100",
  },
  {
    icon: "💸",
    title: "Nakit, Yüz Yüze",
    description:
      "Ödeme yok, komisyon yok. Kampüste buluşun, teslim alın, nakit ödeyin.",
    color: "from-amber-50 to-amber-100",
    iconBg: "bg-amber-100",
  },
  {
    icon: "🎓",
    title: "Sadece Üsküdar Öğrencileri",
    description:
      "@st.uskudar.edu.tr e-postanla kayıt ol. Güvenilir, doğrulanmış topluluk.",
    color: "from-rose-50 to-rose-100",
    iconBg: "bg-rose-100",
  },
  {
    icon: "🦷",
    title: "Diş Hekimliğine Özel",
    description:
      "Genel ikinci el değil. Sadece dental malzeme. Daha hızlı bul, daha hızlı sat.",
    color: "from-cyan-50 to-cyan-100",
    iconBg: "bg-cyan-100",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-28 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-primary font-semibold text-sm uppercase tracking-widest">
            Özellikler
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mt-3 mb-4 tracking-tight">
            İhtiyacın olan her şey,
            <br />
            <span className="gradient-text">tek bir yerde.</span>
          </h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            Dolap ve Letgo'dan ilham alındı, diş hekimliği öğrencilerine göre
            tasarlandı.
          </p>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className={`bg-gradient-to-br ${f.color} rounded-3xl p-7 hover:-translate-y-1 transition-transform duration-200`}
            >
              <div
                className={`${f.iconBg} w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-5`}
              >
                {f.icon}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {f.title}
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
