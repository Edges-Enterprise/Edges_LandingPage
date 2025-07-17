import Head from 'next/head';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import Pricing from '@/components/Pricing';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <>
      <Head>
        <title>Edges Network - Data Reselling Platform</title>
        <meta name="description" content="Buy and sell data seamlessly with Edges Network's secure platform." />
      </Head>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300">
        <Hero />
        <Features />
        <Pricing />
        <Footer />
      </div>
    </>
  );
}
