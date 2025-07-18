"use client";
import Link from "next/link";
import { useState } from "react";
import { HiMenu, HiX } from "react-icons/hi";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  return (
    <header className="bg-primary text-white sticky top-0 shadow-md z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link
            href="/"
            className="text-xl sm:text-2xl font-bold flex-shrink-0"
            onClick={closeMenu}
          >
            Edges Network
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
            <Link
              href="#features"
              className="hover:text-secondary transition-colors duration-200 text-sm lg:text-base"
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="hover:text-secondary transition-colors duration-200 text-sm lg:text-base"
            >
              Pricing
            </Link>
            <Link
              href="/signup"
              className="bg-secondary text-white px-4 py-2 rounded-md hover:bg-amber-800 transition-colors duration-200 text-sm lg:text-base whitespace-nowrap"
            >
              Download Now
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-md hover:bg-white/10 transition-colors duration-200"
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
        <div
          className={`md:hidden transition-all duration-300 ease-in-out ${
            isOpen
              ? "max-h-64 opacity-100 pb-4"
              : "max-h-0 opacity-0 overflow-hidden"
          }`}
        >
          <div className="flex flex-col space-y-1 pt-2 border-t border-white/20">
            <Link
              href="#features"
              className="hover:text-secondary hover:bg-white/10 px-3 py-3 rounded-md transition-all duration-200 text-base"
              onClick={closeMenu}
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="hover:text-secondary hover:bg-white/10 px-3 py-3 rounded-md transition-all duration-200 text-base"
              onClick={closeMenu}
            >
              Pricing
            </Link>
            <Link
              href="/signup"
              className="bg-secondary text-white px-4 py-3 rounded-md hover:bg-amber-800 transition-colors duration-200 text-base text-center mt-2"
              onClick={closeMenu}
            >
              Download Now
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
