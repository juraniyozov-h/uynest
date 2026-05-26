import React from 'react';
import { Heart, MapPin, BedDouble, Bath, Maximize } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../App';

interface ListingCardProps {
  id: string;
  title: string;
  price: string;
  location: string;
  rooms: number;
  bathrooms: number;
  area: number;
  image: string;
  type: 'Ijara' | 'Sotuvda';
  isPremium?: boolean;
}

const ListingCard: React.FC<ListingCardProps> = ({
  id,
  title,
  price,
  location,
  rooms,
  bathrooms,
  area,
  image,
  type,
  isPremium
}) => {
  const { state, dispatch } = useApp();
  const isFavorite = state.favorites.includes(id.toString());
  return (
    <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
      <Link to={`/listing/${id}`} className="block relative aspect-[4/3] overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute top-4 left-4 flex gap-2">
          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            type === 'Ijara' ? 'bg-[#1a513b] text-white' : 'bg-[#eab308] text-white'
          }`}>
            {type}
          </span>
          {isPremium && (
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/50 text-white backdrop-blur-md">
              Premium
            </span>
          )}
        </div>
        <button onClick={(e) => { e.preventDefault(); dispatch({ type: 'TOGGLE_FAVORITE', payload: id.toString() }); }} className={`absolute top-4 right-4 p-2 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white transition-all ${isFavorite ? 'text-red-500' : 'hover:text-red-500'}`}>
          <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      </Link>

      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#1a513b] transition-colors truncate flex-1">
            {title}
          </h3>
          <p className="text-lg font-bold text-[#1a513b] ml-2">
            {price}
          </p>
        </div>

        <div className="flex items-center text-gray-500 text-sm mb-4">
          <MapPin size={14} className="mr-1 flex-shrink-0" />
          <span className="truncate">{location}</span>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-50">
          <div className="flex items-center text-gray-600">
            <BedDouble size={16} className="mr-1.5 text-gray-400" />
            <span className="text-xs font-medium">{rooms} xona</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Bath size={16} className="mr-1.5 text-gray-400" />
            <span className="text-xs font-medium">{bathrooms}</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Maximize size={16} className="mr-1.5 text-gray-400" />
            <span className="text-xs font-medium">{area} m²</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingCard;
