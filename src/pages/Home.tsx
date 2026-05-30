import { Search, MapPin, DollarSign, Home as HomeIcon, ChevronRight, ShieldCheck, Layers, Headphones } from 'lucide-react';
import { Link } from 'react-router-dom';
import ListingCard from '../components/ListingCard';

const Home = () => {
  const featuredListings = [
    {
      id: '1',
      title: 'Yunusobod tumanida zamonaviy hovli',
      price: '$250,000',
      location: 'Yunusobod tumani, 4-kvartal',
      rooms: 5,
      bathrooms: 3,
      area: 450,
      image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800',
      type: 'Sotuvda' as const,
      isPremium: true
    },
    {
      id: '2',
      title: 'Mirzo Ulug\'bekda shinam xonadon',
      price: '$800/oy',
      location: 'Mirzo Ulug\'bek tumani, Markaz-1',
      rooms: 3,
      bathrooms: 1,
      area: 85,
      image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800',
      type: 'Ijara' as const
    },
    {
      id: '3',
      title: 'Yakkasaroy tumani, Rakat',
      price: '$1,200/oy',
      location: 'Yakkasaroy tumani, Rakat mahallasi',
      rooms: 4,
      bathrooms: 2,
      area: 120,
      image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=800',
      type: 'Ijara' as const
    }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden bg-gray-50">
        <div className="absolute inset-0 z-0 opacity-10">
          <img 
            src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=1200" 
            alt="Hero BG" 
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 tracking-tight mb-6">
            Uy qidiryapsiz, lekin hech narsa <span className="text-[#1a513b]">topolmayapsizmi?</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            Bizning tasdiqlangan e'lonlar bazamiz orqali orzuingizdagi uyni xavfsiz va oson toping. Sizning zamonaviy boshpanangiz shu yerda.
          </p>

          <div className="flex flex-col md:flex-row justify-center gap-4 mb-12">
            <button className="px-8 py-4 bg-[#1a513b] text-white font-bold rounded-xl hover:bg-[#14402e] transition-all">
              Ijara uylar
            </button>
            <button className="px-8 py-4 bg-white text-gray-900 border border-gray-200 font-bold rounded-xl hover:bg-gray-50 transition-all">
              Sotuvdagi uylar
            </button>
          </div>

          {/* Search Box */}
          <div className="max-w-4xl mx-auto bg-white p-2 md:p-4 rounded-3xl shadow-2xl border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <div className="flex items-center px-4 border-b md:border-b-0 md:border-r border-gray-100 py-2">
              <MapPin className="text-[#1a513b] mr-3" size={20} />
              <div className="text-left">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Joylashuv</p>
                <input 
                  type="text" 
                  placeholder="Tuman yoki metro..." 
                  className="text-sm font-medium text-gray-900 focus:outline-none w-full"
                />
              </div>
            </div>
            
            <div className="flex items-center px-4 border-b md:border-b-0 md:border-r border-gray-100 py-2">
              <DollarSign className="text-[#1a513b] mr-3" size={20} />
              <div className="text-left">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Narx</p>
                <select className="text-sm font-medium text-gray-900 focus:outline-none w-full bg-transparent">
                  <option>Istalgan</option>
                  <option>$0 - $500</option>
                  <option>$500 - $1500</option>
                  <option>$1500+</option>
                </select>
              </div>
            </div>

            <div className="flex items-center px-4 py-2">
              <HomeIcon className="text-[#1a513b] mr-3" size={20} />
              <div className="text-left">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Xonalar</p>
                <select className="text-sm font-medium text-gray-900 focus:outline-none w-full bg-transparent">
                  <option>Hamma</option>
                  <option>1 xonali</option>
                  <option>2 xonali</option>
                  <option>3+ xonali</option>
                </select>
              </div>
            </div>

            <button className="bg-[#1a513b] text-white p-4 rounded-2xl flex items-center justify-center hover:bg-[#14402e] transition-all">
              <Search size={24} />
            </button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="flex items-center space-x-6">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center">
                <ShieldCheck className="text-[#1a513b]" size={32} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-900">100% Tasdiqlangan</h4>
                <p className="text-gray-500 text-sm">Barcha e'lonlar tekshirilgan</p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center">
                <Layers className="text-[#1a513b]" size={32} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-900">5,000+ Uylar</h4>
                <p className="text-gray-500 text-sm">Keng tanlov imkoniyati</p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center">
                <Headphones className="text-[#1a513b]" size={32} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-900">24/7 Qo'llab-quvvatlash</h4>
                <p className="text-gray-500 text-sm">Doimiy yordam xizmati</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Tanlangan e'lonlar</h2>
              <p className="text-gray-500">Toshkentdagi eng sara va premium uylar to'plami.</p>
            </div>
            <Link to="/listings" className="flex items-center text-[#1a513b] font-bold hover:underline">
              Barchasini ko'rish <ChevronRight size={20} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredListings.map((listing) => (
              <ListingCard key={listing.id} {...listing} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
