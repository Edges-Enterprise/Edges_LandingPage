import Head from 'next/head';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <>
      <Head>
        <title>Edges Network - Cheap airtime/Data bundles Reselling Platform</title>
        <meta name="description" content="Buy airtime/data bundles at cheaper rate fast with Edges Network's secure platform." />
      </Head>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300">
        <Hero />
        <Features />
        <Footer />
      </div>
    </>
  );
}
