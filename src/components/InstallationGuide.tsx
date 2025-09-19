"use client";
import { motion } from "framer-motion";

const InstallationGuide: React.FC = () => {
  const steps = [
    {
      step: 1,
      title: "Download the APK",
      description:
        "Click the download button above to download the Edges Network APK file from Google Drive.",
      icon: "📱",
    },
    {
      step: 2,
      title: "Enable Unknown Sources",
      description:
        "Go to Settings → Security → Enable 'Unknown Sources' or 'Install Unknown Apps'.",
      icon: "⚙️",
    },
    {
      step: 3,
      title: "Install the App",
      description:
        "Open the downloaded APK file and tap 'Install'. Wait for the installation to complete.",
      icon: "📲",
    },
    {
      step: 4,
      title: "Open & Enjoy",
      description:
        "Launch Edges Network from your app drawer and start saving on data and airtime!",
      icon: "🎉",
    },
  ];

  return (
    <section id="installation-guide" className="py-16 bg-white">
      <div className="max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Installation Instructions
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Follow these simple steps to install Edges Network on your Android
            device and start enjoying the cheapest data rates in Nigeria.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {steps.map((step, index) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="flex items-start p-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex-shrink-0 mr-4">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  {step.step}
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-2">{step.icon}</span>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {step.title}
                  </h3>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Security Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-12 p-6 bg-blue-50 rounded-lg border border-blue-200"
        >
          <div className="flex items-center mb-3">
            <span className="text-2xl mr-2">🔒</span>
            <h3 className="text-lg font-semibold text-blue-900">
              Safe & Secure Download
            </h3>
          </div>
          <p className="text-blue-800 text-sm leading-relaxed">
            Our APK file is hosted on Google Drive and is completely safe to
            install. Edges Network uses bank-level security to protect your data
            and transactions. The app has been trusted by thousands of Nigerians
            since 2020.
          </p>
        </motion.div>

        {/* Troubleshooting */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-8 text-center"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Need Help?
          </h3>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <a
              href="https://wa.me/2347000000000?text=Hi,%20I%20need%20help%20installing%20Edges%20Network%20app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
              </svg>
              WhatsApp Support
            </a>
            <a
              href="mailto:support@edgesnetwork.com"
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
              </svg>
              Email Support
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default InstallationGuide;
