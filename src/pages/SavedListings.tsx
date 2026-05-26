import { Trash2, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import ListingCard from '../components/ListingCard';
import { useApp } from '../App';

const SavedListings = () => {
  const { state } = useApp();
  const savedItems = state.approved.filter(p => state.favorites.includes(p.id.toString()));

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Saralangan e'lonlar</h1>
            <p className="text-gray-500">Sizga yoqqan mulklar ro'yxati.</p>
          </div>
          <button className="flex items-center gap-2 text-red-500 font-bold hover:bg-red-50 px-4 py-2 rounded-xl transition-all">
            <Trash2 size={20} />
            Barchasini tozalash
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {savedItems.map((item) => (
            <ListingCard
              key={item.id}
              id={item.id.toString()}
              title={item.title}
              price={item.type === 'rent' ? `$${item.price}/oy` : `$${item.price.toLocaleString()}`}
              location={item.district}
              rooms={item.rooms}
              bathrooms={2}
              area={item.area}
              image={item.img}
              type={item.type === 'rent' ? 'Ijara' : 'Sotuvda'}
              isPremium={item.badge === 'top'}
            />
          ))}
        </div>

        {savedItems.length > 0 && (
          <div className="flex justify-center items-center gap-2">
            <button className="p-2 border border-gray-200 rounded-lg hover:bg-white">
              <ChevronLeft size={20} />
            </button>
            <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#1a513b] text-white font-bold">1</button>
            <button className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white font-bold">2</button>
            <button className="p-2 border border-gray-200 rounded-lg hover:bg-white">
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {savedItems.length === 0 && (
          <div className="py-32 text-center bg-white rounded-3xl border border-gray-100">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
              <Heart size={40} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Hali hech narsa yo'q</h3>
            <p className="text-gray-500 mb-8">O'zingizga yoqqan e'lonlarni saqlab qo'ying va keyinroq ularga qayting.</p>
            <Link to="/listings" className="inline-flex px-8 py-3 bg-[#1a513b] text-white font-bold rounded-xl hover:bg-[#14402e] transition-all">
              E'lonlarni ko'rish
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedListings;
