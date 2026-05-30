import { Link } from 'react-router-dom';
import { Heart, Share2, MapPin, BedDouble, Maximize, Phone, MessageSquare, ShieldCheck, ChevronRight, Layers } from 'lucide-react';

const ListingDetail = () => {

  // Mock data for a single listing
  const listing = {
    title: 'Zamonaviy 3 xonali kvartira, Yunusobod tumani',
    price: '$125,000',
    location: 'Yunusobod tumani, 19-mavze, 45-uy',
    rooms: 3,
    bathrooms: 2,
    area: 75,
    floor: '4/9',
    description: 'Yunusobod markazida joylashgan, barcha qulayliklarga ega zamonaviy ta\'mirlangan kvartira sotiladi. Uyda sifatli materiallar ishlatilgan, Yevropa standartlariga javob beradigan dizayn. Mebel va texnika bilan birga sotiladi. Maktab, bog\'cha va supermarketlar piyoda yurish masofasida.',
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1600566753190-17f0bb2a6c3e?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1600607687940-47a000df3cc4?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1600566753086-00f18fb6f3ea?auto=format&fit=crop&q=80&w=800'
    ],
    owner: {
      name: 'Rustam Valiyev',
      rating: 4.9,
      reviews: 42,
      joined: '2 yildan beri',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=100'
    }
  };

  return (
    <div className="bg-white min-h-screen pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-8">
          <Link to="/listings" className="hover:text-gray-900">E'lonlar</Link>
          <ChevronRight size={14} />
          <span className="hover:text-gray-900">Toshkent</span>
          <ChevronRight size={14} />
          <span className="text-gray-900 font-medium">Yunusobod tumani</span>
        </nav>

        {/* Gallery Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{listing.title}</h1>
            <div className="flex items-center text-gray-500">
              <MapPin size={18} className="mr-2" />
              <span>{listing.location}</span>
            </div>
          </div>
          <div className="flex space-x-4">
            <button className="p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
              <Share2 size={20} />
            </button>
            <button className="p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
              <Heart size={20} />
            </button>
          </div>
        </div>

        {/* Image Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-4 h-[500px] mb-12">
          <div className="md:col-span-2 md:row-span-2 rounded-2xl overflow-hidden group relative">
            <img src={listing.images[0]} alt="Property" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1 bg-[#1a513b]/80 backdrop-blur-md text-white text-xs font-bold rounded-full uppercase">Tasdiqlangan</span>
            </div>
          </div>
          <div className="md:col-span-1 rounded-2xl overflow-hidden">
            <img src={listing.images[1]} alt="Property" className="w-full h-full object-cover" />
          </div>
          <div className="md:col-span-1 rounded-2xl overflow-hidden">
            <img src={listing.images[2]} alt="Property" className="w-full h-full object-cover" />
          </div>
          <div className="md:col-span-2 rounded-2xl overflow-hidden relative">
            <img src={listing.images[3]} alt="Property" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-white font-bold text-xl">+8 Rasm</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Info */}
          <div className="lg:col-span-2">
            <div className="mb-12">
              <h2 className="text-4xl font-bold text-[#1a513b] mb-8">{listing.price}</h2>
              
              <div className="grid grid-cols-3 gap-4 mb-12">
                <div className="bg-gray-50 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                  <BedDouble size={24} className="text-[#1a513b] mb-2" />
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Xonalar</p>
                  <p className="text-lg font-bold text-gray-900">{listing.rooms}</p>
                </div>
                <div className="bg-gray-50 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                  <Maximize size={24} className="text-[#1a513b] mb-2" />
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Maydon</p>
                  <p className="text-lg font-bold text-gray-900">{listing.area} m²</p>
                </div>
                <div className="bg-gray-50 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                  <Layers size={24} className="text-[#1a513b] mb-2" />
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Qavat</p>
                  <p className="text-lg font-bold text-gray-900">{listing.floor}</p>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Ta'rif</h3>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                  {listing.description}
                </p>
              </div>
            </div>

            {/* Map Placeholder */}
            <div className="border-t border-gray-100 pt-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Xaritada joylashuv</h3>
              <div className="aspect-video bg-gray-100 rounded-3xl overflow-hidden relative">
                <img 
                  src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=80&w=1200" 
                  alt="Map" 
                  className="w-full h-full object-cover opacity-60 grayscale"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="w-12 h-12 bg-[#1a513b] rounded-full border-4 border-white flex items-center justify-center shadow-lg">
                      <div className="w-4 h-4 bg-white rounded-full"></div>
                   </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 bg-white p-8 rounded-3xl border border-gray-100 shadow-xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-100">
                  <img src={listing.owner.avatar} alt={listing.owner.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">{listing.owner.name}</h4>
                  <div className="flex items-center text-sm">
                    <span className="text-yellow-500 font-bold mr-1">★ {listing.owner.rating}</span>
                    <span className="text-gray-400">({listing.owner.reviews} ta sharh)</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center text-sm text-gray-600">
                  <ShieldCheck size={18} className="text-[#1a513b] mr-3" />
                  <span>Hujjatlar tasdiqlangan</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <MessageSquare size={18} className="text-[#1a513b] mr-3" />
                  <span>Oasis'da {listing.owner.joined}</span>
                </div>
              </div>

              <div className="space-y-4">
                <button className="w-full py-4 bg-[#1a513b] text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#14402e] transition-all">
                  <Phone size={20} />
                  Raqamni ko'rsatish
                </button>
                <button className="w-full py-4 bg-white text-[#1a513b] border border-[#1a513b] font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-all">
                  <MessageSquare size={20} />
                  Ega bilan bog'lanish
                </button>
              </div>

              <p className="mt-8 text-xs text-gray-400 text-center leading-relaxed">
                Uy ko'rishdan oldin oldindan to'lov qilmang. ToshkentOasis shartnoma tuzishni maslahat beradi.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingDetail;
