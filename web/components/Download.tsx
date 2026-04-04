export default function Download() {
  return (
    <section id="download" className="py-28 bg-white">
      <div className="max-w-4xl mx-auto px-6">
        {/* Main download card */}
        <div className="relative bg-gradient-to-br from-primary to-blue-700 rounded-[2.5rem] p-10 md:p-16 text-center overflow-hidden">
          {/* Background decoration */}
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/5" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-white/5" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/15 text-white text-sm font-semibold px-4 py-2 rounded-full mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Ücretsiz & Reklamsız
            </div>

            <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
              Hemen indir,
              <br />
              satışa başla.
            </h2>

            <p className="text-blue-100 text-lg mb-10 max-w-lg mx-auto">
              App Store ve Play Store'da yok — sınırlamalardan bağımsız,
              sadece Üsküdar Üniversitesi öğrencilerine özel.
            </p>

            {/* Download buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
              {/* Android APK */}
              <a
                href="/downloads/dentel.apk"
                download
                className="group flex items-center justify-center gap-4 bg-white hover:bg-slate-50 text-slate-900 font-bold px-8 py-5 rounded-2xl transition-all shadow-2xl hover:-translate-y-0.5"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7">
                    <path d="M17.523 2.867 14.035 6.355a.75.75 0 0 1-1.06 0L9.487 2.867A.75.75 0 0 0 8.41 3.925l3.116 3.116H4.75A.75.75 0 0 0 4 7.791v8.417A3.792 3.792 0 0 0 7.792 20h8.416A3.792 3.792 0 0 0 20 16.208V7.791a.75.75 0 0 0-.75-.75h-6.776L15.59 3.925a.75.75 0 0 0-2.067-1.058ZM9 13.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm6 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"/>
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-xs text-slate-500 font-medium">Android İçin İndir</div>
                  <div className="text-base font-black">APK Dosyası</div>
                </div>
              </a>

              {/* iOS IPA */}
              <a
                href="/downloads/dentel-ios.ipa"
                download
                className="group flex items-center justify-center gap-4 bg-white hover:bg-slate-50 text-slate-900 font-bold px-8 py-5 rounded-2xl transition-all shadow-2xl hover:-translate-y-0.5"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-xs text-slate-500 font-medium">iOS İçin İndir</div>
                  <div className="text-base font-black">IPA Dosyası</div>
                </div>
              </a>
            </div>

            {/* iOS installation note */}
            <div className="bg-white/10 rounded-2xl p-4 text-left max-w-xl mx-auto">
              <p className="text-blue-100 text-xs leading-relaxed">
                <span className="text-white font-bold">📱 iOS Kullanıcıları:</span>{" "}
                IPA dosyasını yüklemek için{" "}
                <span className="text-white font-semibold">AltStore</span> veya{" "}
                <span className="text-white font-semibold">Sideloadly</span> kullanabilirsiniz.
                Detaylı kurulum rehberi için{" "}
                <a href="#ios-guide" className="underline text-white hover:text-blue-200">
                  buraya tıklayın
                </a>
                .
              </p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mt-8">
          {[
            { value: "Ücretsiz", label: "Her zaman" },
            { value: "0₺", label: "Komisyon yok" },
            { value: "100%", label: "Güvenli topluluk" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-surface border border-slate-100 rounded-2xl p-6 text-center"
            >
              <div className="text-2xl font-black text-slate-900">{s.value}</div>
              <div className="text-slate-500 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
