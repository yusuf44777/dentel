"use client";
import { useState, useEffect } from "react";
import BrandLogo from "./BrandLogo";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-100"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <BrandLogo />

        {/* Nav links — desktop */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#features" className="hover:text-primary transition-colors">
            Özellikler
          </a>
          <a href="#how-it-works" className="hover:text-primary transition-colors">
            Nasıl Çalışır
          </a>
          <a href="#download" className="hover:text-primary transition-colors">
            İndir
          </a>
        </div>

        {/* CTA */}
        <a
          href="#download"
          className="bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
        >
          Uygulamayı İndir
        </a>
      </div>
    </nav>
  );
}
