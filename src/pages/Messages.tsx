import React from 'react';
import { Search, Send, Paperclip, MoreVertical, Phone, Smile } from 'lucide-react';

const Messages = () => {
  const contacts = [
    {
      id: 1,
      name: 'Aziza Karimova',
      lastMessage: 'Assalomu alaykum, kvartira hali sot...',
      time: '10:42',
      unread: 0,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100',
      status: 'online'
    },
    {
      id: 2,
      name: 'Javohir Rustamov',
      lastMessage: 'Rasm jo\'nata olasizmi?',
      time: 'Kecha',
      unread: 2,
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100',
      status: 'offline'
    },
    {
      id: 3,
      name: 'Dilshod Agency',
      lastMessage: 'Kelishdik, ertaga ko\'rishamiz.',
      time: 'Dushanba',
      unread: 0,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100',
      status: 'offline'
    }
  ];

  return (
    <div className="h-[calc(100vh-80px)] bg-white flex">
      {/* Sidebar */}
      <div className="w-full md:w-80 border-r border-gray-100 flex flex-col">
        <div className="p-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Qidirish..." 
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-transparent focus:bg-white focus:border-gray-200 rounded-xl outline-none text-sm transition-all"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {contacts.map((contact) => (
            <div 
              key={contact.id} 
              className={`p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-all ${contact.id === 1 ? 'bg-gray-50 border-r-4 border-[#1a513b]' : ''}`}
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-100">
                  <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" />
                </div>
                {contact.status === 'online' && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-bold text-gray-900 truncate">{contact.name}</h4>
                  <span className="text-[10px] text-gray-400 font-medium">{contact.time}</span>
                </div>
                <p className="text-xs text-gray-500 truncate">{contact.lastMessage}</p>
              </div>
              {contact.unread > 0 && (
                <div className="w-5 h-5 bg-[#1a513b] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {contact.unread}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="hidden md:flex flex-1 flex-col bg-gray-50/50">
        {/* Chat Header */}
        <div className="h-20 px-8 bg-white border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full overflow-hidden">
              <img src={contacts[0].avatar} alt={contacts[0].name} className="w-full h-full object-cover" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900">{contacts[0].name}</h4>
              <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider">Tarmoqda</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2.5 text-gray-400 hover:text-[#1a513b] hover:bg-gray-50 rounded-xl transition-all">
              <Phone size={20} />
            </button>
            <button className="p-2.5 text-gray-400 hover:text-[#1a513b] hover:bg-gray-50 rounded-xl transition-all">
              <MoreVertical size={20} />
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="flex justify-center">
             <span className="px-3 py-1 bg-white border border-gray-100 rounded-full text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bugun</span>
          </div>

          <div className="flex flex-col items-start max-w-[70%]">
            <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm">
              <p className="text-sm text-gray-700 leading-relaxed">
                Assalomu alaykum, Yakkasaroydagi 3 xonali kvartira bo'yicha yozayotgan edim.
              </p>
            </div>
            <span className="mt-2 text-[10px] text-gray-400 ml-1">10:40</span>
          </div>

          <div className="flex flex-col items-start max-w-[70%]">
            <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm">
              <p className="text-sm text-gray-700">Hali sotilmadimi?</p>
            </div>
            <span className="mt-2 text-[10px] text-gray-400 ml-1">10:42</span>
          </div>

          <div className="flex flex-col items-end ml-auto max-w-[70%]">
            <div className="bg-[#1a513b] p-4 rounded-2xl rounded-tr-none shadow-lg">
              <p className="text-sm text-white leading-relaxed">
                Vaalaykum assalom. Yo'q, hali sotilmadi. Bugun kechki payt ko'rsatishim mumkin.
              </p>
            </div>
            <div className="mt-2 flex items-center gap-1 mr-1">
              <span className="text-[10px] text-gray-400">10:45</span>
              <div className="flex">
                <span className="w-2 h-2 text-green-500 font-bold">✓✓</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start max-w-[70%]">
            <div className="bg-white p-2 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm overflow-hidden">
              <div className="aspect-video w-64 bg-gray-100 relative">
                 <img src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=80&w=300" className="w-full h-full object-cover" alt="Map Location" />
                 <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                       <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                 </div>
              </div>
              <div className="p-3">
                 <p className="text-xs font-bold text-gray-900">Shu joydami?</p>
              </div>
            </div>
            <span className="mt-2 text-[10px] text-gray-400 ml-1">10:50</span>
          </div>
        </div>

        {/* Chat Input */}
        <div className="p-8 bg-white border-t border-gray-100">
          <div className="flex items-center gap-4">
            <button className="p-3 text-gray-400 hover:text-[#1a513b] hover:bg-gray-50 rounded-xl transition-all">
              <Paperclip size={20} />
            </button>
            <div className="flex-1 relative">
              <input 
                type="text" 
                placeholder="Xabar yozing..." 
                className="w-full px-6 py-4 bg-gray-50 border border-transparent focus:bg-white focus:border-gray-200 rounded-2xl outline-none text-sm transition-all"
              />
              <button className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-yellow-500 transition-all">
                <Smile size={20} />
              </button>
            </div>
            <button className="p-4 bg-[#1a513b] text-white rounded-2xl shadow-lg hover:bg-[#14402e] transition-all transform hover:scale-105 active:scale-95">
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
