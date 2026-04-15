import PhoneMockup from "./PhoneMockup";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-white pt-16">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-blue-50 opacity-60 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-emerald-50 opacity-60 blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-16 items-center">
        {/* Left — text */}
        <div>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-primary text-sm font-semibold px-4 py-2 rounded-full mb-8">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Üsküdar Üniversitesi • Diş Hekimliği
          </div>

          <h1 className="text-5xl md:text-6xl font-black text-slate-900 leading-[1.05] tracking-tight text-balance mb-6">
            Dental malzemen
            <br />
            <span className="gradient-text">bir tık uzağında.</span>
          </h1>

          <p className="text-lg text-slate-500 leading-relaxed mb-10 max-w-md">
            Kullanmadığın aletleri sat, ihtiyacın olanı uygun fiyata bul.
            Üst sınıflardan alt sınıflara — diş hekimliği öğrencileri için
            tasarlandı.
          </p>

          {/* Download buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <a
              href="https://expo.dev/artifacts/eas/fKnpi7A3ihyAkks3AGmTYT.apk"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-center gap-3 bg-primary hover:bg-primary-dark text-white font-bold px-7 py-4 rounded-2xl transition-all shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5"
            >
              {/* Android icon */}
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.523 15.341 14.035 12l3.488-3.341a.75.75 0 0 0-1.046-1.076l-3.751 3.593a.75.75 0 0 0 0 1.648l3.751 3.593a.75.75 0 0 0 1.046-1.076ZM3.477 8.659l3.488 3.341-3.488 3.341a.75.75 0 0 0 1.046 1.076l3.751-3.593a.75.75 0 0 0 0-1.648L4.523 7.583a.75.75 0 0 0-1.046 1.076Z"/>
                <path d="M6.343 3.515a.75.75 0 0 1 1.06 0l10 10a.75.75 0 0 1-1.06 1.06l-10-10a.75.75 0 0 1 0-1.06ZM6.343 20.485a.75.75 0 0 0 1.06 0l10-10a.75.75 0 0 0-1.06-1.06l-10 10a.75.75 0 0 0 0 1.06Z"/>
              </svg>
              <div className="text-left">
                <div className="text-xs opacity-80 font-normal">Android için İndir</div>
                <div className="text-sm font-bold">APK Dosyası</div>
              </div>
            </a>

            <a
              href="https://apps.apple.com/us/app/dentel/id6762062276"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white font-bold px-7 py-4 rounded-2xl transition-all shadow-lg shadow-slate-200 hover:shadow-slate-300 hover:-translate-y-0.5"
            >
              {/* Apple icon */}
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" xmlns="http://www.w3.org/2000/svg">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <div className="text-left">
                <div className="text-xs opacity-80 font-normal">iOS için İndir</div>
                <div className="text-sm font-bold">App Store</div>
              </div>
            </a>
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <div className="flex -space-x-2">
              {["2B", "3A", "1K", "4Y", "5M"].map((initials) => (
                <div
                  key={initials}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-emerald-400 border-2 border-white flex items-center justify-center"
                >
                  <span className="text-white text-[9px] font-bold">{initials}</span>
                </div>
              ))}
            </div>
            <span>
              <strong className="text-slate-900">Üsküdar Üniversitesi</strong> öğrencilerine özel
            </span>
          </div>
        </div>

        {/* Right — phone mockup */}
        <div className="flex justify-center md:justify-end">
          <div className="animate-float">
            <PhoneMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
