import { useState } from 'react';
import { Camera, MapPin, ChevronRight, ChevronLeft, Check, Plus, Minus } from 'lucide-react';

const PostAd = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    tuman: '',
    rooms: 3,
    area: '',
  });

  const nextStep = () => setStep(prev => Math.min(prev + 1, 5));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const steps = [
    { number: 1, label: 'Ma\'lumotlar' },
    { number: 2, label: 'Tafsilotlar' },
    { number: 3, label: 'Joylashuv' },
    { number: 4, label: 'Rasmlar' },
    { number: 5, label: 'Tasdiqlash' },
  ];

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Yangi e'lon qo'shish</h1>
          <p className="text-gray-500">O'z mulkingizni Toshkentning eng ishonchli platformasida soting yoki ijaraga bering.</p>
        </div>

        {/* Progress Bar */}
        <div className="flex justify-between items-center mb-12 relative">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -translate-y-1/2 z-0"></div>
          <div className="absolute top-1/2 left-0 h-1 bg-[#1a513b] -translate-y-1/2 z-0 transition-all duration-300" style={{ width: `${((step - 1) / 4) * 100}%` }}></div>
          
          {steps.map((s) => (
            <div key={s.number} className="relative z-10 flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                step >= s.number ? 'bg-[#1a513b] text-white shadow-lg' : 'bg-white text-gray-400 border border-gray-200'
              }`}>
                {step > s.number ? <Check size={18} /> : s.number}
              </div>
              <p className={`mt-2 text-xs font-bold transition-all duration-300 ${step >= s.number ? 'text-[#1a513b]' : 'text-gray-400'}`}>
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-gray-100">
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-8 border-b border-gray-50 pb-4">1. Asosiy ma'lumotlar</h2>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Sarlavha</label>
                <input 
                  type="text" 
                  placeholder="Masalan: Yunusobobda 3 xonali kvartira sotiladi"
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent focus:bg-white focus:border-[#1a513b] rounded-xl outline-none transition-all"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
                <p className="text-xs text-gray-400">E'loningizni ajratib turadigan qisqa va aniq sarlavha kiriting.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Tavsif</label>
                <textarea 
                  rows={6}
                  placeholder="Mulkingiz haqida batafsil ma'lumot bering..."
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent focus:bg-white focus:border-[#1a513b] rounded-xl outline-none transition-all resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                ></textarea>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Narx (USD)</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                    <input 
                      type="number" 
                      placeholder="50000"
                      className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-transparent focus:bg-white focus:border-[#1a513b] rounded-xl outline-none transition-all"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Tuman</label>
                  <select 
                    className="w-full px-6 py-4 bg-gray-50 border border-transparent focus:bg-white focus:border-[#1a513b] rounded-xl outline-none transition-all appearance-none"
                    value={formData.tuman}
                    onChange={(e) => setFormData({...formData, tuman: e.target.value})}
                  >
                    <option value="">Tumanni tanlang</option>
                    <option value="yunusobod">Yunusobod tumani</option>
                    <option value="mirobod">Mirobod tumani</option>
                    <option value="yakkasaroy">Yakkasaroy tumani</option>
                    <option value="chilonzor">Chilonzor tumani</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Xonalar soni</label>
                  <div className="flex items-center gap-4">
                    <button 
                      className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-all border border-gray-100"
                      onClick={() => setFormData({...formData, rooms: Math.max(1, formData.rooms - 1)})}
                    >
                      <Minus size={20} className="text-gray-600" />
                    </button>
                    <div className="flex-1 bg-gray-50 h-12 flex items-center justify-center font-bold text-lg rounded-xl border border-gray-100">
                      {formData.rooms}
                    </div>
                    <button 
                      className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-all border border-gray-100"
                      onClick={() => setFormData({...formData, rooms: formData.rooms + 1})}
                    >
                      <Plus size={20} className="text-gray-600" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Umumiy maydon (m²)</label>
                  <input 
                    type="number" 
                    placeholder="75"
                    className="w-full px-6 py-4 bg-gray-50 border border-transparent focus:bg-white focus:border-[#1a513b] rounded-xl outline-none transition-all"
                    value={formData.area}
                    onChange={(e) => setFormData({...formData, area: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-8 border-b border-gray-50 pb-4">4. Rasmlar</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <button className="aspect-square border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center hover:border-[#1a513b] hover:bg-green-50 transition-all group">
                  <Camera size={32} className="text-gray-400 group-hover:text-[#1a513b] mb-2" />
                  <span className="text-sm font-bold text-gray-400 group-hover:text-[#1a513b]">Rasm qo'shish</span>
                </button>
                {/* Image Placeholders */}
                {[1, 2, 3].map((i) => (
                  <div key={i} className="aspect-square bg-gray-50 rounded-3xl overflow-hidden relative group">
                    <img 
                      src={`https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=300&h=300`} 
                      className="w-full h-full object-cover" 
                      alt="Placeholder"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button className="bg-red-500 text-white p-2 rounded-full">
                        <Plus size={20} className="rotate-45" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-400 italic">Kamida 5 ta sifatli rasm yuklashni maslahat beramiz.</p>
            </div>
          )}

          {/* Fallback for other steps */}
          {(step === 2 || step === 3 || step === 5) && (
             <div className="py-20 text-center animate-in fade-in slide-in-from-bottom-4">
               <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                 {step === 3 ? <MapPin size={40} className="text-[#1a513b]" /> : <Check size={40} className="text-[#1a513b]" />}
               </div>
               <h3 className="text-xl font-bold text-gray-900 mb-2">{steps[step-1].label} bosqichi</h3>
               <p className="text-gray-500">Bu qism tez orada tayyor bo'ladi.</p>
             </div>
          )}

          <div className="flex justify-between items-center mt-12 pt-8 border-t border-gray-50">
            <button 
              onClick={prevStep}
              disabled={step === 1}
              className={`px-8 py-4 border border-gray-200 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-50 transition-all ${step === 1 ? 'opacity-0' : 'opacity-100'}`}
            >
              <ChevronLeft size={20} />
              Bekor qilish
            </button>
            <button 
              onClick={nextStep}
              className="px-10 py-4 bg-[#1a513b] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-[#14402e] transition-all shadow-lg"
            >
              {step === 5 ? 'E\'lonni joylash' : 'Davom etish'}
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostAd;
