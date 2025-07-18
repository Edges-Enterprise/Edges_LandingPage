'use client';
import { motion } from 'framer-motion';

const Hero: React.FC = () => {

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">

      {/* Content */}
      <div className="relative z-10 text-center px-4">
        <motion.h1
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-4xl md:text-6xl font-bold mb-4 text-white"
        >
          Empower Your Data with Edges Network
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="text-lg md:text-2xl mb-8 max-w-2xl mx-auto text-white"
        >
          Buy and sell data seamlessly with our secure, high-speed platform.
        </motion.p>
        <motion.a
          href="/signup"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-blue-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-blue-700 transition"
        >
          Download Now
        </motion.a>
      </div>
    </section>
  );
};

export default Hero;
