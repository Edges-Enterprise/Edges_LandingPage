"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
// import InstallationGuide from '@/components/InstallationGuide';

// Then add <InstallationGuide /> after <Features />

const Hero: React.FC = () => {
  return (
    <div className="bg-black min-h-screen">
      <div className="max-w-4xl mx-auto px-4 text-center -mt-4">
        {/* App Screenshot/Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="-mt-24 md:-mt-24 flex justify-center"
        >
          <Image
            src="/hero.png" // put your image file in `public/logo.png`
            alt="Edges Network Logo"
            width={280}
            height={250}
            className="object-contain"
          />
        </motion.div>

        {/* Title */}
        <div>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#D7A77F] -mt-4"
          >
            Edges Network
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className=" text-xs"
          >
            only for Android
          </motion.p>
        </div>

        {/* Description */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-sm md:text-md text-gray-400 my-8 max-w-xl mx-auto"
        >
          Nigeria&apos;s most trusted platform for{" "}
          <strong className="text-[#D7A77F]">cheap data bundles</strong>,
          discounted airtime, utility payments, and educational services. Get up
          to <strong className="text-[#D7A77F]">60% discount</strong> on all
          networks with{" "}
          <strong className="text-[#D7A77F]">instant delivery</strong>.
        </motion.div>

        {/* Download Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mb-12"
        >
          <Link
            href="https://tinyurl.com/Edges-Network3"
            className="inline-block bg-blue-800 text-white px-12 py-2 rounded-3xl text-lg font-semibold hover:bg-blue-700 "
          >
            Download Now
          </Link>
        </motion.div>

        {/* How to Install Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-16"
        >
          <h2 className="text-3xl font-bold mb-4 text-[#D7A77F]">
            How to Install Edges Network?
          </h2>
          <p className="text-gray-400 text-xs md:text-sm mb-8 max-w-2xl mx-auto">
            This video shows how to install Edges Network on your{" "}
            <strong className="text-[#D7A77F]">Android</strong> device. Follow
            these simple steps to start saving money on data and airtime.
          </p>

          {/* Video/Image Placeholder */}
          <div className="max-w-md mx-auto mb-8">
            <div className="bg-gray-100 rounded-lg overflow-hidden shadow-lg">
              <div className="aspect-video bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <p className="text-sm">Installation Guide Video</p>
                </div>
              </div>
            </div>
          </div>

          {/* Alternative Download Option */}
          {/* <div className="bg-gray-50 p-6 rounded-lg max-w-md mx-auto">
            <p className="text-gray-700 mb-4">
              More comfortable with installing apps
              <br />
              from the Google Play Store?
            </p>
            <a
              href="https://tinyurl.com/Edges-Network3"
              className="text-blue-600 hover:text-blue-800 font-semibold transition-colors"
            >
              Download Edges Network from Google Play
            </a>
          </div> */}

          {/* // installation guide */}
          {/* <div className="bg-gray-50 p-6 rounded-lg max-w-md mx-auto">
            <p className="text-gray-700 mb-4">
              Need help with installation?
              <br />
              Check our step-by-step guide below.
            </p>
            <a
              href="#installation-guide"
              className="text-blue-600 hover:text-blue-800 font-semibold transition-colors"
            >
              View Installation Instructions
            </a>
          </div> */}

          {/* Security Note */}
          <div className="mt-8 text-sm text-gray-400 max-w-xl mx-auto">
            Edges Network is secured with industry-standard encryption and
            trusted by thousands of Nigerians. We guarantee the{" "}
            <strong className="text-[#D7A77F]">cheapest rates</strong> and{" "}
            <strong className="text-[#D7A77F]">instant delivery</strong> across
            all networks.
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Hero;
