import React from 'react';
import { User, Mail, Phone, Calendar, Star, Edit3, Plus, Trash2, Eye, Heart, MessageSquare, Settings, List, ChevronRight, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const Profile = () => {
  const userListings = [
    {
      id: '1',
      title: 'Yunusobod 4-mavze, 4 xonali hovli',
      price: '$125,000',
      views: 452,
      likes: 24,
      chats: 12,
      daysLeft: 25,
      status: 'Faol',
      image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=600'
    },
    {
      id: '2',
      title: 'Mirzo Ulug\'bek, 6 sotixli uchastka',
      price: '$340,000',
      views: 890,
      likes: 56,
      chats: 28,
      daysLeft: 12,
      status: 'Faol',
      image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=600'
    }
  ];

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Profile Sidebar */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-24 bg-[#1a513b]/5"></div>
              <div className="relative z-10 mb-6">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white mx-auto shadow-lg">
                  <img 
                    src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200" 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <button className="absolute bottom-0 right-1/2 translate-x-12 translate-y-2 bg-white p-2 rounded-full shadow-md text-gray-400 hover:text-[#1a513b]">
                  <Edit3 size={16} />
                </button>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">Azizbek Rustamov</h3>
              <div className="flex items-center justify-center gap-1 text-[#1a513b] mb-6">
                <Star size={14} fill="currentColor" />
                <span className="text-sm font-bold">Tasdiqlangan foydalanuvchi</span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-50">
                <div className="text-left">
                  <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Reyting</p>
                  <p className="text-sm font-bold text-gray-900">4.9 ★</p>
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">A'zo</p>
                  <p className="text-sm font-bold text-gray-900">Okt 2022</p>
                </div>
              </div>

              <button className="w-full mt-8 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all text-sm">
                Profilni tahrirlash
              </button>
            </div>

            <nav className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 overflow-hidden">
              <div className="space-y-1">
                <button className="w-full flex items-center justify-between px-4 py-3 bg-green-50 text-[#1a513b] rounded-xl font-bold transition-all">
                  <div className="flex items-center gap-3">
                    <List size={20} />
                    <span>Mening e'lonlarim</span>
                  </div>
                  <ChevronRight size={16} />
                </button>
                <Link to="/messages" className="w-full flex items-center justify-between px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-xl font-medium transition-all group">
                  <div className="flex items-center gap-3">
                    <MessageSquare size={20} />
                    <span>Xabarlar</span>
                  </div>
                  <span className="bg-[#1a513b] text-white text-[10px] px-2 py-0.5 rounded-full">3</span>
                </Link>
                <Link to="/saved" className="w-full flex items-center justify-between px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-xl font-medium transition-all group">
                  <div className="flex items-center gap-3">
                    <Heart size={20} />
                    <span>Saralanganlar</span>
                  </div>
                  <ChevronRight size={16} />
                </Link>
                <button className="w-full flex items-center justify-between px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-xl font-medium transition-all group">
                  <div className="flex items-center gap-3">
                    <Settings size={20} />
                    <span>Sozlamalar</span>
                  </div>
                  <ChevronRight size={16} />
                </button>
              </div>
            </nav>
          </div>

          {/* Profile Content */}
          <div className="lg:col-span-3 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Mening e'lonlarim</h1>
                <p className="text-gray-500">Barcha joylangan e'lonlaringizni boshqaring</p>
              </div>
              <Link to="/post-ad" className="flex items-center gap-2 px-6 py-3 bg-[#1a513b] text-white rounded-xl font-bold hover:bg-[#14402e] transition-all shadow-lg">
                <Plus size={20} />
                Yangi e'lon qo'shish
              </Link>
            </div>

            {/* Tabs */}
            <div className="flex gap-8 border-b border-gray-100 pb-px">
              {['Faol (3)', 'Kutilmoqda (1)', 'Muddati o\'tgan (0)'].map((tab, i) => (
                <button key={tab} className={`pb-4 text-sm font-bold relative transition-all ${i === 0 ? 'text-[#1a513b]' : 'text-gray-400 hover:text-gray-600'}`}>
                  {tab}
                  {i === 0 && <div className="absolute bottom-0 left-0 w-full h-1 bg-[#1a513b] rounded-t-full"></div>}
                </button>
              ))}
            </div>

            {/* User Listings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {userListings.map((listing) => (
                <div key={listing.id} className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm group hover:shadow-md transition-all">
                  <div className="relative h-48">
                    <img src={listing.image} alt={listing.title} className="w-full h-full object-cover" />
                    <div className="absolute top-4 left-4 flex gap-2">
                       <span className="px-3 py-1 bg-green-500 text-white text-[10px] font-bold uppercase rounded-full tracking-widest flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                          {listing.status}
                       </span>
                    </div>
                    <div className="absolute top-4 right-4">
                       <span className="px-3 py-1 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold rounded-full">{listing.daysLeft} Kun qoldi</span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                       <h4 className="text-lg font-bold text-gray-900 group-hover:text-[#1a513b] transition-all line-clamp-1">{listing.title}</h4>
                       <p className="text-xl font-bold text-[#1a513b]">{listing.price}</p>
                    </div>
                    <div className="flex items-center text-gray-400 text-xs mb-6">
                       <MapPin size={12} className="mr-1" />
                       Toshkent, Yunusobod tumani
                    </div>

                    <div className="flex items-center gap-6 mb-8 py-4 border-y border-gray-50">
                       <div className="flex items-center gap-1.5 text-gray-500">
                          <Eye size={16} className="text-gray-300" />
                          <span className="text-sm font-bold">{listing.views}</span>
                       </div>
                       <div className="flex items-center gap-1.5 text-gray-500">
                          <Heart size={16} className="text-gray-300" />
                          <span className="text-sm font-bold">{listing.likes}</span>
                       </div>
                       <div className="flex items-center gap-1.5 text-gray-500">
                          <MessageSquare size={16} className="text-gray-300" />
                          <span className="text-sm font-bold">{listing.chats}</span>
                       </div>
                    </div>

                    <div className="flex gap-4">
                       <button className="flex-1 py-3 bg-gray-50 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-100 transition-all">
                          Tahrirlash
                       </button>
                       <button className="flex-1 py-3 bg-[#1a513b]/5 text-[#1a513b] font-bold rounded-xl text-xs hover:bg-[#1a513b]/10 transition-all">
                          Ko'tarish
                       </button>
                       <button className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all">
                          <Trash2 size={18} />
                       </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
