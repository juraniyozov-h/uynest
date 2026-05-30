import React, { createContext, useContext, useReducer, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import {
  AppState, buildInitialState, saveToLS, AuthAPI, ChatAPI, ListingAPI,
  ReviewsAPI, FavoritesAPI, RequestsAPI, ViewingRequestAPI, ReportsAPI,
  SavedSearchAPI, ListingViewAPI, ListingExtAPI, CompareAPI,
  ADMIN_EMAIL, SEED, DISTRICTS, AMENITIES, PROPERTY_CATEGORIES, TIME_SLOTS,
  REGIONS_MAP, AMENITIES_FULL, FLOOR_CATEGORIES,
  Listing, AppRequest, User, ChatMessage, Review, ViewingRequest, Report, SavedSearch
} from './store/appStore';
import { updateDoc, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { uploadImages, uploadComplaintImage } from './store/imageUpload';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Fix leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({iconRetinaUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',iconUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'});

const greenIcon = new L.Icon({iconUrl:'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',iconSize:[25,41],iconAnchor:[12,41],popupAnchor:[1,-34],shadowSize:[41,41]});

type Action={type:string;payload?:any};
const AppCtx=createContext<{state:AppState;dispatch:React.Dispatch<Action>}|null>(null);
function reducer(s:AppState,a:Action):AppState{
  switch(a.type){
    case'NAV':return{...s,page:a.payload};
    case'DETAIL':return{...s,page:'detail',currentDetail:a.payload};
    case'AUTH_TAB':return{...s,authTab:a.payload};
    case'ADMIN_TAB':return{...s,adminTab:a.payload};
    case'LOGIN':return{...s,auth:true,currentUser:a.payload.user,token:a.payload.token};
    case'LOGOUT':return{...s,auth:false,currentUser:null,token:null,favorites:[]};
    case'CONTACT':return{...s,contactModal:a.payload};
    case'AUTH_REQ':return{...s,authRequiredModal:a.payload.open,authReqAction:a.payload.action||''};
    case'GOOGLE_MODAL':return{...s,googleDemoModal:a.payload};
    case'AUTH_NEXT':return{...s,authNext:a.payload};
    case'ADD_PENDING':return{...s,pending:[a.payload,...s.pending]};
    case'ADD_REQUEST':return{...s,requests:[a.payload,...s.requests]};
    case'APPROVE':return{...s,approved:[a.payload,...s.approved],pending:s.pending.filter(p=>p.id!==a.payload.id)};
    case'REJECT':return{...s,pending:s.pending.filter(p=>p.id!==a.payload)};
    case'DEL_LISTING':return{...s,approved:s.approved.filter(p=>p.id!==a.payload)};
    case'DEL_REQUEST':return{...s,requests:s.requests.filter(r=>r.id!==a.payload)};
    case'RESET':return{...s,approved:[...SEED],pending:[],requests:[]};
    case'CLEAR':return{...s,approved:[],pending:[],requests:[]};
    case'RENT_FILTER':return{...s,filters:{...s.filters,rent:{...s.filters.rent,...a.payload}}};
    case'SALE_FILTER':return{...s,filters:{...s.filters,sale:{...s.filters.sale,...a.payload}}};
    case'CHAT_TARGET':return{...s,chatTarget:a.payload};
    case'CHAT_SYNC':return{...s,chatSyncTick:a.payload};
    case'SET_APPROVED':return{...s,approved:a.payload,loading:false};
    case'SET_PENDING':return{...s,pending:a.payload};
    case'SET_REQUESTS':return{...s,requests:a.payload};
    case'SET_FAVORITES':return{...s,favorites:a.payload};
    case'SET_REVIEWS':return{...s,reviews:a.payload};
    case'SET_LOADING':return{...s,loading:a.payload};
    case'TOGGLE_FAVORITE':return{...s,favorites:s.favorites.includes(a.payload)?s.favorites.filter(x=>x!==a.payload):[...s.favorites,a.payload]};
    case'UPDATE_USER':return{...s,currentUser:s.currentUser?{...s.currentUser,...a.payload}:s.currentUser};
    default:return s;
  }
}
export const useApp=()=>useContext(AppCtx)!;

// Toast
function toast(msg:string,type:'success'|'error'|'warn'='success'){
  const w=document.getElementById('tw');if(!w)return;
  const d=document.createElement('div');
  d.className=`tst tst-${type}`;
  d.innerHTML=`<i class="ri-${type==='success'?'checkbox-circle':type==='error'?'error-warning':'alert'}-fill"></i><span>${msg}</span>`;
  w.appendChild(d);setTimeout(()=>{d.style.opacity='0';d.style.transform='translateX(120%)';setTimeout(()=>d.remove(),400);},3500);
}

const isAdmin=(u:User|null)=>!!(u&&u.role==='admin');
const initials=(s:string)=>(s||'?').split(/[\s@]/).filter(Boolean).slice(0,2).map(x=>x[0].toUpperCase()).join('');

// ─── TELEGRAM NOTIFICATION UTILITY ──────────────────────────
const ADMIN_TG_ID = '7258242669';

async function sendTg(chatId:string|number, html:string){
  if(!chatId){console.warn('TG: chatId empty');return;}
  try{
    await fetch('/api/tg',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({chat_id:chatId,text:html})
    });
  }catch(e){console.warn('TG send failed:',e);}
}
const notifyAdmin=(html:string)=>sendTg(ADMIN_TG_ID,html);
// Notify a user if they have linked their Telegram
async function notifyUser(userId:string, html:string){
  try{
    const{getDoc,doc:d}=await import('firebase/firestore');
    const snap=await getDoc(d(db,'users',userId));
    const chatId=(snap.data() as any)?.telegramChatId;
    if(chatId) await sendTg(chatId,html);
  }catch{}
}
const fmtTime=(iso:string)=>{const d=new Date(iso);return d.toLocaleTimeString('uz',{hour:'2-digit',minute:'2-digit'});};
const fmtDate=(iso:string)=>new Date(iso).toLocaleDateString('uz-Latn');

// ─── Render message helper ──────────────────────────────────
function renderMessage(m:ChatMessage){
  const lines = m.text.split('\n');
  return <>{lines.map((line,i) => {
    // Regex for URLs ending in image extensions or containing them (Firebase Storage)
    const imgUrlMatch = line.match(/(https?:\/\/[^\s]+(\.jpg|\.jpeg|\.png|\.gif|\.webp)[^\s]*)/i);
    // Regex for Data URIs
    const dataUriMatch = line.match(/(data:image\/[a-zA-Z]*;base64,[^\s]+)/i);

    if(imgUrlMatch || dataUriMatch){
      const src = imgUrlMatch ? imgUrlMatch[0] : dataUriMatch![0];
      const before = line.substring(0, line.indexOf(src));
      const after = line.substring(line.indexOf(src) + src.length);
      return (
        <div key={i} className="mb-1">
          {before && <span>{before}</span>}
          <img src={src} alt="" className="max-w-full rounded-xl mt-1.5 shadow-sm border border-black/5 max-h-64 object-contain bg-black/5" />
          {after && <span>{after}</span>}
        </div>
      );
    }
    return <div key={i} className="min-h-[1.25rem]">{line}</div>;
  })}</>;
}

// ─── Image Upload Helper (kept for potential future use) ────

// ─── Property Card ──────────────────────────────────────────
function Card({p,compareIds,onCompareChange}:{p:Listing;compareIds?:number[];onCompareChange?:(ids:number[])=>void}){
  const{state,dispatch}=useApp();
  const isFavorite = state.favorites.includes(p.id.toString());
  const inCompare = compareIds?.includes(p.id);
  const isOwn = !!(state.currentUser && p.ownerId && state.currentUser.id === p.ownerId);
  const pr=p.type==='rent'?`$${p.price}/oy`:`$${(p.price||0).toLocaleString()}`;
  const isExpired=p.premiumUntil&&new Date(p.premiumUntil)<new Date();
  const showPremium=p.isPremium&&!isExpired;
  return(
    <div className={`bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 cursor-pointer flex flex-col group ${showPremium&&p.premiumType==='featured'?'ring-2 ring-amber-400':''}`} onClick={()=>{ListingExtAPI.addLastViewed(p.id);dispatch({type:'DETAIL',payload:p.id});}}>
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-emerald-100 to-emerald-50">
        {p.img?<img src={p.img} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={e=>{(e.target as HTMLImageElement).style.display='none';}}/>:<div className="w-full h-full flex items-center justify-center"><i className="ri-home-4-line text-5xl text-emerald-300"/></div>}
        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
          <span className={`${p.type==='rent'?'bg-blue-500':'bg-emerald-600'} text-white text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wide`}>{p.type==='rent'?'IJARA':'SOTUV'}</span>
          {p.badge==='new'&&<span className="bg-amber-400 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">YANGI</span>}
          {p.badge==='top'&&<span className="bg-white/90 backdrop-blur text-[10px] font-bold px-2.5 py-1 rounded-full text-amber-600 flex items-center gap-1"><i className="ri-star-fill"/>TOP</span>}
          {showPremium&&p.premiumType==='top'&&<span className="bg-amber-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"><i className="ri-trophy-fill"/>TOP</span>}
          {showPremium&&p.premiumType==='urgent'&&<span className="bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"><i className="ri-fire-fill"/>SHOSHILINCH</span>}
          {p.verified&&<span className="bg-emerald-500/90 backdrop-blur text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"><i className="ri-verified-badge-fill"/>Tasdiqlangan</span>}
        </div>
        <div className="absolute top-3 right-3 flex flex-col gap-1.5">
          {!isOwn&&<button className={`w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center transition-all active:scale-90 ${isFavorite?'text-red-500':'text-gray-400 hover:text-red-500'}`} onClick={e=>{e.stopPropagation();if(!state.auth){dispatch({type:'AUTH_REQ',payload:{open:true,action:'Sevimlilar'}});return;}dispatch({type:'TOGGLE_FAVORITE',payload:p.id.toString()});if(state.currentUser)FavoritesAPI.toggle(state.currentUser.id,p.id.toString());if(!isFavorite)toast('Sevimlilarga qo\'shildi');}}>
            <i className={isFavorite?'ri-heart-fill':'ri-heart-line'}/>
          </button>}
          {onCompareChange&&<button className={`w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center transition-all active:scale-90 ${inCompare?'text-emerald-600':'text-gray-400 hover:text-emerald-600'}`} title="Solishtirish" onClick={e=>{e.stopPropagation();onCompareChange(inCompare?CompareAPI.remove(p.id):CompareAPI.add(p.id));}}><i className="ri-scales-2-line"/></button>}
        </div>
        {p.viewsCount&&p.viewsCount>0?<div className="absolute bottom-3 right-3 bg-black/40 backdrop-blur text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1"><i className="ri-eye-line"/>{p.viewsCount}</div>:null}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-[15px] text-gray-900 mb-1 leading-snug line-clamp-2">{p.title}</h3>
        <p className="text-gray-500 text-[13px] flex items-center gap-1.5 mb-2"><i className="ri-map-pin-2-fill text-emerald-600"/>{p.address||p.district}</p>
        {p.verified&&<div className="flex items-center gap-1 text-emerald-600 text-[11px] font-bold mb-2"><i className="ri-shield-check-fill text-emerald-500"/>Tasdiqlangan e'lon</div>}
        <div className="flex gap-3 text-gray-400 text-xs mb-3">
          <span className="flex items-center gap-1"><i className="ri-hotel-bed-line"/>{p.rooms} xona</span>
          <span className="flex items-center gap-1"><i className="ri-ruler-2-line"/>{p.area} m²</span>
          {p.floor&&<span className="flex items-center gap-1"><i className="ri-building-2-line"/>{p.floor}/{p.floors}</span>}
        </div>
        <div className="flex justify-between items-end mt-auto pt-3 border-t border-gray-100">
          <span className="text-xl font-extrabold text-emerald-700">{pr}</span>
          <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1 group-hover:bg-emerald-100 transition">Batafsil <i className="ri-arrow-right-s-line"/></span>
        </div>
      </div>
    </div>
  );
}

// ─── Navbar ─────────────────────────────────────────────────
function Navbar(){
  const{state,dispatch}=useApp();
  const[,setMob]=useState(false);
  const[um,setUm]=useState(false);
  const u=state.currentUser;
  const unread=u?ChatAPI.unreadCount(u.id):0;

  const nav=(p:string)=>{setMob(false);setUm(false);
    if(p==='admin'){if(!state.auth){dispatch({type:'AUTH_NEXT',payload:'admin'});dispatch({type:'NAV',payload:'auth'});return;}if(!isAdmin(u)){toast('Faqat admin kirishi mumkin','error');return;}}
    if((p==='submit'||p==='request')&&!state.auth){dispatch({type:'AUTH_NEXT',payload:p});dispatch({type:'AUTH_REQ',payload:{open:true,action:p==='submit'?'E\'lon qo\'shish':'Uy topib berish'}});return;}
    dispatch({type:'NAV',payload:p});window.scrollTo({top:0,behavior:'smooth'});
  };

  const logout=async()=>{if(state.token)AuthAPI.revoke(state.token);await AuthAPI.signOut();CompareAPI.clear();dispatch({type:'LOGOUT'});toast('Chiqildi');nav('home');};

  const links=[{id:'home',label:'Bosh sahifa',icon:'ri-home-4-line'},{id:'rent',label:'Ijara',icon:'ri-key-2-line'},{id:'sale',label:'Sotuv',icon:'ri-shopping-bag-3-line'},{id:'saved',label:'Sevimlilar',icon:'ri-heart-line'},{id:'map',label:'Xarita',icon:'ri-map-2-line'},{id:'chat',label:'Xabarlar',icon:'ri-chat-3-line'},{id:'submit',label:'E\'lon berish',icon:'ri-add-circle-line'}];

  return(
    <nav className="sticky top-0 z-50 bg-white/92 backdrop-blur-xl border-b border-emerald-100/60" style={{backdropFilter:'saturate(180%) blur(16px)'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[60px] md:h-[68px] gap-4">
          <button onClick={()=>nav('home')} className="flex items-center gap-2 font-extrabold text-lg text-emerald-800 tracking-tight shrink-0 active:scale-95 transition-transform">
            <img src="/logo.svg" alt="UyNest" className="h-8 md:h-9 w-auto"/>UY<span className="text-emerald-500">NEST</span>
          </button>
          <div className="hidden md:flex gap-0.5 bg-gray-50/80 rounded-2xl p-1">
            {links.map(l=>(
              <button key={l.id} onClick={()=>nav(l.id)} title={l.label} className={`relative px-3 lg:px-4 py-2 rounded-xl text-[13px] font-medium transition-all active:scale-95 flex items-center gap-1.5 ${state.page===l.id?'bg-white text-emerald-800 shadow-sm font-semibold':'text-gray-500 hover:text-emerald-700 hover:bg-white/50'}`}>
                <i className={`${l.icon} text-base`}/><span className="hidden lg:inline">{l.label}</span>
                {l.id==='chat'&&unread>0&&<span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">{unread}</span>}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 md:gap-3 relative">
            {/* E'lon qo'shish — always visible on mobile in the header */}
            <button onClick={()=>nav('submit')} className="md:hidden flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-full shadow active:scale-95 transition shrink-0"><i className="ri-add-line text-sm"/>E'lon</button>
            {state.auth&&u?(
              <div className="relative hidden md:block">
                <button onClick={()=>setUm(!um)} className="flex items-center gap-2 pl-1.5 pr-2 md:pr-3 py-1 bg-white border border-gray-200 rounded-full hover:border-emerald-300 transition shadow-sm active:scale-95">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-400 text-white flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
                    {u.avatar?<img src={u.avatar} alt="" className="w-full h-full object-cover"/>:initials(u.name||u.email||'')}
                  </div>
                  <span className="text-sm font-semibold text-gray-700 hidden sm:block max-w-[80px] truncate">{isAdmin(u)?'Admin':(u.name||u.email||'').split(' ')[0]}</span>
                  {isAdmin(u)&&<span className="bg-gradient-to-r from-emerald-700 to-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded hidden sm:block">ADMIN</span>}
                  <i className={`ri-arrow-down-s-line text-gray-400 text-lg transition-transform ${um?'rotate-180':''}`}/>
                </button>
                {um&&<>
                  <div className="fixed inset-0 z-40" onClick={()=>setUm(false)}/>
                  <div className="absolute right-0 top-full mt-2 w-60 bg-white border border-gray-100 rounded-2xl shadow-2xl p-2 z-50 animate-[slideDown_0.2s_ease]">
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl mb-1">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-400 text-white flex items-center justify-center font-bold text-sm overflow-hidden shrink-0">
                        {u.avatar?<img src={u.avatar} alt="" className="w-full h-full object-cover"/>:initials(u.name||u.email||'')}
                      </div>
                      <div className="min-w-0"><div className="font-bold text-sm truncate">{isAdmin(u)?'Admin':(u.name||u.email)}</div><div className="text-[11px] text-gray-400 truncate">{u.email}</div></div>
                    </div>
                    {isAdmin(u)&&<button onClick={()=>nav('admin')} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-800 rounded-xl transition"><i className="ri-dashboard-3-line"/>Admin Panel</button>}
                    <button onClick={()=>nav('profile')} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-800 rounded-xl transition"><i className="ri-user-line"/>Profil</button>
                    <button onClick={()=>nav('submit')} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-800 rounded-xl transition"><i className="ri-add-circle-line"/>E'lon qo'shish</button>
                    <button onClick={()=>nav('chat')} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-800 rounded-xl transition"><i className="ri-chat-3-line"/>Xabarlar{unread>0&&<span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{unread}</span>}</button>
                    <button onClick={()=>nav('statistics')} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-800 rounded-xl transition"><i className="ri-bar-chart-line"/>Statistika</button>
                    <button onClick={()=>nav('compare')} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-800 rounded-xl transition"><i className="ri-scales-2-line"/>Solishtirish</button>
                    <div className="border-t border-gray-100 my-1"/>
                    <button onClick={logout} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 rounded-xl transition"><i className="ri-logout-circle-r-line"/>Chiqish</button>
                  </div>
                </>}
              </div>
            ):(
              <button onClick={()=>{dispatch({type:'AUTH_TAB',payload:'login'});nav('auth');}} className="flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 bg-gradient-to-r from-emerald-700 to-emerald-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:-translate-y-0.5 transition"><i className="ri-login-circle-line"/><span className="hidden sm:inline">Kirish</span></button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

// ─── Bottom Nav (mobile only) ────────────────────────────────
function BottomNav(){
  const{state,dispatch}=useApp();
  const u=state.currentUser;
  const unread=u?ChatAPI.unreadCount(u.id):0;
  const nav=(p:string)=>{
    if((p==='submit')&&!state.auth){dispatch({type:'AUTH_NEXT',payload:p});dispatch({type:'AUTH_REQ',payload:{open:true,action:'E\'lon qo\'shish'}});return;}
    dispatch({type:'NAV',payload:p});window.scrollTo({top:0});
  };
  const tabs=[
    {id:'home',icon:'ri-home-4-line',iconActive:'ri-home-4-fill',label:'Bosh'},
    {id:'rent',icon:'ri-key-2-line',iconActive:'ri-key-2-fill',label:'Ijara'},
    {id:'sale',icon:'ri-shopping-bag-3-line',iconActive:'ri-shopping-bag-3-fill',label:'Sotuv'},
    {id:'map',icon:'ri-map-2-line',iconActive:'ri-map-2-fill',label:'Xarita'},
    {id:'chat',icon:'ri-chat-3-line',iconActive:'ri-chat-3-fill',label:'Chat'},
  ];
  const activePage=state.page;
  return(
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur-xl border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,.07)]" style={{paddingBottom:'env(safe-area-inset-bottom,0px)'}}>
      <div className="flex items-stretch h-14">
        {tabs.map(t=>{
          const active=activePage===t.id;
          return(
            <button key={t.id} onClick={()=>nav(t.id)} className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-all active:scale-90 ${active?'text-emerald-600':'text-gray-400'}`}>
              {active&&<span className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-b-full"/>}
              <i className={`text-[22px] leading-none ${active?t.iconActive:t.icon}`}/>
              <span className={`text-[9px] font-semibold ${active?'text-emerald-600':'text-gray-400'}`}>{t.label}</span>
              {t.id==='chat'&&unread>0&&<span className="absolute top-1.5 right-[calc(50%-14px)] w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white">{unread}</span>}
            </button>
          );
        })}
        {/* Profile / Login tab */}
        <button onClick={()=>u?nav('profile'):nav('auth')} className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-all active:scale-90 ${activePage==='profile'||activePage==='auth'?'text-emerald-600':'text-gray-400'}`}>
          {(activePage==='profile'||activePage==='auth')&&<span className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-b-full"/>}
          {u?(
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-400 text-white flex items-center justify-center text-[10px] font-bold overflow-hidden border-2 border-white shadow">
              {u.avatar?<img src={u.avatar} alt="" className="w-full h-full object-cover"/>:initials(u.name||u.email||'')}
            </div>
          ):(
            <i className="text-[22px] leading-none ri-user-line"/>
          )}
          <span className="text-[9px] font-semibold">{u?'Profil':'Kirish'}</span>
        </button>
      </div>
    </nav>
  );
}

// ─── Footer ─────────────────────────────────────────────────
function Footer(){
  const{dispatch}=useApp();
  const nav=(p:string)=>{dispatch({type:'NAV',payload:p});window.scrollTo({top:0});};
  return(
    <footer className="bg-gradient-to-b from-emerald-50 to-emerald-100/50 border-t border-emerald-100 mt-20 pt-14 pb-7">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <button onClick={()=>nav('home')} className="flex items-center gap-2 font-extrabold text-lg text-emerald-800 mb-3"><img src="/logo.svg" alt="UyNest" className="h-8 w-auto"/>UY<span className="text-emerald-500">NEST</span></button>
            <p className="text-gray-500 text-sm leading-relaxed">Toshkentdagi talabalar va ijarachilar uchun ishonchli uy-joy platformasi.</p>
          </div>
          <div><h5 className="font-bold text-xs uppercase tracking-widest text-gray-700 mb-4">Sahifalar</h5>{[['home','Bosh sahifa'],['rent','Ijara uylar'],['sale','Sotuvdagi uylar'],['map','Xarita']].map(([p,l])=><button key={p} onClick={()=>nav(p)} className="block text-sm text-gray-500 mb-2 hover:text-emerald-700 transition active:translate-x-1">{l}</button>)}</div>
          <div><h5 className="font-bold text-xs uppercase tracking-widest text-gray-700 mb-4">Yordam</h5><button onClick={()=>dispatch({type:'CONTACT',payload:true})} className="block text-sm text-gray-500 mb-2 hover:text-emerald-700 transition active:translate-x-1">Bog'lanish</button><button onClick={()=>nav('submit')} className="block text-sm text-gray-500 mb-2 hover:text-emerald-700 transition active:translate-x-1">E'lon qo'shish</button></div>
          <div><h5 className="font-bold text-xs uppercase tracking-widest text-gray-700 mb-4">Aloqa</h5><a href="tel:+998996767742" className="block text-sm text-gray-500 mb-2 hover:text-emerald-700 transition active:translate-x-1">+998 99 676 77 42</a><a href="https://t.me/jrnyzv" target="_blank" className="block text-sm text-gray-500 mb-2 hover:text-emerald-700 transition active:translate-x-1">@jrnyzv (Telegram)</a></div>
        </div>
        <div className="border-t border-emerald-200/50 pt-5 text-center text-xs text-gray-400">© 2026 UyNest. Barcha huquqlar himoyalangan.</div>
      </div>
    </footer>
  );
}

// ─── Modals ─────────────────────────────────────────────────
function ContactModal(){const{state,dispatch}=useApp();if(!state.contactModal)return null;return(<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={()=>dispatch({type:'CONTACT',payload:false})}><div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl relative" onClick={e=>e.stopPropagation()}><button onClick={()=>dispatch({type:'CONTACT',payload:false})} className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200">✕</button><div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-400 text-white flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-emerald-500/30"><i className="ri-customer-service-2-fill"/></div><h3 className="text-xl font-extrabold text-center mb-1">Biz bilan bog'lanish</h3><p className="text-gray-500 text-sm text-center mb-5">Tezkor javob uchun quyidagi kanallardan foydalaning</p><a href="tel:+998996767742" className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl mb-3 hover:bg-emerald-100 transition"><span className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-400 flex items-center justify-center text-white text-lg"><i className="ri-phone-fill"/></span><div><div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Telefon</div><div className="font-bold text-gray-900">+998 99 676 77 42</div></div></a><a href="https://t.me/jrnyzv" target="_blank" className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl hover:bg-blue-100 transition"><span className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-400 flex items-center justify-center text-white text-lg"><i className="ri-telegram-fill"/></span><div><div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Telegram</div><div className="font-bold text-gray-900">@jrnyzv</div></div></a></div></div>);}
function AuthReqModal(){const{state,dispatch}=useApp();if(!state.authRequiredModal)return null;const go=(t:string)=>{dispatch({type:'AUTH_REQ',payload:{open:false}});dispatch({type:'AUTH_TAB',payload:t});dispatch({type:'NAV',payload:'auth'});};return(<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={()=>dispatch({type:'AUTH_REQ',payload:{open:false}})}><div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl relative" onClick={e=>e.stopPropagation()}><button onClick={()=>dispatch({type:'AUTH_REQ',payload:{open:false}})} className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">✕</button><div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-300 text-white flex items-center justify-center text-3xl mx-auto mb-4"><i className="ri-shield-user-line"/></div><h3 className="text-xl font-extrabold text-center mb-1">Avval ro'yxatdan o'ting</h3><p className="text-gray-500 text-sm text-center mb-5">{state.authReqAction||'Bu amal'} uchun tizimga kiring.</p><button onClick={()=>go('register')} className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-emerald-700 to-emerald-500 text-white font-bold rounded-xl mb-3 shadow"><i className="ri-user-add-line"/>Ro'yxatdan o'tish</button><button onClick={()=>go('login')} className="w-full flex items-center justify-center gap-2 py-3.5 bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:border-emerald-300 transition"><i className="ri-login-circle-line"/>Kirish</button></div></div>);}
function GoogleModal(){const{state,dispatch}=useApp();if(!state.googleDemoModal)return null;const submit=async(e:React.FormEvent<HTMLFormElement>)=>{e.preventDefault();dispatch({type:'GOOGLE_MODAL',payload:false});_authInProgress=true;const r=await AuthAPI.googleSignIn();_authInProgress=false;if(r.ok){dispatch({type:'LOGIN',payload:{user:r.user,token:r.token}});toast(`Xush kelibsiz, ${r.user.name}!`);const nx=state.authNext;dispatch({type:'AUTH_NEXT',payload:null});dispatch({type:'NAV',payload:r.user.role==='admin'?'admin':(nx||'home')});}else toast(r.error||'Xato','error');};return(<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[300] flex items-center justify-center p-4" onClick={()=>dispatch({type:'GOOGLE_MODAL',payload:false})}><div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative" onClick={e=>e.stopPropagation()}><button onClick={()=>dispatch({type:'GOOGLE_MODAL',payload:false})} className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">✕</button><div className="flex items-center gap-3 mb-5"><svg width="28" height="28" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.3 0-9.7-3.3-11.3-8L6.2 33C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C41.3 36 44 30.5 44 24c0-1.3-.1-2.3-.4-3.5z"/></svg><div><div className="font-bold">Google bilan kirish</div><div className="text-xs text-gray-400">Tez va xavfsiz</div></div></div><form onSubmit={submit} className="space-y-3"><button type="submit" className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl text-sm transition">Google bilan davom etish</button></form></div></div>);}

// ─── HOME ───────────────────────────────────────────────────
function HomePage(){
  const{state,dispatch}=useApp();
  const[compareIds,setCompareIds]=useState<number[]>(CompareAPI.get());
  const items=state.approved.filter(p=>p.isPremium&&p.premiumType==='featured').slice(0,3).concat(state.approved.filter(p=>!p.isPremium||p.premiumType!=='featured')).slice(0,6);
  const nav=(p:string)=>{dispatch({type:'NAV',payload:p});window.scrollTo({top:0});};
  return(<div>
    <section className="bg-gradient-to-br from-emerald-50 via-white to-emerald-50 py-16 md:py-24 relative overflow-hidden">
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl"/>
      <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-emerald-300/10 rounded-full blur-3xl"/>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold text-gray-900 tracking-tight mb-6 leading-[1.1]">Uy qidiryapsiz, lekin hech narsa<br/><span className="bg-gradient-to-r from-emerald-700 to-emerald-400 bg-clip-text text-transparent">topolmayapsizmi?</span></h1>
            <p className="text-gray-500 text-lg mb-8 leading-relaxed max-w-lg">Biz 24 soatda topib beramiz. Sizning mukammal yashash joyingiz bir necha tugma uzoqlikda.</p>
            <div className="flex flex-wrap gap-3">
              <button onClick={()=>nav('rent')} className="flex items-center gap-2 px-7 py-4 bg-gradient-to-r from-emerald-700 to-emerald-500 text-white font-bold rounded-2xl shadow-xl shadow-emerald-500/25 hover:shadow-2xl hover:-translate-y-1 transition-all active:scale-95"><i className="ri-key-2-line"/>Ijara uylar</button>
              <button onClick={()=>nav('sale')} className="flex items-center gap-2 px-7 py-4 bg-white border-2 border-gray-200 text-gray-800 font-bold rounded-2xl hover:border-emerald-300 hover:-translate-y-0.5 transition-all shadow-sm active:scale-95"><i className="ri-shopping-bag-3-line"/>Sotuvdagi uylar</button>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-3xl overflow-hidden shadow-2xl aspect-[4/3] relative">
              <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=900" alt="" className="w-full h-full object-cover"/>
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"/>
              <div className="absolute bottom-5 left-5 right-5 bg-white/95 backdrop-blur-xl rounded-2xl p-4 flex items-center gap-4 shadow-xl">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-400 flex items-center justify-center text-white text-xl shrink-0 shadow-lg shadow-emerald-500/30"><i className="ri-flashlight-fill"/></div>
                <div className="flex-1 min-w-0"><div className="font-bold text-gray-900 text-sm">Vaqtingiz yo'qmi?</div><div className="text-gray-500 text-xs">Bizga talablaringizni yuboring</div></div>
                <button onClick={()=>{if(!state.auth){dispatch({type:'AUTH_REQ',payload:{open:true,action:'Uy topib berish'}});return;}nav('request');}} className="flex items-center gap-1 px-4 py-2.5 bg-gradient-to-r from-emerald-700 to-emerald-500 text-white text-xs font-bold rounded-xl whitespace-nowrap shadow active:scale-95 transition-transform">So'rov <i className="ri-arrow-right-line"/></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    <section className="py-16"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="text-center mb-12"><h2 className="text-3xl font-extrabold mb-3">Qanday ishlaydi?</h2><p className="text-gray-500">Tez, oson va ishonchli jarayon</p></div><div className="grid md:grid-cols-3 gap-6">{[{icon:'ri-clipboard-line',t:'1. So\'rov',d:'Uy parametrlarini kiriting yoki murojaat qiling.',g:'from-emerald-500 to-emerald-400'},{icon:'ri-search-eye-line',t:'2. Topish',d:'24 soat ichida eng mos variantlarni topamiz.',g:'from-emerald-700 to-emerald-500'},{icon:'ri-key-2-line',t:'3. Ko\'chish',d:'Shartnomalarni rasmiylashtiramiz.',g:'from-emerald-900 to-emerald-700'}].map(s=><div key={s.t} className="bg-white rounded-2xl p-8 text-center shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300"><div className={`w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br ${s.g} flex items-center justify-center text-white text-3xl shadow-lg`}><i className={s.icon}/></div><h3 className="font-bold text-lg mb-2">{s.t}</h3><p className="text-gray-500 text-sm">{s.d}</p></div>)}</div></div></section>
    <section className="pb-16"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="flex justify-between items-end mb-8 flex-wrap gap-4"><div><h2 className="text-3xl font-extrabold mb-1">So'nggi takliflar</h2><p className="text-gray-500">Toshkent markazidagi eng yaxshi uylar</p></div><button onClick={()=>nav('rent')} className="flex items-center gap-1 text-emerald-700 font-bold hover:text-emerald-900 transition">Barchasini ko'rish <i className="ri-arrow-right-line"/></button></div><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">{items.map(p=><Card key={p.id} p={p} compareIds={compareIds} onCompareChange={setCompareIds}/>)}</div></div></section>
    <RecommendationsSection/>
    <NewBuildingsSection/>
    <CompareBar compareIds={compareIds} onChange={setCompareIds}/>
    <section className="pb-20"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="text-center mb-12"><h2 className="text-3xl font-extrabold mb-3">Uy beruvchilar uchun</h2><p className="text-gray-500">Nima uchun bizni tanlashadi?</p></div><div className="grid md:grid-cols-3 gap-6 mb-8">{[{icon:'ri-flashlight-fill',t:'Tez Moslashuv',d:'Uyingizga mos ijarachini rekord vaqtda topamiz.',g:'from-emerald-500 to-emerald-400'},{icon:'ri-coins-line',t:'Bepul E\'lon',d:'E\'lon joylash mutlaqo bepul.',g:'from-blue-500 to-blue-400'},{icon:'ri-shield-check-fill',t:'Xavfsiz',d:'Barcha foydalanuvchilar tekshiriladi.',g:'from-purple-500 to-purple-400'}].map(f=><div key={f.t} className="bg-white rounded-2xl p-7 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all"><div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.g} flex items-center justify-center text-white text-xl mb-4 shadow-lg`}><i className={f.icon}/></div><h3 className="font-bold text-lg mb-2">{f.t}</h3><p className="text-gray-500 text-sm">{f.d}</p></div>)}</div><div className="text-center"><button onClick={()=>nav('submit')} className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-700 to-emerald-500 text-white font-bold rounded-2xl shadow-xl shadow-emerald-500/25 hover:shadow-2xl hover:-translate-y-1 transition-all"><i className="ri-add-circle-line"/>Uy e'loni qo'shish</button></div></div></section>
    <TopReviews/>
  </div>);
}

// ─── SHARED LISTING FILTER BAR ───────────────────────────────
function ListingFilterBar({type,filterKey}:{type:'rent'|'sale';filterKey:'RENT_FILTER'|'SALE_FILTER'}){
  const{state,dispatch}=useApp();
  const f=type==='rent'?state.filters.rent:state.filters.sale;
  const[localRegion,setLocalRegion]=useState(f.region||'');
  const districts=localRegion&&REGIONS_MAP[localRegion]?REGIONS_MAP[localRegion]:Object.values(REGIONS_MAP).flat();
  const ic="bg-transparent flex-1 text-sm outline-none min-w-0";
  const cell="flex items-center gap-2 bg-emerald-50 rounded-xl px-3 py-2.5";
  const lbl="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5";
  const upd=(payload:Record<string,string>)=>dispatch({type:filterKey,payload});
  const reset=()=>{setLocalRegion('');upd(type==='rent'?{region:'',district:'',rooms:'',minPrice:'',maxPrice:''}:{region:'',district:'',rooms:'',max:''});};
  return(
    <div className="bg-white rounded-2xl p-5 shadow-sm mb-7">
      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
        <div><label className={lbl}>Viloyat</label><div className={cell}><i className="ri-map-2-line text-emerald-600 shrink-0"/><select className={ic} value={localRegion} onChange={e=>{setLocalRegion(e.target.value);upd({region:e.target.value,district:''});}}><option value="">Barcha viloyatlar</option>{Object.keys(REGIONS_MAP).map(r=><option key={r}>{r}</option>)}</select></div></div>
        <div><label className={lbl}>Tuman / Shahar</label><div className={cell}><i className="ri-map-pin-2-fill text-emerald-600 shrink-0"/><select className={ic} value={f.district} onChange={e=>upd({district:e.target.value})}><option value="">Barcha tumanlar</option>{districts.map(d=><option key={d}>{d}</option>)}</select></div></div>
        <div><label className={lbl}>Xonalar</label><div className={cell}><i className="ri-door-open-line text-emerald-600 shrink-0"/><select className={ic} value={f.rooms} onChange={e=>upd({rooms:e.target.value})}><option value="">Istagan</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}+ xona</option>)}</select></div></div>
        {type==='rent'
          ?<><div><label className={lbl}>Min narx ($)</label><div className={cell}><i className="ri-money-dollar-circle-line text-emerald-600 shrink-0"/><input type="number" placeholder="200" className={ic} value={(f as typeof state.filters.rent).minPrice} onChange={e=>upd({minPrice:e.target.value})}/></div></div>
             <div><label className={lbl}>Maks narx ($/oy)</label><div className={cell}><i className="ri-money-dollar-circle-line text-emerald-600 shrink-0"/><input type="number" placeholder="2000" className={ic} value={(f as typeof state.filters.rent).maxPrice} onChange={e=>upd({maxPrice:e.target.value})}/></div></div></>
          :<div><label className={lbl}>Maks narx ($)</label><div className={cell}><i className="ri-money-dollar-circle-line text-emerald-600 shrink-0"/><input type="number" placeholder="200000" className={ic} value={(f as typeof state.filters.sale).max} onChange={e=>upd({max:e.target.value})}/></div></div>}
      </div>
      <div className="flex justify-end mt-3"><button onClick={reset} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition"><i className="ri-refresh-line"/>Tozalash</button></div>
    </div>
  );
}

// ─── RENT / SALE PAGES ──────────────────────────────────────
function RentPage(){
  const{state}=useApp();
  const[compareIds,setCompareIds]=useState<number[]>(CompareAPI.get());
  const f=state.filters.rent;
  let items=state.approved.filter(p=>p.type==='rent');
  if(f.region){const rd=REGIONS_MAP[f.region]||[];items=items.filter(p=>rd.includes(p.district)||p.city===f.region);}
  if(f.district)items=items.filter(p=>p.district===f.district);
  if(f.rooms)items=items.filter(p=>p.rooms>=parseInt(f.rooms));
  if(f.minPrice)items=items.filter(p=>p.price>=parseInt(f.minPrice));
  if(f.maxPrice)items=items.filter(p=>p.price<=parseInt(f.maxPrice));
  // Premium TOP always first
  items=[...items.filter(p=>p.isPremium&&p.premiumType==='top'),...items.filter(p=>!(p.isPremium&&p.premiumType==='top'))];
  return(<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
    <div className="mb-7"><h2 className="text-3xl font-extrabold text-emerald-800 mb-1">Ijara uylar</h2><p className="text-gray-500">O'zbekiston bo'ylab eng qulay ijaraga uylar</p></div>
    <ListingFilterBar type="rent" filterKey="RENT_FILTER"/>
    {items.length?<div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">{items.map(p=><Card key={p.id} p={p} compareIds={compareIds} onCompareChange={setCompareIds}/>)}</div>:<div className="bg-white rounded-2xl p-20 text-center shadow-sm"><i className="ri-search-eye-line text-5xl text-gray-300 block mb-3"/><h3 className="font-bold mb-1">Topilmadi</h3><p className="text-gray-500 text-sm">Filtrlarni o'zgartiring</p></div>}
    <CompareBar compareIds={compareIds} onChange={setCompareIds}/>
  </div>);
}

function SalePage(){
  const{state,dispatch}=useApp();
  const[compareIds,setCompareIds]=useState<number[]>(CompareAPI.get());
  const f=state.filters.sale;
  const nav=(pg:string)=>{dispatch({type:'NAV',payload:pg});window.scrollTo({top:0});};
  let items=state.approved.filter(p=>p.type==='sale');
  if(f.region){const rd=REGIONS_MAP[f.region]||[];items=items.filter(p=>rd.includes(p.district)||p.city===f.region);}
  if(f.district)items=items.filter(p=>p.district===f.district);
  if(f.rooms)items=items.filter(p=>p.rooms>=parseInt(f.rooms));
  if(f.max)items=items.filter(p=>p.price<=parseInt(f.max));
  items=[...items.filter(p=>p.isPremium&&p.premiumType==='top'),...items.filter(p=>!(p.isPremium&&p.premiumType==='top'))];
  return(<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
    <div className="mb-7"><h2 className="text-3xl font-extrabold mb-1">Sotuvdagi uylar</h2><p className="text-gray-500">O'zbekiston bo'ylab zamonaviy uylar</p></div>
    <ListingFilterBar type="sale" filterKey="SALE_FILTER"/>
    {items.length?<div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5 mb-10">{items.map(p=><Card key={p.id} p={p} compareIds={compareIds} onCompareChange={setCompareIds}/>)}</div>:<div className="bg-white rounded-2xl p-20 text-center shadow-sm mb-10"><i className="ri-search-eye-line text-5xl text-gray-300 block mb-3"/><h3 className="font-bold mb-1">Topilmadi</h3><p className="text-gray-500 text-sm">Filtrlarni o'zgartiring</p></div>}
    <div className="flex flex-wrap justify-between items-center bg-white rounded-2xl px-7 py-6 shadow-sm gap-4 mb-6"><div><h3 className="font-bold mb-0.5">Mos uyni topolmayapsizmi?</h3><p className="text-gray-500 text-sm">Mutaxassislarimiz yordam beradi.</p></div><button onClick={()=>{if(!state.auth){dispatch({type:'AUTH_REQ',payload:{open:true,action:'Uy topib berish'}});return;}nav('request');}} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-700 to-emerald-500 text-white font-bold rounded-xl shadow"><i className="ri-customer-service-2-line"/>Menga uy topib ber</button></div>
    <CompareBar compareIds={compareIds} onChange={setCompareIds}/>
  </div>);
}

// ─── MAP SEARCH (Module 19) ─────────────────────────────────
function MapSearchBox({onResult,filterType,setFilterType}:{onResult:(lat:number,lng:number,name:string)=>void;filterType:string;setFilterType:(t:string)=>void}){
  const[q,setQ]=useState('');
  const[results,setResults]=useState<any[]>([]);
  const[loading,setLoading]=useState(false);
  const[showLegend,setShowLegend]=useState(false);
  const search=async()=>{
    if(!q.trim())return;setLoading(true);
    try{
      const r=await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q+", O'zbekiston")}&format=json&limit=6&accept-language=uz,ru`);
      const data=await r.json();setResults(data);
    }catch{toast('Qidirishda xato','warn');}
    finally{setLoading(false);}
  };
  return(
    <div className="relative w-full">
      <div className="flex gap-2 mb-2">
        <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5 shadow-md">
          <i className="ri-search-line text-gray-400 shrink-0"/>
          <input value={q} onChange={e=>{setQ(e.target.value);if(!e.target.value)setResults([]);}} onKeyDown={e=>e.key==='Enter'&&search()} placeholder="Ko'cha, mahalla, metro, shahar..." className="flex-1 text-sm outline-none min-w-0"/>
          {loading&&<div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin shrink-0"/>}
        </div>
        <button onClick={search} className="w-10 h-10 md:w-auto md:h-auto md:px-4 md:py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition active:scale-95 shadow-md shrink-0 flex items-center justify-center gap-1.5"><i className="ri-search-line text-base"/><span className="hidden md:inline">Qidiruv</span></button>
      </div>
      <div className="flex items-center gap-2 mb-1">
        {['','rent','sale'].map((t,i)=><button key={t} onClick={()=>setFilterType(t)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${filterType===t?(t==='rent'?'bg-blue-500 text-white':t==='sale'?'bg-emerald-600 text-white':'bg-gray-800 text-white'):'bg-white text-gray-600 border border-gray-200 hover:border-emerald-300'}`}>{i===0?'Hammasi':t==='rent'?'Ijara':'Sotuv'}</button>)}
        <div className="relative ml-auto shrink-0">
          <button onClick={()=>setShowLegend(v=>!v)} className="flex items-center gap-1 px-2 py-1.5 bg-white border border-gray-200 rounded-xl shadow-sm text-xs font-bold text-gray-500 hover:border-emerald-300 transition active:scale-95">
            <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-green-600 inline-block"/><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"/><span className="w-2 h-2 rounded-full bg-red-500 inline-block"/></span>
            <span className="uppercase tracking-wider text-[9px]">Narx</span>
            <i className={`ri-arrow-down-s-line text-gray-400 text-xs transition-transform ${showLegend?'rotate-180':''}`}/>
          </button>
          {showLegend&&<>
            <div className="fixed inset-0 z-[150]" onClick={()=>setShowLegend(false)}/>
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl p-2.5 z-[160] min-w-[140px] space-y-1.5">
              {[{c:'#16a34a',l:'Arzon (−10%)'},{c:'#d97706',l:"O'rtacha"},{c:'#dc2626',l:'Qimmat (+10%)'}].map(x=>(
                <div key={x.l} className="flex items-center gap-2"><div style={{background:x.c}} className="w-3 h-3 rounded-full shrink-0"/><span className="text-[11px] font-semibold text-gray-600 whitespace-nowrap">{x.l}</span></div>
              ))}
            </div>
          </>}
        </div>
      </div>
      {results.length>0&&(
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden z-[200] mt-1">
          {results.map((r,i)=>{
            const shortName=r.display_name.split(',').slice(0,3).join(', ');
            return(
              <button key={i} title={r.display_name} onClick={()=>{onResult(parseFloat(r.lat),parseFloat(r.lon),r.display_name);setResults([]);setQ(shortName);}} className="w-full text-left px-4 py-3 text-sm hover:bg-emerald-50 border-b border-gray-50 last:border-0 flex items-center gap-2 transition">
                <i className="ri-map-pin-2-line text-emerald-500 shrink-0 text-base"/>
                <span className="truncate text-gray-700">{shortName}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── MAP AI ASSISTANT ────────────────────────────────────────
function MapAiPanel({allListings,onFocus,onHighlight}:{allListings:Listing[];onFocus:(lat:number,lng:number,zoom:number)=>void;onHighlight:(ids:number[])=>void}){
  const[q,setQ]=useState('');const[loading,setLoading]=useState(false);
  const[aiMsg,setAiMsg]=useState('Joy nomi yoki tuman yozing, men atrofdagi uylarni topaman');
  const[aiListings,setAiListings]=useState<Listing[]>([]);
  const{dispatch}=useApp();

  const normalizeD=(s:string)=>s.toLowerCase().replace(/ tumani| shahri| viloyati/g,'').trim();
  const allDistricts=[...DISTRICTS,...Object.values(REGIONS_MAP).flat()];

  const search=async()=>{
    if(!q.trim())return;
    setLoading(true);
    try{
      // 1. Tuman nomi tekshirish
      const district=allDistricts.find(d=>q.toLowerCase().includes(normalizeD(d))||normalizeD(d)===q.toLowerCase().trim())||null;
      if(district){
        const found=allListings.filter(p=>normalizeD(p.district).includes(normalizeD(district)));
        if(found.length>0){
          const withCoords=found.filter(p=>p.lat&&p.lng);
          if(withCoords.length>0)onFocus(withCoords[0].lat!,withCoords[0].lng!,14);
          onHighlight(found.map(p=>p.id));
          setAiListings(found.slice(0,5));
          setAiMsg(`"${district}" da ${found.length} ta e'lon topildi:`);
          setLoading(false);return;
        }
      }
      // 2. Nominatim geocoding
      const r=await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q+", O'zbekiston")}&format=json&limit=1`);
      const geo=await r.json();
      if(geo.length>0){
        const{lat,lon,display_name}=geo[0];
        const la=parseFloat(lat),lo=parseFloat(lon);
        onFocus(la,lo,15);
        // Yaqindagi e'lonlar (5km radius)
        const nearby=allListings.filter(p=>{
          if(!p.lat||!p.lng)return false;
          const dx=p.lat-la,dy=p.lng-lo;
          return Math.sqrt(dx*dx+dy*dy)<0.045; // ~5km
        });
        onHighlight(nearby.map(p=>p.id));
        setAiListings(nearby.slice(0,5));
        setAiMsg(nearby.length>0
          ?`"${display_name.split(',')[0]}" atrofida ${nearby.length} ta e'lon:`
          :`"${display_name.split(',')[0]}" topildi, lekin bu atrofda e'lon yo'q.`);
      }else{
        setAiMsg('Joy topilmadi. Boshqa nom bilan urinib ko\'ring.');
        setAiListings([]);onHighlight([]);
      }
    }catch{setAiMsg('Qidiruvda xato. Internet aloqasini tekshiring.');}
    setLoading(false);
  };

  return(
    <div className="flex flex-col h-full">
      {/* AI Header */}
      <div className="p-4 bg-gradient-to-r from-emerald-700 to-emerald-600 text-white">
        <div className="flex items-center gap-2 mb-3">
          <img src="/ai-robot.png" alt="" className="w-8 h-8 rounded-lg object-cover"/>
          <div><div className="font-bold text-sm">Xarita AI Yordamchisi</div><div className="text-emerald-200 text-xs">Joy nomi → atrofdagi uylar</div></div>
        </div>
        <div className="flex gap-2">
          <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()} placeholder="Yunusobod metro, Navoiy ko'chasi..." className="flex-1 px-3 py-2 bg-white/20 text-white placeholder-emerald-200 rounded-xl text-sm outline-none focus:bg-white/30 transition"/>
          <button onClick={search} disabled={loading} className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center active:scale-90 transition">
            {loading?<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>:<i className="ri-search-line"/>}
          </button>
        </div>
      </div>
      {/* AI Response */}
      <div className="p-4 bg-emerald-50 border-b border-emerald-100">
        <p className="text-xs text-emerald-800 font-medium">{aiMsg}</p>
      </div>
      {/* Listings */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {aiListings.length>0&&aiListings.map(p=>(
          <button key={p.id} onClick={()=>dispatch({type:'DETAIL',payload:p.id})} className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-emerald-200 bg-white hover:border-emerald-400 hover:shadow-md transition text-left">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-emerald-50 shrink-0">{p.img&&<img src={p.img} alt="" className="w-full h-full object-cover"/>}</div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate">{p.title}</div>
              <div className="text-xs text-gray-400">{p.district} • {p.rooms} xona</div>
              <div className="font-extrabold text-emerald-700 text-sm">${p.price}{p.type==='rent'?'/oy':''}</div>
            </div>
            <i className="ri-arrow-right-s-line text-emerald-400"/>
          </button>
        ))}
      </div>
    </div>
  );
}

// Module-level geo state — persists across MapPage mounts so we don't re-ask permission
let _geoWatchId:number|null=null;
let _cachedPos:[number,number]|null=null;
const _posListeners=new Set<(p:[number,number])=>void>();

// ─── MAP PAGE (Real Leaflet + AI Assistant) ─────────────────
function MapPage(){
  const{state,dispatch}=useApp();
  const allItems=state.approved.filter(p=>p.lat&&p.lng);
  const[sel,setSel]=useState<Listing|null>(null);
  const[mapCenter,setMapCenter]=useState<[number,number]>([41.3111,69.2797]);
  const[mapZoom,setMapZoom]=useState(12);
  const[mapKey,setMapKey]=useState(0);
  const[filterType,setFilterType]=useState('');
  const[highlightIds,setHighlightIds]=useState<number[]>([]);
  const[aiMode,setAiMode]=useState(true);
  const[userPos,setUserPos]=useState<[number,number]|null>(_cachedPos);
  const[locating,setLocating]=useState(false);
  const filtered=allItems.filter(p=>!filterType||p.type===filterType);

  // Subscribe to module-level position listener; restore cached position on remount
  useEffect(()=>{
    const cb=(p:[number,number])=>setUserPos(p);
    _posListeners.add(cb);
    if(_cachedPos) setUserPos(_cachedPos);
    return()=>{_posListeners.delete(cb);};
  },[]);

  // Start location watch only when user explicitly clicks the button — avoids permission prompt on every visit
  const startLocationWatch=()=>{
    if(!navigator.geolocation) return;
    setLocating(true);
    if(_geoWatchId===null){
      _geoWatchId=navigator.geolocation.watchPosition(
        pos=>{
          const la=pos.coords.latitude,lo=pos.coords.longitude;
          // Validate within Uzbekistan bounds (±3° buffer) to reject stale/wrong-country positions
          if(la<34||la>48||lo<53||lo>76){
            toast('GPS noto\'g\'ri joylashuv qaytardi, qaytadan urining','warn');
            setLocating(false);
            return;
          }
          const p:[number,number]=[la,lo];
          _cachedPos=p;
          _posListeners.forEach(fn=>fn(p));
          setLocating(false);
        },
        ()=>{toast('Joylashuvni aniqlashda xatolik','warn');setLocating(false);},
        {enableHighAccuracy:true,timeout:15000,maximumAge:10000}
      );
    }
  };

  const meIcon=L.divIcon({
    html:`<div style="display:flex;flex-direction:column;align-items:center;gap:3px">
      <div class="me-marker-dot" style="width:18px;height:18px;background:#2563eb;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(37,99,235,.6)"></div>
      <div style="background:#2563eb;color:#fff;font-family:Inter,-apple-system,sans-serif;font-size:11px;font-weight:800;padding:2px 8px;border-radius:10px;white-space:nowrap;box-shadow:0 2px 6px rgba(37,99,235,.4)">Men</div>
    </div>`,
    className:'',
    iconAnchor:[9,32],
  });

  // ── District average prices for color coding ──
  const districtAvgMap=React.useMemo(()=>{
    const m:Record<string,{s:number;c:number}>={};
    state.approved.forEach(p=>{const k=`${p.district}_${p.type}`;if(!m[k])m[k]={s:0,c:0};m[k].s+=p.price;m[k].c++;});
    const r:Record<string,number>={};
    Object.entries(m).forEach(([k,v])=>r[k]=Math.round(v.s/v.c));
    return r;
  },[state.approved]);

  const priceColor=(p:Listing):string=>{
    const avg=districtAvgMap[`${p.district}_${p.type}`]||0;
    if(!avg) return '#10b981';
    const d=(p.price-avg)/avg;
    return d<-0.1?'#16a34a':d>0.1?'#dc2626':'#d97706';
  };

  const makeIcon=(p:Listing)=>{
    const bg=priceColor(p);
    const isSel=sel?.id===p.id;
    const isHL=highlightIds.includes(p.id);
    const px=p.price>=1000000?`$${Math.round(p.price/1000000)}m`:p.price>=1000?`$${Math.round(p.price/1000)}k`:`$${p.price}`;
    const lbl=p.type==='rent'?'Ijara':'Sotuv';
    const border=isSel?`3px solid #fff;box-shadow:0 0 0 3px ${bg},0 4px 16px rgba(0,0,0,.35)`:'2.5px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.28)';
    const scale=isSel?'transform:scale(1.25);z-index:9999;':'';
    const hlRing=isHL&&!isSel?`outline:2px solid #fbbf24;outline-offset:2px;`:'';
    return L.divIcon({
      html:`<div style="background:${bg};color:#fff;border:${border};border-radius:22px;padding:3px 10px 5px;text-align:center;font-family:Inter,-apple-system,sans-serif;min-width:54px;position:relative;cursor:pointer;${scale}${hlRing}">
        <div style="font-size:9.5px;font-weight:700;opacity:.9;letter-spacing:.3px;line-height:1.3">${lbl}</div>
        <div style="font-size:13px;font-weight:800;line-height:1.2;white-space:nowrap">${px}</div>
        <div style="position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid ${bg}"></div>
      </div>`,
      className:'',
      iconAnchor:[37,50],
    });
  };

  const selectListing=(p:Listing)=>{
    setSel(p);
    if(p.lat&&p.lng){setMapCenter([p.lat,p.lng]);setMapZoom(16);setMapKey(k=>k+1);}
  };

  const selAvg=sel?districtAvgMap[`${sel.district}_${sel.type}`]||0:0;
  const selDiff=selAvg&&sel?Math.round(((sel.price-selAvg)/selAvg)*100):null;

  return(
    <div className="flex flex-col lg:flex-row h-[calc(100vh-60px-56px)] md:h-[calc(100vh-68px)]">
      <div className="flex-1 relative overflow-hidden">
        {/* Search bar + filter chips + price legend */}
        <div className="absolute top-3 left-14 z-[100] w-[calc(100%-72px)] md:w-80">
          <MapSearchBox filterType={filterType} setFilterType={setFilterType} onResult={(lat,lng,name)=>{setMapCenter([lat,lng]);setMapZoom(16);setMapKey(k=>k+1);toast(name.split(',')[0]);}}/>
        </div>
        {/* "My location" button — always shows crosshair; spinner while GPS is acquiring */}
        <button onClick={()=>{if(userPos){setMapCenter(userPos);setMapZoom(16);setMapKey(k=>k+1);}else if(!locating)startLocationWatch();}} className="absolute bottom-[200px] md:bottom-24 left-3 z-[100] w-10 h-10 bg-white rounded-xl shadow-lg border border-gray-200 flex items-center justify-center transition active:scale-95 hover:bg-blue-50" title="Mening joylashuvim">
          {locating
            ?<div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"/>
            :<i className={`ri-focus-3-line text-xl ${userPos?'text-blue-600':'text-gray-400'}`}/>}
        </button>
        <MapContainer key={mapKey} center={mapCenter} zoom={mapZoom} className="w-full h-full z-0" scrollWheelZoom>
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
          {filtered.map(p=>(
            <Marker key={p.id} position={[p.lat!,p.lng!]} icon={makeIcon(p)} eventHandlers={{click:()=>selectListing(p)}}/>
          ))}
          {userPos&&(
            <Marker position={userPos} icon={meIcon}>
              <Popup><b>Mening joylashuvim</b></Popup>
            </Marker>
          )}
        </MapContainer>

        {/* ── Floating listing detail card ── */}
        {sel&&(
          <div className="absolute bottom-2 md:bottom-4 left-1/2 z-[200] w-[calc(100%-24px)] max-w-xs md:max-w-sm"
               style={{transform:'translateX(-50%)',animation:'slideUp .22s ease'}}>
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
              {/* Image */}
              <div className="relative" style={{aspectRatio:'16/5'}}>
                {sel.img?<img src={sel.img} alt="" className="w-full h-full object-cover"/>:<div className="w-full h-full bg-emerald-50 flex items-center justify-center"><i className="ri-home-4-line text-4xl text-emerald-300"/></div>}
                <button onClick={()=>setSel(null)} className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center text-base hover:bg-black/70 transition active:scale-90">✕</button>
                <div className="absolute bottom-2 left-2 flex gap-1.5">
                  <span style={{background:priceColor(sel)}} className="text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                    {sel.type==='rent'?<><i className="ri-key-2-line mr-0.5"/>Ijara</>:<><i className="ri-home-4-line mr-0.5"/>Sotuv</>}
                  </span>
                  {sel.verified&&<span className="bg-white/90 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"><i className="ri-checkbox-circle-fill"/>Tasdiqlangan</span>}
                  {sel.isPremium&&<span className="bg-amber-400/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"><i className="ri-star-fill"/>Premium</span>}
                </div>
              </div>
              <div className="p-3">
                {/* Title + price */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h3 className="font-extrabold text-sm leading-tight line-clamp-1 flex-1">{sel.title}</h3>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-emerald-700 text-base leading-tight">${sel.price}{sel.type==='rent'&&<span className="text-xs font-normal text-gray-400">/oy</span>}</div>
                    {selDiff!==null&&<div className={`text-[10px] font-bold ${selDiff<-10?'text-emerald-600':selDiff>10?'text-red-500':'text-amber-600'}`}>{selDiff>0?'+':''}{selDiff}%</div>}
                  </div>
                </div>
                {/* Details chips */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    {i:'ri-map-pin-2-fill',v:sel.district,c:'text-emerald-500'},
                    {i:'ri-hotel-bed-line',v:`${sel.rooms} xona`,c:'text-gray-400'},
                    {i:'ri-ruler-2-line',v:`${sel.area} m²`,c:'text-gray-400'},
                  ].map(x=><span key={x.v} className={`flex items-center gap-1 text-xs text-gray-600`}><i className={`${x.i} ${x.c}`}/>{x.v}</span>)}
                </div>
                {/* Buttons */}
                <div className="flex gap-2">
                  {(sel.phone||sel.contact)
                    ?<a href={`tel:${sel.phone||sel.contact}`} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gradient-to-r from-emerald-700 to-emerald-500 text-white font-bold rounded-xl text-sm active:scale-95 transition shadow"><i className="ri-phone-fill"/>Qo'ng'iroq</a>
                    :<button onClick={()=>{dispatch({type:'CONTACT',payload:true});}} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gradient-to-r from-emerald-700 to-emerald-500 text-white font-bold rounded-xl text-sm active:scale-95 transition shadow"><i className="ri-phone-fill"/>Qo'ng'iroq</button>}
                  <button onClick={()=>dispatch({type:'DETAIL',payload:sel.id})} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-100 text-gray-800 font-bold rounded-xl text-sm hover:bg-emerald-50 hover:text-emerald-700 active:scale-95 transition"><i className="ri-eye-line"/>Batafsil</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right panel — unchanged */}
      <div className="w-full lg:w-96 bg-white border-l border-gray-100 flex flex-col shrink-0 max-h-[50vh] lg:max-h-full">
        <div className="flex border-b border-gray-100">
          <button onClick={()=>setAiMode(true)} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-1.5 transition ${aiMode?'text-emerald-700 border-b-2 border-emerald-600':'text-gray-400 hover:text-gray-600'}`}><img src="/ai-robot.png" alt="" className="w-5 h-5 rounded object-cover"/>AI Yordamchi</button>
          <button onClick={()=>setAiMode(false)} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-1.5 transition ${!aiMode?'text-emerald-700 border-b-2 border-emerald-600':'text-gray-400 hover:text-gray-600'}`}><i className="ri-map-pin-2-line"/>Barcha ({filtered.length})</button>
        </div>
        {aiMode?(
          <MapAiPanel
            allListings={state.approved}
            onFocus={(lat,lng,zoom)=>{setMapCenter([lat,lng]);setMapZoom(zoom);setMapKey(k=>k+1);}}
            onHighlight={setHighlightIds}
          />
        ):(
          <div className="overflow-y-auto p-4 space-y-2">
            {filtered.map(p=>{
              const avg=districtAvgMap[`${p.district}_${p.type}`]||0;
              const diff=avg?Math.round(((p.price-avg)/avg)*100):null;
              return(
                <button key={p.id} onClick={()=>selectListing(p)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition text-left ${sel?.id===p.id?'border-emerald-400 bg-emerald-50':'border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/50'}`}>
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-emerald-50 shrink-0 relative">
                    {p.img&&<img src={p.img} alt="" className="w-full h-full object-cover"/>}
                    {sel?.id===p.id&&<div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center"><i className="ri-map-pin-fill text-emerald-600 text-xl"/></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{p.title}</div>
                    <div className="text-xs text-gray-400">{p.district} • {p.rooms} xona</div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-emerald-700 text-sm">${p.price}{p.type==='rent'?<span className="text-[10px] font-normal text-gray-400">/oy</span>:''}</span>
                      {diff!==null&&<span className={`text-[10px] font-bold ${diff<-10?'text-emerald-600':diff>10?'text-red-500':'text-amber-600'}`}>{diff>0?'+':''}{diff}%</span>}
                    </div>
                  </div>
                  <div style={{background:priceColor(p)}} className="w-2.5 h-2.5 rounded-full shrink-0"/>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DETAIL PAGE ─────────────────────────────────────────────
function DetailPage(){
  const{state,dispatch}=useApp();
  const p=state.approved.find(x=>x.id===state.currentDetail)||state.approved[0];
  const nav=(pg:string)=>{dispatch({type:'NAV',payload:pg});window.scrollTo({top:0});};
  const[selImg,setSelImg]=useState(0);
  const[fullscreen,setFullscreen]=useState(false);
  const[showShare,setShowShare]=useState(false);
  const[showViewing,setShowViewing]=useState(false);
  const[showReport,setShowReport]=useState(false);

  useEffect(()=>{if(p){ListingViewAPI.increment(p.id);ListingExtAPI.addLastViewed(p.id);}setSelImg(0);},[p?.id]);
  useEffect(()=>{const h=(e:KeyboardEvent)=>{if(fullscreen){if(e.key==='Escape')setFullscreen(false);if(e.key==='ArrowRight')setSelImg(i=>Math.min(i+1,(allImgs.length-1)));if(e.key==='ArrowLeft')setSelImg(i=>Math.max(i-1,0));}};document.addEventListener('keydown',h);return()=>document.removeEventListener('keydown',h);},[fullscreen]);

  if(!p) return <div className="max-w-7xl mx-auto px-4 py-20 text-center"><i className="ri-home-line text-6xl text-gray-300 block mb-4"/><h3 className="font-bold text-xl mb-2">E'lon topilmadi</h3><button onClick={()=>nav('home')} className="mt-4 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold">Bosh sahifaga</button></div>;
  const amenList=AMENITIES.filter(a=>p.amenities?.includes(a.id));
  const allImgs=[p.img,...(p.images||[]).filter(x=>x!==p.img)].filter(Boolean);
  const similar=state.approved.filter(x=>x.id!==p.id&&x.district===p.district&&x.type===p.type&&Math.abs(x.rooms-p.rooms)<=1).slice(0,4);
  const startChat=(targetId?:string)=>{
    if(!state.auth){dispatch({type:'AUTH_REQ',payload:{open:true,action:'Xabar yuborish'}});return;}
    const target=targetId||p.ownerId||AuthAPI.getUsers().find(u=>u.role==='admin')?.id;
    if(!target)return toast('Foydalanuvchi topilmadi','error');
    if(target===state.currentUser?.id){toast('O\'zingizga xabar yoza olmaysiz','warn');return;}
    dispatch({type:'CHAT_TARGET',payload:target});dispatch({type:'NAV',payload:'chat'});
  };
  const ownerPhone=p.phone||p.contact||'';
  const adminUser=AuthAPI.getUsers().find(u=>u.role==='admin');
  const startAdminChat=()=>{if(!state.auth){dispatch({type:'AUTH_REQ',payload:{open:true,action:'Admin bilan bog\'lanish'}});return;}if(adminUser){dispatch({type:'CHAT_TARGET',payload:adminUser.id});dispatch({type:'NAV',payload:'chat'});}else toast('Admin topilmadi','warn');};
  // YouTube video embed helper
  const getYtId=(url:string)=>{const m=url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);return m?m[1]:null;};

  return(
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6"><button onClick={()=>nav('home')} className="hover:text-emerald-700"><i className="ri-home-4-line"/></button><i className="ri-arrow-right-s-line"/><button onClick={()=>nav(p.type==='rent'?'rent':'sale')} className="hover:text-emerald-700">{p.type==='rent'?'Ijara':'Sotuv'}</button><i className="ri-arrow-right-s-line"/><span className="text-gray-600 truncate max-w-[200px]">{p.title}</span></div>
      {/* Gallery (Module 8) */}
      <div className="mb-8">
        <div className="rounded-3xl overflow-hidden aspect-[16/7] mb-3 bg-gray-100 relative cursor-zoom-in" onClick={()=>setFullscreen(true)}>
          {allImgs[selImg]&&<img src={allImgs[selImg]} alt="" className="w-full h-full object-cover"/>}
          <div className="absolute top-4 left-4 flex gap-2">
            {p.verified&&<div className="bg-emerald-500/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-bold text-white flex items-center gap-1"><i className="ri-verified-badge-fill"/>Tasdiqlangan</div>}
            {p.isPremium&&p.premiumType&&<div className="bg-amber-500/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-bold text-white flex items-center gap-1">{p.premiumType==='top'?<><i className="ri-trophy-fill"/>TOP</>:p.premiumType==='featured'?<><i className="ri-star-fill"/>FEATURED</>:<><i className="ri-fire-fill"/>SHOSHILINCH</>}</div>}
          </div>
          <div className="absolute bottom-4 right-4 bg-black/40 backdrop-blur text-white text-xs px-3 py-1.5 rounded-full font-semibold">{selImg+1} / {allImgs.length}</div>
          {allImgs.length>1&&<><button onClick={e=>{e.stopPropagation();setSelImg(i=>Math.max(i-1,0));}} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur rounded-full flex items-center justify-center text-gray-700 hover:bg-white transition active:scale-90 shadow"><i className="ri-arrow-left-s-line text-xl"/></button><button onClick={e=>{e.stopPropagation();setSelImg(i=>Math.min(i+1,allImgs.length-1));}} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur rounded-full flex items-center justify-center text-gray-700 hover:bg-white transition active:scale-90 shadow"><i className="ri-arrow-right-s-line text-xl"/></button></>}
        </div>
        {allImgs.length>1&&<div className="flex gap-2 overflow-x-auto pb-2">{allImgs.map((img,i)=><button key={i} onClick={()=>setSelImg(i)} className={`w-20 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition ${i===selImg?'border-emerald-500 ring-2 ring-emerald-200':'border-transparent opacity-70 hover:opacity-100'}`}><img src={img} alt="" className="w-full h-full object-cover"/></button>)}</div>}
      </div>
      {/* Fullscreen gallery */}
      {fullscreen&&<div className="fixed inset-0 bg-black/95 z-[300] flex items-center justify-center" onClick={()=>setFullscreen(false)}>
        <button className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full text-white flex items-center justify-center text-xl hover:bg-white/30" onClick={()=>setFullscreen(false)}>✕</button>
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/20 text-white text-sm px-4 py-2 rounded-full">{selImg+1} / {allImgs.length}</div>
        <button onClick={e=>{e.stopPropagation();setSelImg(i=>Math.max(i-1,0));}} className="absolute left-4 w-12 h-12 bg-white/20 rounded-full text-white flex items-center justify-center text-2xl hover:bg-white/30"><i className="ri-arrow-left-s-line"/></button>
        <img src={allImgs[selImg]} alt="" className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl" onClick={e=>e.stopPropagation()}/>
        <button onClick={e=>{e.stopPropagation();setSelImg(i=>Math.min(i+1,allImgs.length-1));}} className="absolute right-4 w-12 h-12 bg-white/20 rounded-full text-white flex items-center justify-center text-2xl hover:bg-white/30"><i className="ri-arrow-right-s-line"/></button>
        <div className="absolute bottom-4 flex gap-2">{allImgs.map((_,i)=><button key={i} onClick={e=>{e.stopPropagation();setSelImg(i);}} className={`w-2 h-2 rounded-full transition ${i===selImg?'bg-white':'bg-white/40'}`}/>)}</div>
      </div>}

      {/* Mobile sticky bottom CTA */}
      <div className="fixed bottom-14 left-0 right-0 z-40 lg:hidden bg-white border-t border-gray-100 px-4 py-3 flex gap-3 shadow-2xl">
        <div className="flex-1"><div className="text-xs text-gray-400">{p.type==='rent'?'Oylik ijara':'Narx'}</div><div className="font-extrabold text-emerald-700">${p.type==='rent'?p.price:(p.price||0).toLocaleString()} <span className="text-xs font-normal text-gray-400">USD</span></div></div>
        {ownerPhone
          ?<a href={`tel:${ownerPhone}`} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-700 to-emerald-500 text-white font-bold rounded-xl text-sm shadow active:scale-95 transition"><i className="ri-phone-fill"/>Qo'ng'iroq</a>
          :<button onClick={()=>dispatch({type:'CONTACT',payload:true})} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-700 to-emerald-500 text-white font-bold rounded-xl text-sm shadow active:scale-95 transition"><i className="ri-phone-fill"/>Qo'ng'iroq</button>}
        <button onClick={()=>startChat()} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 font-semibold rounded-xl text-sm active:scale-95 transition"><i className="ri-chat-3-line"/>Chat</button>
      </div>
      <div className="pb-20 lg:pb-0 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-extrabold leading-tight">{p.title}</h1>
            <button onClick={()=>setShowShare(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-200 transition active:scale-95 shrink-0"><i className="ri-share-forward-line"/>Ulashish</button>
          </div>
          <p className="flex items-center gap-1.5 text-gray-500 mb-5"><i className="ri-map-pin-2-fill text-emerald-600"/>{p.address}, {p.district}, Toshkent</p>
          <div className="flex flex-wrap gap-2 mb-7">
            {[`${p.rooms} xona`,`${p.area} m²`,p.floor?`${p.floor}-qavat`:'',p.type==='rent'?'Ijara':'Sotuv',p.propertyCategory||''].filter(Boolean).map(t=><span key={t} className="bg-emerald-50 text-emerald-800 px-3.5 py-1.5 rounded-full text-sm font-medium">{t}</span>)}
            {p.viewsCount&&p.viewsCount>0?<span className="bg-gray-50 text-gray-500 px-3.5 py-1.5 rounded-full text-sm flex items-center gap-1"><i className="ri-eye-line"/>{p.viewsCount} ko'rish</span>:null}
          </div>
          {/* Tavsif + AI tarjima */}
          <div className="mb-8"><h3 className="font-bold text-lg mb-3 flex items-center gap-2"><i className="ri-article-line text-emerald-600"/>Tavsif</h3>
            <AiTranslator text={p.desc} title={p.title}/>
          </div>
          {/* AI narx bashorati */}
          <div className="mb-8"><AiPriceAssessment listing={p} districtAvg={Math.round(state.approved.filter(x=>x.district===p.district&&x.type===p.type).reduce((s,x,_,a)=>s+x.price/a.length,0))||p.price}/></div>
          {/* YouTube video embed */}
          {p.videoUrl&&(()=>{const ytId=getYtId(p.videoUrl);return ytId?(<div className="mb-8"><h3 className="font-bold text-lg mb-4 flex items-center gap-2"><i className="ri-youtube-line text-red-500"/>Video</h3><div className="rounded-2xl overflow-hidden shadow-sm aspect-video"><iframe src={`https://www.youtube.com/embed/${ytId}`} title="Video" allowFullScreen className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"/></div></div>):(<div className="mb-8"><h3 className="font-bold text-lg mb-4 flex items-center gap-2"><i className="ri-video-line text-emerald-600"/>Video</h3><a href={p.videoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition"><i className="ri-play-circle-fill text-2xl text-emerald-600"/><span className="text-sm font-medium text-emerald-700 underline">{p.videoUrl}</span></a></div>);})()}
          {amenList.length>0&&<div className="bg-emerald-50 rounded-2xl p-6 mb-8"><h3 className="font-bold text-lg mb-4 flex items-center gap-2"><i className="ri-sparkling-2-fill text-emerald-600"/>Qulayliklar</h3><div className="grid grid-cols-2 gap-3">{amenList.map(a=><div key={a.id} className="flex items-center gap-2.5 text-gray-700 font-medium text-sm bg-white px-3 py-2.5 rounded-xl"><i className={`${a.icon} text-emerald-600 text-base`}/>{a.label}</div>)}</div></div>}
          {/* Infrastructure Map (Module 10) */}
          {p.lat&&p.lng&&<div className="mb-8"><h3 className="font-bold text-lg mb-4 flex items-center gap-2"><i className="ri-community-line text-emerald-600"/>Infratuzilma</h3><InfraMap lat={p.lat} lng={p.lng}/></div>}
          {/* Map */}
          {p.lat&&p.lng&&<div className="mb-8"><h3 className="font-bold text-lg mb-4 flex items-center gap-2"><i className="ri-map-2-line text-emerald-600"/>Xaritada joylashuv</h3><div className="rounded-2xl overflow-hidden h-64 shadow-sm"><MapContainer center={[p.lat,p.lng]} zoom={15} className="w-full h-full z-0" scrollWheelZoom={false}><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/><Marker position={[p.lat,p.lng]} icon={greenIcon}><Popup>{p.title}</Popup></Marker></MapContainer></div></div>}
          {/* Mortgage Calculator (Module 11) */}
          {p.type==='sale'&&<div className="mb-8"><MortgageCalc price={p.price}/></div>}
          {/* Kommunal xarajatlar kalkulyatori */}
          <div className="mb-8"><UtilityCalc area={p.area||0}/></div>
          {/* Ijara shartnomasi generator */}
          {p.type==='rent'&&<div className="mb-8"><ContractGenerator listing={p} user={state.currentUser}/></div>}
          {/* Similar listings (Module 21) */}
          {similar.length>0&&<div className="mb-8"><h3 className="font-bold text-lg mb-4 flex items-center gap-2"><i className="ri-home-3-line text-emerald-600"/>O'xshash e'lonlar</h3><div className="grid sm:grid-cols-2 gap-4">{similar.map(s=><Card key={s.id} p={s}/>)}</div></div>}
          {/* Report button (Module 20) */}
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-5 text-center">
            <p className="text-gray-500 text-sm mb-3 flex items-center justify-center gap-1"><i className="ri-alert-line text-amber-500"/>E'lon bilan muammo bormi?</p>
            <button onClick={()=>{if(!state.auth){dispatch({type:'AUTH_REQ',payload:{open:true,action:'Shikoyat'}});return;}setShowReport(true);}} className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-red-200 text-red-500 font-semibold rounded-xl text-sm hover:bg-red-50 transition mx-auto"><i className="ri-flag-line"/>Adminga xabar yuboring</button>
          </div>
        </div>
        <div className="hidden lg:block">
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 sticky top-20">
            <div className="text-gray-500 text-sm">{p.type==='rent'?'Oylik ijara narxi':'Sotuv narxi'}</div>
            <div className="text-4xl font-extrabold text-emerald-700 mt-1 mb-4">${p.type==='rent'?p.price:(p.price||0).toLocaleString()}<span className="text-sm text-gray-400 font-normal ml-1">USD{p.type==='rent'?'/oy':''}</span></div>
            {ownerPhone
              ?<a href={`tel:${ownerPhone}`} className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-emerald-700 to-emerald-500 text-white font-bold rounded-xl mt-4 shadow-lg shadow-emerald-500/25 hover:shadow-xl transition active:scale-95"><i className="ri-phone-fill"/>Qo'ng'iroq: {ownerPhone}</a>
              :<button onClick={()=>dispatch({type:'CONTACT',payload:true})} className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-emerald-700 to-emerald-500 text-white font-bold rounded-xl mt-4 shadow-lg shadow-emerald-500/25 hover:shadow-xl transition active:scale-95"><i className="ri-phone-fill"/>Qo'ng'iroq qilish</button>}
            <button onClick={()=>startChat()} className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-50 text-emerald-700 font-semibold rounded-xl mt-3 hover:bg-emerald-100 transition active:scale-95"><i className="ri-chat-3-line"/>Xabar yozish</button>
            <button onClick={startAdminChat} className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-50 text-gray-600 font-medium rounded-xl mt-2 hover:bg-gray-100 transition active:scale-95 text-sm"><i className="ri-customer-service-2-line"/>Admin bilan bog'lanish</button>
            <button onClick={()=>{if(!state.auth){dispatch({type:'AUTH_REQ',payload:{open:true,action:'Ko\'rik so\'rovi'}});return;}setShowViewing(true);}} className="w-full flex items-center justify-center gap-2 py-3.5 bg-white border-2 border-emerald-100 text-emerald-700 font-semibold rounded-xl mt-3 hover:bg-emerald-50 transition active:scale-95 text-sm"><i className="ri-calendar-check-line"/>Ko'rikka yozilish</button>
            <button onClick={()=>{if(!state.auth){dispatch({type:'AUTH_REQ',payload:{open:true,action:'Sharh qoldirish'}});return;}dispatch({type:'NAV',payload:'review'});}} className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border-2 border-gray-100 text-gray-600 font-semibold rounded-xl mt-3 hover:bg-gray-50 transition active:scale-95 text-xs"><i className="ri-star-line"/>Xizmatni baholash</button>
            <div className="flex items-center gap-3 mt-5 pt-5 border-t border-gray-100">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-400 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow">{initials(p.owner||'TO')}</div>
              <div><div className="font-bold text-sm">{p.owner||'ToshkentOasis'}</div>{p.telegram&&<div className="text-xs text-gray-500 mt-1">Telegram: <a href={`https://t.me/${p.telegram.replace(/^@/,'')}`} target="_blank" rel="noreferrer" className="text-emerald-700">{p.telegram}</a></div>}</div>
            </div>
            {p.phone&&<a href={`tel:${p.phone}`} className="flex items-center gap-2 mt-3 p-3 bg-gray-50 rounded-xl text-sm text-gray-700 hover:bg-gray-100 transition"><i className="ri-phone-line text-emerald-600"/>{p.phone}</a>}
          </div>
        </div>
      </div>
      {showShare&&<ShareModal listing={p} onClose={()=>setShowShare(false)}/>}
      {showViewing&&<ViewingModal listing={p} onClose={()=>setShowViewing(false)}/>}
      {showReport&&<ReportModal listing={p} onClose={()=>setShowReport(false)}/>}
    </div>
  );
}

// ─── CHAT PAGE ──────────────────────────────────────────────
function ChatPage(){
  const{state}=useApp();
  if(!state.auth) return <AuthPage/>;
  const u=state.currentUser!;
  const partnerId=state.chatTarget;
  const[msgs,setMsgs]=useState<ChatMessage[]>([]);
  const[text,setText]=useState('');
  const endRef=useRef<HTMLDivElement>(null);
  const[threads,setThreads]=useState<{userId:string;name:string;lastMsg:ChatMessage}[]>(ChatAPI.getThreads(u.id));
  const[showHouseModal,setShowHouseModal]=useState(false);
  const[showComplaintModal,setShowComplaintModal]=useState(false);
  const[complaintText,setComplaintText]=useState('');
  const[complaintImg,setComplaintImg]=useState<File|null>(null);
  const[complaintImgPreview,setComplaintImgPreview]=useState('');
  const[houseSearch,setHouseSearch]=useState('');

  const{dispatch}=useApp();
  const adminUser = AuthAPI.getUsers().find(x=>x.role==='admin');
  const adminId = adminUser?.id;

  const loadMsgs=async()=>{
    if(partnerId){
      console.log('Xabarlar yuklanmoqda:', partnerId);
      const m=await ChatAPI.fetchThread(isAdmin(u)?partnerId:u.id,isAdmin(u)?u.id:partnerId);
      console.log('Fetched messages:', m.length);
      setMsgs(m);
      await ChatAPI.markReadRemote(partnerId,u.id);
    }
    const threadsRes=await ChatAPI.fetchThreads(u.id);
    setThreads(threadsRes);
  };

  useEffect(()=>{
    if(!partnerId) return;
    loadMsgs();
    const unsub=ChatAPI.listenMessages(all=>{
      const threadMsgs=all.filter(m=>(m.from===u.id&&m.to===partnerId)||(m.from===partnerId&&m.to===u.id)).sort((a,b)=>new Date(a.time).getTime()-new Date(b.time).getTime());
      setMsgs(threadMsgs);
      if(threadMsgs.some(m=>m.to===u.id&&!m.read)){
        void ChatAPI.markReadRemote(isAdmin(u)?partnerId:u.id,isAdmin(u)?u.id:partnerId);
      }
      setThreads(ChatAPI.getThreads(u.id));
      dispatch({type:'CHAT_SYNC',payload:Date.now()});
    });
    return()=>{try{unsub();}catch{}};
  },[partnerId,u.id,dispatch]);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'});},[msgs.length]);

  const send=async()=>{
    if(!text.trim()||!partnerId)return;
    const msg=text.trim();
    await ChatAPI.send(u.id,partnerId,msg);
    // Telegram notification to the recipient
    if(!isAdmin(u)&&partnerId===adminId){
      notifyAdmin(`💬 <b>Yangi xabar</b>\n👤 ${u.name||u.email||'Foydalanuvchi'}: ${msg.slice(0,200)}`);
    } else if(isAdmin(u)){
      notifyUser(partnerId,`💬 <b>Admin xabari</b>\n${msg.slice(0,200)}\n\n👉 https://uynest.vercel.app`);
    }
    setText('');await loadMsgs();
  };

  const sendHouse=async(p:Listing)=>{if(!partnerId) return;try{const msg=`Uy topdim: ${p.title} (id:${p.id})\nNarx: $${p.price}${p.type==='rent'?'/oy':''}\nManzil: ${p.address||p.district}\nXonalar: ${p.rooms}\nMaydon: ${p.area} m²\n${p.img}`;setShowHouseModal(false);setText('');await ChatAPI.send(u.id,partnerId,msg);await loadMsgs();toast('Uy yuborildi!');}catch(e){toast('Xatolik yuz berdi','error');console.error('Send house error:',e);}};

  const deleteChat = async () => {
    if (!confirm('Haqiqatan ham bu chatni o\'chirishni xohlaysizmi? Barcha xabarlar o\'chib ketadi.')) return;
    await ChatAPI.deleteThread(u.id, partnerId!);
    dispatch({type:'CHAT_TARGET',payload:null});
    setMsgs([]);
    await loadMsgs();
  };

  const sendComplaint = async () => {
    if (!complaintText.trim()) return;
    let text = `Shikoyat: ${complaintText}`;
    if(complaintImg){
      try{
        const url = await uploadComplaintImage(complaintImg);
        text += `\n${url}`;
      }catch(err){ console.error('Image upload error:', err); }
    }
    await ChatAPI.send(u.id, adminId!, text);
    setShowComplaintModal(false);
    setComplaintText('');
    setComplaintImg(null);
    setComplaintImgPreview('');
    toast('Shikoyat yuborildi');
  };

  // For admin: show thread list on left
  if(isAdmin(u)){
    const users=AuthAPI.getUsers();
    const[adminMobileView,setAdminMobileView]=useState<'contacts'|'chat'>(state.chatTarget?'chat':'contacts');
    const selectThread=(id:string)=>{dispatch({type:'CHAT_TARGET',payload:id});setAdminMobileView('chat');};
    const backToThreads=()=>{dispatch({type:'CHAT_TARGET',payload:null});setAdminMobileView('contacts');};
    const selName=users.find(x=>x.id===state.chatTarget)?.name||'?';
    const adminContactsList=(
      <div className={`${adminMobileView==='chat'?'hidden md:flex':'flex'} w-full md:w-80 border-r border-gray-100 flex-col shrink-0`}>
        <div className="p-4 border-b border-gray-100"><h3 className="font-bold text-lg flex items-center gap-2"><i className="ri-chat-3-line text-emerald-600"/>Xabarlar</h3></div>
        <div className="flex-1 overflow-y-auto">
          {threads.length===0&&<div className="p-8 text-center text-gray-400 text-sm">Hozircha xabar yo'q</div>}
          {threads.map(t=>{const tu=users.find(x=>x.id===t.userId);const unr=ChatAPI.getAll().filter(m=>m.from===t.userId&&m.to===u.id&&!m.read).length;return(
            <button key={t.userId} onClick={()=>selectThread(t.userId)} className={`w-full flex items-center gap-3 p-4 hover:bg-emerald-50 transition text-left border-b border-gray-50 ${state.chatTarget===t.userId?'bg-emerald-50 border-l-4 border-l-emerald-500':''}`}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-400 text-white flex items-center justify-center font-bold text-sm shrink-0">{initials(tu?.name||t.name)}</div>
              <div className="flex-1 min-w-0"><div className="font-bold text-sm truncate">{tu?.name||t.name}{tu?.role==='admin'&&<i className="ri-verified-badge-fill text-emerald-500 text-xs ml-1"/>}</div><div className="text-xs text-gray-400 truncate">{t.lastMsg.text}</div></div>
              <div className="flex flex-col items-end gap-1"><span className="text-[10px] text-gray-400">{fmtTime(t.lastMsg.time)}</span>{unr>0&&<span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">{unr}</span>}</div>
            </button>
          );})}
        </div>
      </div>
    );
    const adminChatPanel=(
      <div className={`${adminMobileView==='contacts'?'hidden md:flex':'flex'} flex-1 flex-col min-w-0`}>
        {state.chatTarget?(
          <>
            <div className="h-14 md:h-16 px-3 md:px-6 bg-white border-b border-gray-100 flex items-center gap-3">
              <button onClick={backToThreads} className="md:hidden w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 shrink-0 active:scale-90 transition"><i className="ri-arrow-left-line text-lg"/></button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-400 text-white flex items-center justify-center font-bold text-xs shrink-0">{initials(selName)}</div>
              <div className="flex-1 min-w-0"><div className="font-bold text-sm truncate">{selName}</div><div className="text-[11px] text-emerald-500 font-semibold">Foydalanuvchi</div></div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={deleteChat} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition" title="Chatni o'chirish"><i className="ri-delete-bin-line"/></button>
                <button onClick={()=>setShowComplaintModal(true)} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition" title="Shikoyat"><i className="ri-flag-line"/></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-3 bg-gray-50/50">
              {msgs.map(m=><div key={m.id} className={`flex ${m.from===u.id?'justify-end':'justify-start'}`}><div className={`max-w-[80%] md:max-w-[70%] px-3 md:px-4 py-2.5 md:py-3 rounded-2xl text-sm leading-relaxed ${m.from===u.id?'bg-gradient-to-r from-emerald-700 to-emerald-600 text-white rounded-tr-sm':'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm'}`}>{renderMessage(m)}<div className={`text-[10px] mt-1 ${m.from===u.id?'text-emerald-200 text-right':'text-gray-400'}`}>{fmtTime(m.time)}</div></div></div>)}
              <div ref={endRef}/>
            </div>
            <div className="p-3 md:p-4 bg-white border-t border-gray-100 flex gap-2 md:gap-3"><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Javob yozing..." className="flex-1 px-3 md:px-4 py-3 bg-gray-50 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 ring-emerald-200 transition"/><button onClick={()=>setShowHouseModal(true)} className="w-11 h-11 md:w-12 md:h-12 bg-gray-100 text-gray-600 rounded-2xl flex items-center justify-center hover:bg-gray-200 transition shrink-0" title="Uy tashlash"><i className="ri-home-4-line"/></button><button onClick={send} className="w-11 h-11 md:w-12 md:h-12 bg-gradient-to-r from-emerald-700 to-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25 hover:shadow-xl transition active:scale-95 shrink-0"><i className="ri-send-plane-fill"/></button></div>
          </>
        ):(<div className="flex-1 flex items-center justify-center text-gray-400"><div className="text-center"><i className="ri-chat-smile-3-line text-6xl text-gray-200 block mb-4"/><p className="font-semibold">Suhbatni tanlang</p><p className="text-sm">Chap tarafdan foydalanuvchini tanlang</p></div></div>)}
      </div>
    );
    return(
      <div className="flex h-[calc(100vh-60px-56px)] md:h-[calc(100vh-68px)] bg-white">
        {adminContactsList}
        {adminChatPanel}
        {showHouseModal&&<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={()=>setShowHouseModal(false)}><div className="bg-white rounded-3xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e=>e.stopPropagation()}><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg">Uy tanlang</h3><button onClick={()=>setShowHouseModal(false)} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">✕</button></div><div className="grid sm:grid-cols-2 gap-4">{state.approved.slice(0,20).map(p=><button key={p.id} onClick={()=>sendHouse(p)} className="p-4 border border-gray-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50 transition text-left"><div className="font-bold text-sm truncate">{p.title}</div><div className="text-xs text-gray-500">{p.district} • ${p.price}{p.type==='rent'?'/oy':''}</div></button>)}</div></div></div>}
        {showComplaintModal&&<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={()=>{setShowComplaintModal(false);setComplaintText('');}}><div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4" onClick={e=>e.stopPropagation()}><h3 className="font-bold text-lg mb-4">Shikoyat</h3><textarea value={complaintText} onChange={e=>setComplaintText(e.target.value)} className="w-full border rounded-xl p-3 text-sm h-28 resize-none outline-none" placeholder="Shikoyat matnini yozing..."/><div className="flex gap-3 mt-4"><button onClick={()=>{setShowComplaintModal(false);setComplaintText('');}} className="flex-1 py-2.5 border rounded-xl text-sm font-semibold">Bekor qilish</button><button onClick={sendComplaint} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold">Yuborish</button></div></div></div>}
      </div>
    );
  }

  const threadsForUser = ChatAPI.getThreads(u.id);
  const contacts = threadsForUser.map(t=>{
    const user = AuthAPI.getUsers().find(x=>x.id===t.userId);
    return user || {id:t.userId,name:t.name,email:'',phone:'',avatar:'',provider:'',role:'user',passHash:null,createdAt:'',lastLogin:''};
  }).filter(c=>c.role!=='admin');
  if(partnerId && !contacts.some(c=>c.id===partnerId)){
    const extra = AuthAPI.getUsers().find(x=>x.id===partnerId);
    if(extra && extra.role!=='admin') contacts.unshift(extra);
  }
  // Admin always at top
  if(adminUser && !contacts.some(c=>c.id===adminId)) contacts.unshift(adminUser);

  // Mobile: show contacts or chat view
  const[mobileView,setMobileView]=useState<'contacts'|'chat'>(partnerId?'chat':'contacts');
  const selectContact=(id:string)=>{dispatch({type:'CHAT_TARGET',payload:id});setMobileView('chat');};
  const backToContacts=()=>{dispatch({type:'CHAT_TARGET',payload:null});setMobileView('contacts');};

  const contactName=partnerId===adminId?'Admin':contacts.find(x=>x.id===partnerId)?.name||adminUser?.name||'Foydalanuvchi';

  const contactsList=(
    <div className={`${mobileView==='chat'?'hidden md:flex':'flex'} w-full md:w-80 border-r border-gray-100 flex-col shrink-0`}>
      <div className="p-4 border-b border-gray-100"><h3 className="font-bold text-lg flex items-center gap-2"><i className="ri-contacts-line text-emerald-600"/>Kontaktlar</h3></div>
      <div className="flex-1 overflow-y-auto">
        {contacts.length===0&&<div className="p-8 text-center text-gray-400 text-sm">Hozircha suhbat yo'q. Uy sahifasidan xabar yuboring.</div>}
        {contacts.map(contact=>{const unr=ChatAPI.getAll().filter(m=>m.from===contact.id&&m.to===u.id&&!m.read).length;return(
          <button key={contact.id} onClick={()=>selectContact(contact.id)} className={`w-full flex items-center gap-3 p-4 hover:bg-emerald-50 transition text-left border-b border-gray-50 ${state.chatTarget===contact.id?'bg-emerald-50 border-l-4 border-l-emerald-500':''}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-400 text-white flex items-center justify-center font-bold text-sm shrink-0">{initials(contact.role==='admin'?'Admin':contact.name)}</div>
            <div className="flex-1 min-w-0"><div className="font-bold text-sm truncate">{contact.role==='admin'?'Admin':contact.name}{contact.role==='admin'&&<i className="ri-verified-badge-fill text-emerald-500 text-xs ml-1"/>}</div><div className="text-xs text-gray-400 truncate">{contact.role==='admin'?'UyNest Administrator':contact.email||contact.phone||'Kontakt mavjud'}</div></div>
            {unr>0&&<span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">{unr}</span>}
          </button>
        );})}
      </div>
      <div className="p-4 border-t border-gray-100">
        <button onClick={()=>selectContact(adminId!)} className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-emerald-700 to-emerald-500 text-white font-semibold rounded-xl text-sm shadow active:scale-95 transition"><i className="ri-customer-service-2-line"/>Admin bilan bog'lanish</button>
      </div>
    </div>
  );

  const chatPanel=(
    <div className={`${mobileView==='contacts'?'hidden md:flex':'flex'} flex-1 flex-col min-w-0`}>
      {partnerId ? (
        <>
          <div className="h-14 md:h-16 px-3 md:px-6 bg-white border-b border-gray-100 flex items-center gap-3">
            <button onClick={backToContacts} className="md:hidden w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 shrink-0 active:scale-90 transition"><i className="ri-arrow-left-line text-lg"/></button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-400 text-white flex items-center justify-center font-bold text-xs shrink-0">{initials(contactName)}</div>
            <div className="flex-1 min-w-0"><div className="font-bold text-sm truncate">{contactName}</div><div className="text-[11px] text-emerald-500 font-semibold">{partnerId===adminId?'Admin':'Foydalanuvchi'}</div></div>
            <div className="flex gap-1.5 shrink-0">
              <button onClick={deleteChat} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition" title="Chatni o'chirish"><i className="ri-delete-bin-line"/></button>
              <button onClick={()=>setShowComplaintModal(true)} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition" title="Shikoyat"><i className="ri-flag-line"/></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-3 bg-gray-50/50">
            {msgs.length===0&&<div className="text-center py-12 text-gray-400"><i className="ri-chat-3-line text-5xl text-gray-200 block mb-3"/><p className="font-semibold">Suhbatni boshlang</p></div>}
            {msgs.map(m=><div key={m.id} className={`flex ${m.from===u.id?'justify-end':'justify-start'}`}><div className={`max-w-[80%] md:max-w-[75%] px-3 md:px-4 py-2.5 md:py-3 rounded-2xl text-sm leading-relaxed ${m.from===u.id?'bg-gradient-to-r from-emerald-700 to-emerald-600 text-white rounded-tr-sm':'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm'}`}>{m.text.includes('Uy topdim:')?<button onClick={()=>{const id=m.text.match(/\(id:(\d+)\)/)?.[1]||m.text.match(/id:(\d+)/)?.[1];if(id)dispatch({type:'DETAIL',payload:parseInt(id)});}} className={`${m.from===u.id?'text-emerald-200 underline':'text-emerald-700 underline'}`}>{renderMessage(m)}</button>:renderMessage(m)}<div className={`text-[10px] mt-1 ${m.from===u.id?'text-emerald-200 text-right':'text-gray-400'}`}>{fmtTime(m.time)}{m.from===u.id&&<span className="ml-1">{m.read?'✓✓':'✓'}</span>}</div></div></div>)}
            <div ref={endRef}/>
          </div>
          <div className="p-3 md:p-4 bg-white border-t border-gray-100 flex gap-2 md:gap-3">
            <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Xabar yozing..." className="flex-1 px-3 md:px-4 py-3 bg-gray-50 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 ring-emerald-200 transition"/>
            <button onClick={()=>setShowHouseModal(true)} className="w-11 h-11 md:w-12 md:h-12 bg-gray-100 text-gray-600 rounded-2xl flex items-center justify-center hover:bg-gray-200 transition shrink-0" title="Uy tashlash"><i className="ri-home-4-line"/></button>
            <button onClick={send} className="w-11 h-11 md:w-12 md:h-12 bg-gradient-to-r from-emerald-700 to-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25 hover:shadow-xl transition active:scale-95 shrink-0"><i className="ri-send-plane-fill"/></button>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4 p-6">
          <i className="ri-chat-smile-3-line text-6xl text-gray-200 block"/>
          <p className="font-semibold">Kontaktni tanlang</p>
          <p className="text-sm text-center">Chap tarafdan suhbat qilmoqchi bo'lgan foydalanuvchini tanlang</p>
        </div>
      )}
    </div>
  );

  return(
    <div className="flex h-[calc(100vh-60px-56px)] md:h-[calc(100vh-68px)] bg-white">
      {contactsList}
      {chatPanel}
      {showHouseModal&&<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={()=>setShowHouseModal(false)}><div className="bg-white rounded-3xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e=>e.stopPropagation()}><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg">Uy tanlang</h3><button onClick={()=>setShowHouseModal(false)} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">✕</button></div><div className="flex items-center gap-2 bg-emerald-50 rounded-xl px-4 py-2.5 mb-4"><i className="ri-search-line text-gray-400"/><input className="bg-transparent flex-1 text-sm outline-none" placeholder="Uy qidirish..." value={houseSearch} onChange={e=>setHouseSearch(e.target.value)}/></div><div className="grid sm:grid-cols-2 gap-4">{state.approved.filter(p=>!houseSearch||p.title.toLowerCase().includes(houseSearch.toLowerCase())||p.district.toLowerCase().includes(houseSearch.toLowerCase())).slice(0,20).map(p=><button key={p.id} onClick={()=>sendHouse(p)} className="p-4 border border-gray-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50 transition text-left"><div className="font-bold text-sm truncate">{p.title}</div><div className="text-xs text-gray-500">{p.district} • ${p.price}{p.type==='rent'?'/oy':''}</div></button>)}</div></div></div>}
      {showComplaintModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={()=>{setShowComplaintModal(false);setComplaintText('');setComplaintImg(null);setComplaintImgPreview('');}}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4" onClick={e=>e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><i className="ri-flag-line text-red-500"/>Shikoyat yuborish</h3>
            <textarea value={complaintText} onChange={e=>setComplaintText(e.target.value)} placeholder="Muammo haqida batafsil yozing..." className="w-full p-3 border border-gray-200 rounded-xl mb-3 resize-none focus:border-emerald-400 outline-none transition" rows={4}></textarea>
            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Rasm qo'shish (ixtiyoriy)</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-sm text-gray-600 cursor-pointer hover:bg-gray-100 transition">
                  <i className="ri-image-add-line text-emerald-600"/>Rasm tanlash
                  <input type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f){setComplaintImg(f);const r=new FileReader();r.onload=()=>setComplaintImgPreview(r.result as string);r.readAsDataURL(f);}}}/>
                </label>
                {complaintImgPreview&&<div className="relative w-14 h-14 rounded-lg overflow-hidden border border-gray-200"><img src={complaintImgPreview} alt="" className="w-full h-full object-cover"/><button type="button" onClick={()=>{setComplaintImg(null);setComplaintImgPreview('');}} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center">✕</button></div>}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={()=>{setShowComplaintModal(false);setComplaintText('');setComplaintImg(null);setComplaintImgPreview('');}} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm active:scale-95 transition">Bekor qilish</button>
              <button onClick={sendComplaint} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-semibold text-sm active:scale-95 transition">Yuborish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── REQUEST PAGE ────────────────────────────────────────────
function RequestPage(){
  const{state,dispatch}=useApp();
  const[showPayment,setShowPayment]=useState(false);
  const[pendingReq,setPendingReq]=useState<AppRequest|null>(null);
  const[selRegion,setSelRegion]=useState('Toshkent shahri');
  const[selAmens,setSelAmens]=useState<string[]>([]);
  const[listingType,setListingType]=useState<'ijara'|'sotuv'>('ijara');
  const[showPhoneConnect,setShowPhoneConnect]=useState(false);

  if(!state.auth){
    return(
      <div className="min-h-[calc(100vh-68px)] flex items-center justify-center p-5 bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
        <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-300 text-white flex items-center justify-center text-3xl mx-auto mb-4"><i className="ri-shield-user-line"/></div>
          <h3 className="text-xl font-extrabold mb-2">Avval ro'yxatdan o'ting</h3>
          <p className="text-gray-500 text-sm mb-5">Uy topib berish uchun tizimga kiring.</p>
          <button onClick={()=>{dispatch({type:'AUTH_TAB',payload:'register'});dispatch({type:'NAV',payload:'auth'});}} className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-emerald-700 to-emerald-500 text-white font-bold rounded-xl mb-3 shadow active:scale-95 transition-transform"><i className="ri-user-add-line"/>Ro'yxatdan o'tish</button>
          <button onClick={()=>{dispatch({type:'AUTH_TAB',payload:'login'});dispatch({type:'NAV',payload:'auth'});}} className="w-full flex items-center justify-center gap-2 py-3.5 bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:border-emerald-300 transition active:scale-95"><i className="ri-login-circle-line"/>Kirish</button>
        </div>
      </div>
    );
  }

  const ic="w-full px-4 py-3 bg-emerald-50 border border-transparent focus:border-emerald-400 focus:bg-white rounded-xl text-sm outline-none transition";
  const districtList=REGIONS_MAP[selRegion]||[];

  const desiredAmens=[
    {id:'wifi',label:'Wi-Fi',icon:'ri-wifi-line'},{id:'furn',label:'Mebel bor',icon:'ri-sofa-line'},
    {id:'ac',label:'Konditsioner',icon:'ri-snowy-line'},{id:'parking',label:'Avtoturas',icon:'ri-parking-line'},
    {id:'metro_5min',label:'Metro yaqin',icon:'ri-train-line'},{id:'elevator',label:'Lift',icon:'ri-arrow-up-down-line'},
    {id:'gym',label:'Sport zal',icon:'ri-boxing-line'},{id:'pool',label:'Basseyn',icon:'ri-drop-line'},
    {id:'cctv',label:'CCTV',icon:'ri-camera-line'},{id:'generator',label:'Generator',icon:'ri-flashlight-line'},
    {id:'balcony',label:'Balkon',icon:'ri-hotel-line'},{id:'euro_remont',label:'Evro ta\'mir',icon:'ri-paint-brush-line'},
  ];

  const hs=async(e:React.FormEvent<HTMLFormElement>)=>{
    e.preventDefault();
    const userPhone=state.currentUser?.phone||'';
    if(!userPhone){setShowPhoneConnect(true);return;}
    const fd=new FormData(e.currentTarget);
    const req:AppRequest={
      id:Date.now(),
      name:state.currentUser?.name||(fd.get('name') as string)||'',
      phone:userPhone,
      region:selRegion,
      district:fd.get('district') as string,
      listingType,
      propertyCategory:fd.get('propertyCategory') as string,
      rooms:fd.get('rooms') as string,
      minArea:fd.get('minArea') as string,
      budgetFrom:fd.get('budgetFrom') as string,
      budgetTo:fd.get('budgetTo') as string,
      people:fd.get('people') as string,
      movingDate:fd.get('movingDate') as string,
      floor:fd.get('floor') as string,
      furnishing:fd.get('furnishing') as string,
      amenities:selAmens,
      notes:fd.get('notes') as string,
      createdAt:new Date().toISOString(),
    };
    setPendingReq(req);
    setShowPayment(true);
  };

  const submitAfterPayment=async()=>{
    if(!pendingReq) return;
    dispatch({type:'ADD_REQUEST',payload:pendingReq});
    await RequestsAPI.add(pendingReq);
    toast("So'rov yuborildi! Admin 24 soat ichida bog'lanadi");
    setPendingReq(null);
    setTimeout(()=>{dispatch({type:'NAV',payload:'home'});window.scrollTo({top:0});},1400);
  };

  return(
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8 p-5 bg-gradient-to-r from-emerald-700 to-emerald-500 rounded-3xl text-white shadow-xl shadow-emerald-500/20">
        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl shrink-0"><i className="ri-home-search-line"/></div>
        <div>
          <div className="text-xl font-extrabold">Sizga mos uy topib beramiz</div>
          <div className="text-emerald-100 text-sm mt-0.5">Talablaringizni kiriting — 24 soat ichida eng yaxshi variantlarni taqdim etamiz</div>
          <div className="mt-2 inline-flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-xs font-bold"><i className="ri-secure-payment-line"/>Xizmat narxi: 150,000 so'm</div>
        </div>
      </div>

      <form onSubmit={hs} className="space-y-5">

        {/* BLOCK 1: Mulk turi */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-base mb-4 flex items-center gap-2"><span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-extrabold">1</span>Mulk turi</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button type="button" onClick={()=>setListingType('ijara')} className={`py-3.5 rounded-xl font-bold text-sm border-2 transition active:scale-95 flex items-center justify-center gap-2 ${listingType==='ijara'?'bg-blue-500 text-white border-blue-500':'bg-white border-gray-200 text-gray-600 hover:border-blue-300'}`}><i className="ri-key-2-line"/>Ijara</button>
            <button type="button" onClick={()=>setListingType('sotuv')} className={`py-3.5 rounded-xl font-bold text-sm border-2 transition active:scale-95 flex items-center justify-center gap-2 ${listingType==='sotuv'?'bg-emerald-600 text-white border-emerald-600':'bg-white border-gray-200 text-gray-600 hover:border-emerald-300'}`}><i className="ri-shopping-bag-3-line"/>Sotuv</button>
          </div>
          <div><label className="text-sm font-semibold mb-1.5 block">Ko'chmas mulk kategoriyasi</label>
            <select name="propertyCategory" required className={ic}>
              <option value="">Tanlang...</option>
              {PROPERTY_CATEGORIES.map((c:string)=><option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* BLOCK 2: Joylashuv */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-base mb-4 flex items-center gap-2"><span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-extrabold">2</span>Joylashuv</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Viloyat *</label>
              <select className={ic} value={selRegion} onChange={e=>setSelRegion(e.target.value)} required>
                {Object.keys(REGIONS_MAP).map((r:string)=><option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Tuman / Shahar *</label>
              <select name="district" required className={ic}>
                <option value="">Barcha tumanlar</option>
                {districtList.map((d:string)=><option key={d}>{d}</option>)}
              </select>
              <p className="text-xs text-gray-400 mt-1">Bitta tuman ko'rsating yoki bo'sh qoldiring</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-emerald-50 rounded-xl text-xs text-emerald-700 flex items-start gap-2">
            <i className="ri-information-line text-base shrink-0"/>
            <span>Bir nechta tuman kerak bo'lsa, quyidagi "Qo'shimcha talablar" bo'limida yozing.</span>
          </div>
        </div>

        {/* BLOCK 3: Parametrlar */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-base mb-4 flex items-center gap-2"><span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-extrabold">3</span>Xona va maydon</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Xonalar soni</label>
              <select name="rooms" className={ic}>
                <option value="">Istagan</option>
                {[1,2,3,4,5,6].map(n=><option key={n} value={n}>{n} xona</option>)}
                <option value="7+">7+ xona</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Min. maydon (m²)</label>
              <input name="minArea" type="number" placeholder="40" min={1} className={ic}/>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Qavat</label>
              <select name="floor" className={ic}>
                <option value="">Muhim emas</option>
                <option>1-qavat emas</option>
                <option>Oxirgi qavat emas</option>
                <option>Past qavat (1-3)</option>
                <option>O'rta qavat (4-7)</option>
                <option>Yuqori qavat (8+)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Mebel</label>
              <select name="furnishing" className={ic}>
                <option value="">Muhim emas</option>
                <option>To'liq mebel</option>
                <option>Qisman mebel</option>
                <option>Mebelsiz</option>
              </select>
            </div>
          </div>
        </div>

        {/* BLOCK 4: Byudjet va muhlat */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-base mb-4 flex items-center gap-2"><span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-extrabold">4</span>Byudjet va muhlat</h3>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-semibold mb-1.5 block">{listingType==='ijara'?'Oylik ijara ($ dan)':'Narx ($ dan)'} *</label>
              <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span><input name="budgetFrom" type="number" placeholder="200" required className={`${ic} pl-7`}/></div>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block">{listingType==='ijara'?'Oylik ijara ($ gacha)':'Narx ($ gacha)'} *</label>
              <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span><input name="budgetTo" type="number" placeholder="800" required className={`${ic} pl-7`}/></div>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Ko'chish sanasi *</label>
              <input name="movingDate" type="date" required min={new Date().toISOString().split('T')[0]} className={ic}/>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Necha kishi yashayd</label>
              <select name="people" className={ic}>
                {Array.from({length:10},(_,i)=><option key={i+1} value={i+1}>{i+1} kishi</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* BLOCK 5: Qulayliklar */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-base mb-4 flex items-center gap-2"><span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-extrabold">5</span>Kerakli qulayliklar <span className="text-xs font-normal text-gray-400">(ixtiyoriy)</span></h3>
          <div className="flex flex-wrap gap-2">
            {desiredAmens.map(a=>(
              <button key={a.id} type="button"
                onClick={()=>setSelAmens(p=>p.includes(a.id)?p.filter(x=>x!==a.id):[...p,a.id])}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border-2 transition active:scale-95 ${selAmens.includes(a.id)?'bg-emerald-600 text-white border-emerald-600 shadow-sm':'bg-gray-50 text-gray-600 border-gray-200 hover:border-emerald-300'}`}>
                <i className={a.icon}/>{a.label}
              </button>
            ))}
          </div>
        </div>

        {/* BLOCK 6: Aloqa va izoh */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-base mb-4 flex items-center gap-2"><span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-extrabold">6</span>Aloqa ma'lumotlari</h3>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Ism Familiya *</label>
              <input name="name" defaultValue={state.currentUser?.name||''} placeholder="To'liq ismingiz" required className={ic}/>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Telefon raqam *</label>
              {state.currentUser?.phone
                ?<div className="w-full px-4 py-3 bg-emerald-50 rounded-xl text-sm font-semibold text-emerald-900 flex items-center gap-2"><i className="ri-phone-fill text-emerald-600"/>{state.currentUser.phone}</div>
                :<button type="button" onClick={()=>setShowPhoneConnect(true)} className="w-full px-4 py-3 bg-amber-50 border-2 border-dashed border-amber-300 rounded-xl text-sm font-semibold text-amber-700 flex items-center gap-2 hover:bg-amber-100 transition"><i className="ri-phone-line"/>Telefon raqamni ulang</button>}
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold mb-1.5 block">Qo'shimcha talablar <span className="font-normal text-gray-400">(ixtiyoriy)</span></label>
            <textarea name="notes" rows={3} placeholder="Masalan: ko'chadan uzoq, bolalar bog'chasi yaqin, ma'lum bir ko'chada, balkon bo'lsin, va hokazo..." className={`${ic} resize-none min-h-[80px]`}/>
          </div>
        </div>

        {/* SUBMIT */}
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-500 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <div className="font-extrabold text-lg">So'rov yuborish</div>
              <div className="text-emerald-100 text-sm">To'lovdan keyin so'rovingiz adminga yuboriladi</div>
            </div>
            <div className="text-right"><div className="text-3xl font-extrabold">150,000</div><div className="text-emerald-200 text-xs">so'm (bir martalik)</div></div>
          </div>
          <button type="submit" className="w-full flex items-center justify-center gap-2 py-4 bg-white text-emerald-700 font-extrabold rounded-xl shadow-lg active:scale-95 transition text-base hover:bg-emerald-50">
            <i className="ri-secure-payment-line text-lg"/>To'lov va so'rov yuborish →
          </button>
        </div>
      </form>

      {showPayment&&<PaymentModal purpose="find_house" onSuccess={submitAfterPayment} onClose={()=>setShowPayment(false)}/>}
      {showPhoneConnect&&<PhoneConnectModal onClose={()=>setShowPhoneConnect(false)} onSuccess={()=>setShowPhoneConnect(false)}/>}
    </div>
  );
}


function SavedPage(){const{state}=useApp();const savedItems=state.approved.filter(p=>state.favorites.includes(p.id.toString()));return(<div className="max-w-7xl mx-auto px-4 py-14"><div className="mb-8"><h2 className="text-3xl font-extrabold">Sevimlilar</h2><p className="text-gray-500">Siz saqlagan e'lonlar.</p></div>{savedItems.length===0?<div className="bg-white rounded-3xl p-16 text-center shadow-sm"><div className="mx-auto mb-6 w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center text-4xl text-emerald-500">♥</div><h3 className="text-xl font-bold mb-2">Hali hech narsa yo'q</h3><p className="text-gray-500">Yurakchasini bosib e'lonlarni saqlang.</p></div>:<div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">{savedItems.map(p=><Card key={p.id} p={p}/> )}</div>}</div>);}

// ─── SUBMIT PAGE (with real image upload) ───────────────────
function SubmitPage(){
  const{state,dispatch}=useApp();
  const[amens,setAmens]=useState<string[]>([]);
  const[fileObjects,setFileObjects]=useState<File[]>([]);
  const[videoFile,setVideoFile]=useState<File|null>(null);
  const[docFiles,setDocFiles]=useState<{kadastr?:File;passport?:File;selfie?:File}>({});
  const[lat,setLat]=useState<number>(41.2995);
  const[lng,setLng]=useState<number>(69.2401);
  const[mapKey,setMapKey]=useState(0);
  const[locationMsg,setLocationMsg]=useState<string>('');
  const[gpsLocked,setGpsLocked]=useState(false);
  const[gpsAccuracy,setGpsAccuracy]=useState<number|null>(null);
  const[loading,setLoading]=useState(false);
  const submittingRef=useRef(false);
  const[selectedRegion,setSelectedRegion]=useState('Toshkent shahri');
  const[selectedPropType,setSelectedPropType]=useState('Kvartira');
  const[submitRooms,setSubmitRooms]=useState(2);
  const[submitArea,setSubmitArea]=useState(65);
  const[showPhoneConnect,setShowPhoneConnect]=useState(false);
  const showFloors=FLOOR_CATEGORIES.includes(selectedPropType);
  const fileRef=useRef<HTMLInputElement>(null);
  const videoRef=useRef<HTMLInputElement>(null);
  const ic="w-full px-4 py-3 bg-emerald-50 border border-transparent focus:border-emerald-400 focus:bg-white rounded-xl text-sm outline-none transition";

  const handleFiles=(e:React.ChangeEvent<HTMLInputElement>)=>{
    if(!e.target.files?.length)return;
    const newFiles=Array.from(e.target.files);
    setFileObjects(prev=>[...prev,...newFiles].slice(0,10));
    e.target.value='';
  };
  const removeImg=(i:number)=>setFileObjects(prev=>prev.filter((_,idx)=>idx!==i));

  const handleRegionChange=(e:React.ChangeEvent<HTMLSelectElement>)=>{
    setSelectedRegion(e.target.value);
    // GPS is the authoritative coordinate source — do not override lat/lng from dropdown
  };

  const handleDistrictChange=(_e:React.ChangeEvent<HTMLSelectElement>)=>{
    // GPS is the authoritative coordinate source — do not override lat/lng from dropdown
  };

  const detectLocation=()=>{
    if(!navigator.geolocation){
      setLocationMsg("Brauzeringiz geolokatsiyani qo'llab-quvvatlamaydi.");
      return;
    }
    setLocationMsg('Joylashuv aniqlanmoqda...');
    setGpsLocked(false);
    navigator.geolocation.getCurrentPosition(
      pos=>{
        const la=pos.coords.latitude,lo=pos.coords.longitude;
        if(la<34||la>48||lo<53||lo>76){
          setLocationMsg("GPS noto'g'ri joy qaytardi (boshqa davlat). Qaytadan urining.");
          setGpsLocked(false);return;
        }
        setLat(la);setLng(lo);
        setGpsAccuracy(Math.round(pos.coords.accuracy));
        setGpsLocked(true);setMapKey(k=>k+1);setLocationMsg('');
      },
      ()=>{
        setLocationMsg("Joylashuvni aniqlash muvaffaqiyatsiz. GPS ruxsatini tekshiring.");
        setGpsLocked(false);
      },
      {enableHighAccuracy:true,timeout:15000}
    );
  };

  // Auto-detect GPS on page load
  useEffect(()=>{detectLocation();},[]);

  const submit=async(e:React.FormEvent<HTMLFormElement>)=>{
    e.preventDefault();
    if(submittingRef.current)return;
    const fd=new FormData(e.currentTarget);
    if(fileObjects.length===0){toast('Kamida bitta rasm yuklang','error');return;}
    if(!gpsLocked){toast("Joylashuvni aniqlash shart. GPS tugmasini bosing.",'error');return;}
    submittingRef.current=true;
    setLoading(true);
    try{
      const listingPhone = state.currentUser?.phone || '';
      if(!listingPhone){toast('Telefon raqam ulash kerak','warn');setLoading(false);setShowPhoneConnect(true);return;}
      const imageUrls = await uploadImages(fileObjects);
      const ownerName = state.currentUser?.name || (fd.get('owner') as string) || 'UyNest';
      const listing:Listing={
        id:Date.now(),
        type:(fd.get('type')as'rent'|'sale')||'rent',
        title:fd.get('title')as string,
        district:fd.get('district')as string,
        city:fd.get('region')as string||undefined,
        address:fd.get('address')as string,
        price:parseInt(fd.get('price')as string)||0,
        unit:(fd.get('type')as string)==='rent'?'oy':'total',
        rooms:parseInt(fd.get('rooms')as string)||1,
        area:parseInt(fd.get('area')as string)||0,
        floor:parseInt(fd.get('floor')as string)||0,
        floors:parseInt(fd.get('floors')as string)||0,
        desc:fd.get('desc')as string,
        amenities:amens,
        img:imageUrls[0],
        images:imageUrls,
        badge:'new',
        owner:ownerName,
        contact:listingPhone,
        phone:listingPhone,
        ownerId:state.currentUser?.id,
        telegram:fd.get('telegram')as string||undefined,
        propertyCategory:fd.get('propType')as string||undefined,
        createdAt:new Date().toISOString(),
        expiresAt:new Date(Date.now()+30*24*60*60*1000).toISOString(),
        status:'pending',
        lat,lng
      };
      dispatch({type:'ADD_PENDING',payload:listing});
      await ListingAPI.addPending(listing);
      toast("E'lon yuborildi! Admin tasdiqlaydi");
      notifyAdmin(`📬 <b>Yangi e'lon tasdiqlash kutmoqda</b>\n\n🏠 ${listing.title}\n📍 ${listing.district}${listing.city?', '+listing.city:''}\n💰 $${listing.price}${listing.type==='rent'?'/oy':''}\n🛏 ${listing.rooms} xona • ${listing.area} m²\n👤 Egasi: ${listing.owner||'—'} | ${listing.phone||listing.contact||'—'}\n\n👉 Admin panelda tasdiqlang`);
      if(listing.ownerId) notifyUser(listing.ownerId,`✅ <b>E'loningiz qabul qilindi!</b>\n\n🏠 "${listing.title}"\n📍 ${listing.district}${listing.city?', '+listing.city:''}\n💰 $${listing.price}${listing.type==='rent'?'/oy':''}\n\nAdmin ko'rib chiqqandan so'ng faollashtiriladi.\n👉 https://uynest.vercel.app`);
      (e.target as HTMLFormElement).reset();setAmens([]);setFileObjects([]);setTimeout(()=>{dispatch({type:'NAV',payload:'home'});window.scrollTo({top:0});},1400);
    }catch(err:any){
      console.error('Submit error:',err);
      toast(err?.message?`Xato: ${err.message}`:'Xatolik yuz berdi. Qayta urining','error');
    }finally{
      setLoading(false);
      submittingRef.current=false;
    }
  };
  return(
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="text-center mb-6"><h2 className="text-3xl font-extrabold mb-1">Yangi e'lon qo'shish</h2><p className="text-gray-500">Mulkingizni ijaraga bering yoki soting.</p><p className="text-sm text-emerald-700 mt-2 flex items-center justify-center gap-1"><i className="ri-shield-check-fill"/>E'lon admin tasdig'idan o'tgach ko'rinadi</p></div>
      <div className="flex items-center justify-center max-w-lg mx-auto mb-8">{['Asosiy','Tafsilotlar','Rasmlar','Xarita','Aloqa'].map((s,i,a)=><React.Fragment key={s}><div className="flex flex-col items-center"><div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-400 text-white flex items-center justify-center font-bold text-sm shadow">{i+1}</div><div className="text-xs text-emerald-700 font-semibold mt-1">{s}</div></div>{i<a.length-1&&<div className="flex-1 h-0.5 bg-emerald-200 mx-2 mb-4"/>}</React.Fragment>)}</div>
      <form onSubmit={submit} className="space-y-5">
        <div className="bg-white rounded-2xl p-6 shadow-sm"><h3 className="font-bold text-lg mb-5 flex items-center gap-2"><i className="ri-file-list-3-line text-emerald-600"/>Asosiy ma'lumotlar</h3>
          <div className="grid grid-cols-2 gap-4 mb-4"><div><label className="text-sm font-semibold mb-1.5 block">E'lon turi</label><select name="type" required className={ic}><option value="rent">Ijaraga</option><option value="sale">Sotish</option></select></div><div><label className="text-sm font-semibold mb-1.5 block">Mulk turi *</label><select name="propType" required className={ic} value={selectedPropType} onChange={e=>setSelectedPropType(e.target.value)}>{PROPERTY_CATEGORIES.map((c:string)=><option key={c}>{c}</option>)}</select></div></div>
          <div className="grid grid-cols-2 gap-4 mb-4"><div><label className="text-sm font-semibold mb-1.5 block">Narxi (USD)</label><input name="price" type="number" placeholder="500" required className={ic}/></div><div><label className="text-sm font-semibold mb-1.5 block">Viloyat *</label><select name="region" required className={ic} onChange={handleRegionChange}><option value="">Tanlang...</option>{Object.keys(REGIONS_MAP).map((r:string)=><option key={r}>{r}</option>)}</select></div></div>
          <div className="grid grid-cols-2 gap-4 mb-4"><div><label className="text-sm font-semibold mb-1.5 block">Tuman / Shahar *</label><select name="district" required onChange={handleDistrictChange} className={ic}><option value="">Viloyatni tanlang</option>{(REGIONS_MAP[selectedRegion]||[]).map((d:string)=><option key={d}>{d}</option>)}</select></div><div><label className="text-sm font-semibold mb-1.5 block">Telefon raqam *</label>{state.currentUser?.phone?<div className="w-full px-4 py-3 bg-emerald-50 rounded-xl text-sm font-semibold text-emerald-900 flex items-center gap-2"><i className="ri-phone-fill text-emerald-600"/>{state.currentUser.phone}</div>:<button type="button" onClick={()=>setShowPhoneConnect(true)} className="w-full px-4 py-3 bg-amber-50 border-2 border-dashed border-amber-300 rounded-xl text-sm font-semibold text-amber-700 flex items-center gap-2 hover:bg-amber-100 transition"><i className="ri-phone-line"/>Telefon ulash</button>}<p className="text-xs text-gray-400 mt-1">Xaridor siz bilan bog'lanadi</p></div></div>
          <div className="mb-4"><label className="text-sm font-semibold mb-1.5 block">Manzil</label><input name="address" placeholder="Ko'cha, uy raqami" required className={ic}/></div>
          <div><label className="text-sm font-semibold mb-1.5 block">Sarlavha</label><input name="title" placeholder="Masalan: Yunusobod markazida zamonaviy xonadon" required className={ic}/></div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm"><h3 className="font-bold text-lg mb-5 flex items-center gap-2"><i className="ri-settings-3-line text-emerald-600"/>Tafsilotlar</h3>
          <div className={`grid gap-3 mb-4 ${showFloors?'grid-cols-4':'grid-cols-2'}`}>
            {[{n:'rooms',l:'Xonalar',p:'2',sv:submitRooms,set:(v:number)=>setSubmitRooms(v)},{n:'area',l:'Maydon m²',p:'65',sv:submitArea,set:(v:number)=>setSubmitArea(v)}].map(f=><div key={f.n}><label className="text-sm font-semibold mb-1.5 block">{f.l}</label><input name={f.n} type="number" placeholder={f.p} required className={ic} value={f.sv||''} onChange={e=>f.set(Number(e.target.value))}/></div>)}
            {showFloors&&[{n:'floor',l:'Qavat',p:'4'},{n:'floors',l:'Umumiy qavat',p:'9'}].map(f=><div key={f.n}><label className="text-sm font-semibold mb-1.5 block">{f.l}</label><input name={f.n} type="number" placeholder={f.p} required className={ic}/></div>)}
          </div>
          <div className="mb-4"><label className="text-sm font-semibold mb-1.5 block">Tavsif</label><textarea name="desc" id="submit-desc" placeholder="Mulk haqida..." required className={`${ic} min-h-[100px] resize-y`}/><div className="mt-2"><AiDescGenerator rooms={submitRooms} area={submitArea} district={selectedRegion} amenities={amens} onGenerate={(t)=>{const el=document.getElementById('submit-desc') as HTMLTextAreaElement;if(el){el.value=t;el.dispatchEvent(new Event('input',{bubbles:true}));}}}/></div></div>
          <div>
            <label className="text-sm font-semibold mb-3 block">Qulayliklar</label>
            {(['interior','security','transport','lifestyle','extra'] as const).map(grp=>{
              const items=AMENITIES_FULL.filter(a=>a.group===grp);
              const label=items[0]?.gl||grp;
              return(<div key={grp} className="mb-4"><div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{label}</div><div className="flex flex-wrap gap-2">{items.map(a=><button key={a.id} type="button" onClick={()=>setAmens(p=>p.includes(a.id)?p.filter(x=>x!==a.id):[...p,a.id])} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition active:scale-95 ${amens.includes(a.id)?'bg-emerald-600 text-white border-transparent shadow':'bg-gray-50 text-gray-600 border-gray-200 hover:border-emerald-300'}`}><i className={a.icon}/>{a.label}</button>)}</div></div>);
            })}
          </div>
        </div>
        {/* VIDEO UPLOAD */}
        <div className="bg-white rounded-2xl p-6 shadow-sm"><h3 className="font-bold text-lg mb-5 flex items-center gap-2"><i className="ri-video-line text-emerald-600"/>Video (ixtiyoriy)</h3>
          {videoFile?<div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl"><i className="ri-video-fill text-emerald-600 text-xl"/><span className="flex-1 text-sm font-medium truncate">{videoFile.name}</span><button type="button" onClick={()=>setVideoFile(null)} className="w-7 h-7 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-sm"><i className="ri-close-line"/></button></div>:
          <div className="border-2 border-dashed border-emerald-200 rounded-2xl p-6 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition" onClick={()=>videoRef.current?.click()}><i className="ri-upload-cloud-2-line text-3xl text-emerald-400 block mb-2"/><div className="text-sm font-semibold text-gray-700">Video yuklash (MP4)</div><div className="text-xs text-gray-400 mt-1">Maks 50MB</div></div>}
          <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f){if(f.size>50*1024*1024){toast('Video 50MB dan katta bo\'lmasin','error');return;}setVideoFile(f);}}}/>
          <p className="text-xs text-gray-400 mt-2">YouTube havolasi (ixtiyoriy):</p>
          <input name="videoUrl" placeholder="https://youtube.com/watch?v=..." className={`${ic} mt-1`}/>
        </div>
        {/* DOCUMENT UPLOAD FOR VERIFICATION */}
        <div className="bg-white rounded-2xl p-6 shadow-sm"><h3 className="font-bold text-lg mb-2 flex items-center gap-2"><i className="ri-file-shield-2-line text-emerald-600"/>Hujjatlar (Tasdiqlash uchun)</h3>
          <p className="text-sm text-gray-500 mb-4">Hujjat yuklasangiz, e'loningiz <span className="font-bold text-emerald-700 inline-flex items-center gap-1"><i className="ri-checkbox-circle-fill"/>Tasdiqlangan mulk</span> belgisiga ega bo'ladi. Manba: <a href="https://my.gov.uz" target="_blank" className="text-emerald-700 underline">my.gov.uz</a></p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {key:'kadastr',label:'Kadastr hujjati',icon:'ri-map-2-line',accept:'.pdf,image/*'},
              {key:'passport',label:'Egasi pasporti',icon:'ri-id-card-line',accept:'image/*'},
              {key:'selfie',label:'Selfie (pasport bilan)',icon:'ri-camera-line',accept:'image/*'},
            ].map(d=>(
              <label key={d.key} className={`flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-xl cursor-pointer transition ${docFiles[d.key as keyof typeof docFiles]?'border-emerald-400 bg-emerald-50':'border-gray-200 hover:border-emerald-300'}`}>
                <i className={`${d.icon} text-2xl ${docFiles[d.key as keyof typeof docFiles]?'text-emerald-600':'text-gray-400'}`}/>
                <span className="text-xs font-semibold text-center text-gray-700">{d.label}</span>
                {docFiles[d.key as keyof typeof docFiles]?<span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5"><i className="ri-checkbox-circle-fill"/>Yuklandi</span>:<span className="text-[10px] text-gray-400">Bosing va yuklang</span>}
                <input type="file" accept={d.accept} className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)setDocFiles(p=>({...p,[d.key]:f}));}}/>
              </label>
            ))}
          </div>
        </div>
        {/* IMAGES */}
        <div className="bg-white rounded-2xl p-6 shadow-sm"><h3 className="font-bold text-lg mb-5 flex items-center gap-2"><i className="ri-image-2-line text-emerald-600"/>Rasmlar <span className="text-gray-400 text-sm font-normal">({fileObjects.length}/10)</span></h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mb-4">
            {fileObjects.map((file,i)=><div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group"><img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover"/><button type="button" onClick={()=>removeImg(i)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition active:scale-95"><i className="ri-close-line"/></button>{i===0&&<div className="absolute bottom-1 left-1 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded">Asosiy</div>}</div>)}
            {fileObjects.length<10&&<button type="button" onClick={()=>fileRef.current?.click()} className="aspect-square border-2 border-dashed border-emerald-200 rounded-xl flex flex-col items-center justify-center hover:border-emerald-400 hover:bg-emerald-50 transition cursor-pointer group active:scale-95"><i className="ri-add-line text-2xl text-emerald-400 group-hover:text-emerald-600"/><span className="text-[10px] text-gray-400 mt-1">Qo'shish</span></button>}
          </div>
          <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFiles}/>
          <div className="border-2 border-dashed border-emerald-200 rounded-2xl p-8 text-center hover:border-emerald-400 hover:bg-emerald-50 transition cursor-pointer" onClick={()=>fileRef.current?.click()}>
            <i className="ri-upload-cloud-2-line text-4xl text-emerald-400 block mb-2"/><div className="font-semibold text-gray-700 text-sm">Rasmlarni tanlang yoki shu yerga tashlang</div><div className="text-xs text-gray-400 mt-1">JPG, PNG — maks 5MB • 10 tagacha</div>
          </div>
        </div>
        {/* MAP — GPS locked, no manual override */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><i className="ri-map-pin-line text-emerald-600"/>Joylashuv</h3>
          <p className="text-xs text-gray-500 mb-4 flex items-start gap-1.5"><i className="ri-information-line text-blue-500 text-base shrink-0 mt-0.5"/>Joylashuv faqat GPS orqali aniqlanadi. Soxta e'lonlarning oldini olish uchun qo'lda o'zgartirib bo'lmaydi.</p>
          {locationMsg&&<div className={`flex items-center gap-2 text-sm mb-3 px-3 py-2 rounded-xl ${gpsLocked?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'}`}><i className={gpsLocked?'ri-map-pin-2-fill':'ri-loader-4-line animate-spin'}/>{locationMsg||'Aniqlanmoqda...'}</div>}
          {gpsLocked?(
            <div className="flex items-center gap-3 mb-3 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <i className="ri-lock-2-fill text-emerald-600 text-xl shrink-0"/>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-emerald-800">GPS qulflandi</div>
                <div className="text-xs text-emerald-600">{lat.toFixed(5)}, {lng.toFixed(5)}{gpsAccuracy!=null&&` • ±${gpsAccuracy}m`}</div>
              </div>
              <button type="button" onClick={detectLocation} className="shrink-0 text-xs text-emerald-600 font-semibold underline">Yangilash</button>
            </div>
          ):(
            <button type="button" onClick={detectLocation} className="w-full mb-3 flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white font-bold rounded-xl text-sm shadow active:scale-95 transition">
              <i className="ri-focus-3-line text-lg"/>GPS joylashuvni aniqlash
            </button>
          )}
          <MapContainer key={mapKey} center={[lat,lng]} zoom={17} className="h-56 rounded-xl border border-gray-200">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap'/>
            <Marker position={[lat,lng]}/>
          </MapContainer>
        </div>
        {/* CONTACT */}
        <div className="bg-white rounded-2xl p-6 shadow-sm"><h3 className="font-bold text-lg mb-5 flex items-center gap-2"><i className="ri-contacts-line text-emerald-600"/>Aloqa</h3>
          {state.auth && state.currentUser ? (
            <>
              <div className="mb-4 p-4 bg-emerald-50 rounded-xl"><div className="text-sm font-semibold text-emerald-900">Sizning profil:</div><div className="flex items-center gap-3 mt-2"><div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-400 text-white flex items-center justify-center font-bold text-sm">{state.currentUser.name?.[0]?.toUpperCase()}</div><div><div className="font-semibold text-sm">{state.currentUser.name||'Nomi yo\'q'}</div><div className="text-xs text-gray-600">{state.currentUser.phone||state.currentUser.email||'Kontakt mavjud emas'}</div></div></div></div>
              <label className="text-sm font-semibold mb-1.5 block">Telegram (ixtiyoriy)</label><input name="telegram" placeholder="@username yoki +998..." className={ic}/>
            </>
          ) : (
            <div className="p-4 bg-amber-50 border-2 border-dashed border-amber-300 rounded-xl text-center">
              <i className="ri-phone-line text-2xl text-amber-500 block mb-2"/>
              <p className="text-sm font-semibold text-amber-800">E'lon berish uchun tizimga kirib, telefon raqamni ulang</p>
              <button type="button" onClick={()=>dispatch({type:'NAV',payload:'auth'})} className="mt-3 px-5 py-2 bg-emerald-600 text-white font-bold text-sm rounded-xl active:scale-95 transition">Kirish / Ro'yxatdan o'tish</button>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={()=>{dispatch({type:'NAV',payload:'home'});window.scrollTo({top:0});}} className="px-7 py-3.5 bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:border-gray-300 transition active:scale-95">Bekor qilish</button>
          <button type="submit" disabled={loading} className="flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-emerald-700 to-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-xl transition active:scale-95 disabled:opacity-50"><i className="ri-send-plane-fill"/>{loading?'Yuborilmoqda...':'E\'lonni yuborish'}</button>
        </div>
      </form>
      {showPhoneConnect&&<PhoneConnectModal onClose={()=>setShowPhoneConnect(false)} onSuccess={()=>setShowPhoneConnect(false)}/>}
    </div>
  );
}

// Prevents onAuthStateChanged from racing with explicit login/register handlers
let _authInProgress = false;

// ─── AUTH PAGE ───────────────────────────────────────────────
function AuthPage(){
  const{state,dispatch}=useApp();const[err,setErr]=useState('');const[sp,setSp]=useState(false);const[loading,setLoading]=useState(false);const tab=state.authTab||'login';
  const ic="w-full pl-10 pr-4 py-3 bg-emerald-50 border border-transparent focus:border-emerald-400 focus:bg-white rounded-xl text-sm outline-none transition";
  const afterAuth=(user:User,token:string)=>{dispatch({type:'LOGIN',payload:{user,token}});const nx=state.authNext;dispatch({type:'AUTH_NEXT',payload:null});if(user.role==='admin'){toast('Admin paneliga xush kelibsiz!');dispatch({type:'NAV',payload:'admin'});}else{toast(`Xush kelibsiz, ${user.name}!`);dispatch({type:'NAV',payload:nx||'home'});}window.scrollTo({top:0});};
  const doLogin=async(e:React.FormEvent<HTMLFormElement>)=>{
    e.preventDefault();setLoading(true);_authInProgress=true;
    const fd=new FormData(e.currentTarget);
    const r=await AuthAPI.login({email:fd.get('email')as string,password:fd.get('password')as string});
    _authInProgress=false;setLoading(false);
    if(r.ok)afterAuth(r.user,r.token);else{setErr(r.error||'Xato');setTimeout(()=>setErr(''),4500);}
  };
  const doReg=async(e:React.FormEvent<HTMLFormElement>)=>{
    e.preventDefault();setLoading(true);_authInProgress=true;
    const fd=new FormData(e.currentTarget);
    const r=await AuthAPI.register({name:fd.get('name')as string,email:fd.get('email')as string,phone:fd.get('phone')as string,password:fd.get('password')as string});
    _authInProgress=false;setLoading(false);
    if(r.ok){afterAuth(r.user,r.token);toast('Hisob yaratildi!');}else{setErr(r.error||'Xato');setTimeout(()=>setErr(''),4500);}
  };
  const uc=AuthAPI.getUsers().length;
  return(<div className="min-h-[calc(100vh-68px)] flex items-center justify-center p-5 bg-gradient-to-br from-emerald-50 via-white to-emerald-50 relative overflow-hidden"><div className="absolute -top-32 -right-32 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl"/><div className="absolute -bottom-32 -left-32 w-80 h-80 bg-emerald-300/10 rounded-full blur-3xl"/>
    <div className="bg-white rounded-3xl p-8 md:p-10 w-full max-w-md shadow-2xl relative z-10 border border-gray-100">
      <button onClick={()=>{dispatch({type:'NAV',payload:'home'});window.scrollTo({top:0});}} className="flex items-center gap-2 font-extrabold text-lg text-emerald-800 mx-auto mb-6 justify-center"><img src="/logo.svg" alt="UyNest" className="h-9 w-auto"/>UY<span className="text-emerald-500">NEST</span></button>
      <div className="flex bg-emerald-50 p-1 rounded-xl mb-6 gap-1">
        {['login','register'].map(t => (
          <button key={t} onClick={() => { dispatch({type:'AUTH_TAB', payload:t}); setErr(''); }} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${tab===t ? 'bg-white text-emerald-800 shadow-sm' : 'text-gray-500'}`}>
            {t === 'login' ? 'Kirish' : "Ro'yxatdan o'tish"}
          </button>
        ))}
      </div>
      {err && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4 border border-red-100 flex items-center gap-2"><i className="ri-error-warning-line"/>{err}</div>}
      {tab==='login' ? (
        <form onSubmit={doLogin} className="space-y-4">
          <div><label className="text-sm font-semibold mb-1.5 block">Email</label><div className="relative"><i className="ri-mail-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input type="email" name="email" placeholder="email@example.com" required className={ic}/></div></div>
          <div><label className="text-sm font-semibold mb-1.5 block">Parol</label><div className="relative"><i className="ri-lock-2-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input type={sp?'text':'password'} name="password" placeholder="••••••••" required className={ic}/><button type="button" onClick={()=>setSp(!sp)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-700"><i className={sp?'ri-eye-off-line':'ri-eye-line'}/></button></div></div>
          <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-emerald-700 to-emerald-500 text-white font-bold rounded-xl shadow-lg transition active:scale-95 disabled:opacity-60">{loading?<><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Kirmoqda...</>:<><i className="ri-login-circle-line"/>Kirish</>}</button>
        </form>
      ) : tab==='register' ? (
        <form onSubmit={doReg} className="space-y-4">
          <div><label className="text-sm font-semibold mb-1.5 block">To'liq ism</label><div className="relative"><i className="ri-user-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input name="name" placeholder="Ism Familiya" required className={ic}/></div></div>
          <div><label className="text-sm font-semibold mb-1.5 block">Email</label><div className="relative"><i className="ri-mail-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input type="email" name="email" placeholder="email@example.com" required className={ic}/></div></div>
          <div><label className="text-sm font-semibold mb-1.5 block">Parol</label><div className="relative"><i className="ri-lock-2-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input type={sp?'text':'password'} name="password" placeholder="Kamida 6 belgi" minLength={6} required className={ic}/><button type="button" onClick={()=>setSp(!sp)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><i className={sp?'ri-eye-off-line':'ri-eye-line'}/></button></div></div>
          <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-emerald-700 to-emerald-500 text-white font-bold rounded-xl shadow-lg transition active:scale-95 disabled:opacity-60">{loading?<><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Yaratilmoqda...</>:<><i className="ri-user-add-line"/>Ro'yxatdan o'tish</>}</button>
        </form>
      ) : null}
      <div className="flex items-center gap-3 my-5 text-gray-300 text-sm"><div className="flex-1 h-px bg-gray-100"/><span>yoki</span><div className="flex-1 h-px bg-gray-100"/></div>
      <button onClick={()=>dispatch({type:'GOOGLE_MODAL',payload:true})} className="w-full flex items-center justify-center gap-2.5 py-3 bg-white border-2 border-gray-200 rounded-xl font-semibold text-sm text-gray-700 hover:border-blue-400 hover:bg-blue-50 transition"><svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.3 0-9.7-3.3-11.3-8L6.2 33C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C41.3 36 44 30.5 44 24c0-1.3-.1-2.3-.4-3.5z"/></svg>Google bilan davom etish</button>
      <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400"><i className="ri-shield-check-line text-emerald-600"/>{uc} foydalanuvchi ro'yxatdan o'tgan</div>
    </div>
  </div>);
}

// ─── ADMIN PAGE ──────────────────────────────────────────────
function AdminPage(){
  const{state,dispatch}=useApp();const u=state.currentUser;if(!state.auth||!isAdmin(u))return<AuthPage/>;const tab=state.adminTab;
  const logout=async()=>{if(state.token)AuthAPI.revoke(state.token);await AuthAPI.signOut();dispatch({type:'LOGOUT'});toast('Chiqdingiz');dispatch({type:'NAV',payload:'home'});window.scrollTo({top:0});};
  const links=[{id:'overview',icon:'ri-dashboard-3-line',l:'Overview'},{id:'listings',icon:'ri-list-check-2',l:"E'lonlar",c:state.approved.length},{id:'pending',icon:'ri-time-line',l:'Tekshiruv',c:state.pending.length,clr:'bg-amber-400'},{id:'verifications',icon:'ri-verified-badge-line',l:'Tasdiqlash',c:state.approved.filter(p=>!p.verified).length,clr:'bg-emerald-500'},{id:'premium',icon:'ri-vip-crown-line',l:'Premium',c:state.approved.filter(p=>p.isPremium).length,clr:'bg-amber-500'},{id:'requests',icon:'ri-mail-line',l:"So'rovlar",c:state.requests.length,clr:'bg-blue-500'},{id:'reviews',icon:'ri-star-line',l:'Sharhlar',c:state.reviews.length,clr:'bg-amber-500'},{id:'complaints',icon:'ri-flag-line',l:'Shikoyatlar',c:u?ChatAPI.unreadComplaints(u.id):0,clr:'bg-red-500'},{id:'reports',icon:'ri-alert-line',l:"Xabarlar",clr:'bg-red-400'},{id:'chat',icon:'ri-chat-3-line',l:'Xabarlar',c:ChatAPI.unreadCount(u!.id),clr:'bg-red-500'},{id:'users',icon:'ri-group-line',l:'Foydalanuvchilar'},{id:'settings',icon:'ri-settings-3-line',l:'Sozlamalar'}];
  return(<div className="flex min-h-[calc(100vh-68px)] bg-emerald-50">
    <aside className="w-60 shrink-0 bg-gradient-to-b from-emerald-50 to-emerald-100/50 border-r border-emerald-100 flex-col p-4 hidden md:flex">
      <button onClick={()=>{dispatch({type:'NAV',payload:'home'});window.scrollTo({top:0});}} className="flex items-center gap-2 font-extrabold text-emerald-800 mb-4 px-2 active:scale-95 transition-transform"><img src="/logo.svg" alt="UyNest" className="h-8 w-auto"/>UY<span className="text-emerald-500">NEST</span></button>
      <div className="flex items-center gap-2.5 px-2 mb-4 pb-4 border-b border-emerald-200/60"><div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-400 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow">{u?.avatar?<img src={u.avatar} alt="" className="w-full h-full object-cover rounded-full"/>:initials('Admin')}</div><div className="min-w-0"><div className="font-bold text-sm truncate text-gray-800">Admin</div><div className="text-[10px] text-emerald-600 font-semibold">Admin</div></div></div>
      <nav className="flex flex-col gap-1 flex-1">{links.map(l=>{
        const count = l.id === 'reviews' ? state.reviews.filter(r => !r.read).length : l.c;
        return (
          <button key={l.id} onClick={()=>{if(l.id==='chat'){dispatch({type:'NAV',payload:'chat'});}else dispatch({type:'ADMIN_TAB',payload:l.id});}} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition active:scale-95 ${tab===l.id&&l.id!=='chat'?'bg-white text-emerald-800 font-semibold shadow-sm':'text-gray-600 hover:bg-white/60'}`}><i className={`${l.icon} text-base`}/><span className="flex-1 text-left">{l.l}</span>{!!count&&count>0&&<span className={`${l.clr||'bg-emerald-500'} text-white text-[10px] font-bold px-2 py-0.5 rounded-full`}>{count}</span>}</button>
        );
      })}</nav>
      <button onClick={logout} className="flex items-center gap-2 px-3 py-2.5 bg-white/50 hover:bg-white rounded-xl text-sm text-gray-600 hover:text-red-500 transition active:scale-95 mt-2"><i className="ri-logout-circle-r-line"/>Chiqish</button>
    </aside>
    <main className="flex-1 p-6 md:p-8 overflow-auto">
      {tab==='overview'&&<AdminOverview/>}
      {tab==='listings'&&<AdminListings/>}
      {tab==='pending'&&<AdminPending/>}
      {tab==='verifications'&&<AdminVerifications/>}
      {tab==='premium'&&<AdminPremium/>}
      {tab==='requests'&&<AdminRequests/>}
      {tab==='reviews'&&<AdminReviews/>}
      {tab==='complaints'&&<AdminComplaints/>}
      {tab==='reports'&&<AdminReports/>}
      {tab==='users'&&<AdminUsers/>}
      {tab==='settings'&&<AdminSettings/>}
    </main>
  </div>);
}
function AdminOverview(){const{state,dispatch}=useApp();return(<div><div className="flex flex-wrap justify-between items-start gap-4 mb-7"><div><h2 className="text-2xl font-extrabold">Dashboard</h2><p className="text-gray-500 text-sm">Tizim holati</p></div><button onClick={()=>dispatch({type:'ADMIN_TAB',payload:'pending'})} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-700 to-emerald-500 text-white font-bold rounded-xl text-sm shadow"><i className="ri-time-line"/>Tekshiruvlar ({state.pending.length})</button></div><div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">{[{l:"Jami e'lonlar",v:state.approved.length,i:'ri-home-4-line',g:'from-emerald-500 to-emerald-400'},{l:'Ijara',v:state.approved.filter(p=>p.type==='rent').length,i:'ri-key-2-line',g:'from-blue-500 to-blue-400'},{l:'Sotuv',v:state.approved.filter(p=>p.type==='sale').length,i:'ri-shopping-bag-3-line',g:'from-purple-500 to-purple-400'},{l:'Kutuvda',v:state.pending.length,i:'ri-time-line',g:'from-amber-500 to-amber-400'}].map(s=><div key={s.l} className="bg-white rounded-2xl p-5 shadow-sm flex justify-between items-start hover:-translate-y-1 transition"><div><div className="text-gray-500 text-sm mb-1">{s.l}</div><div className="text-3xl font-extrabold">{s.v}</div></div><div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.g} flex items-center justify-center text-white text-lg shadow`}><i className={s.i}/></div></div>)}</div></div>);}
function AdminListings(){
  const{state,dispatch}=useApp();
  const[q,setQ]=useState('');
  const[selected,setSelected]=useState<Listing|null>(null);
  const items=state.approved.filter(p=>!q||p.title.toLowerCase().includes(q.toLowerCase())||p.district.toLowerCase().includes(q.toLowerCase()));
  const deleteListing=async(id:number|string)=>{if(confirm("O'chirilsinmi?")){dispatch({type:'DEL_LISTING',payload:id});await ListingAPI.deleteListing(id);toast("O'chirildi","warn");}};
  return(
    <div>
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6"><div><h2 className="text-2xl font-extrabold">E'lonlar</h2><p className="text-gray-500 text-sm">{state.approved.length} ta</p></div><button onClick={()=>{dispatch({type:'NAV',payload:'submit'});window.scrollTo({top:0});}} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-700 to-emerald-500 text-white font-bold rounded-xl text-sm shadow"><i className="ri-add-line"/>Yangi</button></div>
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 bg-emerald-50 rounded-xl px-4 py-2.5 mb-4 max-w-xs"><i className="ri-search-line text-gray-400"/><input className="bg-transparent flex-1 text-sm outline-none" placeholder="Qidirish..." value={q} onChange={e=>setQ(e.target.value)}/></div>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-gray-100">{["E'lon",'Manzil','Narx','Tur',''].map(h=><th key={h} className="text-left py-3 px-2 text-[11px] text-gray-400 font-semibold uppercase tracking-wider">{h}</th>)}</tr></thead>
          <tbody>{items.map(p=><tr key={p.id} className="border-b border-gray-50 hover:bg-emerald-50/50 transition cursor-pointer" onClick={()=>setSelected(p)}>
            <td className="py-3 px-2"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-emerald-100">{p.img&&<img src={p.img} alt="" className="w-full h-full object-cover"/>}</div><div><div className="font-semibold max-w-[140px] truncate">{p.title}</div><div className="text-[11px] text-gray-400">#{p.id} • {(p.images?.length||0)+1} rasm</div></div></div></td>
            <td className="py-3 px-2 text-gray-500 text-xs">{p.district}</td>
            <td className="py-3 px-2 font-bold text-emerald-700">${(p.price||0).toLocaleString()}{p.type==='rent'&&<span className="text-gray-400 font-normal text-xs">/oy</span>}</td>
            <td className="py-3 px-2"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${p.type==='rent'?'bg-blue-100 text-blue-700':'bg-emerald-100 text-emerald-700'}`}>{p.type==='rent'?'Ijara':'Sotuv'}</span></td>
            <td className="py-3 px-2" onClick={e=>e.stopPropagation()}><div className="flex gap-1">
              <button onClick={()=>setSelected(p)} className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center justify-center text-sm" title="Batafsil"><i className="ri-eye-line"/></button>
              <button onClick={()=>deleteListing(p.id)} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center text-sm" title="O'chirish"><i className="ri-delete-bin-line"/></button>
            </div></td>
          </tr>)}</tbody>
        </table></div>
      </div>
      {selected&&<AdminListingDetail p={selected} onClose={()=>setSelected(null)}/>}
    </div>
  );
}
// ─── ADMIN LISTING DETAIL MODAL ─────────────────────────────
function AdminListingDetail({p,onClose,onApprove,onReject}:{p:Listing;onClose:()=>void;onApprove?:(p:Listing)=>void;onReject?:(id:number|string)=>void}){
  const[sel,setSel]=useState(0);
  const allImgs=[p.img,...(p.images||[]).filter(x=>x&&x!==p.img)].filter(Boolean);
  const amenList=AMENITIES.filter(a=>p.amenities?.includes(a.id));
  const getYtId=(url:string)=>{const m=url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);return m?m[1]:null;};
  const info=[
    {l:'Narx',v:`$${(p.price||0).toLocaleString()}${p.type==='rent'?'/oy':''}`,i:'ri-price-tag-3-line'},
    {l:'Tur',v:p.type==='rent'?'Ijara':'Sotuv',i:'ri-home-4-line'},
    {l:'Xonalar',v:`${p.rooms||'—'} ta`,i:'ri-hotel-bed-line'},
    {l:'Maydon',v:`${p.area||'—'} m²`,i:'ri-ruler-2-line'},
    {l:'Qavat',v:p.floor?`${p.floor}/${p.floors||'?'}`:' — ',i:'ri-building-2-line'},
    {l:'Tuman',v:p.district||'—',i:'ri-map-pin-2-fill'},
    {l:'Manzil',v:p.address||'—',i:'ri-road-map-line'},
    {l:'Mulk turi',v:p.propertyCategory||'—',i:'ri-community-line'},
    {l:'Egasi',v:p.owner||'—',i:'ri-user-line'},
    {l:'Telefon',v:p.phone||p.contact||'—',i:'ri-phone-line'},
    {l:'Aloqa',v:p.contact||'—',i:'ri-mail-line'},
    {l:'Telegram',v:p.telegram||'—',i:'ri-telegram-line'},
  ];
  return(
    <div className="fixed inset-0 z-[400] bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-3xl my-4 shadow-2xl overflow-hidden" onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-extrabold text-lg leading-tight truncate max-w-sm">{p.title}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${p.type==='rent'?'bg-blue-100 text-blue-700':'bg-emerald-100 text-emerald-700'}`}>{p.type==='rent'?'Ijara':'Sotuv'}</span>
              {p.verified&&<span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-white flex items-center gap-1"><i className="ri-checkbox-circle-fill"/>Tasdiqlangan hujjat</span>}
              {p.isPremium&&<span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 flex items-center gap-1"><i className="ri-star-fill"/>Premium</span>}
              <span className="text-xs text-gray-400">#{p.id}</span>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 shrink-0 text-lg">✕</button>
        </div>
        <div className="p-6 space-y-6">
          {/* Gallery */}
          {allImgs.length>0&&<div>
            <div className="rounded-2xl overflow-hidden aspect-[16/7] bg-gray-100 mb-2 relative">
              <img src={allImgs[sel]} alt="" className="w-full h-full object-cover"/>
              {allImgs.length>1&&<>
                <button onClick={()=>setSel(i=>Math.max(i-1,0))} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 rounded-full flex items-center justify-center shadow hover:bg-white"><i className="ri-arrow-left-s-line text-xl"/></button>
                <button onClick={()=>setSel(i=>Math.min(i+1,allImgs.length-1))} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 rounded-full flex items-center justify-center shadow hover:bg-white"><i className="ri-arrow-right-s-line text-xl"/></button>
              </>}
              <div className="absolute bottom-2 right-3 bg-black/40 text-white text-xs px-2.5 py-1 rounded-full">{sel+1}/{allImgs.length}</div>
            </div>
            {allImgs.length>1&&<div className="flex gap-2 overflow-x-auto pb-1">{allImgs.map((img,i)=><button key={i} onClick={()=>setSel(i)} className={`w-16 h-12 rounded-xl overflow-hidden shrink-0 border-2 transition ${i===sel?'border-emerald-500':'border-transparent opacity-60 hover:opacity-90'}`}><img src={img} alt="" className="w-full h-full object-cover"/></button>)}</div>}
          </div>}
          {/* Video */}
          {p.videoUrl&&(()=>{const ytId=getYtId(p.videoUrl);return ytId?(<div><h3 className="font-bold mb-2 flex items-center gap-2"><i className="ri-youtube-line text-red-500"/>Video</h3><div className="rounded-2xl overflow-hidden aspect-video shadow-sm"><iframe src={`https://www.youtube.com/embed/${ytId}`} title="Video" allowFullScreen className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"/></div></div>):(<div><h3 className="font-bold mb-2 flex items-center gap-2"><i className="ri-video-line text-emerald-600"/>Video</h3><a href={p.videoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition text-sm text-emerald-700 underline">{p.videoUrl}</a></div>);})()}
          {/* Info grid */}
          <div>
            <h3 className="font-bold mb-3 flex items-center gap-2"><i className="ri-information-line text-emerald-600"/>Ma'lumotlar</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {info.filter(x=>x.v&&x.v!=='—'&&x.v!=='  — ').map(x=>(
                <div key={x.l} className="bg-gray-50 rounded-xl px-3 py-2.5">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 flex items-center gap-1"><i className={`${x.i} text-emerald-500`}/>{x.l}</div>
                  <div className="font-semibold text-sm text-gray-800 truncate">{x.v}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Description */}
          {p.desc&&<div>
            <h3 className="font-bold mb-2 flex items-center gap-2"><i className="ri-article-line text-emerald-600"/>Tavsif</h3>
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{p.desc}</div>
          </div>}
          {/* Amenities */}
          {amenList.length>0&&<div>
            <h3 className="font-bold mb-3 flex items-center gap-2"><i className="ri-sparkling-2-fill text-emerald-600"/>Qulayliklar ({amenList.length})</h3>
            <div className="flex flex-wrap gap-2">{amenList.map(a=><span key={a.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl"><i className={`${a.icon} text-emerald-600`}/>{a.label}</span>)}</div>
          </div>}
          {/* Documents */}
          {(p as any).docUrls&&Object.keys((p as any).docUrls).length>0&&<div>
            <h3 className="font-bold mb-3 flex items-center gap-2"><i className="ri-file-shield-2-line text-emerald-600"/>Hujjatlar</h3>
            <div className="flex flex-wrap gap-3">{Object.entries((p as any).docUrls).map(([k,v])=><a key={k} href={v as string} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 text-sm font-semibold rounded-xl hover:bg-blue-100 transition border border-blue-100"><i className="ri-file-pdf-line text-lg"/>{k==='kadastr'?'Kadastr':k==='passport'?'Pasport':k==='selfie'?'Selfie':k}</a>)}</div>
          </div>}
          {/* Approve / Reject buttons */}
          {(onApprove||onReject)&&<div className="flex gap-3 pt-2">
            {onApprove&&<button onClick={()=>{onApprove(p);onClose();}} className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-emerald-700 to-emerald-500 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition"><i className="ri-check-double-line text-lg"/>Tasdiqlash</button>}
            {onReject&&<button onClick={()=>{onReject(p.id);onClose();}} className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-red-500 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition"><i className="ri-close-circle-line text-lg"/>Rad etish</button>}
          </div>}
        </div>
      </div>
    </div>
  );
}

function AdminPending(){
  const{state,dispatch}=useApp();
  const[selected,setSelected]=useState<Listing|null>(null);
  const approve=async(p:Listing)=>{
    dispatch({type:'APPROVE',payload:{...p,status:'active'}});
    await ListingAPI.approveListing({...p,status:'active'});
    toast(`"${p.title}" tasdiqlandi`);
    notifyAdmin(`✅ <b>E'lon tasdiqlandi</b>\n🏠 ${p.title}\n📍 ${p.district}\n💰 $${p.price}${p.type==='rent'?'/oy':''}\n👤 ${p.owner||'—'}`);
    if(p.ownerId)notifyUser(p.ownerId,`✅ <b>E'loningiz tasdiqlandi!</b>\n\n🏠 "${p.title}"\n📍 ${p.district} • $${p.price}${p.type==='rent'?'/oy':''}\n\nEndi barcha foydalanuvchilar ko'ra oladi!\n👉 https://uynest.vercel.app`);
  };
  const reject=async(id:number|string)=>{
    const p=state.pending.find(x=>x.id===id);
    if(confirm('Rad etilsinmi?')){
      dispatch({type:'REJECT',payload:id});
      await ListingAPI.deleteListing(id);
      toast('Rad etildi','warn');
      if(p?.ownerId)notifyUser(p.ownerId,`❌ <b>E'loningiz rad etildi</b>\n\n🏠 "${p.title}"\n\nBatafsil ma'lumot uchun adminga murojaat qiling.`);
    }
  };
  return(
    <div>
      <div className="mb-6"><h2 className="text-2xl font-extrabold">Tekshiruv</h2><p className="text-gray-500 text-sm">{state.pending.length} ta kutmoqda</p></div>
      {state.pending.length===0
        ?<div className="bg-white rounded-2xl p-20 text-center shadow-sm"><i className="ri-checkbox-circle-line text-5xl text-gray-200 block mb-3"/><h3 className="font-bold mb-1">Barchasi tekshirilgan</h3></div>
        :<div className="space-y-3">
          {state.pending.map(p=>(
            <div key={p.id} onClick={()=>setSelected(p)} className="bg-white rounded-2xl p-4 shadow-sm flex gap-4 items-center cursor-pointer hover:shadow-md hover:border-emerald-200 border-2 border-transparent transition group">
              <div className="w-24 h-18 rounded-xl overflow-hidden shrink-0 bg-emerald-50 aspect-[4/3]">
                {p.img?<img src={p.img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>:<div className="w-full h-full flex items-center justify-center"><i className="ri-home-4-line text-2xl text-emerald-300"/></div>}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold mb-1 truncate">{p.title}</h4>
                <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-2">
                  <span className="flex items-center gap-1"><i className="ri-map-pin-2-fill text-emerald-500"/>{p.district}</span>
                  <span className="flex items-center gap-1"><i className="ri-money-dollar-circle-line text-emerald-500"/>${p.price}{p.type==='rent'?'/oy':''}</span>
                  <span className="flex items-center gap-1"><i className="ri-hotel-bed-line text-emerald-500"/>{p.rooms} xona, {p.area}m²</span>
                  {p.images&&p.images.length>0&&<span className="flex items-center gap-1"><i className="ri-image-line text-blue-500"/>{p.images.length} rasm</span>}
                  {p.videoUrl&&<span className="flex items-center gap-1"><i className="ri-video-line text-red-500"/>Video</span>}
                  {p.verified&&<span className="flex items-center gap-1 text-emerald-600 font-semibold"><i className="ri-shield-check-fill"/>Hujjat</span>}
                </div>
                {p.images&&p.images.length>0&&<div className="flex gap-1">{p.images.slice(0,5).map((img,i)=><div key={i} className="w-9 h-9 rounded-lg overflow-hidden border border-gray-100"><img src={img} alt="" className="w-full h-full object-cover"/></div>)}{p.images.length>5&&<div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400">+{p.images.length-5}</div>}</div>}
              </div>
              <div className="flex flex-col gap-2 shrink-0 items-end">
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 group-hover:underline"><i className="ri-eye-line"/>Ko'rish</span>
                <div className="flex gap-2" onClick={e=>e.stopPropagation()}>
                  <button onClick={()=>approve(p)} className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-emerald-700 to-emerald-500 text-white text-xs font-bold rounded-xl shadow active:scale-95 transition"><i className="ri-check-line"/>Tasdiq</button>
                  <button onClick={()=>reject(p.id)} className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-xl shadow active:scale-95 transition"><i className="ri-close-line"/>Rad</button>
                </div>
              </div>
            </div>
          ))}
        </div>}
      {selected&&<AdminListingDetail p={selected} onClose={()=>setSelected(null)} onApprove={approve} onReject={reject}/>}
    </div>
  );
}
function AdminRequests(){
  const{state,dispatch}=useApp();
  const foundHouse=(r:AppRequest)=>{
    const user=AuthAPI.getUsers().find(u=>u.name===r.name||u.phone===r.phone);
    if(user){dispatch({type:'CHAT_TARGET',payload:user.id});dispatch({type:'NAV',payload:'chat'});dispatch({type:'DEL_REQUEST',payload:r.id});RequestsAPI.remove(r.id);toast('Chat ochildi va so\'rov o\'chirildi');}
    else toast('Foydalanuvchi topilmadi','error');
  };
  return(
    <div><div className="mb-6"><h2 className="text-2xl font-extrabold">Uy topib berish so'rovlari</h2><p className="text-gray-500 text-sm">{state.requests.length} ta so'rov</p></div>
    {state.requests.length===0?<div className="bg-white rounded-2xl p-20 text-center shadow-sm"><i className="ri-inbox-line text-5xl text-gray-200 block mb-3"/>Hozircha so'rov yo'q</div>:
    <div className="space-y-4">{state.requests.map(r=>(
      <div key={r.id} className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <div className="font-extrabold text-base">{r.name}</div>
            <a href={`tel:${r.phone}`} className="text-emerald-700 font-semibold text-sm flex items-center gap-1 mt-0.5"><i className="ri-phone-line"/>{r.phone}</a>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${r.listingType==='ijara'?'bg-blue-100 text-blue-700':'bg-emerald-100 text-emerald-700'}`}>{r.listingType==='ijara'?'Ijara':'Sotuv'}</span>
            {r.propertyCategory&&<span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">{r.propertyCategory}</span>}
            <span className="text-xs text-gray-400">{fmtDate(r.createdAt)}</span>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <div className="bg-gray-50 rounded-xl p-3"><div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Joylashuv</div><div className="text-sm font-semibold">{r.region||'—'}</div><div className="text-xs text-gray-500">{r.district||'Barcha tumanlar'}</div></div>
          <div className="bg-gray-50 rounded-xl p-3"><div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Byudjet</div><div className="text-sm font-semibold text-emerald-700">${r.budgetFrom} — ${r.budgetTo}</div><div className="text-xs text-gray-500">{r.listingType==='ijara'?'oyiga':''}</div></div>
          <div className="bg-gray-50 rounded-xl p-3"><div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Parametrlar</div><div className="text-sm font-semibold">{r.rooms||'—'} xona{r.minArea?` • ${r.minArea}m²`:''}</div><div className="text-xs text-gray-500">{r.people||'—'} kishi • {r.furnishing||'—'}</div></div>
          <div className="bg-gray-50 rounded-xl p-3"><div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Ko'chish sanasi</div><div className="text-sm font-semibold">{r.movingDate||'—'}</div><div className="text-xs text-gray-500">{r.floor||'Qavat muhim emas'}</div></div>
        </div>
        {r.amenities&&r.amenities.length>0&&<div className="flex flex-wrap gap-1.5 mb-3">{r.amenities.map(a=><span key={a} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg">{a}</span>)}</div>}
        {r.notes&&<div className="p-3 bg-amber-50 rounded-xl text-sm text-gray-700 mb-3 border border-amber-100"><span className="font-bold text-amber-700">Qo'shimcha: </span>{r.notes}</div>}
        <div className="flex gap-2 justify-end">
          <button onClick={()=>foundHouse(r)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-700 to-emerald-500 text-white text-sm font-bold rounded-xl shadow active:scale-95 transition"><i className="ri-home-4-line"/>Uy topildi — Chat ochish</button>
          <button onClick={()=>{if(confirm("O'chirilsinmi?")){dispatch({type:'DEL_REQUEST',payload:r.id});RequestsAPI.remove(r.id);toast("O'chirildi","warn");}}} className="w-9 h-9 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center" title="O'chirish"><i className="ri-delete-bin-line"/></button>
        </div>
      </div>
    ))}</div>}
    </div>
  );
}
function AdminUsers(){const users=AuthAPI.getUsers();return(<div><div className="mb-6"><h2 className="text-2xl font-extrabold">Foydalanuvchilar</h2><p className="text-gray-500 text-sm">{users.length} ta</p></div><div className="bg-white rounded-2xl p-5 shadow-sm"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-gray-100">{['Ism','Email','Rol','Usul','Sana'].map(h=><th key={h} className="text-left py-3 px-2 text-[11px] text-gray-400 font-semibold uppercase">{h}</th>)}</tr></thead><tbody>{users.map(u=><tr key={u.id} className="border-b border-gray-50 hover:bg-emerald-50/50"><td className="py-3 px-2"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-400 text-white flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">{u.avatar?<img src={u.avatar} alt="" className="w-full h-full object-cover"/>:initials(u.name||u.email||'')}</div><span className="font-semibold">{u.name||'—'}</span></div></td><td className="py-3 px-2 text-gray-500">{u.email}</td><td className="py-3 px-2"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.role==='admin'?'bg-emerald-100 text-emerald-700':'bg-purple-100 text-purple-700'}`}>{u.role==='admin'?'Admin':'User'}</span></td><td className="py-3 px-2 text-xs">{u.provider==='google'?<span className="flex items-center gap-1 text-blue-500"><i className="ri-google-fill"/>Google</span>:<span className="flex items-center gap-1 text-gray-500"><i className="ri-mail-line"/>Email</span>}</td><td className="py-3 px-2 text-gray-400">{fmtDate(u.createdAt)}</td></tr>)}</tbody></table></div></div></div>);}
function AdminComplaints(){const{state,dispatch}=useApp();const u=state.currentUser;const allMsgs=ChatAPI.getAll();const complaints=allMsgs.filter(m=>m.text.startsWith('Shikoyat:'));const openComplaintChat=async(from:string)=>{dispatch({type:'CHAT_TARGET',payload:from});dispatch({type:'NAV',payload:'chat'});ChatAPI.markReadRemote(from,u!.id).then(()=>dispatch({type:'CHAT_SYNC',payload:Date.now()}));};return(<div><div className="mb-6"><h2 className="text-2xl font-extrabold">Shikoyatlar</h2><p className="text-gray-500 text-sm">{complaints.length} ta, {u?ChatAPI.unreadComplaints(u.id):0} o'qilmagan</p></div><div className="bg-white rounded-2xl p-5 shadow-sm">{complaints.length===0?<div className="text-center py-12 text-gray-400"><i className="ri-flag-line text-5xl text-gray-200 block mb-3"/>Hozircha yo'q</div>:<div className="space-y-4">{complaints.map(c=>{const isUnread=!c.read&&c.to===u?.id;return(<div key={c.id} className={`border rounded-xl p-4 hover:bg-gray-50 transition ${isUnread?'border-red-200 bg-red-50/30':'border-gray-100'}`}><div className="flex justify-between items-start mb-2"><div className="flex items-center gap-2"><div className="font-semibold">{AuthAPI.getUsers().find(x=>x.id===c.from)?.name||'Noma\'lum'}</div>{isUnread&&<span className="w-2 h-2 rounded-full bg-red-500 inline-block"/>}</div><div className="text-xs text-gray-400">{fmtTime(c.time)}</div></div><div className="text-gray-600 mb-3">{renderMessage(c)}</div><button onClick={()=>openComplaintChat(c.from)} className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition">Chat ochish</button></div>);})}  </div>}</div></div>);}
function AdminReviews(){
  const{state}=useApp();const reviews=state.reviews;
  useEffect(() => { ReviewsAPI.markAllRead(); }, []);
  const deleteReview=async(id:string)=>{if(confirm("O'chirilsinmi?")){await ReviewsAPI.remove(id);toast("O'chirildi",'warn');}};
  const toggleFeature=async(r:Review)=>{await ReviewsAPI.update(r.id, {featured: !r.featured}); toast(r.featured?"Belgi olib tashlandi":"Asosiy sahifaga qo'shildi");};
  const setReply=async(r:Review)=>{const rep=prompt("Javob yozing:", r.adminReply||""); if(rep!==null) await ReviewsAPI.update(r.id, {adminReply: rep});};

  return(<div><div className="mb-6"><h2 className="text-2xl font-extrabold">Sharhlar</h2><p className="text-gray-500 text-sm">{reviews.length} ta sharh</p></div><div className="bg-white rounded-2xl p-5 shadow-sm">{reviews.length===0?<div className="text-center py-12 text-gray-400"><i className="ri-star-line text-5xl text-gray-200 block mb-3"/>Hozircha sharh yo'q</div>:<div className="space-y-4">{reviews.map(r=><div key={r.id} className={`border rounded-xl p-4 transition ${r.featured?'border-amber-200 bg-amber-50/20':'border-gray-100 hover:bg-gray-50'}`}><div className="flex justify-between items-start mb-2"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-400 text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">{r.userAvatar?<img src={r.userAvatar} alt="" className="w-full h-full object-cover"/>:initials(r.userName)}</div><div><div className="font-bold text-sm">{r.userName}</div><div className="flex gap-0.5">{[1,2,3,4,5].map(s=><i key={s} className={`${s<=r.stars?'ri-star-fill text-amber-400':'ri-star-line text-gray-300'} text-sm`}/>)}</div></div></div><div className="flex items-center gap-1.5">
    <button onClick={()=>toggleFeature(r)} className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition ${r.featured?'bg-amber-400 text-white':'bg-amber-50 text-amber-500 hover:bg-amber-100'}`} title={r.featured?"Asosiy sahifadan olish":"Asosiy sahifaga chiqarish"}><i className={r.featured?'ri-star-fill':'ri-star-line'}/></button>
    <button onClick={()=>setReply(r)} className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center text-sm" title="Javob yozish"><i className="ri-reply-line"/></button>
    <button onClick={()=>deleteReview(r.id)} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center text-sm"><i className="ri-delete-bin-line"/></button>
  </div></div><p className="text-gray-600 text-sm">{r.text}</p>{r.adminReply&&<div className="mt-3 p-3 bg-white/60 rounded-lg border-l-4 border-emerald-400 text-xs italic text-gray-500"><span className="font-bold text-emerald-700 not-italic block mb-1">Admin javobi:</span>{r.adminReply}</div>}</div>)}</div>}</div></div>);
}
function AdminSettings(){const{dispatch}=useApp();return(<div><div className="mb-6"><h2 className="text-2xl font-extrabold">Sozlamalar</h2></div><div className="bg-white rounded-2xl p-6 shadow-sm mb-4"><h3 className="font-bold mb-4">Admin</h3><div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-semibold mb-1 block">Email</label><input className="w-full px-4 py-3 bg-emerald-50 rounded-xl text-sm text-gray-500" value={ADMIN_EMAIL} disabled/></div><div><label className="text-sm font-semibold mb-1 block">Telefon</label><input className="w-full px-4 py-3 bg-emerald-50 rounded-xl text-sm text-gray-500" value="+998 99 676 77 42" disabled/></div></div></div><div className="bg-white rounded-2xl p-6 shadow-sm"><h3 className="font-bold mb-4">Ma'lumotlar</h3><div className="flex gap-3"><button onClick={()=>{if(confirm('Tiklash?')){dispatch({type:'RESET'});toast('Tiklandi');}}} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold rounded-xl text-sm hover:bg-emerald-100 transition"><i className="ri-refresh-line"/>Tiklash</button><button onClick={()=>{if(confirm("BARCHA ma'lumotlar o'chiriladi!")){dispatch({type:'CLEAR'});toast("O'chirildi","warn");}}} className="flex items-center gap-2 px-5 py-2.5 bg-red-50 border border-red-200 text-red-600 font-semibold rounded-xl text-sm hover:bg-red-100 transition"><i className="ri-delete-bin-line"/>Tozalash</button></div></div></div>);}

// ─── TOP REVIEWS (homepage) ──────────────────────────────────
function TopReviews(){
  const{state,dispatch}=useApp();
  const topRevs=state.reviews.filter(r=>r.featured || r.stars>=4).sort((a,b)=>{if(a.featured && !b.featured) return -1; if(!a.featured && b.featured) return 1; return b.stars-a.stars;}).slice(0,6);
  return (
    <section className="pb-20"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-end mb-8 flex-wrap gap-4"><div><h2 className="text-3xl font-extrabold mb-1">Foydalanuvchi sharhlari</h2><p className="text-gray-500">Bizning mijozlar fikri</p></div>
        <button onClick={()=>{if(!state.auth){dispatch({type:'AUTH_REQ',payload:{open:true,action:'Sharh qoldirish'}});return;}dispatch({type:'NAV',payload:'review'});window.scrollTo({top:0});}} className="flex items-center gap-1 text-emerald-700 font-bold hover:text-emerald-900 transition active:scale-95">Sharh qoldirish <i className="ri-arrow-right-line"/></button>
      </div>
      {topRevs.length===0?(
        <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-emerald-100">
          <i className="ri-star-smile-line text-4xl text-emerald-200 block mb-3"/>
          <p className="text-gray-500 mb-4">Hozircha sharhlar yo'q. Birinchilardan bo'lib sharh qoldiring!</p>
          <button onClick={()=>{if(!state.auth){dispatch({type:'AUTH_REQ',payload:{open:true,action:'Sharh qoldirish'}});return;}dispatch({type:'NAV',payload:'review'});}} className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl active:scale-95 transition">Sharh qoldirish</button>
        </div>
      ):(
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {topRevs.map(r=><div key={r.id} className={`bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all border-2 ${r.featured?'border-amber-200':'border-transparent'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-400 text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">{r.userAvatar?<img src={r.userAvatar} alt="" className="w-full h-full object-cover"/>:initials(r.userName)}</div>
              <div><div className="font-bold text-sm flex items-center gap-1">{r.userName}{r.featured&&<i className="ri-star-fill text-amber-400 text-xs"/>}</div><div className="flex gap-0.5">{[1,2,3,4,5].map(s=><i key={s} className={`${s<=r.stars?'ri-star-fill text-amber-400':'ri-star-line text-gray-300'} text-sm`}/>)}</div></div>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">{r.text}</p>
            {r.adminReply&&<div className="mt-3 p-2.5 bg-emerald-50/50 rounded-xl border-l-4 border-emerald-500 text-[11px] text-gray-500 italic"><span className="font-bold text-emerald-700 not-italic block mb-0.5">Admin javobi:</span>{r.adminReply}</div>}
            <div className="text-xs text-gray-400 mt-3">{fmtDate(r.createdAt)}</div>
          </div>)}
        </div>
      )}
    </div></section>
  );
}

// ─── REVIEW PAGE ──────────────────────────────────────────────
function ReviewPage(){
  const{state,dispatch}=useApp();
  const[stars,setStars]=useState(0);
  const[hover,setHover]=useState(0);
  const[text,setText]=useState('');
  const[sending,setSending]=useState(false);
  if(!state.auth) return <AuthPage/>;
  const u=state.currentUser!;
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();
    if(stars<1){toast('Yulduzcha tanlang','error');return;}
    if(!text.trim()){toast('Sharh yozing','error');return;}
    setSending(true);
    const review:Review={id:'r_'+Date.now().toString(36),userId:u.id,userName:u.name||u.email||'Foydalanuvchi',userAvatar:u.avatar,stars,text:text.trim(),createdAt:new Date().toISOString(),read:false};
    try {
      await ReviewsAPI.add(review);
      toast('Sharh yuborildi!');
      notifyAdmin(`⭐ <b>Yangi sharh</b>\n👤 ${review.userName}\n${'⭐'.repeat(review.stars)} (${review.stars}/5)\n💬 ${review.text.slice(0,100)}${review.text.length>100?'...':''}`);

      dispatch({type:'NAV',payload:'home'});
      window.scrollTo({top:0});
    } catch (err:any) {
      toast('Xato: Ruxsat berilmadi yoki tarmoq xatosi','error');
      console.error(err);
    } finally {
      setSending(false);
    }
  };
  return(
    <div className="max-w-2xl mx-auto px-4 py-14">
      <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-gray-100">
        <div className="text-center mb-8"><div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-300 text-white flex items-center justify-center text-3xl shadow-lg"><i className="ri-star-smile-line"/></div><h2 className="text-2xl font-extrabold mb-1">Sharh qoldiring</h2><p className="text-gray-500 text-sm">Xizmatimiz haqida fikringiz muhim</p></div>
        <form onSubmit={submit} className="space-y-6">
          <div className="text-center"><label className="text-sm font-semibold mb-3 block">Baholang</label>
            <div className="flex justify-center gap-2">{[1,2,3,4,5].map(s=><button key={s} type="button" onClick={()=>setStars(s)} onMouseEnter={()=>setHover(s)} onMouseLeave={()=>setHover(0)} className="text-4xl transition-transform hover:scale-110 active:scale-95"><i className={`${s<=(hover||stars)?'ri-star-fill text-amber-400':'ri-star-line text-gray-300'}`}/></button>)}</div>
            {stars>0&&<div className="text-sm text-amber-600 font-semibold mt-2">{['','Yomon','O\'rtacha','Yaxshi','Ajoyib','Zo\'r!'][stars]}</div>}
          </div>
          <div><label className="text-sm font-semibold mb-1.5 block">Sharh matni</label><textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Xizmatimiz haqida fikringizni yozing..." className="w-full px-4 py-3 bg-emerald-50 border border-transparent focus:border-emerald-400 focus:bg-white rounded-xl text-sm outline-none transition min-h-[120px] resize-y" required/></div>
          <button type="submit" disabled={sending} className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-emerald-700 to-emerald-500 text-white font-bold rounded-xl shadow-lg active:scale-95 transition disabled:opacity-50"><i className="ri-send-plane-fill"/>{sending?'Yuborilmoqda...':'Sharh yuborish'}</button>
        </form>
      </div>
    </div>
  );
}

// ─── SHARE MODAL (Module 16) ────────────────────────────────
function ShareModal({listing,onClose}:{listing:Listing;onClose:()=>void}){
  const url=`https://uynest.vercel.app/listing/${listing.id}`;
  const text=encodeURIComponent(`${listing.title} — $${listing.price}${listing.type==='rent'?'/oy':''} | UyNest`);
  const copy=()=>{navigator.clipboard.writeText(url).then(()=>toast('Havola nusxalandi'));};;
  const share=(platform:string)=>{
    const links:Record<string,string>={
      telegram:`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${text}`,
      whatsapp:`https://wa.me/?text=${text}%20${encodeURIComponent(url)}`,
      facebook:`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter:`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`,
    };
    if(platform==='instagram'){copy();toast('Havola nusxalandi — Instagram Stories ga qo\'shing!');}
    else window.open(links[platform],'_blank','width=600,height=400');
  };
  return(<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={onClose}><div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e=>e.stopPropagation()}>
    <div className="flex justify-between items-center mb-5"><h3 className="font-bold text-lg">Bu e'lonni ulashing</h3><button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200">✕</button></div>
    <div className="grid grid-cols-3 gap-3 mb-5">
      {[{id:'telegram',icon:'ri-telegram-fill',label:'Telegram',color:'bg-blue-500'},{id:'whatsapp',icon:'ri-whatsapp-fill',label:'WhatsApp',color:'bg-green-500'},{id:'facebook',icon:'ri-facebook-fill',label:'Facebook',color:'bg-blue-600'},{id:'twitter',icon:'ri-twitter-x-fill',label:'X/Twitter',color:'bg-gray-900'},{id:'instagram',icon:'ri-instagram-fill',label:'Instagram',color:'bg-gradient-to-br from-purple-500 to-pink-500 text-white'}].map(p=>(
        <button key={p.id} onClick={()=>share(p.id)} className={`flex flex-col items-center gap-2 p-3 ${p.color} text-white rounded-2xl hover:opacity-90 transition active:scale-95`}>
          <i className={`${p.icon} text-2xl`}/><span className="text-xs font-semibold">{p.label}</span>
        </button>
      ))}
    </div>
    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-3">
      <span className="text-xs text-gray-500 flex-1 truncate">{url}</span>
      <button onClick={copy} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition active:scale-95"><i className="ri-clipboard-line"/>Nusxa</button>
    </div>
  </div></div>);
}

// ─── PHONE CONNECT MODAL ─────────────────────────────────────
function PhoneConnectModal({onClose,onSuccess}:{onClose:()=>void;onSuccess:(phone:string)=>void}){
  const{state,dispatch}=useApp();
  const[phone,setPhone]=useState('');
  const[loading,setLoading]=useState(false);

  const save=async()=>{
    const p=phone.trim().replace(/\s/g,'');
    if(!p.match(/^\+998\d{9}$/)){toast("To'g'ri raqam kiriting: +998XXXXXXXXX",'error');return;}
    setLoading(true);
    try{
      const uid=state.currentUser?.id;
      if(uid){await updateDoc(doc(db,'users',uid),{phone:p});}
      dispatch({type:'UPDATE_USER',payload:{phone:p}});
      toast('Telefon raqam saqlandi');
      onSuccess(p);
    }catch{toast('Xatolik yuz berdi','error');}
    setLoading(false);
  };

  return(<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[300] flex items-center justify-center p-4" onClick={onClose}><div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e=>e.stopPropagation()}>
    <div className="flex justify-between items-center mb-5"><h3 className="font-bold text-lg flex items-center gap-2"><i className="ri-phone-line text-emerald-600"/>Telefon ulash</h3><button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200">✕</button></div>
    <p className="text-sm text-gray-500 mb-4">Telefon raqamingizni kiriting.</p>
    <div className="mb-4"><label className="text-sm font-semibold mb-1.5 block">Telefon raqam</label><div className="relative"><i className="ri-phone-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input value={phone} onChange={e=>setPhone(e.target.value)} onKeyDown={e=>e.key==='Enter'&&save()} placeholder="+998901234567" className="w-full pl-10 pr-4 py-3 bg-emerald-50 border border-transparent focus:border-emerald-400 focus:bg-white rounded-xl text-sm outline-none transition"/></div></div>
    <button onClick={save} disabled={loading} className="w-full py-3 bg-gradient-to-r from-emerald-700 to-emerald-500 text-white font-bold rounded-xl shadow active:scale-95 transition disabled:opacity-50">{loading?'Saqlanmoqda...':'Saqlash'}</button>
  </div></div>);
}

// ─── VIEWING REQUEST MODAL (Module 7) ───────────────────────
function ViewingModal({listing,onClose}:{listing:Listing;onClose:()=>void}){
  const{state}=useApp();
  const[date,setDate]=useState('');
  const[time,setTime]=useState('');
  const[phone,setPhone]=useState(state.currentUser?.phone||'');
  const[loading,setLoading]=useState(false);
  const[showPhoneConnect,setShowPhoneConnect]=useState(false);
  const today=new Date();
  const minDate=new Date(today);minDate.setDate(minDate.getDate()+1);
  const maxDate=new Date(today);maxDate.setDate(maxDate.getDate()+30);
  const toISO=(d:Date)=>d.toISOString().split('T')[0];
  const submit=async()=>{
    if(!date||!time){toast('Sana va vaqt tanlang','error');return;}
    if(!phone){toast('Telefon raqam kiriting','error');return;}
    if(!state.auth||!state.currentUser){toast('Kirish kerak','error');return;}
    setLoading(true);
    try{
      await ViewingRequestAPI.add({
        listingId:listing.id,listingTitle:listing.title,
        listingOwnerId:listing.ownerId||'',requesterId:state.currentUser.id,
        requesterName:state.currentUser.name||'',requesterPhone:phone,
        date,time,status:'pending'
      });
      toast('Ko\'rik so\'rovi yuborildi! Egasi tez orada javob beradi.');
      // Notify listing owner + admin
      const ownerTg=`📅 <b>Yangi ko'rik so'rovi</b>\n\n🏠 ${listing.title}\n📆 Sana: ${date} soat ${time}\n👤 ${state.currentUser?.name||'—'} | ${phone}\n\nTezda javob bering!`;
      if(listing.ownerId) notifyUser(listing.ownerId, ownerTg);
      notifyAdmin(`📅 <b>Ko'rik so'rovi</b>\n🏠 ${listing.title} (${listing.district})\n📆 ${date} ${time}\n👤 ${state.currentUser?.name||'—'} → Egasi: ${listing.owner||'—'}`);
      onClose();
    }catch(e){toast('Xato yuz berdi','error');}finally{setLoading(false);}
  };
  return(<><div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={onClose}><div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl" onClick={e=>e.stopPropagation()}>
    <div className="flex justify-between items-center mb-5"><h3 className="font-bold text-lg flex items-center gap-2"><i className="ri-calendar-check-line text-emerald-600"/>Ko'rikka yozilish</h3><button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">✕</button></div>
    <div className="mb-5">
      <div className="font-semibold text-sm mb-3 text-gray-600">Sana tanlang</div>
      <input
        type="date"
        value={date}
        min={toISO(minDate)}
        max={toISO(maxDate)}
        onChange={e=>setDate(e.target.value)}
        className="w-full px-4 py-3 bg-emerald-50 border-2 border-transparent focus:border-emerald-400 rounded-xl text-sm outline-none transition font-semibold text-emerald-900 cursor-pointer"
      />
      {date&&<div className="mt-2 text-xs text-emerald-700 font-semibold">✓ {new Date(date).toLocaleDateString('uz-Latn',{weekday:'long',day:'numeric',month:'long'})}</div>}
    </div>
    <div className="mb-5"><div className="font-semibold text-sm mb-3 text-gray-600">Vaqt tanlang</div><div className="grid grid-cols-5 gap-2">{TIME_SLOTS.map(t=><button key={t} onClick={()=>setTime(t)} className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition active:scale-95 ${time===t?'bg-emerald-600 text-white border-emerald-600':'border-gray-200 hover:border-emerald-300'}`}>{t}</button>)}</div></div>
    <div className="mb-5"><label className="font-semibold text-sm mb-2 block text-gray-600">Telefon raqam *</label>
      {phone
        ?<div className="w-full px-4 py-3 bg-emerald-50 rounded-xl text-sm font-semibold text-emerald-900 flex items-center gap-2"><i className="ri-phone-fill text-emerald-600"/>{phone}</div>
        :<button onClick={()=>setShowPhoneConnect(true)} className="w-full px-4 py-3 bg-amber-50 border-2 border-dashed border-amber-300 rounded-xl text-sm font-semibold text-amber-700 flex items-center gap-2 hover:bg-amber-100 transition"><i className="ri-phone-line"/>Telefon raqamni ulang</button>}
    </div>
    <div className="flex gap-3"><button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl active:scale-95 transition">Bekor qilish</button><button onClick={submit} disabled={loading||!phone} className="flex-1 py-3 bg-gradient-to-r from-emerald-700 to-emerald-500 text-white font-bold rounded-xl shadow active:scale-95 transition disabled:opacity-50">{loading?'Yuborilmoqda...':'So\'rov yuborish'}</button></div>
  </div></div>
  {showPhoneConnect&&<PhoneConnectModal onClose={()=>setShowPhoneConnect(false)} onSuccess={p=>{setPhone(p);setShowPhoneConnect(false);}}/>}
  </>);
}

// ─── REPORT MODAL (Module 20) ───────────────────────────────
function ReportModal({listing,onClose}:{listing:Listing;onClose:()=>void}){
  const{state}=useApp();
  const[type,setType]=useState<Report['type']>('fake');
  const[comment,setComment]=useState('');
  const[loading,setLoading]=useState(false);
  const submit=async()=>{
    if(!comment.trim()){toast('Izoh yozing','error');return;}
    if(!state.auth||!state.currentUser){toast('Kirish kerak','error');return;}
    setLoading(true);
    try{
      await ReportsAPI.add({listingId:listing.id,listingTitle:listing.title,reporterId:state.currentUser.id,type,comment:comment.trim(),status:'pending'});
      toast('Shikoyat yuborildi! Admin ko\'rib chiqadi.');
      const typelbl:{[k:string]:string}={fake:'Soxta e\'lon',wrong_price:'Noto\'g\'ri narx',outdated:'Eskirgan',other:'Boshqa'};
      notifyAdmin(`🚨 <b>Yangi shikoyat</b>\n\n🏠 ${listing.title}\n⚠️ Tur: ${typelbl[type]||type}\n💬 ${comment.trim()}\n👤 Reporter: ${state.currentUser?.name||'—'}`);
      onClose();
    }catch(e){toast('Xato yuz berdi','error');}finally{setLoading(false);}
  };
  const types:{v:Report['type'];l:string}[]=[{v:'fake',l:'Soxta e\'lon'},{v:'wrong_price',l:'Noto\'g\'ri narx'},{v:'outdated',l:'Eskirgan ma\'lumot'},{v:'other',l:'Boshqa'}];
  return(<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={onClose}><div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e=>e.stopPropagation()}>
    <div className="flex justify-between items-center mb-5"><h3 className="font-bold text-lg flex items-center gap-2"><i className="ri-flag-line text-red-500"/>Muammo haqida xabar</h3><button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">✕</button></div>
    <div className="mb-4"><label className="text-sm font-semibold mb-2 block">Muammo turi</label><div className="space-y-2">{types.map(t=><button key={t.v} onClick={()=>setType(t.v)} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition ${type===t.v?'bg-red-50 border-red-400 text-red-700':'border-gray-200 hover:border-red-200'}`}>{t.l}</button>)}</div></div>
    <div className="mb-5"><label className="text-sm font-semibold mb-2 block">Izoh</label><textarea value={comment} onChange={e=>setComment(e.target.value)} rows={3} placeholder="Muammo haqida batafsil yozing..." className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-300 transition resize-none"/></div>
    <div className="flex gap-3"><button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl">Bekor qilish</button><button onClick={submit} disabled={loading} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl active:scale-95 transition disabled:opacity-50">{loading?'Yuborilmoqda...':'Yuborish'}</button></div>
  </div></div>);
}

// ─── MORTGAGE CALCULATOR (Module 11) ───────────────────────
function MortgageCalc({price}:{price:number}){
  const[dpS,setDpS]=useState('20');
  const[yrS,setYrS]=useState('10');
  const[rtS,setRtS]=useState('18');
  const cl=(s:string,mn:number,mx:number)=>Math.max(mn,Math.min(mx,parseFloat(s)||mn));
  const dp=cl(dpS,0,90);const years=cl(yrS,1,50);const rate=cl(rtS,0.1,50);
  const principal=price*(1-dp/100);
  const r=rate/100/12;const n=years*12;
  const monthly=principal>0&&r>0?principal*(r*Math.pow(1+r,n))/(Math.pow(1+r,n)-1):0;
  const total=monthly*n;
  const fmt=(v:number)=>v.toLocaleString('en',{maximumFractionDigits:0});
  const ni=(v:string,set:(s:string)=>void,mn:number,mx:number)=>(
    <><input type="number" value={v}
        onChange={e=>set(e.target.value)}
        onFocus={e=>e.target.select()}
        onBlur={()=>set(String(cl(v,mn,mx)))}
        className="flex-1 text-sm outline-none font-semibold text-emerald-700 w-0"/></>
  );
  return(<div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl p-6 border border-emerald-100">
    <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><i className="ri-bank-line text-emerald-600"/>Ipoteka kalkulyatori</h3>
    <div className="grid grid-cols-2 gap-3 mb-4">
      <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Boshlang'ich to'lov (%)</label>
        <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 border border-gray-200">{ni(dpS,setDpS,0,90)}<span className="text-gray-400 text-sm">%</span></div>
        <div className="text-xs text-gray-400 mt-1">${fmt(price*dp/100)}</div>
      </div>
      <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Muddat (yil)</label>
        <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 border border-gray-200">{ni(yrS,setYrS,1,50)}<span className="text-gray-400 text-sm">yil</span></div>
      </div>
      <div className="col-span-2"><label className="text-xs font-semibold text-gray-500 mb-1 block">Foiz stavkasi (% yillik)</label>
        <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 border border-gray-200">{ni(rtS,setRtS,0.1,50)}<span className="text-gray-400 text-sm">%</span></div>
      </div>
    </div>
    <div className="bg-emerald-600 rounded-2xl p-4 text-white">
      <div className="grid grid-cols-3 gap-3 text-center">
        <div><div className="text-xs opacity-80 mb-1">Oylik to'lov</div><div className="font-extrabold text-lg">${fmt(monthly)}</div></div>
        <div><div className="text-xs opacity-80 mb-1">Jami to'lov</div><div className="font-extrabold text-lg">${fmt(total)}</div></div>
        <div><div className="text-xs opacity-80 mb-1">Ortiqcha</div><div className="font-extrabold text-lg">${fmt(total-principal)}</div></div>
      </div>
    </div>
  </div>);
}

// ─── INFRA MAP (Module 10) ──────────────────────────────────
function InfraMap({lat,lng}:{lat:number;lng:number}){
  const[places,setPlaces]=useState<{type:string;name:string;dist:number}[]>([]);
  const[loading,setLoading]=useState(false);
  const haversine=(lat1:number,lng1:number,lat2:number,lng2:number)=>{
    const R=6371000;const dLat=(lat2-lat1)*Math.PI/180;const dLng=(lng2-lng1)*Math.PI/180;
    const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  };
  const load=async()=>{
    setLoading(true);
    try{
      const q=`[out:json][timeout:15];(node["amenity"="school"](around:1000,${lat},${lng});node["amenity"="hospital"](around:1000,${lat},${lng});node["amenity"="supermarket"](around:1000,${lat},${lng});node["railway"="station"](around:1000,${lat},${lng});node["highway"="bus_stop"](around:800,${lat},${lng});node["leisure"="park"](around:1000,${lat},${lng}););out body;`;
      const r=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',body:q});
      const data=await r.json();
      const typeMap:Record<string,string>={'school':'🏫 Maktab','hospital':'🏥 Klinika','supermarket':'🛒 Supermarket','station':'🚇 Metro','bus_stop':'🚌 Avtobus','park':'🌳 Park'};
      const items=data.elements.map((e:any)=>{
        const t=e.tags?.amenity||e.tags?.railway||e.tags?.highway||e.tags?.leisure||'';
        const label=typeMap[t]||t;
        const dist=Math.round(haversine(lat,lng,e.lat,e.lon));
        return {type:label,name:e.tags?.name||label,dist};
      }).sort((a:any,b:any)=>a.dist-b.dist).slice(0,12);
      setPlaces(items);
    }catch{toast('Infratuzilma ma\'lumotlarini yuklashda xato','warn');}
    finally{setLoading(false);}
  };
  if(places.length===0&&!loading) return(<div className="bg-gray-50 rounded-2xl p-5 border border-dashed border-gray-200 text-center"><i className="ri-map-2-line text-3xl text-gray-300 block mb-2"/><p className="text-sm text-gray-500 mb-3">Yaqin atrofdagi maktab, shifoxona va boshqalar</p><button onClick={load} className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl active:scale-95 transition">Infratuzilmani ko'rsatish</button></div>);
  if(loading) return(<div className="bg-gray-50 rounded-2xl p-8 text-center"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"/><p className="text-sm text-gray-500">Yuklanmoqda...</p></div>);
  const groups:Record<string,typeof places>={}; places.forEach(p=>{if(!groups[p.type])groups[p.type]=[];groups[p.type].push(p);});
  return(<div className="bg-emerald-50 rounded-2xl p-5"><h3 className="font-bold text-base mb-4 flex items-center gap-2"><i className="ri-map-pin-2-fill text-emerald-600"/>Yaqin atrofdagi joy</h3><div className="space-y-3">{Object.entries(groups).map(([type,items])=><div key={type}><div className="font-semibold text-sm text-emerald-800 mb-2">{type}</div><div className="space-y-1.5">{items.slice(0,3).map((p,i)=><div key={i} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl text-sm"><span className="text-gray-700 truncate">{p.name}</span><span className="text-gray-400 text-xs shrink-0 ml-2">{p.dist<1000?`${p.dist}m`:`${(p.dist/1000).toFixed(1)}km`}</span></div>)}</div></div>)}</div></div>);
}

// ─── COMPARE BAR (Module 6) ─────────────────────────────────
function CompareBar({compareIds,onChange}:{compareIds:number[];onChange:(ids:number[])=>void}){
  const{state,dispatch}=useApp();
  if(compareIds.length===0) return null;
  const items=compareIds.map(id=>state.approved.find(p=>p.id===id)).filter(Boolean) as Listing[];
  return(<div className="fixed bottom-14 md:bottom-0 left-0 right-0 z-[55] bg-white border-t border-gray-200 shadow-2xl px-4 py-3 flex items-center gap-3 flex-wrap">
    <i className="ri-scales-2-line text-emerald-600 shrink-0"/>
    <span className="font-bold text-sm text-gray-700 shrink-0">Solishtirish ({compareIds.length}/3):</span>
    {items.map(p=><div key={p.id} className="flex items-center gap-2 bg-emerald-50 rounded-xl px-3 py-1.5"><span className="text-sm font-medium truncate max-w-[100px]">{p.title.split(',')[0]}</span><button onClick={()=>onChange(CompareAPI.remove(p.id))} className="text-gray-400 hover:text-red-500 ml-1">✕</button></div>)}
    {compareIds.length<3&&<span className="text-sm text-gray-400">+ Qo'sh</span>}
    <button onClick={()=>onChange([])} className="text-gray-400 hover:text-red-500 text-lg ml-1" title="Yopish"><i className="ri-close-line"/></button>
    <button onClick={()=>{dispatch({type:'NAV',payload:'compare'});window.scrollTo({top:0});}} className="ml-auto flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-700 to-emerald-500 text-white font-bold text-sm rounded-xl shadow active:scale-95 transition">Solishtirish →</button>
  </div>);
}

function ComparePage(){
  const{state,dispatch}=useApp();
  const[ids,setIds]=useState<number[]>(CompareAPI.get());
  // Auto-clear compare list when leaving this page so CompareBar is clean on return
  useEffect(()=>()=>{CompareAPI.clear();},[]);
  const items=ids.map(id=>state.approved.find(p=>p.id===id)).filter(Boolean) as Listing[];
  if(items.length===0) return(<div className="max-w-2xl mx-auto px-4 py-20 text-center"><i className="ri-scales-2-line text-6xl text-gray-200 block mb-4"/><h3 className="font-bold text-xl mb-2">Solishtirish ro'yxati bo'sh</h3><p className="text-gray-500 mb-6">E'lon sahifalaridan "Solishtirish" tugmasini bosing</p><button onClick={()=>{dispatch({type:'NAV',payload:'rent'});window.scrollTo({top:0});}} className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl">E'lonlarni ko'rish</button></div>);
  const rows=[{l:"Narx",v:(p:Listing)=>p.type==='rent'?`$${p.price}/oy`:`$${(p.price||0).toLocaleString()}`},{l:"Maydon",v:(p:Listing)=>`${p.area} m²`},{l:"Xonalar",v:(p:Listing)=>`${p.rooms} xona`},{l:"Qavat",v:(p:Listing)=>p.floor?`${p.floor}/${p.floors}`:'—'},{l:"Tuman",v:(p:Listing)=>p.district},{l:"Tur",v:(p:Listing)=>p.type==='rent'?'Ijara':'Sotuv'},{l:"Tasdiqlangan",v:(p:Listing)=>p.verified?'✅ Ha':'❌ Yo\'q'},{l:"Ko'rishlar",v:(p:Listing)=>String(p.viewsCount||0)},{l:"Telegram",v:(p:Listing)=>p.telegram||'—'}];
  return(<div className="max-w-5xl mx-auto px-4 py-10">
    <div className="mb-7 flex items-center gap-4"><h2 className="text-3xl font-extrabold flex items-center gap-2"><i className="ri-scales-2-line text-emerald-600"/>E'lonlarni solishtirish</h2><button onClick={()=>{CompareAPI.clear();setIds([]);}} className="text-sm text-red-500 hover:underline">Tozalash</button></div>
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
      <div className="grid overflow-x-auto" style={{gridTemplateColumns:`180px repeat(${items.length},1fr)`}}>
        <div className="p-4 bg-gray-50 border-b border-gray-100"/>
        {items.map(p=><div key={p.id} className="p-4 bg-gray-50 border-b border-gray-100 border-l">
          <div className="aspect-video rounded-xl overflow-hidden mb-3 bg-emerald-50">{p.img&&<img src={p.img} alt="" className="w-full h-full object-cover"/>}</div>
          <div className="font-bold text-sm mb-1 line-clamp-2">{p.title}</div>
          <button onClick={()=>dispatch({type:'DETAIL',payload:p.id})} className="text-xs text-emerald-700 hover:underline">Batafsil →</button>
          <button onClick={()=>setIds(CompareAPI.remove(p.id))} className="block text-xs text-red-500 hover:underline mt-1">Olib tashlash</button>
        </div>)}
        {rows.map((r,i)=><React.Fragment key={r.l}>
          <div className={`p-4 font-semibold text-sm text-gray-600 ${i%2===0?'bg-white':'bg-gray-50/50'} border-b border-gray-100`}>{r.l}</div>
          {items.map(p=><div key={p.id} className={`p-4 text-sm ${i%2===0?'bg-white':'bg-gray-50/50'} border-b border-gray-100 border-l font-medium`}>{r.v(p)}</div>)}
        </React.Fragment>)}
      </div>
    </div>
  </div>);
}

// ─── SECURITY TAB ───────────────────────────────────────────
function SecurityTab({u}:{u:User}){
  const{dispatch}=useApp();
  const[confirm,setConfirm]=useState(false);
  const[deleting,setDeleting]=useState(false);
  const handleDelete=async()=>{
    setDeleting(true);
    try{
      const{deleteUser}=await import('firebase/auth');
      const fbUser=auth.currentUser;
      if(fbUser){await deleteUser(fbUser);}
      CompareAPI.clear();
      dispatch({type:'LOGOUT'});
      toast('Hisob o\'chirildi');
    }catch(e:any){
      if(e?.code==='auth/requires-recent-login'){
        toast('Xavfsizlik uchun qayta login qiling, keyin o\'chiring','error');
      } else {
        toast('Xatolik yuz berdi. Adminiga murojaat qiling','error');
      }
    }
    setDeleting(false);setConfirm(false);
  };
  return(
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h3 className="font-bold text-lg mb-5">Xavfsizlik</h3>
      <div className="p-5 bg-red-50 border border-red-100 rounded-2xl">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0"><i className="ri-delete-bin-6-line text-red-600 text-xl"/></div>
          <div>
            <div className="font-bold text-red-700 mb-1">Hisobni o'chirish</div>
            <p className="text-xs text-red-500 leading-relaxed">Bu amal qaytarib bo'lmaydi. Barcha e'lonlar, xabarlar va ma'lumotlar butunlay o'chib ketadi.</p>
          </div>
        </div>
        {!confirm?(
          <button onClick={()=>setConfirm(true)} className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl active:scale-95 transition shadow">
            <i className="ri-delete-bin-6-line"/>Hisobni o'chirish
          </button>
        ):(
          <div className="bg-white border border-red-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-red-700 mb-3">Rostdan ham <b>{u.name||u.email}</b> hisobini o'chirmoqchimisiz?</p>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl disabled:opacity-60 active:scale-95 transition">
                {deleting?<><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>O'chirilmoqda...</>:<><i className="ri-check-line"/>Ha, o'chirish</>}
              </button>
              <button onClick={()=>setConfirm(false)} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-200 active:scale-95 transition">Bekor qilish</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── FULL PROFILE PAGE (Module 9) ───────────────────────────
function FullProfilePage(){
  const{state,dispatch}=useApp();
  if(!state.auth||!state.currentUser) return <AuthPage/>;
  const u=state.currentUser;
  const[tab,setTab]=useState('info');
  const[name,setName]=useState(u.name||'');
  const[showPhoneConnect,setShowPhoneConnect]=useState(false);
  const[saving,setSaving]=useState(false);
  const[viewReqs,setViewReqs]=useState<ViewingRequest[]>([]);
  const[savedSearches,setSavedSearches]=useState<SavedSearch[]>([]);
  const myListings=state.approved.filter(p=>p.ownerId===u.id);
  const savedItems=state.approved.filter(p=>state.favorites.includes(p.id.toString()));
  const[tgCode,setTgCode]=useState('');
  const[tgLinked,setTgLinked]=useState(!!(u as any).telegramChatId);

  useEffect(()=>{
    if(tab==='notifications'){
      ViewingRequestAPI.fetchByUser(u.id).then(setViewReqs);
    }
    if(tab==='searches'){
      SavedSearchAPI.fetchByUser(u.id).then(setSavedSearches);
    }
  },[tab,u.id]);

  const saveProfile=async()=>{
    setSaving(true);
    try{
      await updateDoc(doc(db,'users',u.id),{name});
      dispatch({type:'UPDATE_USER',payload:{name}});
      toast('Profil saqlandi');
    }catch{toast('Xatolik','error');}
    finally{setSaving(false);}
  };
  const genTgCode=async()=>{
    const c=Math.floor(100000+Math.random()*900000).toString();
    try{
      await setDoc(doc(db,'telegram_codes',u.id),{
        userId:u.id, code:c, used:false,
        createdAt:new Date().toISOString(),
        expiresAt:new Date(Date.now()+10*60*1000).toISOString()
      });
      setTgCode(c);
      toast('Kod yaratildi! Botga yuboring');
    }catch{toast('Xato yuz berdi','error');}
  };
  const unlinkTg=async()=>{
    try{await updateDoc(doc(db,'users',u.id),{telegramChatId:null});setTgLinked(false);toast('Telegram uzildi','warn');}catch{toast('Xato','error');}
  };
  const[premiumListing,setPremiumListing]=useState<Listing|null>(null);
  const[premiumPurpose,setPremiumPurpose]=useState<'premium_top'|'premium_featured'|'premium_urgent'>('premium_top');
  const[showPremiumPay,setShowPremiumPay]=useState(false);
  const premiumOptions=[
    {purpose:'premium_top' as const,label:'TOP',icon:'ri-trophy-fill',price:'50,000',days:7,color:'from-amber-500 to-amber-400',desc:'Qidiruvda va sahifada eng tepada ko\'rinadi'},
    {purpose:'premium_featured' as const,label:'FEATURED',icon:'ri-star-fill',price:'100,000',days:7,color:'from-purple-600 to-purple-500',desc:'Bosh sahifada katta kartochka sifatida ko\'rinadi'},
    {purpose:'premium_urgent' as const,label:'URGENT',icon:'ri-fire-fill',price:'30,000',days:3,color:'from-red-500 to-red-400',desc:'Qizil "Shoshilinch" belgisi bilan diqqatni tortadi'},
  ];
  const activatePremium=()=>{
    if(!premiumListing)return;
    const dayMap:{[k:string]:number}={premium_top:7,premium_featured:7,premium_urgent:3};
    const days=dayMap[premiumPurpose]||7;
    ListingExtAPI.setPremium(premiumListing.id,premiumPurpose.replace('premium_','') as any,days,premiumListing._docId);
    dispatch({type:'SET_APPROVED',payload:state.approved.map(x=>x.id===premiumListing.id?{...x,isPremium:true,premiumType:premiumPurpose.replace('premium_','') as any,premiumUntil:new Date(Date.now()+days*24*60*60*1000).toISOString()}:x)});
    notifyAdmin(`⭐ <b>Premium faollashtirildi</b>\n🏠 ${premiumListing.title}\n🏅 Tur: ${premiumPurpose}\n👤 ${u.name}`);
    toast(`Premium faollashtirildi! ${days} kun`);
  };

  const tabs=[{id:'info',icon:'ri-user-line',l:'Ma\'lumot'},{id:'listings',icon:'ri-home-4-line',l:'E\'lonlarim'},{id:'premium',icon:'ri-vip-crown-line',l:'Premium'},{id:'notifications',icon:'ri-notification-3-line',l:'Bildirishnomalar'},{id:'searches',icon:'ri-search-line',l:'Qidiruvlar'},{id:'saved',icon:'ri-heart-line',l:'Sevimlilar'},{id:'security',icon:'ri-shield-line',l:'Xavfsizlik'}];

  return(<div className="max-w-5xl mx-auto px-4 py-10">
    <div className="flex flex-col md:flex-row gap-6">
      <aside className="w-full md:w-60 shrink-0">
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-400 text-white flex items-center justify-center font-bold text-2xl mx-auto mb-3 overflow-hidden shadow-lg shadow-emerald-500/25">{u.avatar?<img src={u.avatar} alt="" className="w-full h-full object-cover"/>:initials(u.name||u.email||'')}</div>
          <div className="font-bold truncate">{isAdmin(u)?'Admin':u.name||'—'}</div>
          <div className="text-xs text-gray-400 truncate">{u.email||u.phone}</div>
          {isAdmin(u)&&<span className="inline-block mt-2 bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full">Admin</span>}
          {tgLinked&&<div className="mt-2 flex items-center justify-center gap-1 text-xs text-blue-600 font-semibold"><i className="ri-telegram-fill"/>Telegram ulangan</div>}
        </div>
        {/* ── PREMIUM CTA between sidebar sections ── */}
        {!isAdmin(u)&&<div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 mb-4 text-center">
          <div className="text-lg mb-1"><i className="ri-star-fill text-amber-500"/></div>
          <div className="font-bold text-amber-800 text-sm mb-1">E'lonni premium qiling</div>
          <div className="text-xs text-amber-600 mb-3">3x ko'proq xaridor</div>
          <button onClick={()=>setTab('premium')} className={`w-full py-2 rounded-xl text-xs font-bold transition active:scale-95 ${tab==='premium'?'bg-amber-500 text-white':'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}>Premium tanlash →</button>
        </div>}
        <nav className="bg-white rounded-2xl p-2 shadow-sm">{tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition ${tab===t.id?'bg-emerald-50 text-emerald-800 font-semibold':'text-gray-600 hover:bg-gray-50'}`}><i className={`${t.icon} text-base`}/>{t.l}</button>)}</nav>
        <button onClick={async()=>{if(state.token)AuthAPI.revoke(state.token);await AuthAPI.signOut();CompareAPI.clear();dispatch({type:'LOGOUT'});toast('Chiqildi');dispatch({type:'NAV',payload:'home'});window.scrollTo({top:0});}} className="mt-3 w-full flex items-center gap-2.5 px-3 py-2.5 bg-white rounded-2xl shadow-sm text-sm text-red-500 hover:bg-red-50 transition"><i className="ri-logout-circle-r-line"/>Chiqish</button>
      </aside>

      <div className="flex-1 min-w-0">
        {/* ── INFO ── */}
        {tab==='info'&&(<div className="bg-white rounded-2xl p-6 shadow-sm"><h3 className="font-bold text-lg mb-5">Asosiy ma'lumot</h3><div className="space-y-4 mb-6"><div><label className="text-sm font-semibold mb-1 block">Ism</label><input value={name} onChange={e=>setName(e.target.value)} className="w-full px-4 py-3 bg-emerald-50 rounded-xl text-sm outline-none focus:ring-2 ring-emerald-200"/></div><div><label className="text-sm font-semibold mb-1 block">Telefon raqam</label>{u.phone?<div><div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 rounded-xl text-sm font-semibold text-emerald-900 mb-2"><i className="ri-phone-fill text-emerald-600 shrink-0"/><span className="flex-1 truncate">{u.phone}</span><span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0"><i className="ri-checkbox-circle-fill"/>Ulangan</span></div><button onClick={async()=>{if(!window.confirm("Telefon raqamni uzmoqchimisiz?"))return;const uid=state.currentUser?.id;if(!uid)return;try{await updateDoc(doc(db,'users',uid),{phone:null});dispatch({type:'UPDATE_USER',payload:{phone:''}});toast('Telefon raqam uzildi');}catch{toast('Xatolik yuz berdi','error');}}} className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-sm font-semibold rounded-xl transition active:scale-95"><i className="ri-link-unlink-m text-base"/>Raqamni uzish</button></div>:<button onClick={()=>setShowPhoneConnect(true)} className="w-full flex items-center gap-2 px-4 py-3 bg-amber-50 border-2 border-dashed border-amber-300 rounded-xl text-sm font-semibold text-amber-700 hover:bg-amber-100 transition"><i className="ri-phone-line"/>Telefon raqam ulash</button>}</div><div><label className="text-sm font-semibold mb-1 block">Email</label><input value={u.email||''} disabled className="w-full px-4 py-3 bg-gray-100 rounded-xl text-sm text-gray-400"/></div></div><button onClick={saveProfile} disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-700 to-emerald-500 text-white font-bold rounded-xl shadow active:scale-95 transition disabled:opacity-50"><i className="ri-save-line"/>{saving?'Saqlanmoqda...':'Saqlash'}</button></div>)}
        {showPhoneConnect&&<PhoneConnectModal onClose={()=>setShowPhoneConnect(false)} onSuccess={p=>{dispatch({type:'UPDATE_USER',payload:{phone:p}});setShowPhoneConnect(false);}}/>}

        {/* ── MY LISTINGS ── */}
        {tab==='listings'&&(<div className="space-y-3">{myListings.length===0?<div className="bg-white rounded-2xl p-12 text-center shadow-sm"><i className="ri-home-line text-4xl text-gray-200 block mb-3"/><p className="text-gray-500">Hali e'lonlaringiz yo'q</p><button onClick={()=>{dispatch({type:'NAV',payload:'submit'});window.scrollTo({top:0});}} className="mt-4 px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-sm">E'lon qo'shish</button></div>:myListings.map(p=><div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-start sm:items-center"><div className="w-16 h-16 rounded-xl overflow-hidden bg-emerald-50 shrink-0">{p.img&&<img src={p.img} alt="" className="w-full h-full object-cover"/>}</div><div className="flex-1 min-w-0"><div className="font-bold text-sm truncate">{p.title}</div><div className="text-xs text-gray-400">{p.district} • ${p.price}{p.type==='rent'?'/oy':''}</div><div className="flex gap-3 text-xs text-gray-400 mt-1"><span><i className="ri-eye-line mr-0.5"/>{p.viewsCount||0} ko'rish</span><span><i className="ri-heart-line mr-0.5"/>{p.favoritesCount||0} saqlagan</span>{p.verified&&<span className="text-emerald-600"><i className="ri-verified-badge-fill mr-0.5"/>Tasdiqlangan</span>}{p.isPremium&&<span className="text-amber-600 flex items-center gap-0.5"><i className="ri-star-fill"/>{p.premiumType?.toUpperCase()}</span>}</div></div><div className="flex gap-2 shrink-0"><button onClick={()=>dispatch({type:'DETAIL',payload:p.id})} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-semibold rounded-lg text-xs hover:bg-emerald-100">Ko'rish</button><button onClick={()=>{setPremiumListing(p);setTab('premium');}} className="px-3 py-1.5 bg-amber-50 text-amber-700 font-semibold rounded-lg text-xs hover:bg-amber-100 flex items-center gap-1"><i className="ri-star-line"/>Premium</button></div></div>)}</div>)}

        {/* ── PREMIUM ── */}
        {tab==='premium'&&(<div>
          <div className="bg-gradient-to-r from-amber-500 to-orange-400 rounded-2xl p-6 text-white mb-6 shadow-lg">
            <div className="text-2xl font-extrabold mb-1 flex items-center gap-2"><i className="ri-star-fill"/>Premium xizmat</div>
            <p className="text-amber-100 text-sm">E'loningizni ko'proq odamga ko'rsating va tezroq xaridor toping</p>
          </div>
          {/* STEP 1 — Select listing */}
          <div className="bg-white rounded-2xl p-5 shadow-sm mb-5">
            <div className="font-bold text-sm mb-1 text-gray-700 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-extrabold shrink-0">1</span>E'lonni tanlang</div>
            <p className="text-xs text-gray-400 mb-3 ml-8">Qaysi e'loningizni premium qilmoqchisiz?</p>
            {myListings.length===0
              ?<div className="text-center py-8 text-gray-400 text-sm"><i className="ri-home-line text-3xl text-gray-200 block mb-2"/>E'lonlaringiz yo'q<br/><button onClick={()=>{dispatch({type:'NAV',payload:'submit'});window.scrollTo({top:0});}} className="mt-3 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg">E'lon qo'shish</button></div>
              :<div className="space-y-2">{myListings.map(p=>(
                <button key={p.id} onClick={()=>setPremiumListing(p)} className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition text-left ${premiumListing?.id===p.id?'border-amber-400 bg-amber-50':'border-gray-200 hover:border-amber-200'}`}>
                  <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-gray-100">{p.img&&<img src={p.img} alt="" className="w-full h-full object-cover"/>}</div>
                  <div className="flex-1 min-w-0"><div className="font-semibold text-sm truncate">{p.title}</div><div className="text-xs text-gray-400">{p.district} • ${p.price}{p.type==='rent'?'/oy':''}</div>{p.isPremium&&<div className="text-xs text-amber-600 font-bold flex items-center gap-0.5"><i className="ri-star-fill"/>Hozir {p.premiumType?.toUpperCase()} aktiv</div>}</div>
                  {premiumListing?.id===p.id&&<i className="ri-checkbox-circle-fill text-amber-500 text-xl shrink-0"/>}
                </button>
              ))}</div>
            }
          </div>

          {/* STEP 2 — 3 premium options, each with its own pay button */}
          <div className="font-bold text-sm mb-3 text-gray-700 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-extrabold shrink-0">2</span>Premium turini tanlang va to'lang</div>
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            {premiumOptions.map(opt=>(
              <div key={opt.purpose} className={`rounded-2xl border-2 overflow-hidden transition ${premiumPurpose===opt.purpose?'border-amber-400 shadow-lg shadow-amber-100':'border-gray-200'}`}>
                <div className={`p-4 bg-gradient-to-br ${opt.color}`}>
                  <div className="text-white font-extrabold text-lg">{opt.label}</div>
                  <div className="text-white/80 text-xs mt-0.5">{opt.days} kun</div>
                </div>
                <div className="p-4 bg-white">
                  <div className="text-2xl font-extrabold text-gray-900 mb-1">{opt.price}<span className="text-sm font-normal text-gray-500 ml-1">so'm</span></div>
                  <div className="text-xs text-gray-500 mb-4">{opt.desc}</div>
                  <button
                    onClick={()=>{
                      if(!premiumListing){toast('Avval e\'lonni tanlang ⬆️','error');return;}
                      setPremiumPurpose(opt.purpose);
                      setShowPremiumPay(true);
                    }}
                    className={`w-full py-2.5 rounded-xl text-sm font-extrabold transition active:scale-95 bg-gradient-to-r ${opt.color} text-white shadow-sm hover:opacity-90`}
                  >
                    To'lash — {opt.price} so'm
                  </button>
                </div>
              </div>
            ))}
          </div>
          {!premiumListing&&<div className="text-center text-xs text-amber-600 font-semibold mb-2">⬆️ Avval e'lonni tanlang</div>}
          {showPremiumPay&&<PaymentModal purpose={premiumPurpose} onSuccess={()=>{activatePremium();setShowPremiumPay(false);}} onClose={()=>setShowPremiumPay(false)}/>}
        </div>)}

        {/* ── NOTIFICATIONS ── */}
        {tab==='notifications'&&(<div className="space-y-5">
          {/* Telegram connect card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><i className="ri-telegram-fill text-blue-500"/>Telegram Bildirishnomalar</h3>
            <p className="text-sm text-gray-500 mb-4">Telegramni ulab, muhim voqealar haqida <b>darhol xabar oling</b> — hatto saytda bo'lmasangiz ham.</p>
            {tgLinked?(
              <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white text-2xl shrink-0"><i className="ri-telegram-fill"/></div>
                <div className="flex-1"><div className="font-bold text-blue-900 flex items-center gap-1"><i className="ri-checkbox-circle-fill text-blue-500"/>Telegram ulangan</div><div className="text-sm text-blue-600 mt-0.5">Barcha bildirishnomalar Telegramga keladi</div></div>
                <button onClick={unlinkTg} className="px-3 py-1.5 bg-red-50 text-red-500 text-xs font-bold rounded-lg hover:bg-red-100 transition">Uzish</button>
              </div>
            ):(
              <div>
                <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200 mb-4">
                  <i className="ri-information-line text-amber-600 text-xl shrink-0 mt-0.5"/>
                  <div className="text-sm text-amber-800">
                    <b>Qanday ulash:</b><br/>
                    1. Quyidagi tugmani bosing — 6 raqamli kod yaratiladi<br/>
                    2. Telegram'dagi <b>@Uynestbot</b> ga yozing: <code className="bg-amber-100 px-1 rounded">/start KOD</code><br/>
                    3. Bot "Ulandi!" deb javob beradi
                  </div>
                </div>
                <button onClick={genTgCode} className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white font-bold rounded-xl text-sm active:scale-95 transition hover:bg-blue-600">
                  <i className="ri-telegram-fill"/>Telegram'ni ulash
                </button>
                {tgCode&&(
                  <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl">
                    <div className="font-bold text-blue-800 mb-2 flex items-center gap-2"><i className="ri-key-2-line"/>Sizning kodingiz (10 daqiqa amal qiladi):</div>
                    <div className="text-4xl font-extrabold text-blue-600 tracking-[0.3em] mb-3">{tgCode}</div>
                    <div className="text-sm text-blue-700">
                      Telegram'ni oching → <b>@Uynestbot</b> → yozing:
                      <div className="mt-1.5 bg-blue-100 px-3 py-2 rounded-lg font-mono font-bold text-blue-900">/start {tgCode}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notification types explained */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-base mb-4 flex items-center gap-2"><i className="ri-notification-3-line text-emerald-600"/>Qachon va nima uchun bildirishnoma keladi?</h3>
            <div className="space-y-3">
              {[
                {icon:'ri-mail-send-line',title:'Yangi xabar keldi',when:'Kimdir e\'loningizga xabar yuborganda',why:'Tezda javob bersangiz, xaridor boshqasiga ketmaydi'},
                {icon:'ri-checkbox-circle-line',title:'E\'lon tasdiqlandi',when:'Admin e\'loningizni tasdiqlagan paytda',why:'E\'lon endi barcha foydalanuvchilarga ko\'rinadi'},
                {icon:'ri-close-circle-line',title:'E\'lon rad etildi',when:'Admin e\'loningizni rad etgan paytda',why:'Sababini bilish va qayta yuborish uchun'},
                {icon:'ri-calendar-check-line',title:'Ko\'rik so\'rovi keldi',when:'Kimdir e\'loningizga ko\'rikka yozilganda',why:'Aniq sana va vaqtni ko\'rsatadi — tasdiqlash kerak'},
                {icon:'ri-notification-3-line',title:'Mos e\'lon topildi',when:'Saqlagan qidiruvingizga yangi e\'lon tushganda',why:'Tez xabar beradi — eng yaxshi variantlarni birinchi bo\'lib ko\'rasiz'},
                {icon:'ri-alert-line',title:'E\'lon eskirmoqda',when:"E'lon muddati tugashdan 3 kun oldin",why:'Yangilash uchun vaqt bo\'ladi — e\'lon o\'chib ketmaydi'},
              ].map(n=>(
                <div key={n.title} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <i className={`${n.icon} text-xl text-emerald-600 shrink-0 mt-0.5`}/>
                  <div><div className="font-semibold text-sm">{n.title}</div><div className="text-xs text-gray-500 mt-0.5"><b>Qachon:</b> {n.when}</div><div className="text-xs text-emerald-700 mt-0.5"><b>Nima uchun muhim:</b> {n.why}</div></div>
                </div>
              ))}
            </div>
          </div>

          {/* Viewing requests list */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-base mb-4 flex items-center gap-2"><i className="ri-calendar-check-line text-emerald-600"/>Ko'rik so'rovlarim</h3>
            {viewReqs.length===0?<div className="text-center py-6 text-gray-400"><i className="ri-calendar-line text-3xl text-gray-200 block mb-2"/>Ko'rik so'rovlari yo'q</div>:
            <div className="space-y-3">{viewReqs.map(r=><div key={r.id} className="border border-gray-100 rounded-xl p-4 flex items-start gap-3"><div className="flex-1"><div className="font-semibold text-sm">{r.listingTitle}</div><div className="text-sm text-gray-500 mt-0.5">📆 {r.date} soat {r.time}</div></div><span className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ${r.status==='confirmed'?'bg-emerald-100 text-emerald-700':r.status==='cancelled'?'bg-red-100 text-red-600':'bg-amber-100 text-amber-700'}`}>{r.status==='confirmed'?'✅ Tasdiqlangan':r.status==='cancelled'?'❌ Bekor':'⏳ Kutmoqda'}</span></div>)}</div>}
          </div>
        </div>)}

        {/* ── SEARCHES ── */}
        {tab==='searches'&&(<div className="bg-white rounded-2xl p-6 shadow-sm"><h3 className="font-bold text-lg mb-5">Saqlangan qidiruvlar</h3>{savedSearches.length===0?<div className="text-center py-8 text-gray-400"><i className="ri-search-line text-4xl text-gray-200 block mb-3"/>Saqlangan qidiruvlar yo'q<br/><span className="text-xs">Qidiruv sahifasida "Saqlash" tugmasini bosing</span></div>:<div className="space-y-3">{savedSearches.map(s=><div key={s.id} className="flex items-center gap-3 p-4 border border-gray-100 rounded-xl"><div className="flex-1"><div className="font-semibold text-sm">{s.filters.type||'Hammasi'} • {s.filters.district||'Barcha tumanlar'}</div><div className="text-xs text-gray-400">{s.filters.minPrice&&`$${s.filters.minPrice} — `}{s.filters.maxPrice&&`$${s.filters.maxPrice}`}{s.filters.rooms&&` • ${s.filters.rooms} xona`}</div></div><button onClick={()=>SavedSearchAPI.remove(s.id).then(()=>setSavedSearches(p=>p.filter(x=>x.id!==s.id)))} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100"><i className="ri-delete-bin-line text-sm"/></button></div>)}</div>}</div>)}

        {/* ── SAVED ── */}
        {tab==='saved'&&(<div>{savedItems.length===0?<div className="bg-white rounded-2xl p-12 text-center shadow-sm"><i className="ri-heart-line text-4xl text-gray-200 block mb-3"/><p className="text-gray-500">Sevimlilarga hech narsa qo'shilmagan</p></div>:<div className="grid sm:grid-cols-2 gap-4">{savedItems.map(p=><Card key={p.id} p={p}/>)}</div>}</div>)}

        {/* ── SECURITY ── */}
        {tab==='security'&&<SecurityTab u={u}/>}
      </div>
    </div>
  </div>);
}

// ─── STATISTICS PAGE (Module 5) ─────────────────────────────
function StatisticsPage(){
  const{state,dispatch:_d}=useApp();void _d;
  const byDistrict=DISTRICTS.map(d=>{
    const items=state.approved.filter(p=>p.district===d);
    const rent=items.filter(p=>p.type==='rent');const sale=items.filter(p=>p.type==='sale');
    const avgRent=rent.length?Math.round(rent.reduce((s,p)=>s+p.price,0)/rent.length):0;
    const avgSale=sale.length?Math.round(sale.reduce((s,p)=>s+p.price,0)/sale.length):0;
    return {d,total:items.length,rent:rent.length,sale:sale.length,avgRent,avgSale};
  }).filter(x=>x.total>0).sort((a,b)=>b.total-a.total);
  const max=Math.max(...byDistrict.map(x=>x.total),1);
  return(<div className="max-w-5xl mx-auto px-4 py-10">
    <div className="mb-8"><h2 className="text-3xl font-extrabold mb-1">Narx statistikasi</h2><p className="text-gray-500">Toshkent tumanlari bo'yicha ko'chmas mulk narxlari</p></div>
    <div className="grid md:grid-cols-3 gap-4 mb-8">{[{l:"Jami e'lonlar",v:state.approved.length,i:'ri-home-4-line',g:'from-emerald-500 to-emerald-400'},{l:"Ijara o'rtacha",v:`$${state.approved.filter(p=>p.type==='rent').length?Math.round(state.approved.filter(p=>p.type==='rent').reduce((s,p)=>s+p.price,0)/state.approved.filter(p=>p.type==='rent').length):0}/oy`,i:'ri-key-2-line',g:'from-blue-500 to-blue-400'},{l:"Sotuv o'rtacha",v:`$${state.approved.filter(p=>p.type==='sale').length?Math.round(state.approved.filter(p=>p.type==='sale').reduce((s,p)=>s+p.price,0)/state.approved.filter(p=>p.type==='sale').length).toLocaleString():0}`,i:'ri-price-tag-3-line',g:'from-purple-500 to-purple-400'}].map(s=><div key={s.l} className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4"><div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.g} text-white flex items-center justify-center text-xl shadow`}><i className={s.i}/></div><div><div className="text-gray-500 text-xs">{s.l}</div><div className="text-2xl font-extrabold">{s.v}</div></div></div>)}</div>
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden"><div className="p-5 border-b border-gray-100"><h3 className="font-bold">Tuman bo'yicha statistika</h3></div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50 border-b">{["Tuman","E'lonlar","Ijara","Sotuv","O'rtacha ijara","O'rtacha sotuv","Grafik"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
        <tbody>{byDistrict.map(r=><tr key={r.d} className="border-b hover:bg-gray-50 transition"><td className="px-4 py-3 font-semibold">{r.d}</td><td className="px-4 py-3 font-bold text-emerald-700">{r.total}</td><td className="px-4 py-3 text-blue-600">{r.rent}</td><td className="px-4 py-3 text-purple-600">{r.sale}</td><td className="px-4 py-3">{r.avgRent?`$${r.avgRent}/oy`:'—'}</td><td className="px-4 py-3">{r.avgSale?`$${r.avgSale.toLocaleString()}`:'—'}</td><td className="px-4 py-3 w-32"><div className="bg-gray-100 rounded-full h-2 w-full"><div className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-2 rounded-full" style={{width:`${(r.total/max*100)}%`}}/></div></td></tr>)}
        </tbody></table></div></div>
  </div>);
}

// ─── ADMIN REPORTS PAGE (Module 20) ─────────────────────────
function AdminReports(){
  const[reports,setReports]=useState<Report[]>([]);
  const[loading,setLoading]=useState(true);
  useEffect(()=>{ReportsAPI.fetchAll().then(r=>{setReports(r);setLoading(false);});},[]);
  const typelabels:Record<string,string>={fake:'Soxta',wrong_price:'Noto\'g\'ri narx',outdated:'Eskirgan',other:'Boshqa'};
  return(<div><div className="mb-6"><h2 className="text-2xl font-extrabold">Shikoyatlar (E'lonlar)</h2><p className="text-gray-500 text-sm">{reports.length} ta shikoyat</p></div>
    {loading?<div className="text-center py-12"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"/></div>:reports.length===0?<div className="bg-white rounded-2xl p-20 text-center shadow-sm"><i className="ri-flag-line text-5xl text-gray-200 block mb-3"/><p className="font-bold">Shikoyatlar yo'q</p></div>:
    <div className="space-y-4">{reports.map(r=><div key={r.id} className="bg-white rounded-2xl p-5 shadow-sm flex flex-col md:flex-row gap-4 items-start"><div className="flex-1"><div className="font-bold mb-1">{r.listingTitle}</div><div className="flex gap-2 flex-wrap mb-2"><span className="bg-red-100 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full">{typelabels[r.type]||r.type}</span><span className={`text-xs font-bold px-2.5 py-1 rounded-full ${r.status==='pending'?'bg-amber-100 text-amber-700':r.status==='reviewed'?'bg-blue-100 text-blue-700':'bg-emerald-100 text-emerald-700'}`}>{r.status==='pending'?'Kutmoqda':r.status==='reviewed'?'Ko\'rildi':'Hal qilindi'}</span></div><p className="text-gray-600 text-sm">{r.comment}</p><p className="text-xs text-gray-400 mt-1">{r.createdAt?fmtDate(r.createdAt):''}</p></div><div className="flex gap-2 shrink-0">{r.status==='pending'&&<button onClick={()=>{ReportsAPI.updateStatus(r.id,'reviewed');setReports(p=>p.map(x=>x.id===r.id?{...x,status:'reviewed' as const}:x));}} className="px-4 py-2 bg-blue-500 text-white text-sm font-bold rounded-xl">Ko'rildi</button>}<button onClick={()=>{ReportsAPI.updateStatus(r.id,'resolved');setReports(p=>p.map(x=>x.id===r.id?{...x,status:'resolved' as const}:x));}} className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl">Hal qilindi</button></div></div>)}
    </div>}
  </div>);
}

// ─── ADMIN VERIFICATIONS PAGE (Module 1) ────────────────────
function AdminVerifications(){
  const{state,dispatch}=useApp();
  const u=state.currentUser;
  const unverified=state.approved.filter(p=>!p.verified);
  const verified=state.approved.filter(p=>p.verified);
  const verify=async(p:Listing)=>{
    await ListingExtAPI.verify(p.id,u?.id||'admin',p._docId);
    dispatch({type:'SET_APPROVED',payload:state.approved.map(x=>x.id===p.id?{...x,verified:true,verifiedAt:new Date().toISOString(),verifiedBy:u?.id||'admin'}:x)});
    toast(`"${p.title}" tasdiqlandi`);
    if(p.ownerId) notifyUser(p.ownerId, `✅ <b>E'loningiz tasdiqlandi!</b>\n\n🏠 "${p.title}"\n📍 ${p.district}\n\nEndi e'loningiz <b>Tasdiqlangan mulk</b> belgisiga ega. Ko'proq xaridorlar ishonadilar!\n\n👉 https://uynest.vercel.app`);
  };
  return(<div><div className="mb-6"><h2 className="text-2xl font-extrabold">Tasdiqlash</h2><p className="text-gray-500 text-sm">{unverified.length} ta tasdiqlanmagan • {verified.length} ta tasdiqlangan</p></div>
    <h3 className="font-bold mb-4 text-amber-700 flex items-center gap-2"><i className="ri-time-line"/>Tasdiqlanmagan ({unverified.length})</h3>
    {unverified.length===0?<div className="bg-white rounded-2xl p-12 text-center shadow-sm mb-6"><i className="ri-checkbox-circle-line text-4xl text-gray-200 block mb-3"/><p className="font-bold">Barchasi tasdiqlangan</p></div>:
    <div className="space-y-3 mb-8">{unverified.map(p=><div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4"><div className="w-16 h-16 rounded-xl overflow-hidden bg-emerald-50 shrink-0">{p.img&&<img src={p.img} alt="" className="w-full h-full object-cover"/>}</div><div className="flex-1 min-w-0"><div className="font-bold text-sm truncate">{p.title}</div><div className="text-xs text-gray-400">{p.district} • ${p.price}{p.type==='rent'?'/oy':''} • {p.owner}</div></div><button onClick={()=>verify(p)} className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-emerald-700 to-emerald-500 text-white text-sm font-bold rounded-xl shadow active:scale-95 transition"><i className="ri-check-line"/>Tasdiq</button></div>)}</div>}
    <h3 className="font-bold mb-4 text-emerald-700 flex items-center gap-2"><i className="ri-checkbox-circle-fill"/>Tasdiqlangan ({verified.length})</h3>
    <div className="space-y-3">{verified.map(p=><div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4 opacity-75"><div className="w-14 h-14 rounded-xl overflow-hidden bg-emerald-50 shrink-0">{p.img&&<img src={p.img} alt="" className="w-full h-full object-cover"/>}</div><div className="flex-1 min-w-0"><div className="font-bold text-sm truncate">{p.title}</div><div className="flex items-center gap-2 text-xs text-gray-400"><i className="ri-verified-badge-fill text-emerald-500"/>Tasdiqlangan • {p.district}</div></div></div>)}</div>
  </div>);
}

// ─── ADMIN PREMIUM PAGE (Module 12) ─────────────────────────
function AdminPremium(){
  const{state,dispatch}=useApp();
  const premium=state.approved.filter(p=>p.isPremium);
  const setPremium=async(p:Listing,type:"top"|"featured"|"urgent",days:number)=>{
    await ListingExtAPI.setPremium(p.id,type,days,p._docId);
    const until=new Date(Date.now()+days*24*60*60*1000).toISOString();
    dispatch({type:'SET_APPROVED',payload:state.approved.map(x=>x.id===p.id?{...x,isPremium:true,premiumType:type,premiumUntil:until}:x)});
    toast(`Premium qo'yildi: ${type}`);
  };
  const removePremium=async(p:Listing)=>{
    if(!confirm(`"${p.title}" dan premiumni olib tashlash?`)) return;
    await ListingExtAPI.removePremium(p.id,p._docId);
    dispatch({type:'SET_APPROVED',payload:state.approved.map(x=>x.id===p.id?{...x,isPremium:false,premiumType:undefined,premiumUntil:undefined}:x)});
    toast('Premium olib tashlandi','warn');
  };
  const pts=[{t:'top' as const,l:'TOP',p:50000,d:7,desc:'Qidiruvda eng tepada'},{t:'featured' as const,l:'FEATURED',p:100000,d:7,desc:'Asosiy sahifada katta kartochka'},{t:'urgent' as const,l:'URGENT',p:30000,d:3,desc:'Shoshilinch qizil badge'}];
  return(<div><div className="mb-6"><h2 className="text-2xl font-extrabold">Premium E'lonlar</h2><p className="text-gray-500 text-sm">{premium.length} ta premium e'lon faol</p></div>
    <div className="grid md:grid-cols-3 gap-4 mb-8">{pts.map(pt=><div key={pt.t} className="bg-white rounded-2xl p-5 shadow-sm border-2 border-amber-100"><div className="font-extrabold text-amber-600 mb-1">{pt.l}</div><div className="text-2xl font-extrabold mb-1">{pt.p.toLocaleString()} so'm</div><div className="text-xs text-gray-500 mb-2">{pt.d} kun • {pt.desc}</div></div>)}</div>
    {premium.length>0&&<div className="bg-amber-50 rounded-2xl p-5 mb-6 border border-amber-200"><h3 className="font-bold text-amber-800 mb-3 flex items-center gap-2"><i className="ri-star-fill"/>Faol premium e'lonlar ({premium.length})</h3><div className="space-y-2">{premium.map(p=><div key={p.id} className="bg-white rounded-xl p-3 flex items-center gap-3"><div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-emerald-50">{p.img&&<img src={p.img} alt="" className="w-full h-full object-cover"/>}</div><div className="flex-1 min-w-0"><div className="font-semibold text-sm truncate">{p.title}</div><span className="text-xs text-amber-600 font-bold">{p.premiumType?.toUpperCase()} — {p.premiumUntil?new Date(p.premiumUntil).toLocaleDateString('uz-Latn'):''}</span></div><button onClick={()=>removePremium(p)} className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 transition active:scale-95 shrink-0"><i className="ri-close-circle-line mr-1"/>Olib tashlash</button></div>)}</div></div>}
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden"><div className="p-5 border-b flex items-center justify-between"><h3 className="font-bold">Barcha e'lonlar — premium qo'yish</h3><span className="text-xs text-gray-400">{state.approved.length} ta e'lon</span></div>
      <div className="divide-y">{state.approved.map(p=><div key={p.id} className={`p-4 flex items-center gap-4 ${p.isPremium?'bg-amber-50/40':''}`}><div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-emerald-50">{p.img&&<img src={p.img} alt="" className="w-full h-full object-cover"/>}</div><div className="flex-1 min-w-0"><div className="font-semibold text-sm truncate">{p.title}</div><div className="text-xs text-gray-400">{p.district} • ${p.price}{p.type==='rent'?'/oy':''}</div>{p.isPremium&&<span className="text-xs text-amber-600 font-bold flex items-center gap-0.5"><i className="ri-star-fill"/>{p.premiumType?.toUpperCase()} aktiv</span>}</div><div className="flex gap-1 flex-wrap">{p.isPremium?<button onClick={()=>removePremium(p)} className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 transition"><i className="ri-close-line"/>Olib tashlash</button>:pts.map(pt=><button key={pt.t} onClick={()=>setPremium(p,pt.t,pt.d)} className="px-2.5 py-1.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg hover:bg-amber-100 transition">{pt.l}</button>)}</div></div>)}</div></div>
  </div>);
}

// ─── AGENT PROFILE (Module 4) ───────────────────────────────
function AgentProfilePage(){
  const{state,dispatch}=useApp();void dispatch;
  const u=state.currentUser;
  const[applying,setApplying]=useState(false);
  const[form,setForm]=useState({company:'',license:'',experience:'',bio:''});
  const isAgent=u?.role==='agent'||u?.role==='admin';
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();
    if(!u) return;
    setApplying(true);
    toast('Agent so\'rovi yuborildi! Admin ko\'rib chiqadi.');
    setTimeout(()=>{setApplying(false);dispatch({type:'NAV',payload:'profile'});},1500);
  };
  if(!state.auth) return <AuthPage/>;
  return(<div className="max-w-2xl mx-auto px-4 py-10">
    <div className="bg-white rounded-3xl p-8 shadow-xl">
      <div className="text-center mb-8"><div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-400 text-white flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg"><i className="ri-user-star-line"/></div><h2 className="text-2xl font-extrabold mb-1">Agent bo'lish</h2><p className="text-gray-500 text-sm">Professional riyeltor sifatida ro'yxatdan o'ting</p></div>
      {isAgent?<div className="text-center py-8"><div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mx-auto mb-4"><i className="ri-verified-badge-fill"/></div><h3 className="font-bold text-lg mb-2">Siz allaqachon tasdiqlangan agentsiz!</h3><p className="text-gray-500 text-sm">Profilingizda agent tizimidan foydalanishingiz mumkin.</p></div>:
      <form onSubmit={submit} className="space-y-4">
        <div><label className="text-sm font-semibold mb-1 block">Kompaniya nomi</label><input value={form.company} onChange={e=>setForm(p=>({...p,company:e.target.value}))} placeholder="UyNest Rieltors" className="w-full px-4 py-3 bg-emerald-50 rounded-xl text-sm outline-none focus:ring-2 ring-emerald-200"/></div>
        <div><label className="text-sm font-semibold mb-1 block">Litsenziya raqami (ixtiyoriy)</label><input value={form.license} onChange={e=>setForm(p=>({...p,license:e.target.value}))} placeholder="LIC-2024-XXXXX" className="w-full px-4 py-3 bg-emerald-50 rounded-xl text-sm outline-none focus:ring-2 ring-emerald-200"/></div>
        <div><label className="text-sm font-semibold mb-1 block">Tajriba (yil)</label><input type="number" value={form.experience} onChange={e=>setForm(p=>({...p,experience:e.target.value}))} placeholder="5" className="w-full px-4 py-3 bg-emerald-50 rounded-xl text-sm outline-none focus:ring-2 ring-emerald-200"/></div>
        <div><label className="text-sm font-semibold mb-1 block">Qisqacha tavsif</label><textarea value={form.bio} onChange={e=>setForm(p=>({...p,bio:e.target.value}))} rows={3} placeholder="O'zingiz haqida qisqacha yozing..." className="w-full px-4 py-3 bg-emerald-50 rounded-xl text-sm outline-none focus:ring-2 ring-emerald-200 resize-none"/></div>
        <button type="submit" disabled={applying} className="w-full py-3.5 bg-gradient-to-r from-emerald-700 to-emerald-500 text-white font-bold rounded-xl shadow active:scale-95 transition disabled:opacity-50">{applying?'Yuborilmoqda...':'So\'rov yuborish'}</button>
      </form>}
    </div>
  </div>);
}

// ─── ENHANCED HOME (Module 17 Recommendations) ──────────────
function RecommendationsSection(){
  const{state,dispatch}=useApp();void dispatch;
  const lastViewed=ListingExtAPI.getLastViewed();
  const recent=lastViewed.map(id=>state.approved.find(p=>p.id===id)).filter(Boolean) as Listing[];
  const popular=[...state.approved].sort((a,b)=>(b.viewsCount||0)-(a.viewsCount||0)).slice(0,4);
  const score=(p:Listing)=>(p.viewsCount||0)+(p.favoritesCount||0)*3+(p.verified?10:0)+(p.isPremium?5:0);
  const top=[...state.approved].sort((a,b)=>score(b)-score(a)).slice(0,4);
  if(state.approved.length===0) return null;
  return(<div className="pb-16"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
    {recent.length>0&&<div><div className="flex justify-between items-end mb-6"><div><h2 className="text-2xl font-extrabold mb-1">🕐 Yaqinda ko'rganlar</h2><p className="text-gray-500 text-sm">So'nggi ko'rilgan e'lonlar</p></div></div><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{recent.slice(0,4).map(p=><Card key={p.id} p={p}/>)}</div></div>}
    <div><div className="flex justify-between items-end mb-6"><div><h2 className="text-2xl font-extrabold mb-1 flex items-center gap-2"><i className="ri-fire-fill text-red-500"/>Eng ko'p ko'rilgan</h2><p className="text-gray-500 text-sm">Bu hafta eng mashhur e'lonlar</p></div></div><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{popular.map(p=><Card key={p.id} p={p}/>)}</div></div>
    <div><div className="flex justify-between items-end mb-6"><div><h2 className="text-2xl font-extrabold mb-1 flex items-center gap-2"><i className="ri-star-fill text-amber-500"/>Yuqori reytingli</h2><p className="text-gray-500 text-sm">Tasdiqlangan + ko'p ko'rilgan</p></div></div><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{top.map(p=><Card key={p.id} p={p}/>)}</div></div>
  </div></div>);
}

// ─── 1. AI NARX BASHORATI (ML-based) ────────────────────────
type MlResult={estimated_price:number;price_per_m2:number;location_adjustment:string;condition_adjustment:string;explanation:string;confidence:'low'|'medium'|'high'};

function AiPriceAssessment({listing,districtAvg}:{listing:Listing;districtAvg:number}){
  const{state}=useApp();
  const[result,setResult]=useState<MlResult|null>(null);
  const[loading,setLoading]=useState(false);
  const[score,setScore]=useState<number|null>(null);

  // --- Local statistics ---
  // Widen search: same propType+district → same propType+city → same propType → relax propType
  const pType=listing.propType||'Kvartira';
  const _byDistrict=state.approved.filter(x=>x.id!==listing.id&&x.type===listing.type&&x.propType===pType&&x.district===listing.district);
  const _byCity=_byDistrict.length<3
    ?state.approved.filter(x=>x.id!==listing.id&&x.type===listing.type&&x.propType===pType&&x.city===listing.city&&x.district!==listing.district)
    :[];
  const _byPropType=(_byDistrict.length+_byCity.length)<3
    ?state.approved.filter(x=>x.id!==listing.id&&x.type===listing.type&&x.propType===pType&&x.city!==listing.city).slice(0,12)
    :[];
  const _anyType=(_byDistrict.length+_byCity.length+_byPropType.length)<3
    ?state.approved.filter(x=>x.id!==listing.id&&x.type===listing.type).slice(0,10)
    :[];
  const similar=[..._byDistrict,..._byCity,..._byPropType,..._anyType];
  const avgDistrictPrice=similar.length>0?Math.round(similar.reduce((s,x)=>s+x.price,0)/similar.length):districtAvg;
  const avgPricePerM2=similar.filter(x=>x.area>0).length>0
    ?Math.round(similar.filter(x=>x.area>0).reduce((s,x)=>s+x.price/x.area,0)/similar.filter(x=>x.area>0).length)
    :0;
  const thisPricePerM2=listing.area>0?Math.round(listing.price/listing.area):0;
  const diff=avgDistrictPrice>0?Math.round(((listing.price-avgDistrictPrice)/avgDistrictPrice)*100):0;
  const amenCount=listing.amenities?.length||0;
  const amenBonus=amenCount>=10?'yuqori (10+)':amenCount>=5?'o\'rtacha (5-9)':'kam (0-4)';

  const assess=async()=>{
    setLoading(true);

    // Remove outliers: keep prices within 0.4x–2.5x of median
    const prices=similar.map(x=>x.price).sort((a,b)=>a-b);
    const median=prices[Math.floor(prices.length/2)]||listing.price;
    // Relaxed outlier filter: 0.25x–4x (wide enough to keep hovli vs kvartira range)
    const clean=similar.filter(x=>x.area>0&&x.price>=median*0.25&&x.price<=median*4);
    // If outlier removal killed everything, use raw similar
    const dataSource=clean.length>=2?clean:similar.filter(x=>x.area>0);

    // Build compact dataset (max 30 rows to save tokens)
    const dataset=dataSource.slice(0,30).map(x=>({
      district:x.district,
      propType:x.propType||'Kvartira',
      area:x.area,
      rooms:x.rooms,
      price:x.price,
      amenities_count:x.amenities?.length||0
    }));

    const target={
      district:listing.district,
      area:listing.area,
      rooms:listing.rooms,
      asking_price:listing.price,
      condition:listing.propertyCategory||'Kvartira',
      amenities_count:amenCount,
      floor:listing.floor||null,
      verified:listing.verified||false
    };

    const ML_SYS=`You are a real estate price estimation model trained on official Uzbekistan 2026 market data.

## 2026 UZ MARKET REFERENCE (source: kun.uz, uzbuild.uz, stat.uz, daryo.uz)

### SOTUV — Kvartira ($/m², ikkilamchi bozor, 2026)
Toshkent shahri:
  Yunusobod: $1,200-1,450 | Mirzo Ulug'bek: $1,050-1,300 | Yakkasaroy: $1,100-1,350
  Shayxontohur: $1,000-1,250 | Mirabad: $1,200-1,500 | Chilonzor: $900-1,150
  Olmazor: $900-1,100 | Uchtepa: $850-1,050 | Sergeli: $650-850
Toshkent viloyati:
  Chirchiq: $550-750 | Zangiota: $450-650 | Bekobod: $400-580
Samarqand viloyati:
  Samarqand (markaz): $750-1,000 | Samarqand (chekka): $500-700 | Kattaqo'rg'on: $380-550
Buxoro viloyati:
  Buxoro: $500-750 | G'ijduvon: $300-480
Andijon viloyati:
  Andijon: $550-800 | Asaka: $380-550
Farg'ona viloyati:
  Farg'ona: $500-750 | Marg'ilon: $380-550
Namangan viloyati:
  Namangan: $500-720 | Chortoq: $280-420
Qashqadaryo viloyati:
  Qarshi: $380-600 | Shahrisabz: $300-480
Surxondaryo viloyati:
  Termiz: $350-550 | Denov: $250-400
Xorazm viloyati:
  Urganch: $380-580 | Xiva: $320-500
Navoiy viloyati:
  Navoiy: $350-550 | Zarafshon: $380-580
Jizzax viloyati:
  Jizzax: $350-520

### SOTUV — Hovli ($/m² uy maydoni bo'yicha, yer bahosi ichida)
Toshkent shahri: $1,100-1,800/m² | Toshkent viloyati: $600-1,000/m²
Samarqand: $550-900/m² | Buxoro: $450-750/m²
Farg'ona vodiysi (Andijon/Farg'ona/Namangan): $500-850/m²
Qashqadaryo/Surxondaryo: $320-600/m² | Xorazm/Navoiy/Jizzax: $300-550/m²

### IJARA — Kvartira ($/oy, 2026)
Toshkent markaz: 1-xona $400-700 | 2-xona $600-1,000 | 3-xona $900-1,500
Toshkent chekka: 1-xona $250-450 | 2-xona $400-650 | 3-xona $550-900
Viloyat markazlari: 1-xona $150-300 | 2-xona $250-450 | 3-xona $350-600
Tuman markazlari: 1-xona $100-200 | 2-xona $180-320 | 3-xona $250-420

### IJARA — Ofis ($/oy/m²)
Toshkent markaz: $12-22/m² | Toshkent chekka: $7-12/m²
Viloyat markazlari: $5-10/m² | Tuman markazlari: $3-6/m²

### TUZATISH KOEFFITSIENTLARI
Mulk turi: Hovli = Kvartira + 30-60% (yer qo'shimchasi)
Qavat: 1-qavat -5%, oxirgi qavat -3%, lift bilan yuqori qavat +3-5%
Ta'mir: Evromont +15-25%, Ta'mirlangan +5-10%, Ta'mirsiz -15-20%
Qulayliklar soni: 1-4 ta (oddiy), 5-9 ta +8%, 10+ ta +15%
Yangi bino vs ikkilamchi: yangi +15-25%
2026 trend: Toshkent yillik +33% hajm o'sishi; viloyatlar +10-12%

## HISOBLASH ALGORITMI
1. Tumanni/shaharni yuqoridagi jadvaldan toping -> narx oralig'ini oling
2. Asosiy baho = oraliq o'rtachasi x maydon (m2)
3. Tuzatishlarni qo'llang: mulk turi, qavat, qulayliklar soni, xonalar
4. Mavjud dataset bilan tekshiring (agar mavjud bo'lsa):
   - 0 ta listing: faqat reference ma'lumot, confidence="low"
   - 1-2 ta listing: dataset 40% + reference 60%, confidence="low"
   - 3-7 ta listing: dataset 60% + reference 40%, confidence="medium"
   - 8+ ta listing: dataset 80% + reference 20%, confidence="high"
5. estimated_price HAR DOIM musbat son bo'lishi shart — hech qachon null yoki 0 qaytarma

Output ONLY valid JSON (no markdown, no text outside JSON):
{"estimated_price":number,"price_per_m2":number,"location_adjustment":"±X%","condition_adjustment":"±X%","explanation":"O'zbek tilida 2-3 jumla tushuntirish","confidence":"low|medium|high"}`;

    const userMsg=`Dataset (${dataset.length} similar listings — ${listing.district}, ${listing.type==='rent'?'ijara':'sotuv'}):
${JSON.stringify(dataset)}

Estimate fair market price for this listing:
${JSON.stringify(target)}`;

    try{
      const raw=await groqAsk(userMsg,600,ML_SYS);
      const cleaned=raw.replace(/```json|```/g,'').trim();
      const jsonMatch=cleaned.match(/\{[\s\S]*\}/);
      const parsed:MlResult=JSON.parse(jsonMatch?jsonMatch[0]:cleaned);
      // Reject response if AI still returned 0/null — use fallback instead
      if(!parsed.estimated_price) throw new Error('estimated_price missing');
      setResult(parsed);
      const confScore:Record<string,number>={high:8.5,medium:6.5,low:4};
      setScore(confScore[parsed.confidence]??5);
    }catch{
      // Fallback: local stats-based result
      const verdict=diff<-15?'Bu narx tumandagi o\'rtachadan ancha arzon — yaxshi taklif.'
        :diff<-5?'Narx bozorga nisbatan biroz qulay.'
        :diff>20?'Narx bozor o\'rtachasidan yuqori, savdo qilish imkoni bor.'
        :diff>10?'Narx biroz yuqori, ammo qulayliklar hisobga olinsa qabul qilinadi.'
        :'Narx tuman bozor narxiga mos keladi.';
      setResult({
        estimated_price:avgDistrictPrice||listing.price,
        price_per_m2:avgPricePerM2||thisPricePerM2,
        location_adjustment:`${diff>=0?'+':''}${diff}%`,
        condition_adjustment:amenCount>=10?'+10%':amenCount>=5?'+5%':'0%',
        explanation:verdict,
        confidence:similar.length>=8?'medium':'low'
      });
      setScore(similar.length>=8?6.5:4);
    }
    setLoading(false);
  };

  const scoreColor=score?score>=7?'text-emerald-600':score>=5?'text-amber-600':'text-red-500':'text-gray-400';
  const confBadge=result?result.confidence==='high'
    ?'bg-emerald-100 text-emerald-700'
    :result.confidence==='medium'
    ?'bg-amber-100 text-amber-700'
    :'bg-red-100 text-red-600':'';
  const confLabel=result?result.confidence==='high'?'● Ishonchli':result.confidence==='medium'?'◑ O\'rtacha':'○ Kam ma\'lumot':'';

  return(
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-base flex items-center gap-2"><i className="ri-ai-generate text-blue-600"/>AI Narx Bashorati</h3>
        <span className="text-[10px] text-gray-400 bg-white px-2 py-0.5 rounded-lg border border-blue-100">{similar.length} ta e'lon tahlili</span>
      </div>
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-white rounded-xl p-3 text-center border border-blue-100">
          <div className="font-extrabold text-gray-900 text-sm">${listing.price}{listing.type==='rent'?<span className="text-xs font-normal text-gray-400">/oy</span>:''}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">So'ralgan</div>
        </div>
        <div className="bg-white rounded-xl p-3 text-center border border-blue-100">
          <div className="font-bold text-gray-600 text-sm">{result&&result.estimated_price?`$${Number(result.estimated_price).toLocaleString()}`:avgDistrictPrice>0?`$${avgDistrictPrice.toLocaleString()}`:'—'}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">{result?'AI baholash':'Tuman o\'rtacha'}</div>
        </div>
        <div className={`rounded-xl p-3 text-center font-extrabold text-sm ${diff<-10?'bg-emerald-100 text-emerald-700':diff>10?'bg-red-100 text-red-600':'bg-amber-100 text-amber-700'}`}>
          <div>{diff>0?'+':''}{diff}%</div>
          <div className="text-[10px] font-normal mt-0.5">{diff<-10?'Arzon':diff>10?'Qimmat':'O\'rtacha'}</div>
        </div>
      </div>
      {/* Per m² */}
      {thisPricePerM2>0&&<div className="flex items-center justify-between bg-white rounded-xl px-3 py-2 mb-3 border border-blue-100 text-sm">
        <span className="text-gray-500">1 m² narxi:</span>
        <span className="font-bold">${thisPricePerM2} {avgPricePerM2>0&&<span className={`text-xs ml-1 ${thisPricePerM2>avgPricePerM2?'text-red-500':'text-emerald-600'}`}>(o'rtacha: ${avgPricePerM2})</span>}</span>
      </div>}
      {/* Amenities + score */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 bg-white rounded-xl px-3 py-2 border border-blue-100 text-sm flex justify-between">
          <span className="text-gray-500">Qulayliklar:</span>
          <span className="font-bold text-blue-700">{amenCount} ta — {amenBonus}</span>
        </div>
        {score&&<div className="bg-white rounded-xl px-3 py-2 border border-blue-100 text-center min-w-[64px]">
          <div className={`font-extrabold text-lg ${scoreColor}`}>{score}/10</div>
          <div className="text-[10px] text-gray-400">Ball</div>
        </div>}
      </div>
      {/* ML result */}
      {result&&(
        <div className="bg-white rounded-xl p-3 mb-3 border border-blue-100 space-y-2">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-semibold flex items-center gap-1"><i className="ri-map-pin-2-fill"/>Joylashuv: {result.location_adjustment}</span>
            <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-lg font-semibold">🔧 Holat: {result.condition_adjustment}</span>
            <span className={`px-2 py-1 rounded-lg font-semibold ${confBadge}`}>{confLabel}</span>
          </div>
          <p className="text-xs text-gray-700 leading-relaxed">{result.explanation}</p>
        </div>
      )}
      {!result&&<button onClick={assess} disabled={loading} className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl text-sm active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2">
        {loading?<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>ML tahlil qilinmoqda...</>:<><i className="ri-ai-generate"/>Dataset asosida AI baholash</>}
      </button>}
      {result&&<button onClick={()=>{setResult(null);setScore(null);}} className="w-full py-2 text-xs text-gray-400 hover:text-blue-600 transition mt-1">Qayta baholash</button>}
    </div>
  );
}

// ─── 2. KOMMUNAL KALKULYATORI ───────────────────────────────
function UtilityCalc({area}:{area:number}){
  const[people,setPeople]=useState(2);
  const gas=Math.round(area*0.5*people*800);
  const water=Math.round(people*25000);
  const electric=Math.round(area*300+people*20000);
  const internet=75000;
  const total=gas+water+electric+internet;
  return(
    <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
      <h3 className="font-bold text-base mb-3 flex items-center gap-2"><i className="ri-droplet-line text-amber-600"/>Kommunal to'lovlar hisobi</h3>
      <div className="flex items-center gap-3 mb-4"><label className="text-sm font-semibold text-gray-600">Necha kishi:</label><div className="flex gap-2">{[1,2,3,4,5].map(n=><button key={n} onClick={()=>setPeople(n)} className={`w-9 h-9 rounded-xl font-bold text-sm transition active:scale-90 ${people===n?'bg-amber-500 text-white':'bg-white border border-amber-200 text-gray-600 hover:border-amber-400'}`}>{n}</button>)}</div></div>
      <div className="space-y-2 mb-3">{[{l:'Gaz',v:gas,i:'ri-fire-line'},{l:'Suv',v:water,i:'ri-drop-line'},{l:'Elektr',v:electric,i:'ri-flashlight-line'},{l:'Internet',v:internet,i:'ri-wifi-line'}].map(r=><div key={r.l} className="flex items-center justify-between bg-white rounded-xl px-3 py-2"><span className="text-sm text-gray-600 flex items-center gap-1.5"><i className={`${r.i} text-amber-500`}/>{r.l}</span><span className="font-semibold text-sm">{r.v.toLocaleString()} so'm</span></div>)}</div>
      <div className="flex items-center justify-between bg-amber-500 text-white rounded-xl px-4 py-3"><span className="font-bold">Jami oylik taxmin</span><span className="font-extrabold text-lg">{total.toLocaleString()} so'm</span></div>
      <p className="text-xs text-gray-400 mt-2">*Taxminiy hisob. Haqiqiy to'lov farq qilishi mumkin.</p>
    </div>
  );
}

// ─── 3. AI TARJIMA ──────────────────────────────────────────
function AiTranslator({text,title}:{text:string;title:string}){
  const[lang,setLang]=useState<'uz'|'ru'|'en'>('uz');
  const[translations,setTranslations]=useState<Record<string,string>>({});
  const[loading,setLoading]=useState(false);
  const translate=async(target:'ru'|'en')=>{
    if(translations[target]){setLang(target);return;}
    setLoading(true);
    const langName=target==='ru'?'русский':'English';
    const sysPrompt=`Sen professional tarjimon. Ko'chmas mulk e'lonlarini ${langName} tiliga aniq, tabiiy va professional tarzda tarjima qilasan. Faqat tarjima matnini ber, hech qanday tushuntirish yoki izoh qo'shma.`;
    const r=await groqAsk(`Quyidagi uy e'loni matnini ${langName} tiliga tarjima qil. Sarlavha va tavsifni alohida saqlagan holda tabiiy tarjima qil. Faqat tarjima matnini yoz.\n\nSarlavha: ${title}\n\nTavsif: ${text}`,500,sysPrompt);
    if(r){setTranslations(p=>({...p,[target]:r}));setLang(target);}
    setLoading(false);
  };
  const displayed=lang==='uz'?text:translations[lang]||text;
  return(
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-400 font-semibold">Til:</span>
        {(['uz','ru','en'] as const).map(l=><button key={l} onClick={()=>l==='uz'?setLang('uz'):translate(l)} disabled={loading} className={`px-3 py-1 rounded-lg text-xs font-bold transition active:scale-90 disabled:opacity-50 ${lang===l?'bg-emerald-600 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{l==='uz'?'UZ':l==='ru'?'RU':'EN'}</button>)}
        {loading&&<div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"/>}
      </div>
      <p className="text-gray-600 leading-relaxed text-sm">{displayed}</p>
    </div>
  );
}

// ─── 4. AI TAVSIF GENERATOR (SubmitPage uchun) ──────────────
function AiDescGenerator({rooms,area,district,amenities,onGenerate}:{rooms:number;area:number;district:string;amenities:string[];onGenerate:(text:string)=>void}){
  const[loading,setLoading]=useState(false);
  const generate=async()=>{
    setLoading(true);
    const amenLabels=amenities.map(id=>AMENITIES_FULL.find(a=>a.id===id)?.label||id).slice(0,8);
    const amenText=amenLabels.length>0?amenLabels.join(', '):'qulayliklar mavjud';
    const sysPrompt=`Sen O'zbek tilida ko'chmas mulk e'lonlari yozadigan professional kopirayter. Aniq, jozibali va ishonchli matnlar yozasan. Xaridorlar va ijarachilarni qiziqtiradigan, real faktlarga asoslangan tavsiflar berasan.`;
    const prompt=`Quyidagi ko'chmas mulk uchun O'zbek tilida professional e'lon tavsifi yoz. 3-4 ta jozibali va aniq jumla. FAQAT tavsif matnini yoz — sarlavha, intro yoki boshqa hech narsa qo'shma.

Mulk ma'lumotlari:
- ${rooms} xonali, ${area} m² umumiy maydon
- Joylashuv: ${district}, Toshkent shahar
- Mavjud qulayliklar: ${amenText}

Ko'rsatmalar: Uyning eng yaxshi tomonlarini ta'kidsla, konkret faktlar (${rooms} xona, ${area}m²) ni ishlat, potentsial xaridorlar uchun jozibali va ishonchli tarzda yoz. Oddiy va tushunarli til ishlat.`;
    const r=await groqAsk(prompt,350,sysPrompt);
    if(r)onGenerate(r);
    else onGenerate(`${district}da joylashgan ${rooms} xonali, ${area} m² maydondagi qulay uy. ${amenLabels.slice(0,3).join(', ')} kabi qulayliklar mavjud. Oilalar va tinch yashashni xohlovchilar uchun ideal variant.`);
    setLoading(false);
  };
  return(
    <button type="button" onClick={generate} disabled={loading||!district} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold rounded-xl active:scale-95 transition disabled:opacity-50">
      {loading?<><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>Yozilmoqda...</>:<><i className="ri-ai-generate"/>AI bilan tavsif yozish</>}
    </button>
  );
}

// ─── 5. YANGI QURILISHLAR SECTION ────────────────────────────
function NewBuildingsSection(){
  const{state,dispatch}=useApp();
  const newBuilds=state.approved.filter(p=>p.propertyCategory==='Yangi bino'||p.badge==='new').slice(0,4);
  if(newBuilds.length===0)return null;
  return(
    <section className="pb-16"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-end mb-8 flex-wrap gap-4">
        <div><h2 className="text-2xl font-extrabold mb-1 flex items-center gap-2"><i className="ri-building-4-fill text-emerald-600"/>Yangi qurilishlar</h2><p className="text-gray-500 text-sm">LCD va yangi binolar — bevosita qurilish kompaniyasidan</p></div>
        <button onClick={()=>{dispatch({type:'SALE_FILTER',payload:{district:'',rooms:'',max:''}});dispatch({type:'NAV',payload:'sale'});window.scrollTo({top:0});}} className="flex items-center gap-1 text-emerald-700 font-bold hover:text-emerald-900 text-sm transition">Barchasini ko'rish <i className="ri-arrow-right-line"/></button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{newBuilds.map(p=>(
        <div key={p.id} onClick={()=>dispatch({type:'DETAIL',payload:p.id})} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group">
          <div className="relative aspect-[4/3] bg-emerald-50 overflow-hidden">{p.img&&<img src={p.img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>}<div className="absolute top-3 left-3"><span className="bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"><i className="ri-building-4-line"/>YANGI BINO</span></div></div>
          <div className="p-4"><h3 className="font-bold text-sm mb-1 line-clamp-2">{p.title}</h3><p className="text-xs text-gray-400 flex items-center gap-1 mb-2"><i className="ri-map-pin-2-fill text-emerald-500"/>{p.district}</p><div className="font-extrabold text-emerald-700">${(p.price||0).toLocaleString()}</div></div>
        </div>
      ))}</div>
    </div></section>
  );
}

// ─── 6. IJARA SHARTNOMASI GENERATOR ─────────────────────────
function ContractGenerator({listing}:{listing?:Listing;user?:{name?:string;phone?:string}|null}){
  const[show,setShow]=useState(false);
  const[tenantName,setTenantName]=useState('');
  const[tenantPhone,setTenantPhone]=useState('');
  const[startDate,setStartDate]=useState('');
  const[months,setMonths]=useState(12);
  const today=new Date().toLocaleDateString('uz-Latn');
  const contract=`IJARA SHARTNOMASI
Tuzilgan sana: ${today}

TOMONLAR:
Ijaraga BERUVCHI: ${listing?.owner||'___________'}
Telefon: ${listing?.phone||listing?.contact||'___________'}

Ijaraga OLUVCHI: ${tenantName||'___________'}
Telefon: ${tenantPhone||'___________'}

MULK:
Manzil: ${listing?.address||''}, ${listing?.district||''}, Toshkent
Maydon: ${listing?.area||'___'} m²  |  Xonalar: ${listing?.rooms||'___'}

SHARTNOMA SHARTLARI:
Oylik ijara narxi: $${listing?.price||'___'} (USD)
Boshlash sanasi: ${startDate||'___________'}
Muddat: ${months} oy
Jami summa: $${((listing?.price||0)*months).toLocaleString()} USD

QOIDALAR:
1. Ijara haqqi har oyning 1-5 kunigacha to'lanadi
2. Kommunal xarajatlar ijarachi hisobidan
3. Mulkka zarar yetkazilsa ijarachi javobgar
4. Shartnomani bekor qilish uchun 30 kun oldin xabar berish shart

Ijaraga beruvchi: _____________ / ${listing?.owner||''}
Ijarachi: _____________ / ${tenantName||''}`;

  const print=()=>{const w=window.open('','_blank');if(w){const blob=new Blob([`<pre style="font-family:monospace;padding:40px;font-size:13px">${contract}</pre>`],{type:'text/html'});const url=URL.createObjectURL(blob);w.location.href=url;setTimeout(()=>{w.print();URL.revokeObjectURL(url);},400);}};
  const copy=()=>{navigator.clipboard.writeText(contract);toast('Shartnoma nusxalandi');};;

  return(
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <button onClick={()=>setShow(s=>!s)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition">
        <div className="flex items-center gap-2 font-semibold text-sm"><i className="ri-file-text-line text-emerald-600"/>Ijara shartnomasi yaratish</div>
        <i className={`ri-arrow-${show?'up':'down'}-s-line text-gray-400`}/>
      </button>
      {show&&<div className="p-4 border-t border-gray-100">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div><label className="text-xs font-semibold text-gray-500 block mb-1">Ijarachi ismi</label><input value={tenantName} onChange={e=>setTenantName(e.target.value)} placeholder="To'liq ism" className="w-full px-3 py-2 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 ring-emerald-200"/></div>
          <div><label className="text-xs font-semibold text-gray-500 block mb-1">Ijarachi telefoni</label><input value={tenantPhone} onChange={e=>setTenantPhone(e.target.value)} placeholder="+998 90..." className="w-full px-3 py-2 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 ring-emerald-200"/></div>
          <div><label className="text-xs font-semibold text-gray-500 block mb-1">Boshlash sanasi</label><input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="w-full px-3 py-2 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 ring-emerald-200"/></div>
          <div><label className="text-xs font-semibold text-gray-500 block mb-1">Muddat (oy)</label><select value={months} onChange={e=>setMonths(Number(e.target.value))} className="w-full px-3 py-2 bg-gray-50 rounded-xl text-sm outline-none">{[3,6,12,24,36].map(m=><option key={m} value={m}>{m} oy</option>)}</select></div>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-xs font-mono text-gray-600 max-h-40 overflow-y-auto mb-3 whitespace-pre-wrap">{contract.slice(0,400)}...</div>
        <div className="flex gap-2">
          <button onClick={copy} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-sm active:scale-95 transition"><i className="ri-clipboard-line"/>Nusxa</button>
          <button onClick={print} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-sm active:scale-95 transition"><i className="ri-printer-line"/>Chop etish / PDF</button>
        </div>
      </div>}
    </div>
  );
}

// ─── PAYMENT LOGOS ─────────────────────────────────────────
function PaymeLogo({size=36}:{size?:number}){
  return(
    <svg width={size*2.8} height={size*0.9} viewBox="0 0 140 45" fill="none">
      <text x="0" y="36" fontFamily="Arial Black,Arial" fontWeight="900" fontSize="38" fill="#000">Pay</text>
      <rect x="78" y="2" width="62" height="40" rx="8" fill="#00C9BB"/>
      <text x="82" y="34" fontFamily="Arial Black,Arial" fontWeight="900" fontSize="30" fill="#fff">me</text>
    </svg>
  );
}
function ClickLogo({size=36}:{size?:number}){
  return(
    <svg width={size*2.4} height={size} viewBox="0 0 96 40" fill="none">
      <defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#00CFFF"/><stop offset="100%" stopColor="#0080FF"/></linearGradient></defs>
      <path d="M20 4 C10 4 4 12 4 20 C4 28 10 36 20 36 C28 36 34 30 34 20 C34 10 28 4 20 4Z" fill="url(#cg)"/>
      <path d="M20 11 C15 11 11 15 11 20 C11 25 15 29 20 29 C23 29 26 27 27.5 24.5 L21 20 L27.5 15.5 C26 13 23 11 20 11Z" fill="#fff"/>
      <text x="40" y="28" fontFamily="Arial Black,Arial" fontWeight="900" fontSize="22" fill="#000">click</text>
    </svg>
  );
}

// ─── PAYMENT MODAL MVP (Module 14) ─────────────────────────
type PaymentPurpose = 'premium_top'|'premium_featured'|'premium_urgent'|'find_house';
function PaymentModal({purpose,onSuccess,onClose}:{purpose:PaymentPurpose;onSuccess:()=>void;onClose:()=>void}){
  const[step,setStep]=useState<'choose'|'paying'|'success'>('choose');
  const[method,setMethod]=useState<'payme'|'click'|null>(null);
  const[card,setCard]=useState('');
  const prices:Record<PaymentPurpose,{label:string;amount:number;desc:string}>={
    premium_top:{label:'TOP Premium',amount:50000,desc:'7 kun — qidiruvda eng tepada'},
    premium_featured:{label:'FEATURED Premium',amount:100000,desc:'7 kun — asosiy sahifada katta kartochka'},
    premium_urgent:{label:'URGENT (Shoshilinch)',amount:30000,desc:'3 kun — qizil badge'},
    find_house:{label:"Uy topib berish xizmati",amount:150000,desc:'24 soat ichida topib beramiz'},
  };
  const info=prices[purpose];
  const fmtCard=(v:string)=>v.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim();
  const fakePay=()=>{
    if(!method){toast('To\'lov usulini tanlang','error');return;}
    if(card.replace(/\s/g,'').length<16){toast('Karta raqamini to\'liq kiriting','error');return;}
    setStep('paying');
    setTimeout(()=>setStep('success'),2500);
  };
  return(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4" onClick={step!=='paying'?onClose:undefined}>
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e=>e.stopPropagation()}>
        {step==='choose'&&(<>
          <div className="bg-gradient-to-r from-emerald-700 to-emerald-500 p-6 text-white">
            <div className="text-xs opacity-80 uppercase tracking-widest mb-1">To'lov</div>
            <div className="text-xl font-extrabold">{info.label}</div>
            <div className="text-sm opacity-90 mt-1">{info.desc}</div>
            <div className="text-3xl font-extrabold mt-3">{info.amount.toLocaleString()} <span className="text-lg font-normal">so'm</span></div>
          </div>
          <div className="p-6">
            <div className="text-sm font-bold text-gray-700 mb-3">To'lov usulini tanlang:</div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button onClick={()=>setMethod('payme')} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-3 transition active:scale-95 ${method==='payme'?'border-teal-400 bg-teal-50':'border-gray-200 hover:border-teal-300'}`}>
                <PaymeLogo size={22}/>
                <span className="text-xs font-bold text-gray-500">Payme</span>
              </button>
              <button onClick={()=>setMethod('click')} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-3 transition active:scale-95 ${method==='click'?'border-blue-400 bg-blue-50':'border-gray-200 hover:border-blue-300'}`}>
                <ClickLogo size={24}/>
                <span className="text-xs font-bold text-gray-500">Click</span>
              </button>
            </div>
            {method&&(
              <div className="mb-4">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Karta raqami</label>
                <div className="flex items-center gap-3 bg-gray-50 border-2 border-gray-200 focus-within:border-emerald-400 rounded-xl px-4 py-3 transition">
                  <i className="ri-bank-card-line text-gray-400 text-lg shrink-0"/>
                  <input
                    type="text" inputMode="numeric" maxLength={19}
                    placeholder="0000 0000 0000 0000"
                    value={card} onChange={e=>setCard(fmtCard(e.target.value))}
                    className="flex-1 bg-transparent text-sm font-mono outline-none tracking-widest"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                    <input type="text" placeholder="MM/YY" maxLength={5} className="flex-1 bg-transparent text-sm outline-none font-mono" onChange={e=>{let v=e.target.value.replace(/\D/g,'');if(v.length>=2)v=v.slice(0,2)+'/'+v.slice(2,4);e.target.value=v;}}/>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                    <input type="text" placeholder="CVV" maxLength={3} className="flex-1 bg-transparent text-sm outline-none font-mono" inputMode="numeric"/>
                  </div>
                </div>
              </div>
            )}
            <button onClick={fakePay} disabled={!method} className="w-full py-3.5 bg-gradient-to-r from-emerald-700 to-emerald-500 text-white font-bold rounded-xl shadow-lg active:scale-95 transition disabled:opacity-40">To'lash {info.amount.toLocaleString()} so'm →</button>
            <button onClick={onClose} className="w-full py-2.5 text-gray-400 text-sm mt-2 hover:text-gray-700 transition">Bekor qilish</button>
          </div>
        </>)}
        {step==='paying'&&(
          <div className="p-12 text-center">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-5"/>
            <div className="font-bold text-gray-800 text-lg">To'lov amalga oshirilmoqda...</div>
            <div className="text-sm text-gray-400 mt-2 flex items-center justify-center gap-2">
              {method==='payme'?<PaymeLogo size={14}/>:<ClickLogo size={14}/>}
              <span>orqali</span>
            </div>
          </div>
        )}
        {step==='success'&&(
          <div className="p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-4xl mx-auto mb-4"><i className="ri-checkbox-circle-fill text-4xl text-emerald-600"/></div>
            <div className="text-xl font-extrabold text-gray-900 mb-2">To'lov muvaffaqiyatli!</div>
            <div className="text-sm text-gray-500 mb-6">{info.label} faollashtirildi</div>
            <button onClick={()=>{onSuccess();onClose();}} className="w-full py-3 bg-gradient-to-r from-emerald-700 to-emerald-500 text-white font-bold rounded-xl active:scale-95 transition">Davom etish</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AI MASLAHATCHI ──────────────────────────────────────────
// Groq — bepul, 30 RPM, 14,400 RPD
const GROQ_KEY = ((import.meta as any).env?.VITE_GROQ_API_KEY as string)||'';

// Hardcoded Uzbekistan city coords — prevents Nominatim from returning
// streets named after cities (e.g. "Termez ko'chasi" in Tashkent)
const UZBEK_CITY_COORDS:Record<string,[number,number]>={
  'termiz':[37.2244,67.2783],'termez':[37.2244,67.2783],
  'samarqand':[39.6542,66.9597],'самарканд':[39.6542,66.9597],
  'buxoro':[39.7747,64.4286],'бухара':[39.7747,64.4286],
  'navoiy':[40.0840,65.3791],
  'qarshi':[38.8600,65.7900],'shahrisabz':[39.0619,66.8292],
  'nukus':[42.4600,59.6200],
  'urgench':[41.5500,60.6333],'xiva':[41.3786,60.3622],
  'namangan':[41.0011,71.6725],
  'andijon':[40.7821,72.3442],
  "farg'ona":[40.3842,71.7843],'fargona':[40.3842,71.7843],'fergana':[40.3842,71.7843],
  "marg'ilon":[40.4736,71.7220],'margilan':[40.4736,71.7220],
  "qo'qon":[40.5280,70.9420],'kokand':[40.5280,70.9420],
  'jizzax':[40.1219,67.8428],
  'guliston':[40.4897,68.7750],
  'chirchiq':[41.4686,69.5820],'angren':[41.0168,70.1415],
  'zarafshon':[41.5700,64.2000],
  'denov':[38.2747,67.8884],'muborak':[38.9853,65.2264],
  'toshkent':[41.2995,69.2401],'tashkent':[41.2995,69.2401],
};
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile'; // aniqroq, ko'p tilli, 30 RPM bepul

// Groq OpenAI-compatible formatda so'rov yuboradi
// Quick Groq helper — bitta savol, bitta javob
async function groqAsk(prompt:string,maxTokens=400,systemPrompt=''):Promise<string>{
  const key=((import.meta as any).env?.VITE_GROQ_API_KEY as string)||'';
  if(!key)return '';
  try{
    const msgs:any[]=[...(systemPrompt?[{role:'system',content:systemPrompt}]:[]),{role:'user',content:prompt}];
    const r=await fetch('https://api.groq.com/openai/v1/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
      body:JSON.stringify({model:GROQ_MODEL,messages:msgs,temperature:0.4,max_tokens:maxTokens})
    });
    if(!r.ok)return '';
    const d=await r.json();
    return d.choices?.[0]?.message?.content||'';
  }catch{return '';}
}

async function callGroq(systemPrompt:string, userMsg:string, history:{role:string;content:string}[]=[]){
  const res=await fetch(GROQ_URL,{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+GROQ_KEY},
    body:JSON.stringify({
      model:GROQ_MODEL,
      messages:[
        {role:'system',content:systemPrompt},
        ...history,
        {role:'user',content:userMsg}
      ],
      temperature:0.3,
      max_tokens:600
    })
  });
  if(!res.ok){const s=res.status;throw new Error(s===429?'429':'HTTP '+s);}
  const data=await res.json();
  return data.choices?.[0]?.message?.content||'';
}


const AI_SYSTEM = `Sen UyNest — O'zbekiston ko'chmas mulk platformasining AI yordamchisi.
MUHIM: Doimo va faqat O'ZBEK TILIDA javob ber. Hech qachon rus yoki ingliz tilida yozma.

Foydalanuvchi xabarini tahlil qilib, quyidagi JSON formatlardan FAQAT birini qaytargin:

Uy qidirish: {"action":"search","type":"ijara|sotuv|null","district":"joy nomi yoki null","maxPrice":son|null,"minPrice":son|null,"rooms":son|null}
Narx statistika: {"action":"stats","district":"tuman nomi"}
Oddiy savol: {"action":"chat","reply":"O'zbek tilidagi javob matni"}

Joylar ro'yxati:
- Toshkent tumanlari: Yunusobod, Chilonzor, Mirzo Ulug'bek, Mirobod, Yakkasaroy, Shayxontohur, Uchtepa, Sergeli, Bektemir, Olmazor
- Viloyat markazlari: Samarqand, Buxoro, Namangan, Andijon, Farg'ona, Qarshi, Nukus, Urgench, Navoiy, Jizzax, Guliston, Termiz, Chirchiq
- Foydalanuvchi "Termiz/Termez" desa → district="termiz"
- Foydalanuvchi "Toshkent" desa → district=null (butun shahar)
- Viloyat nomi (masalan "Samarqand viloyati") → district="samarqand"

Narx taxminlari (USD): ijara 1x $150-350/oy, 2x $300-700/oy; sotuv 2x $40k-120k, 3x $80k-200k+
Faqat JSON qaytargin, boshqa hech narsa yozma.`;

// ─── LOCAL NLP — Gemini API shart emas ──────────────────────
// Simple keyword-based query parser — works offline, no quota
function localParseQuery(text:string):{action:string;[k:string]:any}|null{
  const t=text.toLowerCase().trim();
  const normalize=(s:string)=>s.toLowerCase().replace(/ tumani| shahri| viloyati| viloyat| oblast/gi,'').trim();

  // Barcha ma'lum joylar: district + viloyat nomlari + shahar nomlari
  const allPlaces=[
    ...DISTRICTS,
    ...Object.values(REGIONS_MAP).flat(),
    ...Object.keys(REGIONS_MAP), // "Samarqand viloyati", "Buxoro viloyati" va h.
    // Qo'shimcha mashhur shahar nomlari
    'samarqand','buxoro','navoiy','qarshi','termiz','nukus','urgench','namangan',
    'andijon','farg\'ona','marg\'ilon','kokand','jizzax','guliston','zarafshon',
    'chirchiq','angren','bekobod','nurafshon'
  ];
  const district=allPlaces.find(d=>{
    const dn=normalize(d);
    return t.includes(dn)||dn===t.trim();
  })||null;

  // Rooms
  const wordNums:Record<string,number>={bir:1,ikki:2,uch:3,tort:4,besh:5,olti:6};
  let rooms:number|null=null;
  const roomM=t.match(/(\d+)\s*(?:xonali?|room|xona)/i)||t.match(/(\d+)-xonali/i);
  if(roomM)rooms=parseInt(roomM[1]);
  else{for(const[w,n]of Object.entries(wordNums)){if(t.includes(w+' xona')||t.includes(w+'xona')){rooms=n;break;}}}

  // Price
  const priceM=t.match(/\$\s*(\d[\d,]*)/)||t.match(/(\d[\d,]*)\s*(?:dollar|usd)/i)||t.match(/(\d[\d,]*)\s*gacha/i);
  const maxPrice=priceM?parseInt(priceM[1].replace(',','')):null;

  // Type
  const hasSotuv=/(sotuv|sotib|xarid|buy|sale)/i.test(t);
  const hasIjara=/(ijara|ijaraga|rent|arenda)/i.test(t);
  const type=hasSotuv?'sotuv':hasIjara?'ijara':null;

  // Search intent
  const hasSearchWord=/(topib|qidir|izla|ko'rsat|bor mi|bormi|top|ber|chiqar|tavsiya|toping|izlang|uy bor|e'lon|uylar)/i.test(t);
  const hasSignal=!!(district||rooms||maxPrice);
  const isStats=/(narx|o'rtacha|qancha tur|statistika|bozor narx)/i.test(t)&&!hasSearchWord;
  const isSearch=hasSearchWord||(hasSignal&&!isStats&&t.split(' ').length<=15);

  if(!isSearch&&!isStats)return null;
  if(isStats)return{action:'stats',district:district||DISTRICTS[0]};

  // useGeo flag: tuman/viloyat bazada yo'q bo'lishi mumkin → Nominatim kerak
  const isKnownTashkentDistrict=DISTRICTS.some(d=>normalize(d)===normalize(district||''));
  const useGeo=!!(district&&!isKnownTashkentDistrict);

  return{action:'search',type,district,rooms,maxPrice,useGeo};
}

function parseAiResponse(text:string):{action:string;[k:string]:any}{
  try{return JSON.parse(text.replace(/```json|```|\n/g,'').trim());}
  catch{return{action:'chat',reply:text};}
}

interface AiMsg { role:'user'|'assistant'; text:string; listings?:Listing[]; }

function AiChatModal({onClose}:{onClose:()=>void}){
  const{state,dispatch}=useApp();
  const[msgs,setMsgs]=useState<AiMsg[]>([{role:'assistant',text:'Salom! Men UyNest AI yordamchisiman\n\nYozib yoki mikrofondan gaplab so\'rang:\n"Yunusobodda 2 xonali $500 gacha ijara topib ber"'}]);
  const[input,setInput]=useState('');
  const[loading,setLoading]=useState(false);
  const[listening,setListening]=useState(false);
  const[transcribing,setTranscribing]=useState(false);
  const[whisperFailed,setWhisperFailed]=useState(false);
  const endRef=useRef<HTMLDivElement>(null);
  const recogRef=useRef<any>(null);
  const mediaRecorderRef=useRef<MediaRecorder|null>(null);
  const audioChunksRef=useRef<BlobPart[]>([]);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'});},[msgs]);


  // Mikrofon: Groq Whisper — O'zbek tilini yaxshi taniydi, bepul
  const startListening=async()=>{
    // Stop if already recording
    if(listening){
      mediaRecorderRef.current?.stop();
      recogRef.current?.stop();
      setListening(false);
      return;
    }
    // Try MediaRecorder + Groq Whisper first (skip if Whisper already failed this session)
    if(navigator.mediaDevices?.getUserMedia&&GROQ_KEY&&!whisperFailed){
      try{
        const stream=await navigator.mediaDevices.getUserMedia({audio:true});
        const mimeType=MediaRecorder.isTypeSupported('audio/webm')?'audio/webm':
                        MediaRecorder.isTypeSupported('audio/ogg')?'audio/ogg':'audio/mp4';
        const mr=new MediaRecorder(stream,{mimeType});
        audioChunksRef.current=[];
        mr.ondataavailable=(e:BlobEvent)=>{if(e.data.size>0)audioChunksRef.current.push(e.data);};
        mr.onstop=async()=>{
          stream.getTracks().forEach(t=>t.stop());
          setListening(false);
          const blob=new Blob(audioChunksRef.current,{type:mimeType});
          if(blob.size<2000){return;}// too short
          setTranscribing(true);
          try{
            const fd=new FormData();
            const ext=mimeType.split('/')[1].split(';')[0];
            fd.append('file',blob,'voice.'+ext);
            fd.append('model','whisper-large-v3');
            fd.append('language','uz');
            fd.append('response_format','text');
            // Vocabulary hint — tells Whisper to expect these words, greatly improves accuracy
            fd.append('prompt',"Termiz, Toshkent, Samarqand, Buxoro, Namangan, Andijon, Farg'ona, Qarshi, Nukus, Urgench, Navoiy, Jizzax, Chirchiq, Yunusobod, Chilonzor, Olmazor, Mirobod, ijara, sotuv, kvartira, xonadon, xona, narx, dollar, arzon, qimmat");
            const r=await fetch('https://api.groq.com/openai/v1/audio/transcriptions',{
              method:'POST',
              headers:{'Authorization':'Bearer '+GROQ_KEY},
              body:fd
            });
            if(!r.ok)throw new Error('Whisper '+r.status);
            // Correct common Whisper misrecognitions of Uzbek city names
            const VOICE_FIX:Record<string,string>={
              'hermes':'termiz','hermès':'termiz','termas':'termiz','ermas':'termiz',
              'термез':'termiz','термес':'termiz',
              'хошкент':'toshkent','ташкент':'toshkent','хашкент':'toshkent',
              'самарканд':'samarqand','самаркан':'samarqand',
              'бухара':'buxoro','наманган':'namangan','андижан':'andijon',
            };
            let t=(await r.text()).trim();
            const tLow=t.toLowerCase();
            for(const[wrong,right]of Object.entries(VOICE_FIX)){if(tLow.includes(wrong))t=tLow.replace(new RegExp(wrong,'gi'),right);}
            if(t){
              setInput(t);
              setTimeout(()=>{(document.getElementById('ai-send-btn') as HTMLButtonElement|null)?.click();},200);
            }
          }catch(e){
            console.warn('Whisper failed:',e);
            setWhisperFailed(true);
            toast("Ovoz API xatosi — brauzer ovozi ishlatilmoqda, qayta bosing",'warn');
          }
          finally{setTranscribing(false);}
        };
        mediaRecorderRef.current=mr;
        mr.start();
        setListening(true);
        return;
      }catch{/* fall through to Web Speech API */}
    }
    // Fallback: Web Speech API (iOS Safari, older browsers)
    const SpeechRecognition=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
    if(!SpeechRecognition){toast("Mikrofon qo'llab-quvvatlanmaydi",'warn');return;}
    const recog=new SpeechRecognition();
    recog.lang='uz-UZ';recog.continuous=false;recog.interimResults=false;
    recog.onstart=()=>setListening(true);
    recog.onend=()=>setListening(false);
    recog.onerror=()=>setListening(false);
    recog.onresult=(e:any)=>{
      let t=e.results[0][0].transcript;
      const tLow=t.toLowerCase();
      const FIX:Record<string,string>={'hermes':'termiz','hermès':'termiz','termas':'termiz','ermas':'termiz','термез':'termiz','термес':'termiz','хошкент':'toshkent','ташкент':'toshkent','хашкент':'toshkent','самарканд':'samarqand','бухара':'buxoro','наманган':'namangan','андижан':'andijon'};
      for(const[w,r]of Object.entries(FIX)){if(tLow.includes(w))t=tLow.replace(new RegExp(w,'gi'),r);}
      setInput(t);
      setTimeout(()=>{(document.getElementById('ai-send-btn') as HTMLButtonElement|null)?.click();},300);
    };
    recogRef.current=recog;
    recog.start();
  };

  // Tool executor — Jarvis pattern
  const execTool=(name:string,args:any):string|{listings:Listing[];note?:string}=>{
    if(name==='search_listings'){
      const all=[...state.approved];
      const typeFilter=(items:Listing[])=>args.type&&args.type!=='null'?items.filter(p=>p.type===(args.type==='ijara'?'rent':'sale')):items;
      const normD=(s:string)=>s.toLowerCase().replace(/ tumani| shahri| viloyati/g,'').trim();
      const districtFilter=(items:Listing[])=>args.district
        ?items.filter(p=>
          normD(p.district).includes(normD(args.district))||
          normD(args.district).includes(normD(p.district))||
          (p.city&&normD(p.city).includes(normD(args.district))))
        :items;
      const priceFilter=(items:Listing[])=>{
        let r=items;
        if(args.maxPrice)r=r.filter(p=>p.price<=args.maxPrice);
        if(args.minPrice)r=r.filter(p=>p.price>=args.minPrice);
        return r;
      };
      const roomsFilter=(items:Listing[])=>args.rooms?items.filter(p=>p.rooms>=args.rooms):items;

      // 1. To'liq qidiruv
      let items=roomsFilter(priceFilter(districtFilter(typeFilter(all))));

      // 2. Xona filtri tushiriladi
      if(items.length===0&&args.rooms){
        items=priceFilter(districtFilter(typeFilter(all)));
      }

      // 3. Narx filtri tushiriladi
      if(items.length===0&&(args.maxPrice||args.minPrice)){
        items=districtFilter(typeFilter(all));
      }

      // 4. If a specific district was given and nothing found, do NOT fall back to
      //    unrelated cities — return empty so the geo block can try nearby search
      let note='';
      if(items.length===0&&args.district){
        // Keep items empty; the caller will try geo-based search
        note='';
      }

      // 5. Only fall back to all listings when NO district was specified
      if(items.length===0&&!args.district) items=all.slice(0,5);

      // Premium TOP e'lonlar yuqorida
      items=[...items.filter(p=>p.isPremium&&p.premiumType==='top'),...items.filter(p=>!(p.isPremium&&p.premiumType==='top'))].slice(0,5);
      return {listings:items,note};
    }
    if(name==='get_price_stats'){
      const d=args.district;
      const rentItems=state.approved.filter(p=>p.district===d&&p.type==='rent');
      const saleItems=state.approved.filter(p=>p.district===d&&p.type==='sale');
      const avgRent=rentItems.length?Math.round(rentItems.reduce((s,p)=>s+p.price,0)/rentItems.length):0;
      const avgSale=saleItems.length?Math.round(saleItems.reduce((s,p)=>s+p.price,0)/saleItems.length):0;
      return `${d} tumani: ${rentItems.length} ta ijara (o'rtacha $${avgRent}/oy), ${saleItems.length} ta sotuv (o'rtacha $${avgSale?.toLocaleString()})`;
    }
    if(name==='get_listing_detail'){
      const p=state.approved.find(x=>x.id===args.listingId);
      if(!p) return 'E\'lon topilmadi';
      return `${p.title}\n💰 $${p.price}${p.type==='rent'?'/oy':''}\n📍 ${p.district}\n🛏 ${p.rooms} xona, ${p.area}m²\n${p.verified?'✅ Tasdiqlangan':''}`;
    }
    return 'Tool topilmadi';
  };

  const send=async()=>{
    if(!input.trim()||loading)return;
    if(!GROQ_KEY){toast('VITE_GROQ_API_KEY topilmadi. .env ga qo\'shing.','error');return;}
    const userMsg=input.trim();setInput('');
    setMsgs(p=>[...p,{role:'user',text:userMsg}]);
    setLoading(true);
    try{
      // 1. LOCAL PARSE FIRST — no API, no quota
      let parsed=localParseQuery(userMsg);
      let raw=''; // tashqi scope'da e'lon qilinadi

      // 2. Faqat umumiy chat uchun Groq API (30 RPM bepul)
      if(!parsed){
        if(!GROQ_KEY){
          setMsgs(p=>[...p,{role:'assistant',text:'Uy qidirish uchun tuman, narx va xona sonini yozing. Masalan: "Yunusobodda 2 xonali $500 gacha"'}]);
          setLoading(false);return;
        }
        const history=msgs.slice(-4).map(m=>({role:m.role==='user'?'user':'assistant' as const,content:m.text}));
        raw=await callGroq(AI_SYSTEM,userMsg,history);
        parsed=parseAiResponse(raw);
      }

      if(parsed.action==='search'){
        // 1. Avval lokal bazadan qidiruv
        const result=execTool('search_listings',{
          type:parsed.type,district:parsed.district,
          maxPrice:parsed.maxPrice,minPrice:parsed.minPrice,rooms:parsed.rooms
        });
        let found:Listing[]=typeof result==='object'&&'listings' in result?(result as any).listings:[];
        let note:string=typeof result==='object'&&'note' in result?(result as any).note||'':'';
        let geoName='';

        // 2. Geo search — first try hardcoded Uzbek city coords, then Nominatim
        if((found.length===0||parsed.useGeo)&&parsed.district){
          try{
            const dNorm=parsed.district.toLowerCase().trim();
            // Check hardcoded map first to avoid Nominatim returning wrong results
            // (e.g. "Termez ko'chasi" in Tashkent instead of the actual city)
            let la:number|null=null,lo:number|null=null,resolvedName=parsed.district;
            const hardcoded=UZBEK_CITY_COORDS[dNorm]||UZBEK_CITY_COORDS[dNorm.replace(/ tumani| shahri| viloyati/g,'').trim()];
            if(hardcoded){
              [la,lo]=hardcoded;
              resolvedName=parsed.district;
            }else{
              // Fallback to Nominatim for unknown places
              const geoR=await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(parsed.district+", O'zbekiston")}&format=json&limit=5&addressdetails=1`);
              const geo=await geoR.json();
              // Prefer city/town/village results over streets (place_rank < 20 means city-level)
              const best=geo.find((r:any)=>r.class==='place')||geo.find((r:any)=>r.place_rank&&r.place_rank<20)||geo[0];
              if(best){la=parseFloat(best.lat);lo=parseFloat(best.lon);resolvedName=best.display_name.split(',')[0];}
            }
            if(la!=null&&lo!=null){
              geoName=resolvedName;
              const radius=0.5; // ~50km — covers a city and surrounding areas
              let nearby=state.approved.filter(p=>{
                if(!p.lat||!p.lng)return false;
                const dx=p.lat-la!,dy=p.lng-lo!;
                return Math.sqrt(dx*dx+dy*dy)<radius;
              });
              if(parsed.type)nearby=nearby.filter(p=>p.type===(parsed.type==='ijara'?'rent':'sale'));
              if(parsed.rooms)nearby=nearby.filter(p=>p.rooms>=parsed.rooms);
              if(parsed.maxPrice)nearby=nearby.filter(p=>p.price<=parsed.maxPrice);
              if(nearby.length>0){
                found=nearby.slice(0,5);
                note=`"${geoName}" atrofida ${nearby.length} ta e'lon:`;
              }else{
                // No listings near this city — fall back to all listings with a clear note
                const fallback=(parsed.type?state.approved.filter(p=>p.type===(parsed.type==='ijara'?'rent':'sale')):state.approved).slice(0,5);
                found=fallback;
                note=`"${geoName}" hududida hozircha e'lon yo'q. Platformadagi boshqa e'lonlar:`;
              }
            }
          }catch{/* geocoding xato */}
        }

        // If still nothing found at all (no district, no approved listings), show empty
        if(found.length===0&&!parsed.district){
          const all=state.approved.slice(0,5);
          found=all;note='Barcha e\'lonlar:';
        }
        let reply='';
        if(found.length===0){
          reply=note||`"${parsed.district||'Bu joy'}" bo'yicha hozircha e'lon yo'q.`;
        }else{
          const distLabel=geoName||parsed.district
            ?(geoName||parsed.district).charAt(0).toUpperCase()+(geoName||parsed.district).slice(1)
            :'E\'lonlar';
          const prefix=note?note+'\n':distLabel+' — '+found.length+' ta topildi:\n';
          reply=prefix+found.slice(0,3).map((l:Listing,i:number)=>`${i+1}. ${l.title} — $${l.price}${l.type==='rent'?'/oy':''}, ${l.district}, ${l.rooms} xona`).join('\n');
        }
        setMsgs(p=>[...p,{role:'assistant',text:reply,listings:found}]);
      }else if(parsed.action==='stats'){
        const reply=String(execTool('get_price_stats',{district:parsed.district}));
        setMsgs(p=>[...p,{role:'assistant',text:reply}]);
      }else{
        const reply=parsed.reply||raw||'Tushunmadim, qaytadan so\'rang.';
        setMsgs(p=>[...p,{role:'assistant',text:reply}]);
      }
    }catch(e:any){
      const msg=String(e?.message||e);
      const errMsg=msg.includes('429')
        ?'Kvota tugadi. 1 daqiqa kuting va qaytadan urinib ko\'ring.'
        :msg.includes('404')
        ?'Model topilmadi: '+msg
        :'Xato yuz berdi: '+msg;
      setMsgs(p=>[...p,{role:'assistant',text:errMsg}]);
    }
    setLoading(false);
  };

  return(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[400] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:w-[420px] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[600px]" onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100 bg-gradient-to-r from-emerald-700 to-emerald-500 sm:rounded-t-3xl rounded-t-3xl">
          <div className={`w-10 h-10 rounded-xl overflow-hidden ${listening?'animate-pulse ring-2 ring-white':''}`}><img src="/ai-robot.png" alt="AI" className="w-full h-full object-cover"/></div>
          <div className="flex-1"><div className="font-bold text-white">UyNest AI</div><div className="text-emerald-100 text-xs">{listening?'🎙️ Gapiring... (to\'xtatish uchun bosing)':transcribing?'⏳ Ovoz tanilmoqda...':'Llama 3.3 70B • Yozing yoki gapiring'}</div></div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center hover:bg-white/30"><i className="ri-close-line"/></button>
        </div>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
          {msgs.map((m,i)=>(
            <div key={i} className={`flex ${m.role==='user'?'justify-end':'justify-start'}`}>
              <div className={`max-w-[85%] ${m.role==='user'?'bg-gradient-to-r from-emerald-700 to-emerald-600 text-white rounded-2xl rounded-tr-sm':'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm shadow-sm'} px-4 py-3 text-sm`}>
                <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
                {m.listings&&m.listings.length>0&&(
                  <div className="mt-3 space-y-2">
                    {m.listings.map(p=>(
                      <button key={p.id} onClick={()=>{dispatch({type:'DETAIL',payload:p.id});onClose();}} className="w-full flex items-center gap-2.5 p-2.5 bg-emerald-50 hover:bg-emerald-100 rounded-xl text-left transition border border-emerald-100">
                        <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-gray-100">{p.img&&<img src={p.img} alt="" className="w-full h-full object-cover"/>}</div>
                        <div className="flex-1 min-w-0"><div className="font-semibold text-xs text-gray-900 truncate">{p.title}</div><div className="text-[11px] text-emerald-700 font-bold">${p.price}{p.type==='rent'?'/oy':''}</div><div className="text-[10px] text-gray-400">{p.district} • {p.rooms} xona</div></div>
                        <i className="ri-arrow-right-s-line text-emerald-500 shrink-0"/>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading&&<div className="flex justify-start"><div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm flex items-center gap-2"><div className="flex gap-1">{[0,1,2].map(i=><div key={i} className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</div><span className="text-xs text-gray-400">Qidiryapman...</span></div></div>}
          <div ref={endRef}/>
        </div>
        {/* Suggested prompts */}
        {msgs.length<=1&&<div className="px-4 py-2 flex gap-2 overflow-x-auto">{['Yunusobodda 2 xonali $500','Chilonzor narxlari','3 xonali sotuv uy'].map(s=><button key={s} onClick={()=>{setInput(s);}} className="shrink-0 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-xl hover:bg-emerald-100 transition border border-emerald-200 whitespace-nowrap">{s}</button>)}</div>}
        {/* Input */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex gap-2">
            {/* Mic button */}
            <button onClick={startListening} title={listening?"To'xtatish":"Mikrofon bilan gapiring"} disabled={transcribing} className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg transition active:scale-95 shrink-0 ${listening?'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/40':transcribing?'bg-amber-100 text-amber-500':'bg-gray-100 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600'}`}>
              <i className={transcribing?'ri-loader-4-line animate-spin':listening?'ri-stop-circle-line':'ri-mic-line'}/>
            </button>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()} placeholder={listening?'🎙️ Gapiring... (tugash uchun bosing)':transcribing?'⏳ Ovoz tanilmoqda...':'Yozing yoki mikrofondan gapiring...'} disabled={transcribing} className="flex-1 px-4 py-2.5 bg-gray-50 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 ring-emerald-200 transition disabled:opacity-60"/>
            <button id="ai-send-btn" onClick={send} disabled={loading||transcribing||!input.trim()} className="w-11 h-11 bg-gradient-to-r from-emerald-700 to-emerald-500 text-white rounded-xl flex items-center justify-center shadow active:scale-95 transition disabled:opacity-40 shrink-0">
              {loading?<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>:<i className="ri-send-plane-fill"/>}
            </button>
          </div>
          <div className="text-[10px] text-gray-400 mt-1.5 text-center">Groq Whisper • O'zbek tilini yaxshi taniydi • Matn ko'rinishida javob beradi</div>
        </div>
      </div>
    </div>
  );
}

// ─── ROUTER ─────────────────────────────────────────────────
function AppRouter(){
  const{state}=useApp();
  const hideFooter=['admin','auth','login','map','chat'].includes(state.page);
  const pages:Record<string,React.ReactElement>={home:<HomePage/>,rent:<RentPage/>,sale:<SalePage/>,saved:<SavedPage/>,map:<MapPage/>,detail:<DetailPage/>,request:<RequestPage/>,submit:<SubmitPage/>,auth:<AuthPage/>,login:<AuthPage/>,admin:<AdminPage/>,chat:<ChatPage/>,review:<ReviewPage/>,profile:<FullProfilePage/>,compare:<ComparePage/>,statistics:<StatisticsPage/>,agent:<AgentProfilePage/>};
  return(<div className="min-h-screen flex flex-col bg-[#F4F9F5]" style={{fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"}}><Navbar/><main className="flex-1 pb-14 md:pb-0">{pages[state.page]||<HomePage/>}</main>{!hideFooter&&<Footer/>}<BottomNav/><ContactModal/><AuthReqModal/><GoogleModal/></div>);
}

// ─── APP ─────────────────────────────────────────────────────
export default function App(){
  const[state,dispatch]=useReducer(reducer,undefined,buildInitialState);
  useEffect(()=>{saveToLS(state);},[state.token]);
  // Handle direct /listing/:id URLs (share links)
  useEffect(()=>{
    const m=window.location.pathname.match(/^\/listing\/(\d+)/);
    if(m){
      const id=Number(m[1]);
      dispatch({type:'DETAIL',payload:id});
      window.history.replaceState({},'','/');
    }
  },[]);
  useEffect(()=>{
    const unsubs:(() => void)[]=[];
    unsubs.push(ListingAPI.listenApproved(items=>dispatch({type:'SET_APPROVED',payload:items})));
    // pending_listings: only admin has Firestore read permission — subscribing here
    // causes a permission error for regular users. We subscribe only after we know the user is admin.
    unsubs.push(ChatAPI.listenMessages(()=>dispatch({type:'CHAT_SYNC',payload:Date.now()})));
    unsubs.push(ReviewsAPI.listenAll(items=>dispatch({type:'SET_REVIEWS',payload:items})));
    unsubs.push(RequestsAPI.listenAll(items=>dispatch({type:'SET_REQUESTS',payload:items})));
    return()=>{unsubs.forEach(unsub=>{try{unsub();}catch{}});};
  },[dispatch]);
  useEffect(()=>{
    AuthAPI.syncUsersFromFirestore();
    ListingAPI.fetchApproved().then(a=>dispatch({type:'SET_APPROVED',payload:a}));
    RequestsAPI.fetchAll().then(r=>dispatch({type:'SET_REQUESTS',payload:r}));
  },[]);
  useEffect(() => {
    let pendingUnsub:()=>void=()=>{};
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      // Skip if doLogin/doReg/googleSignIn is already handling this auth change
      if (_authInProgress) return;
      if (fbUser) {
        let u = await AuthAPI.fetchUserByUid(fbUser.uid);
        // Admin may have id='admin' stored separately — check by email too
        if(!u) u = AuthAPI.getUsers().find(x=>x.email===ADMIN_EMAIL)||null;
        if (u) {
          const token = await fbUser.getIdToken();
          dispatch({ type: 'LOGIN', payload: { user: u, token } });
          if(u.role==='admin'){
            // Admin can read pending_listings — subscribe only for them
            pendingUnsub();
            pendingUnsub = ListingAPI.listenPending(items=>dispatch({type:'SET_PENDING',payload:items}));
            ListingAPI.fetchPending().then(p=>dispatch({type:'SET_PENDING',payload:p}));
          }
        }
      } else {
        pendingUnsub();
        dispatch({ type: 'LOGOUT' });
      }
    });
    return () => { unsub(); pendingUnsub(); };
  }, [dispatch]);
  useEffect(()=>{
    if(state.auth&&state.currentUser){
      FavoritesAPI.get(state.currentUser.id).then(f=>dispatch({type:'SET_FAVORITES',payload:f}));
    }
  },[state.auth,state.currentUser?.id]);

  const[showAiChat,setShowAiChat]=useState(false);
  return(
    <AppCtx.Provider value={{state,dispatch}}>
      <div id="tw" style={{position:'fixed',top:18,right:18,zIndex:500,display:'flex',flexDirection:'column',gap:9,pointerEvents:'none'}}/>
      {/* AI Chat floating button — hidden on map page (has its own AI panel) */}
      {!showAiChat&&state.page!=='map'&&(
        <button onClick={()=>setShowAiChat(true)} className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-[350] w-14 h-14 md:w-16 md:h-16 rounded-2xl shadow-2xl shadow-emerald-500/40 overflow-hidden hover:scale-110 active:scale-95 transition-transform border-2 border-emerald-400" title="AI Maslahatchi">
          <img src="/ai-robot.png" alt="AI Maslahatchi" className="w-full h-full object-cover"/>
        </button>
      )}
      {showAiChat&&<AiChatModal onClose={()=>setShowAiChat(false)}/>}
      <style>{`
        @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        .tst{background:#fff;border-radius:14px;padding:12px 18px;box-shadow:0 8px 30px rgba(0,0,0,.12);display:flex;align-items:center;gap:10px;border-left:4px solid #1FAE6F;min-width:260px;max-width:360px;pointer-events:auto;transition:all .4s;animation:toastIn .3s ease;font-size:.88rem}
        .tst-error{border-left-color:#E2493A}.tst-warn{border-left-color:#E0A317}
        .tst i{font-size:20px;color:#1FAE6F}.tst-error i{color:#E2493A}.tst-warn i{color:#E0A317}
        @keyframes toastIn{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}
        .leaflet-container{font-family:inherit!important}
      `}</style>
      <AppRouter/>
    </AppCtx.Provider>
  );
}
