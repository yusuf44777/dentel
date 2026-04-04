import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "dentel — Üsküdar Üniversitesi Dental Malzeme Platformu",
  description:
    "Diş hekimliği öğrencileri için ikinci el dental alet, kitap ve malzeme alım-satım uygulaması. Üsküdar Üniversitesi öğrencilerine özel.",
  keywords: [
    "dental malzeme",
    "diş hekimliği",
    "ikinci el",
    "üsküdar üniversitesi",
    "dental alet",
  ],
  openGraph: {
    title: "dentel",
    description: "Dental malzemenizi al, satın, takası görün.",
    type: "website",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-white antialiased">{children}</body>
    </html>
  );
}
