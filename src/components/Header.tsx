import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-primary text-white sticky top-0 shadow-md">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold">
          Edges Network
        </Link>
        <div className="space-x-4">
          <Link href="#features" className="hover:text-secondary">
            Features
          </Link>
          <Link href="#pricing" className="hover:text-secondary">
            Pricing
          </Link>
          <Link
            href="/signup"
            className="bg-secondary text-white px-4 py-2 rounded-md hover:bg-amber-800"
          >
            Download Now
          </Link>
        </div>
      </nav>
    </header>
  );
}