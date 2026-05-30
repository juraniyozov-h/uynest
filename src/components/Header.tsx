import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { name: 'Asosiy', path: '/' },
    { name: 'E\'lonlar', path: '/listings' },
    { name: 'Xarita', path: '/map' },
    { name: 'Saralangan', path: '/saved' },
    { name: 'Suhbatlar', path: '/messages' },
    { name: 'Yordam', path: '/help' },
  ];

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-bold text-[#1a513b]">ToshkentOasis</span>
            </Link>
          </div>

          <nav className="hidden md:flex space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? 'text-[#1a513b] border-b-2 border-[#1a513b] pb-1'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center space-x-4">
            <div className="hidden lg:flex items-center text-sm font-medium text-gray-500 cursor-pointer">
              <span>UZ/RU</span>
            </div>
            
            <Link
              to="/post-ad"
              className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-[#1a513b] hover:bg-[#14402e] transition-colors"
            >
              E'lon berish
            </Link>

            <Link to="/profile" className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-100">
                <img
                  src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=100&h=100"
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
