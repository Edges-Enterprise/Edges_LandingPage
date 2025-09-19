"use client";

import { features, testimonials } from "@/constants";
import { motion } from "framer-motion";

const Features: React.FC = () => {
  return (
    <section className="py-20 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl font-bold text-[#D7A77F] mb-4">
            Why Choose Edges Network?
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Nigeria's #1 platform for cheap data, airtime, and utility payments.
            Trusted by thousands of satisfied customers nationwide.
          </p>
        </motion.div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-gray-900 p-8 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"

              // className="bg-gradient-to-br from-white to-gray-50 p-8 rounded-2xl shadow-lg
              //            hover:shadow-2xl hover:scale-105 transition-all duration-300"
            >
              <div className="text-center mb-6">
                <div className="text-5xl mb-4 text-[#D7A77F]">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>

              {/* <div className="space-y-2">
                {feature.benefits.map((benefit, idx) => (
                  <div
                    key={idx}
                    className="flex items-center text-sm text-gray-700"
                  >
                    <svg
                      className="w-4 h-4 text-green-500 mr-2 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {benefit}
                  </div>
                ))}
              </div> */}
            </motion.div>
          ))}
        </div>

        {/* Testimonials */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mt-20 text-center"
        >
          <h3 className="text-2xl font-bold text-[#D7A77F] mb-8">
            What Our Customers Say
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur-md p-8 rounded-xl shadow-lg border border-white/10 hover:shadow-xl transition-shadow duration-300"

                // className="bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300"
              >
                {/* <p className="text-gray-600 italic mb-4">
                  "{testimonial.comment}"
                </p>
                <div className="font-semibold text-gray-900">
                  {testimonial.name}
                </div>
                <div className="text-sm text-gray-500">
                  {testimonial.location}
                </div> */}
                <div
                  key={index}
                  className="bg-gray-900 p-6 rounded-lg shadow-md"
                >
                  <p className="text-gray-300 italic mb-4">
                    "{testimonial.comment}"
                  </p>
                  <div className="font-semibold text-white">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-gray-400">
                    {testimonial.location}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Features;
