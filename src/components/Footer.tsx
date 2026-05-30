import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-100 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12">
          <div className="mb-8 md:mb-0">
            <Link to="/" className="text-2xl font-bold text-[#1a513b]">
              ToshkentOasis
            </Link>
            <p className="mt-4 text-gray-500 text-sm max-w-xs">
              Toshkentdagi eng ishonchli va zamonaviy ko'chmas mulk platformasi.
            </p>
          </div>
          
          <nav className="flex flex-wrap gap-8 text-sm font-medium text-gray-600">
            <Link to="/about" className="hover:text-[#1a513b]">Biz haqimizda</Link>
            <Link to="/terms" className="hover:text-[#1a513b]">Foydalanish shartlari</Link>
            <Link to="/privacy" className="hover:text-[#1a513b]">Maxfiylik siyosati</Link>
            <Link to="/contact" className="hover:text-[#1a513b]">Aloqa</Link>
          </nav>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-gray-50 text-xs text-gray-400">
          <p>© 2024 ToshkentOasis. Barcha huquqlar himoyalangan.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
