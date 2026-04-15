import BrandLogo from "./BrandLogo";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start gap-10 mb-12">
          {/* Brand */}
          <div className="max-w-xs">
            <div className="mb-4">
              <BrandLogo textClassName="text-white" iconClassName="w-9 h-9" />
            </div>
            <p className="text-sm leading-relaxed">
              Üsküdar Üniversitesi Diş Hekimliği Fakültesi öğrencilerine özel
              ikinci el dental malzeme platformu.
            </p>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-x-16 gap-y-4 text-sm">
            <div>
              <div className="text-white font-semibold mb-3">Uygulama</div>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-white transition-colors">Özellikler</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">Nasıl Çalışır</a></li>
                <li><a href="#download" className="hover:text-white transition-colors">İndir</a></li>
                <li><a href="/privacy" className="hover:text-white transition-colors">Gizlilik Politikası</a></li>
              </ul>
            </div>
            <div>
              <div className="text-white font-semibold mb-3">İletişim</div>
              <ul className="space-y-2">
                <li>
                  <a
                    href="mailto:dentelapp@st.uskudar.edu.tr"
                    className="hover:text-white transition-colors"
                  >
                    E-posta
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Instagram
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <p>© {new Date().getFullYear()} dentel. Tüm hakları saklıdır.</p>
          <p>
            Üsküdar Üniversitesi Diş Hekimliği Fakültesi •{" "}
            <span className="text-primary">Öğrenci Projesi</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
