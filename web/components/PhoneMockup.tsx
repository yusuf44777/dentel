// Pure CSS phone mockup showing the app UI
export default function PhoneMockup() {
  const cards = [
    { iconClass: "fa-medkit", title: "GC Fuji IX Kit", price: "₺450", badge: "Sıfır Gibi", badgeColor: "#2563EB", badgeBg: "#DBEAFE" },
    { iconClass: "fa-book", title: "Histoloji Atlas", price: "₺180", badge: "İyi", badgeColor: "#D97706", badgeBg: "#FEF3C7" },
    { iconClass: "fa-wrench", title: "Ölçü Kaşıkları", price: "₺120", badge: "Sıfır", badgeColor: "#059669", badgeBg: "#D1FAE5" },
    { iconClass: "fa-stethoscope", title: "Ayna Seti", price: "₺95", badge: "Makul", badgeColor: "#DC2626", badgeBg: "#FEE2E2" },
  ];

  return (
    <div
      style={{
        width: 280,
        height: 560,
        borderRadius: 44,
        background: "#0F172A",
        padding: 3,
        boxShadow:
          "0 50px 100px -20px rgba(37,99,235,0.25), 0 30px 60px -30px rgba(0,0,0,0.3), inset 0 -2px 6px rgba(255,255,255,0.05)",
        position: "relative",
      }}
    >
      {/* Screen */}
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 42,
          background: "#F8FAFC",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Status bar */}
        <div
          style={{
            background: "#fff",
            paddingTop: 12,
            paddingBottom: 6,
            paddingLeft: 20,
            paddingRight: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: "#0F172A" }}>9:41</span>
          {/* Notch */}
          <div
            style={{
              width: 80,
              height: 22,
              background: "#0F172A",
              borderRadius: 100,
              position: "absolute",
              top: 6,
              left: "50%",
              transform: "translateX(-50%)",
            }}
          />
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <svg width="12" height="10" viewBox="0 0 12 10" fill="#0F172A"><rect x="0" y="4" width="2" height="6" rx="1"/><rect x="3.5" y="2.5" width="2" height="7.5" rx="1"/><rect x="7" y="1" width="2" height="9" rx="1"/><rect x="10.5" y="0" width="1.5" height="10" rx="0.75"/></svg>
            <svg width="14" height="10" viewBox="0 0 24 16" fill="#0F172A"><path d="M12 3C8.7 3 5.73 4.28 3.57 6.37L0 12l3.57 5.63C5.73 19.72 8.7 21 12 21s6.27-1.28 8.43-3.37L24 12l-3.57-5.63C18.27 4.28 15.3 3 12 3z" opacity=".3"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
        </div>

        {/* App header */}
        <div
          style={{
            background: "#fff",
            paddingLeft: 16,
            paddingRight: 16,
            paddingBottom: 10,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 20, fontWeight: 900, color: "#2563EB", letterSpacing: -0.5 }}>
            dentel
          </span>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              background: "#F1F5F9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i className="fa fa-bell-o" style={{ fontSize: 13, color: "#334155" }} aria-hidden="true" />
          </div>
        </div>

        {/* Search bar */}
        <div style={{ paddingLeft: 16, paddingRight: 16, marginBottom: 10 }}>
          <div
            style={{
              background: "#F1F5F9",
              borderRadius: 14,
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <i className="fa fa-search" style={{ fontSize: 11, color: "#94A3B8" }} aria-hidden="true" />
            <span style={{ fontSize: 11, color: "#94A3B8" }}>Alet, kitap ara...</span>
          </div>
        </div>

        {/* Category pills */}
        <div
          style={{
            display: "flex",
            gap: 6,
            paddingLeft: 16,
            overflowX: "hidden",
            marginBottom: 12,
          }}
        >
          {[
            { label: "Tümü", iconClass: "fa-tags" },
            { label: "Klinik Öncesi", iconClass: "fa-medkit" },
            { label: "Kitaplar", iconClass: "fa-book" },
          ].map((c, i) => (
            <div
              key={c.label}
              style={{
                background: i === 0 ? "#2563EB" : "#fff",
                borderRadius: 20,
                paddingLeft: 10,
                paddingRight: 10,
                paddingTop: 4,
                paddingBottom: 4,
                border: i === 0 ? "none" : "1px solid #E2E8F0",
                fontSize: 9,
                fontWeight: 600,
                color: i === 0 ? "#fff" : "#475569",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <i className={`fa ${c.iconClass}`} style={{ fontSize: 8 }} aria-hidden="true" />
              {c.label}
            </div>
          ))}
        </div>

        {/* Product grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            paddingLeft: 12,
            paddingRight: 12,
            flex: 1,
            overflowY: "hidden",
          }}
        >
          {cards.map((card) => (
            <div
              key={card.title}
              style={{
                background: "#fff",
                borderRadius: 14,
                overflow: "hidden",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}
            >
              {/* Image area */}
              <div
                style={{
                  background: "#F8FAFC",
                  aspectRatio: "1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                <i className={`fa ${card.iconClass}`} style={{ fontSize: 24, color: "#334155" }} aria-hidden="true" />
                <div
                  style={{
                    position: "absolute",
                    top: 5,
                    left: 5,
                    background: card.badgeBg,
                    borderRadius: 10,
                    padding: "2px 5px",
                  }}
                >
                  <span style={{ fontSize: 7, fontWeight: 700, color: card.badgeColor }}>
                    {card.badge}
                  </span>
                </div>
              </div>
              {/* Info */}
              <div style={{ padding: "6px 8px 8px" }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: "#0F172A", marginBottom: 2, lineHeight: 1.3 }}>
                  {card.title}
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#2563EB" }}>
                  {card.price}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom tab bar */}
        <div
          style={{
            background: "#fff",
            borderTop: "1px solid #F1F5F9",
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
            padding: "8px 0 12px",
            marginTop: 8,
          }}
        >
          {[
            { iconClass: "fa-home", label: "Ana Sayfa", active: true },
            { iconClass: "fa-search", label: "Ara", active: false },
            { icon: null, label: "", active: false },
            { iconClass: "fa-comments", label: "Mesajlar", active: false },
            { iconClass: "fa-user", label: "Profil", active: false },
          ].map((tab, i) =>
            tab.icon === null ? (
              <div
                key={i}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  background: "#2563EB",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: -12,
                  boxShadow: "0 4px 12px rgba(37,99,235,0.4)",
                }}
              >
                <span style={{ color: "#fff", fontSize: 18 }}>+</span>
              </div>
            ) : (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <i
                  className={`fa ${tab.iconClass}`}
                  style={{ fontSize: 13, color: tab.active ? "#2563EB" : "#94A3B8" }}
                  aria-hidden="true"
                />
                <span style={{ fontSize: 7, color: tab.active ? "#2563EB" : "#94A3B8", fontWeight: tab.active ? 700 : 500 }}>
                  {tab.label}
                </span>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
