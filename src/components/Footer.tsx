import Image from "next/image";
import { socialLinks } from "@/constants";
import Link from "next/link";

const Footer: React.FC = () => {
  return (
    <footer className="bg-black text-white py-12">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <div className="mb-8">
          <div className="flex flex-row items-center justify-center gap-2">
            <Image
              src="/edgesnetworkicon.png" // <- replace with your logo file path
              alt="Edges Network Logo"
              width={40}
              height={40}
            />
            <h3 className="text-2xl font-bold ">Edges Network</h3>
          </div>
          <p className="text-gray-400 max-w-xl mx-auto text-sm py-4">
            Nigeria&apos;s most trusted platform for cheap data bundles,
            discounted airtime, utility payments, and educational services.
          </p>
        </div>

        <div className="flex justify-center space-x-8 mb-8">
          {socialLinks.map((social) => (
            <a
              key={social.name}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <social.icon />
              <span className="hidden sm:inline">{social.name}</span>
            </a>
          ))}
        </div>

        <div className="flex justify-center space-x-6 text-xs text-gray-400 mb-6">
          <Link href="/privacy" className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-white transition-colors">
            Terms of Service
          </Link>
          <Link href="/contact" className="hover:text-white transition-colors">
            Contact Us
          </Link>
          <Link href="/help" className="hover:text-white transition-colors">
            F.A.Q.
          </Link>
        </div>

        <p className="text-gray-500 text-[10px]">
          &copy; 2025 Edges Network. All rights reserved. | Made with &#10084;
          for Nigeria
        </p>
      </div>
    </footer>
  );
};

export default Footer;
