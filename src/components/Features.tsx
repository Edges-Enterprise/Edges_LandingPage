
'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface Feature {
  title: string;
  description: string;
  gif: string;
}

const features: Feature[] = [
  {
    title: 'Secure Transactions',
    description: 'All data transactions are encrypted with top-tier security protocols.',
    gif: 'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExN2Z5a2Z6MDN3b2k0YzJqY2E0eHlyeTR3cDM4enY4eTN4c3E4aGkwciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7btPCcdNniyf0ArK/giphy.gif',
  },
  {
    title: 'Fast Data Transfer',
    description: 'Instantly buy or sell data with our high-speed network.',
    gif: 'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExd3I0c2w2ZTRoZThhdjJnd25qZG5ua2Jhd2R2c3k3d3J4Y3V1a2NlbCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0Iyl55kTehV9KH6w/giphy.gif',
  },
  {
    title: 'User-Friendly Interface',
    description: 'Manage your data with our intuitive dashboard.',
    gif: 'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExa3E5Z3Z3N3JkeTB6a3o5c3A4bXpjZmxyc3Zjd3A0YzF5a2s3ZGZhOCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKz9b3xN9b6fK6Q/giphy.gif',
  },
];

const Features: React.FC = () => {
  return (
    <section id="features" className="py-20 bg-white dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="text-4xl font-bold text-center mb-12 text-gray-900 dark:text-white"
        >
          Why Choose Edges Network?
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              className="bg-gray-100 dark:bg-gray-700 p-6 rounded-xl shadow-lg text-center hover:shadow-2xl transition"
            >
              <Image
                src={feature.gif}
                alt={feature.title}
                width={400}
                height={160}
                unoptimized
                className="object-cover rounded-md mb-4"
              />
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
