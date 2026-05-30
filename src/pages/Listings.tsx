import { Search, Map, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import ListingCard from '../components/ListingCard';

const Listings = () => {
  const listings = [
    {
      id: '1',
      title: 'Zamonaviy 2 xonali kvartira',
      price: '$500/oy',
      location: 'Mirobod tumani, Oybek metrosi',
      rooms: 2,
      bathrooms: 1,
      area: 65,
      image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&q=80&w=800',
      type: 'Ijara' as const,
      isPremium: true
    },
    {
      id: '2',
      title: 'Shinam 1 xonali studiya',
      price: '$450/oy',
      location: 'Yunusobod tumani, Bodomzor',
      rooms: 1,
      bathrooms: 1,
      area: 40,
      image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=800',
      type: 'Ijara' as const,
      isPremium: true
    },
    {
      id: '3',
      title: 'Keng 3 xonali oilaviy uy',
      price: '$800/oy',
      location: 'Yakkasaroy tumani, Rakat',
      rooms: 3,
      bathrooms: 2,
      area: 110,
      image: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&q=80&w=800',
      type: 'Ijara' as const
    },
    {
      id: '4',
      title: 'Markazda qulay kvartira',
      price: '$650/oy',
      location: 'Shayxontohur tumani, Chorsu',
      rooms: 2,
      bathrooms: 1,
      area: 80,
      image: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&q=80&w=800',
      type: 'Ijara' as const
    },
    {
      id: '5',
      title: 'Premium darajadagi hovli',
      price: '$3,500/oy',
      location: 'Mirzo Ulug\'bek tumani, Qorasuv',
      rooms: 6,
      bathrooms: 4,
      area: 350,
      image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800',
      type: 'Ijara' as const,
      isPremium: true
    },
    {
      id: '6',
      title: 'Yangi qurilgan binoda uy',
      price: '$700/oy',
      location: 'Chilonzor tumani, Oqtepa',
      rooms: 2,
      bathrooms: 1,
      area: 75,
      image: 'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?auto=format&fit=crop&q=80&w=800',
      type: 'Ijara' as const
    }
  ];

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="w-full md:w-80 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Filtrlar</h2>
                <SlidersHorizontal size={20} className="text-gray-400" />
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Narx oralig'i (oyiga)</label>
                  <div className="flex gap-4">
                    <input type="number" placeholder="$ 0" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                    <input type="number" placeholder="$ 5000" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Tuman</label>
                  <div className="space-y-2">
                    {['Mirobod tumani', 'Yunusobod tumani', 'Yakkasaroy tumani', 'Chilonzor tumani'].map((tuman) => (
                      <label key={tuman} className="flex items-center space-x-3 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 rounded text-[#1a513b] focus:ring-[#1a513b]" />
                        <span className="text-sm text-gray-600">{tuman}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Xonalar soni</label>
                  <div className="flex gap-2">
                    {['1', '2', '3', '4+'].map((num) => (
                      <button key={num} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:border-[#1a513b] hover:text-[#1a513b] transition-all">
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                <button className="w-full py-3 bg-[#1a513b] text-white font-bold rounded-xl hover:bg-[#14402e] transition-all">
                  Natijalarni ko'rsatish
                </button>
              </div>
            </div>
          </aside>

          {/* Listings Grid */}
          <main className="flex-1">
            <div className="bg-white p-4 rounded-2xl mb-8 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm border border-gray-100">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Qidirish..." 
                  className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-transparent focus:bg-white focus:border-gray-200 rounded-xl outline-none"
                />
              </div>
              <div className="flex items-center gap-4 w-full md:w-auto">
                <button className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all w-full md:w-auto">
                  <Map size={18} />
                  Xaritada ko'rish
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center mb-6 px-2">
              <h1 className="text-2xl font-bold text-gray-900">Barcha e'lonlar</h1>
              <p className="text-sm text-gray-500">1,245 ta variant topildi</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
              {listings.map((listing) => (
                <ListingCard key={listing.id} {...listing} />
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center items-center gap-2">
              <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100">
                <ChevronLeft size={20} />
              </button>
              {[1, 2, 3, '...', 10].map((page, i) => (
                <button 
                  key={i} 
                  className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${
                    page === 1 ? 'bg-[#1a513b] text-white' : 'hover:bg-gray-100'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100">
                <ChevronRight size={20} />
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Listings;
