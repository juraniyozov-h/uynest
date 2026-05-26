import React from 'react';
import { Search, SlidersHorizontal, MapPin, Heart, ChevronRight, BedDouble, Maximize } from 'lucide-react';

const MapPage = () => {
  const pins = [
    { id: 1, x: '25%', y: '30%', price: '$65,000' },
    { id: 2, x: '55%', y: '45%', price: '$120,000', active: true },
    { id: 3, x: '15%', y: '65%', price: '$145,000' },
    { id: 4, x: '75%', y: '80%', price: '$210,000' },
  ];

  return (
    <div className="h-[calc(100vh-80px)] relative overflow-hidden bg-gray-100">
      {/* Map Background Simulation */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=2400" 
          alt="Map" 
          className="w-full h-full object-cover opacity-40 grayscale"
        />
        {/* Simple grid lines for map feel */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#1a513b 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      </div>

      {/* Floating Controls */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 w-full max-w-4xl px-4 flex flex-col md:flex-row gap-4">
        <div className="flex-1 bg-white p-2 rounded-2xl shadow-2xl border border-gray-100 flex items-center gap-4">
          <div className="flex-1 flex items-center px-4 gap-4">
            <Search className="text-[#1a513b]" size={20} />
            <input 
              type="text" 
              placeholder="Tuman, ko'cha yoki metro bekati..." 
              className="w-full py-2 bg-transparent outline-none text-sm font-medium"
            />
          </div>
          <div className="h-8 w-px bg-gray-100"></div>
          <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 rounded-xl transition-all">
            <span className="text-sm font-bold text-gray-700">Narx</span>
            <ChevronRight size={16} className="rotate-90 text-gray-400" />
          </button>
          <div className="h-8 w-px bg-gray-100"></div>
          <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 rounded-xl transition-all">
            <span className="text-sm font-bold text-gray-700">Xonalar</span>
            <ChevronRight size={16} className="rotate-90 text-gray-400" />
          </button>
          <div className="h-8 w-px bg-gray-100"></div>
          <button className="flex items-center gap-2 px-6 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all">
            <SlidersHorizontal size={18} className="text-[#1a513b]" />
            <span className="text-sm font-bold text-[#1a513b]">Filtr</span>
          </button>
        </div>
      </div>

      {/* Map Pins */}
      {pins.map((pin) => (
        <div 
          key={pin.id}
          className="absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
          style={{ left: pin.x, top: pin.y }}
        >
          <div className={`px-4 py-2 rounded-full font-bold text-sm shadow-lg border-2 transition-all transform group-hover:scale-110 ${
            pin.active 
              ? 'bg-[#8d6e63] text-white border-[#8d6e63] scale-110 ring-4 ring-[#8d6e63]/20' 
              : 'bg-[#1a513b] text-white border-white hover:bg-[#14402e]'
          }`}>
            {pin.price}
          </div>
          {pin.active && (
             <div className="absolute top-full mt-4 left-1/2 -translate-x-1/2 w-72 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
               <div className="relative h-40">
                  <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=400" className="w-full h-full object-cover" alt="Property" />
                  <button className="absolute top-3 right-3 p-2 bg-white rounded-full text-gray-400 hover:text-red-500 shadow-lg">
                    <Heart size={16} />
                  </button>
                  <div className="absolute top-3 left-3">
                    <span className="px-2 py-1 bg-[#1a513b]/80 backdrop-blur-md text-white text-[8px] font-bold uppercase rounded-md tracking-widest">Tasdiqlangan</span>
                  </div>
               </div>
               <div className="p-4">
                  <h4 className="text-xl font-bold text-gray-900 mb-1">{pin.price}</h4>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Savdo bor</p>
                  <p className="text-xs text-gray-600 mb-4 line-clamp-2">Yunusobod tumani, 4-mavze, 3 xonali shinam kvartira</p>
                  <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                     <div className="flex items-center gap-4">
                        <div className="flex items-center text-gray-400 text-[10px] font-bold">
                           <BedDouble size={14} className="mr-1" /> 3 xona
                        </div>
                        <div className="flex items-center text-gray-400 text-[10px] font-bold">
                           <Maximize size={14} className="mr-1" /> 95 m²
                        </div>
                     </div>
                     <ChevronRight size={16} className="text-[#1a513b]" />
                  </div>
               </div>
             </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default MapPage;
