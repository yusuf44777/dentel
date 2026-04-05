import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Features from "../components/Features";
import HowItWorks from "../components/HowItWorks";
import Download from "../components/Download";
import IosGuide from "../components/IosGuide";
import Footer from "../components/Footer";

export default function HomePage() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <Download />
      <IosGuide />
      <Footer />
    </main>
  );
}
