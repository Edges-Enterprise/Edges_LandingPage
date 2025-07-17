
'use client';

import { motion } from 'framer-motion';

interface Plan {
  name: string;
  price: string;
  features: string[];
  cta: string;
}

const plans: Plan[] = [
  {
    name: 'Basic',
    price: '$10/mo',
    features: ['1GB Data', 'Standard Support', 'Basic Analytics'],
    cta: 'Choose Basic',
  },
  {
    name: 'Pro',
    price: '$50/mo',
    features: ['10GB Data', 'Priority Support', 'Advanced Analytics'],
    cta: 'Choose Pro',
  },
  {
    name: 'Enterprise',
    price: 'Contact Us',
    features: ['Unlimited Data', '24/7 Support', 'Custom Analytics'],
    cta: 'Contact Sales',
  },
];

const Pricing: React.FC = () => {
  return (
    <section id="pricing" className="py-20 bg-gray-100 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="text-4xl font-bold text-center mb-12 text-gray-900 dark:text-white"
        >
          Pricing Plans
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              whileHover={{ scale: 1.05 }}
              className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg text-center hover:shadow-2xl transition"
            >
              <h3 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">{plan.name}</h3>
              <p className="text-4xl font-bold text-blue-600 dark:text-yellow-500 mb-6">{plan.price}</p>
              <ul className="mb-8 text-gray-600 dark:text-gray-300 space-y-2">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586l-3.293-3.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <a
                href={plan.name === 'Enterprise' ? '/contact' : '/signup'}
                className="bg-blue-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-700 transition"
              >
                {plan.cta}
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
