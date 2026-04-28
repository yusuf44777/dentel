import type { Metadata } from "next";
import "./globals.css";

const BASE_URL = "https://denteluskudar.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: "dentel — Dental Malzeme Platformu",
  description:
    "Diş hekimliği öğrencileri için ikinci el dental alet, kitap ve malzeme alım-satım uygulaması. Üsküdar Üniversitesi öğrencileri tarafından geliştirildi.",
  keywords: [
    "dental malzeme",
    "diş hekimliği",
    "ikinci el",
    "dental alet",
    "diş hekimliği öğrenci",
    "dental kit",
    "pre-klinik malzeme",
  ],
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    title: "dentel — Dental Malzeme Platformu",
    description:
      "Kullanmadığın dental aletleri sat, ihtiyacın olanı uygun fiyata bul. Diş hekimliği öğrencileri için geliştirilen ücretsiz uygulama.",
    type: "website",
    url: BASE_URL,
    siteName: "dentel",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "dentel — Dental Malzeme Platformu",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "dentel — Dental Malzeme Platformu",
    description:
      "Kullanmadığın dental aletleri sat, ihtiyacın olanı uygun fiyata bul. Üsküdar Üniversitesi öğrencileri tarafından geliştirildi.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/logo-mark.svg",
    shortcut: "/logo-mark.svg",
    apple: "/logo-mark.svg",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "MobileApplication",
  name: "dentel",
  description:
    "Diş hekimliği öğrencileri için ikinci el dental alet, kitap ve malzeme alım-satım uygulaması. Üsküdar Üniversitesi öğrencileri tarafından geliştirildi.",
  url: "https://denteluskudar.vercel.app",
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Android, iOS",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "TRY",
  },
  publisher: {
    "@type": "Organization",
    name: "dentel",
    url: "https://denteluskudar.vercel.app",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
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
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"
        />
      </head>
      <body className="bg-white antialiased">{children}</body>
    </html>
  );
}
