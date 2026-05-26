import React from 'react';
import { HelpCircle, Book, MessageCircle, Mail } from 'lucide-react';

const Help = () => {
  return (
    <div className="bg-gray-50 min-h-screen py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Qanday yordam bera olamiz?</h1>
          <p className="text-gray-500">Savollaringizga javob toping yoki biz bilan bog'laning.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <Book className="text-[#1a513b] mb-6" size={32} />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Qo'llanma</h3>
            <p className="text-gray-500 text-sm mb-6">Platformadan foydalanish bo'yicha batafsil yo'riqnomalar.</p>
            <button className="text-[#1a513b] font-bold text-sm hover:underline">O'qish →</button>
          </div>
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <HelpCircle className="text-[#1a513b] mb-6" size={32} />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Ko'p so'raladigan savollar</h3>
            <p className="text-gray-500 text-sm mb-6">Eng ko'p uchraydigan savollarga tezkor javoblar.</p>
            <button className="text-[#1a513b] font-bold text-sm hover:underline">Ko'rish →</button>
          </div>
        </div>

        <div className="bg-[#1a513b] rounded-3xl p-12 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">Hali ham savollaringiz bormi?</h2>
          <p className="text-green-100 mb-10">Bizning qo'llab-quvvatlash jamoamiz sizga yordam berishga tayyor.</p>
          <div className="flex flex-col md:flex-row justify-center gap-6">
            <button className="flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#1a513b] font-bold rounded-xl hover:bg-green-50 transition-all">
              <MessageCircle size={20} />
              Telegram Chat
            </button>
            <button className="flex items-center justify-center gap-2 px-8 py-4 bg-[#14402e] text-white font-bold rounded-xl hover:bg-[#0d2a1f] transition-all">
              <Mail size={20} />
              Email yuborish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;
