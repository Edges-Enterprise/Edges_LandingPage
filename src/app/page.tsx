// src/app/page.tsx
import Navbar from "@/components/reseller/ResellerNavbar";
import Hero from "@/components/reseller/ResellerHero";
import HowItWorks from "@/components/reseller/ResellerHowItWorks";
import CommissionTiers from "@/components/reseller/ResellerCommissionTiers";
import Benefits from "@/components/reseller/ResellerBenefits";
import FAQ from "@/components/reseller/ResellerFAQ";
import CTA from "@/components/reseller/ResellerCTA";
import Footer from "@/components/reseller/ResellerFooter";
import "./reseller.css";

export default function Home() {
  return (
    <main style={{ position: "relative", zIndex: 1 }}>
      <Navbar />
      <Hero />
      <div style={{ borderTop: "1px solid var(--border)" }} />
      <HowItWorks />
      <div style={{ borderTop: "1px solid var(--border)" }} />
      <CommissionTiers />
      <div style={{ borderTop: "1px solid var(--border)" }} />
      <Benefits />
      <div style={{ borderTop: "1px solid var(--border)" }} />
      <FAQ />
      <div style={{ borderTop: "1px solid var(--border)" }} />
      <CTA />
      <Footer />
    </main>
  );
}
