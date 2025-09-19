import Head from 'next/head';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import Footer from '@/components/Footer';
import Header from '@/components/Header';

export default function Home() {
  return (
    <>
      <Head>
        <title>
          Edges Network - Cheap airtime/Data bundles Reselling Platform
        </title>
        <meta
          name="description"
          content="Buy airtime/data bundles at cheaper rate fast with Edges Network's secure platform."
        />
        <meta
          name="keywords"
          content="cheap data Nigeria, discounted airtime, MTN data, Airtel data, Glo data, 9mobile data, utility payments, WAEC pins, NECO pins, NABTEB pins, electricity bills, cable tv subscription"
        />
        <meta name="author" content="Edges Network" />
        <meta name="robots" content="index, follow" />
        <meta
          property="og:title"
          content="Edges Network - Nigeria's #1 Platform for Cheap Data & Airtime"
        />
        <meta
          property="og:description"
          content="Save money on data bundles, airtime, and utility bills. Trusted by thousands of Nigerians for the best prices and instant delivery."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://edgesnetwork.com" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="Edges Network - Cheapest Data & Airtime in Nigeria"
        />
        <meta
          name="twitter:description"
          content="Get up to 60% discount on data bundles and airtime across all networks. Instant delivery guaranteed!"
        />
        <link rel="canonical" href="https://edgesnetwork.com" />
      </Head>
      <div className="min-h-screen bg-black dark:bg-black text-gray-900 dark:text-white transition-colors duration-300">
        <Header />
        <Hero />
        <Features />
        <Footer />
      </div>
    </>
  );
}
