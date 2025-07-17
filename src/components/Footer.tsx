
const Footer: React.FC = () => {
  return (
    <footer className="py-12 bg-gray-900 text-white text-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-lg mb-4">Edges Network © 2025. All rights reserved.</p>
        <div className="flex justify-center space-x-4">
          <a href="/privacy" className="hover:text-blue-400">Privacy Policy</a>
          <a href="/terms" className="hover:text-blue-400">Terms of Service</a>
          <a href="/contact" className="hover:text-blue-400">Contact Us</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
