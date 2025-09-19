"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { HiMenu, HiX } from "react-icons/hi";
import { socialLinks } from "@/constants";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const closeMenu = () => setIsOpen(false);
  
  return (
    <header className="bg-black sticky top-0 shadow-sm z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-56">
        <div className="flex justify-between items-center py-3">
          {/* Left Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/edgesnetworkicon.png" // <- replace with your logo file path
              alt="Edges Network Logo"
              width={40}
              height={40}
            />
            <span className="text-[#D7A77F] font-bold text-lg">
              Edges Network
            </span>
          </Link>

          {/* Right Social Links (Desktop) */}
          <div className="hidden md:flex items-center space-x-4">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#D7A77F] hover:text-[#744925] transition-colors duration-200"
                title={social.name}
              >
                <social.icon />
              </a>
            ))}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-md transition-colors duration-200 text-[#D7A77F]"
            aria-label="Toggle navigation menu"
            aria-expanded={isOpen}
          >
            {isOpen ? (
              <HiX className="w-6 h-6" />
            ) : (
              <HiMenu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isOpen && (
          <div className="md:hidden transition-all duration-300 ease-in-out pb-0">
            <div className="flex flex-row justify-center items-center pt-0 gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#D7A77F] hover:text-[#744925] transition-colors duration-200"
                  title={social.name}
                  onClick={closeMenu}
                >
                  <social.icon />
                </a>
              ))}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
