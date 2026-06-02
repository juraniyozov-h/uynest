export const ADMIN_EMAIL = "hojiakbarjuraniyozov@gmail.com";
export const ADMIN_PASS = "HOJIAKBAR2009";

export const DISTRICTS = ["Yunusobod","Mirzo Ulug'bek","Chilonzor","Yakkasaroy","Mirobod","Shayxontohur","Sergeli","Yashnobod","Olmazor","Uchtepa","Bektemir"];
export const UNIVERSITIES = ["TATU","INHA","UWED","TDPU","WIUT","TIU"];
export const AMENITIES = [
  {id:"wifi",label:"Wi-Fi",icon:"ri-wifi-line"},{id:"ac",label:"Konditsioner",icon:"ri-snowy-line"},
  {id:"tv",label:"Televizor",icon:"ri-tv-line"},{id:"wash",label:"Kir yuvish",icon:"ri-shirt-line"},
  {id:"metro",label:"Metro yaqin",icon:"ri-train-line"},{id:"furn",label:"To'liq mebel",icon:"ri-sofa-line"},
  {id:"fridge",label:"Muzlatgich",icon:"ri-fridge-line"},{id:"parking",label:"Avto turargoh",icon:"ri-parking-line"},
];

export interface Listing {
  id:number; type:"rent"|"sale"; title:string; district:string; city?:string; address:string;
  price:number; unit:string; rooms:number; area:number; floor?:number; floors?:number;
  desc:string; amenities:string[]; img:string; images:string[]; badge:string;
  owner?:string; contact?:string; propType?:string; createdAt?:string; status?:string;
  lat?:number; lng?:number; telegram?:string; ownerId?:string;
  phone?:string; verified?:boolean; verifiedAt?:string; verifiedBy?:string; documents?:string[];
  isPremium?:boolean; premiumUntil?:string; premiumType?:"top"|"featured"|"urgent";
  expiresAt?:string; viewsCount?:number; favoritesCount?:number; sharesCount?:number;
  videoUrl?:string; virtualTourUrl?:string; propertyCategory?:string; amenitiesExt?:string[];
  _docId?:string; // Firestore document ID — used for direct updates
}
export interface User {
  id:string; name:string; email?:string; phone?:string; avatar?:string;
  provider:string; role:string; passHash:string|null; createdAt:string; lastLogin:string;
}
export interface ChatMessage {
  id:string; from:string; to:string; text:string; time:string; read:boolean;
  threadId?:string; participants?:string[];
  mediaUrl?:string; mediaType?:'image'|'video';
}
export interface ChatThread {
  odak: string; // other user id
  messages: ChatMessage[];
}
export interface AppRequest {
  id:number; name:string; phone:string;
  region:string; district:string;
  listingType:"ijara"|"sotuv";
  propertyCategory:string;
  rooms:string; minArea:string;
  budgetFrom:string; budgetTo:string;
  people:string; movingDate:string;
  floor:string; furnishing:string;
  amenities:string[];
  notes:string;
  createdAt:string;
}
export interface Review {
  id:string; userId:string; userName:string; userAvatar?:string;
  stars:number; text:string; createdAt:string;
  featured?: boolean;
  adminReply?: string;
  read?: boolean;
}

export interface ViewingRequest {
  id:string; listingId:string|number; listingTitle:string;
  listingOwnerId:string; requesterId:string; requesterName:string; requesterPhone:string;
  date:string; time:string; status:"pending"|"confirmed"|"cancelled"; createdAt?:string;
}
export interface Report {
  id:string; listingId:string|number; listingTitle:string; reporterId:string;
  type:"fake"|"wrong_price"|"outdated"|"other"; comment:string;
  status:"pending"|"reviewed"|"resolved"; createdAt?:string;
}
export interface SavedSearch {
  id:string; userId:string;
  filters:{type?:string;district?:string;minPrice?:number;maxPrice?:number;rooms?:number};
  notifyTelegram:boolean; createdAt:string; lastNotifiedAt?:string;
}

export const PROPERTY_CATEGORIES = ["Kvartira","Yangi bino","Eski bino","Hovli","Ofis/Tijorat","Yer uchastkasi","Studio","Xona"];
export const FLOOR_CATEGORIES = ["Kvartira","Yangi bino","Eski bino","Studio","Ofis/Tijorat"];
export const TIME_SLOTS = ["09:00","11:00","13:00","15:00","17:00"];

// All Uzbekistan regions + districts (source: stat.uz)
export const REGIONS_MAP: Record<string,string[]> = {
  "Toshkent shahri":["Bektemir","Chilonzor","Hamza","Mirzo Ulug'bek","Mirobod","Olmazor","Sergeli","Uchtepa","Yakkasaroy","Yashnobod","Yunusobod","Shayxontohur"],
  "Toshkent viloyati":["Nurafshon shahri","Angren shahri","Bekobod shahri","Chirchiq shahri","Ohangaron shahri","Bo'stonliq tumani","Bo'ka tumani","Chinoz tumani","Ohangaron tumani","Parkent tumani","Piskent tumani","Qibray tumani","Toshkent tumani","Urtachirchiq tumani","Yuqorichirchiq tumani","Zangiota tumani"],
  "Andijon viloyati":["Andijon shahri","Asaka tumani","Baliqchi tumani","Bo'z tumani","Buloqboshi tumani","Izboskan tumani","Jalolquduq tumani","Xo'jaobod tumani","Marhamat tumani","Oltinkol tumani","Paxtaobod tumani","Qo'rg'ontepa tumani","Shahrixon tumani","Ulug'nor tumani"],
  "Farg'ona viloyati":["Farg'ona shahri","Marg'ilon shahri","Beshariq tumani","Bog'dod tumani","Buvayda tumani","Dang'ara tumani","Furqat tumani","Qo'shtepa tumani","Oltiariq tumani","O'zbekiston tumani","Quva tumani","Rishton tumani","So'x tumani","Toshloq tumani","Uchko'prik tumani","Yozyovon tumani"],
  "Namangan viloyati":["Namangan shahri","Chortoq tumani","Chust tumani","Kosonsoy tumani","Mingbuloq tumani","Namangan tumani","Norin tumani","Pop tumani","To'raqo'rg'on tumani","Uchqo'rg'on tumani","Yangiqo'rg'on tumani"],
  "Samarqand viloyati":["Samarqand shahri","Kattaqo'rg'on shahri","Bulungur tumani","Ishtixon tumani","Jomboy tumani","Kattaqo'rg'on tumani","Narpay tumani","Nurobod tumani","Oqdaryo tumani","Pastdarg'om tumani","Payariq tumani","Paxtachi tumani","Qo'shrabot tumani","Tayloq tumani","Urgut tumani"],
  "Buxoro viloyati":["Buxoro shahri","Kogon shahri","Buxoro tumani","G'ijduvon tumani","Jondor tumani","Kogon tumani","Olot tumani","Peshku tumani","Qorovulbozor tumani","Romitan tumani","Shofirkon tumani","Vobkent tumani"],
  "Navoiy viloyati":["Navoiy shahri","Zarafshon shahri","Karmana tumani","Konimex tumani","Navbahor tumani","Nurota tumani","Qiziltepa tumani","Tomdi tumani","Uchquduq tumani"],
  "Qashqadaryo viloyati":["Qarshi shahri","Shahrisabz shahri","Chiroqchi tumani","Dehqonobod tumani","G'uzor tumani","Kasbi tumani","Kitob tumani","Ko'kdala tumani","Mirishkor tumani","Muborak tumani","Nishon tumani","Shahrisabz tumani","Yakkabog' tumani"],
  "Surxondaryo viloyati":["Termiz shahri","Angor tumani","Bandixon tumani","Boysun tumani","Denov tumani","Jarqo'rg'on tumani","Muzrabot tumani","Oltinsoy tumani","Qiziriq tumani","Qumqo'rg'on tumani","Sariosiyo tumani","Sherobod tumani","Shurchi tumani","Uzun tumani"],
  "Sirdaryo viloyati":["Guliston shahri","Shirin shahri","Boyovut tumani","Guliston tumani","Mirzaobod tumani","Oqqo'rg'on tumani","Sardoba tumani","Sayxunobod tumani","Xovos tumani"],
  "Jizzax viloyati":["Jizzax shahri","Arnasoy tumani","Baxmal tumani","Do'stlik tumani","Forish tumani","G'allaorol tumani","Mirzacho'l tumani","Paxtakor tumani","Sharof Rashidov tumani","Yangiobod tumani","Zomin tumani","Zarbdor tumani"],
  "Xorazm viloyati":["Urganch shahri","Xiva shahri","Bog'ot tumani","Gurlan tumani","Hazorasp tumani","Xiva tumani","Xonqa tumani","Qo'shko'pir tumani","Shovot tumani","Tuproqqal'a tumani","Urganch tumani","Yangiariq tumani","Yangibozor tumani"],
  "Qoraqalpog'iston":["Nukus shahri","Amudaryo tumani","Beruniy tumani","Chimboy tumani","Elliqal'a tumani","Kegeyli tumani","Mo'ynoq tumani","Nukus tumani","Qo'ng'irot tumani","Qorao'zak tumani","Shumanay tumani","Taxtako'pir tumani","To'rtko'l tumani","Xo'jayli tumani"],
};

// Approximate coordinates for each district/city (for map positioning)
export const DISTRICT_COORDS: Record<string,{lat:number;lng:number}> = {
  // Toshkent shahri
  "Bektemir":{lat:41.2400,lng:69.3200},"Chilonzor":{lat:41.2870,lng:69.2110},"Hamza":{lat:41.3000,lng:69.2500},
  "Mirzo Ulug'bek":{lat:41.3410,lng:69.3350},"Mirobod":{lat:41.3110,lng:69.2790},"Olmazor":{lat:41.3000,lng:69.2200},
  "Sergeli":{lat:41.2600,lng:69.2400},"Uchtepa":{lat:41.2800,lng:69.2000},"Yakkasaroy":{lat:41.2950,lng:69.2750},
  "Yashnobod":{lat:41.2500,lng:69.3000},"Yunusobod":{lat:41.3345,lng:69.2843},"Shayxontohur":{lat:41.3200,lng:69.2800},
  // Toshkent viloyati
  "Nurafshon shahri":{lat:41.0167,lng:69.7167},"Angren shahri":{lat:41.0168,lng:70.1439},"Bekobod shahri":{lat:40.2181,lng:69.2617},
  "Chirchiq shahri":{lat:41.4694,lng:69.5822},"Ohangaron shahri":{lat:40.9100,lng:69.6500},"Qibray tumani":{lat:41.4700,lng:69.6300},
  "Zangiota tumani":{lat:41.3600,lng:69.3800},"Parkent tumani":{lat:41.2967,lng:69.6733},"Bo'stonliq tumani":{lat:41.9000,lng:70.0000},
  // Regional centers
  "Andijon shahri":{lat:40.7821,lng:72.3442},"Asaka tumani":{lat:40.6456,lng:72.2411},"Shahrixon tumani":{lat:40.7100,lng:72.0600},
  "Farg'ona shahri":{lat:40.3842,lng:71.7843},"Marg'ilon shahri":{lat:40.4736,lng:71.7250},"Qo'qon shahri":{lat:40.5300,lng:70.9400},
  "Namangan shahri":{lat:41.0011,lng:71.6725},"Chust tumani":{lat:40.9900,lng:71.2500},"Chortoq tumani":{lat:41.0700,lng:71.8200},
  "Samarqand shahri":{lat:39.6542,lng:66.9597},"Kattaqo'rg'on shahri":{lat:39.8988,lng:66.2581},"Urgut tumani":{lat:39.4000,lng:67.2500},
  "Buxoro shahri":{lat:39.7747,lng:64.4286},"Kogon shahri":{lat:39.7200,lng:64.5400},"G'ijduvon tumani":{lat:40.1000,lng:64.6800},
  "Navoiy shahri":{lat:40.0840,lng:65.3791},"Zarafshon shahri":{lat:41.5647,lng:64.2108},"Nurota tumani":{lat:40.5600,lng:65.6900},
  "Qarshi shahri":{lat:38.8600,lng:65.7900},"Shahrisabz shahri":{lat:39.0553,lng:66.8358},"Kitob tumani":{lat:39.1300,lng:66.8900},
  "Termiz shahri":{lat:37.2244,lng:67.2783},"Denov tumani":{lat:38.2700,lng:67.8900},"Boysun tumani":{lat:38.2100,lng:67.1900},
  "Guliston shahri":{lat:40.4897,lng:68.7750},"Shirin shahri":{lat:40.6100,lng:68.8600},"Xovos tumani":{lat:40.7800,lng:68.3400},
  "Jizzax shahri":{lat:40.1219,lng:67.8428},"Zomin tumani":{lat:39.9600,lng:68.4100},"G'allaorol tumani":{lat:40.0700,lng:67.5800},
  "Urganch shahri":{lat:41.5500,lng:60.6333},"Xiva shahri":{lat:41.3775,lng:60.3600},"Hazorasp tumani":{lat:41.3200,lng:61.0700},
  "Nukus shahri":{lat:42.4600,lng:59.6200},"Qo'ng'irot tumani":{lat:42.8500,lng:58.9000},"Beruniy tumani":{lat:41.6900,lng:60.7500},
};

// Comprehensive amenities with groups
export const AMENITIES_FULL = [
  // Interior
  {id:"wifi",label:"Wi-Fi",icon:"ri-wifi-line",group:"interior",gl:"🛋️ Interyer"},
  {id:"furn",label:"To'liq mebel",icon:"ri-sofa-line",group:"interior",gl:"🛋️ Interyer"},
  {id:"fridge",label:"Muzlatgich",icon:"ri-fridge-line",group:"interior",gl:"🛋️ Interyer"},
  {id:"tv",label:"Televizor",icon:"ri-tv-line",group:"interior",gl:"🛋️ Interyer"},
  {id:"wash",label:"Kir yuvish mashinasi",icon:"ri-shirt-line",group:"interior",gl:"🛋️ Interyer"},
  {id:"ac",label:"Konditsioner",icon:"ri-snowy-line",group:"interior",gl:"🛋️ Interyer"},
  {id:"heated_floor",label:"Isitilgan pol",icon:"ri-fire-line",group:"interior",gl:"🛋️ Interyer"},
  {id:"smart_home",label:"Smart home (Alexa/Google)",icon:"ri-home-wifi-line",group:"interior",gl:"🛋️ Interyer"},
  {id:"desk",label:"Ish stoli",icon:"ri-booklet-line",group:"interior",gl:"🛋️ Interyer"},
  {id:"balcony",label:"Balkon / Teras",icon:"ri-hotel-line",group:"interior",gl:"🛋️ Interyer"},
  {id:"euro_remont",label:"Yangi ta'mir (Evro remont)",icon:"ri-paint-brush-line",group:"interior",gl:"🛋️ Interyer"},
  {id:"designer",label:"Dizayner interior",icon:"ri-palette-line",group:"interior",gl:"🛋️ Interyer"},
  // Security
  {id:"cctv",label:"Video kuzatuv (CCTV)",icon:"ri-camera-line",group:"security",gl:"🔐 Xavfsizlik"},
  {id:"intercom",label:"Domofon (Interkom)",icon:"ri-phone-line",group:"security",gl:"🔐 Xavfsizlik"},
  {id:"security_service",label:"Qo'riqchilik xizmati",icon:"ri-shield-user-line",group:"security",gl:"🔐 Xavfsizlik"},
  {id:"keyless",label:"Kalitsiz kirish",icon:"ri-key-2-line",group:"security",gl:"🔐 Xavfsizlik"},
  // Transport
  {id:"metro",label:"Metro yaqin",icon:"ri-train-line",group:"transport",gl:"🚗 Transport"},
  {id:"metro_5min",label:"Metro 5 daqiqa yurish",icon:"ri-train-fill",group:"transport",gl:"🚗 Transport"},
  {id:"bus_stop",label:"Avtobus bekat yaqin",icon:"ri-bus-line",group:"transport",gl:"🚗 Transport"},
  {id:"parking",label:"Ochiq to'xtash joyi",icon:"ri-parking-line",group:"transport",gl:"🚗 Transport"},
  {id:"parking_closed",label:"Yopiq garaj / parkinglar",icon:"ri-car-line",group:"transport",gl:"🚗 Transport"},
  {id:"central",label:"Markaziy joylashuv",icon:"ri-map-pin-line",group:"transport",gl:"🚗 Transport"},
  // Lifestyle
  {id:"gym",label:"Sport zal (Fitnes)",icon:"ri-boxing-line",group:"lifestyle",gl:"🧘 Hayot tarzi"},
  {id:"pool",label:"Basseyn",icon:"ri-drop-line",group:"lifestyle",gl:"🧘 Hayot tarzi"},
  {id:"playground",label:"Bolalar maydoni",icon:"ri-basketball-line",group:"lifestyle",gl:"🧘 Hayot tarzi"},
  {id:"park_nearby",label:"Park yaqin",icon:"ri-tree-line",group:"lifestyle",gl:"🧘 Hayot tarzi"},
  {id:"mall_nearby",label:"Savdo markazi yaqin",icon:"ri-shopping-bag-line",group:"lifestyle",gl:"🧘 Hayot tarzi"},
  {id:"cafe_nearby",label:"Kafe / Restoran yaqin",icon:"ri-cup-line",group:"lifestyle",gl:"🧘 Hayot tarzi"},
  // Extra/Premium
  {id:"generator",label:"Generator (elektrlik uzilmaydi)",icon:"ri-flashlight-line",group:"extra",gl:"⚡ Qo'shimcha"},
  {id:"elevator",label:"Lift mavjud",icon:"ri-arrow-up-down-line",group:"extra",gl:"⚡ Qo'shimcha"},
  {id:"concierge",label:"Konsyerj xizmati",icon:"ri-customer-service-2-line",group:"extra",gl:"⚡ Qo'shimcha"},
  {id:"cleaning",label:"Tozalash xizmati",icon:"ri-brush-line",group:"extra",gl:"⚡ Qo'shimcha"},
  {id:"fast_internet",label:"Tez internet (100+ Mbps)",icon:"ri-signal-wifi-3-fill",group:"extra",gl:"⚡ Qo'shimcha"},
];

export const SEED: Listing[] = [
  {id:1001,type:"rent",title:"Yunusobod markazida zamonaviy xonadon",district:"Yunusobod",address:"Yunusobod 4-daha",price:450,unit:"oy",rooms:2,area:65,floor:4,floors:9,desc:"Talabalar uchun maxsus tayyorlangan, barcha sharoitlarga ega yorug' va shinam xonadon. Metro bekatiga piyoda 5 daqiqa yo'l.",amenities:["wifi","ac","wash","metro","furn"],img:"https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",images:["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800","https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600","https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=600"],badge:"top",owner:"Rustam Karimov",contact:"+998 90 123 45 67",lat:41.3345,lng:69.2843},
  {id:1002,type:"sale",title:"Yunusobod 4-mavze, yangi bino",district:"Yunusobod",address:"Yunusobod 4-mavze",price:65000,unit:"total",rooms:2,area:65,floor:7,floors:12,desc:"Yangi qurilgan binoda zamonaviy ta'mirlangan kvartira. Ipoteka mavjud.",amenities:["wifi","ac","metro","furn"],img:"https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",images:["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800","https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=600"],badge:"sale",owner:"Aziza Yusupova",contact:"+998 91 555 12 34",lat:41.3380,lng:69.2780},
  {id:1003,type:"rent",title:"Mirzo Ulug'bek tumani, 3 xonali",district:"Mirzo Ulug'bek",address:"Buyuk Ipak Yo'li 15",price:850,unit:"oy",rooms:3,area:95,floor:5,floors:9,desc:"Buyuk Ipak Yo'li metrosi yonida, INHA universitetiga yaqin keng xonadon.",amenities:["wifi","ac","tv","wash","metro","furn","fridge"],img:"https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",images:["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800","https://images.unsplash.com/photo-1600566753190-17f0bb2a6c3e?w=600"],badge:"new",owner:"Sherzod Aliyev",contact:"+998 93 777 88 99",lat:41.3410,lng:69.3350},
  {id:1004,type:"sale",title:"Mirzo Ulug'bek, Eco Park ro'parasida",district:"Mirzo Ulug'bek",address:"Eco Park ro'parasida",price:210000,unit:"total",rooms:4,area:130,floor:3,floors:9,desc:"Eco Park ro'parasida joylashgan keng xonadon, premium ta'mir bilan.",amenities:["wifi","ac","tv","wash","furn","fridge"],img:"https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800",images:["https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800"],badge:"sale",lat:41.3500,lng:69.3200},
  {id:1005,type:"rent",title:"Yakkasaroy tumani, 1 xonali studiya",district:"Yakkasaroy",address:"Bobur ko'chasi 42",price:550,unit:"oy",rooms:1,area:42,floor:2,floors:5,desc:"Talaba qiz uchun ideal, xavfsiz hudud.",amenities:["wifi","ac","wash"],img:"https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800",images:["https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800"],badge:"new",lat:41.2950,lng:69.2750},
  {id:1006,type:"sale",title:"Chilonzor 8-kvartal, Hovli",district:"Chilonzor",address:"Tinch mahalla",price:185000,unit:"total",rooms:5,area:250,floor:1,floors:2,desc:"Tinch mahallada joylashgan zamonaviy hovli.",amenities:["wifi","ac","tv","wash","furn","fridge"],img:"https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800",images:["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800","https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600"],badge:"sale",lat:41.2870,lng:69.2110},
  {id:1007,type:"rent",title:"Mirobod Avenue, 3 xonali premium",district:"Mirobod",address:"Mirobod tumani",price:1200,unit:"oy",rooms:3,area:120,floor:8,floors:12,desc:"Premium darajadagi xonadon, shahar markazida.",amenities:["wifi","ac","tv","wash","metro","furn","fridge"],img:"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",images:["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800","https://images.unsplash.com/photo-1600607687940-47a000df3cc4?w=600","https://images.unsplash.com/photo-1554995207-c18c203602cb?w=600"],badge:"top",lat:41.3110,lng:69.2790},
];

// ─── LocalStorage Keys ──────────────────────────────────────
import { auth, db, googleProvider } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, signOut as firebaseSignOut, RecaptchaVerifier, signInWithPhoneNumber, signInAnonymously } from 'firebase/auth';
import { doc, setDoc, getDoc, getDocs, collection, updateDoc, addDoc, deleteDoc, onSnapshot, query, where } from 'firebase/firestore';

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

const LS = { token:"to_token",tokens:"to_tokens" };

function _genToken(){ const r=()=>Math.random().toString(36).slice(2); return `tk_${Date.now().toString(36)}_${r()}${r()}`.slice(0,48); }
function _hash(s:string){ let h=5381; for(let i=0;i<s.length;i++) h=((h<<5)+h)+s.charCodeAt(i); return "h"+(h>>>0).toString(36); }

const usersCollection = collection(db, 'users');
const messagesCollection = collection(db, 'messages');
const listingsCollection = collection(db, 'listings');
const pendingListingsCollection = collection(db, 'pending_listings');
const reviewsCollection = collection(db, 'reviews');
const requestsCollection = collection(db, 'requests');
const viewingRequestsCollection = collection(db, 'viewing_requests');
const reportsCollection = collection(db, 'reports');
const savedSearchesCollection = collection(db, 'saved_searches');

// ─── In-memory user cache ───────────────────────────────────
let _usersCache: User[] = [];

function getThreadId(a:string,b:string){
  return [a,b].sort().join('__');
}

function normalizeMessage(data:any, fallbackId:string):ChatMessage{
  const rawTime = data?.time;
  const time = typeof rawTime === 'string'
    ? rawTime
    : rawTime?.toDate?.().toISOString?.() || new Date().toISOString();
  const msg: ChatMessage = {
    id: typeof data?.id === 'string' && data.id ? data.id : fallbackId,
    from: String(data?.from || ''),
    to: String(data?.to || ''),
    text: String(data?.text || ''),
    time,
    read: !!data?.read,
    threadId: typeof data?.threadId === 'string' ? data.threadId : getThreadId(String(data?.from || ''), String(data?.to || '')),
    participants: Array.isArray(data?.participants) ? data.participants.map((x:string)=>String(x)) : [String(data?.from || ''), String(data?.to || '')],
  };
  // Preserve media fields for image/video messages
  if(data?.mediaUrl) msg.mediaUrl = String(data.mediaUrl);
  if(data?.mediaType === 'image' || data?.mediaType === 'video') msg.mediaType = data.mediaType;
  return msg;
}

function normalizeListing(data:any, fallbackId:string):Listing{
  return {
    ...data,
    id: typeof data?.id === 'number' ? data.id : Number(fallbackId) || Date.now(),
    city: typeof data?.city === 'string' ? data.city : undefined,
    _docId: fallbackId, // always store the real Firestore document ID
  } as Listing;
}

async function fetchUserByUid(uid:string):Promise<User|null>{
  try{
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    return snap.exists()? snap.data() as User : null;
  }catch{return null;}
}

export const AuthAPI = {
  fetchUserByUid,
  getUsers():User[]{ 
    if(_usersCache.length===0){
      try{ _usersCache = JSON.parse(localStorage.getItem('to_users_cache')||'[]'); }catch{ _usersCache = []; }
    }
    return _usersCache; 
  },
  saveUsers(u:User[]){ 
    _usersCache = u; 
    localStorage.setItem('to_users_cache', JSON.stringify(u));
  },
  getTokens():Record<string,{userId:string,issuedAt:number}>{ try{return JSON.parse(localStorage.getItem(LS.tokens)||"{}"); }catch{return {};} },
  saveTokens(t:Record<string,{userId:string,issuedAt:number}>){ localStorage.setItem(LS.tokens,JSON.stringify(t)); },

  async syncUsersFromFirestore(){
    try{
      const snapshot = await getDocs(usersCollection);
      const users = snapshot.docs.map(doc=>doc.data() as User);
      _usersCache = users;
      return users;
    }catch{return _usersCache;}
  },

  async register(p:{name?:string;email:string;password?:string;phone?:string;provider?:string;avatar?:string}){
    const email=(p.email||"").trim().toLowerCase();
    if(!email) return {ok:false as const,error:"Email kiritilmagan"};
    if(!p.password) return {ok:false as const,error:"Parol kiritilmagan"};

    try{
      const cred = await createUserWithEmailAndPassword(auth,email,p.password);
      const now = new Date().toISOString();
      const user:User={id:cred.user.uid,name:p.name||email.split("@")[0],email,provider:p.provider||"email",role:email===ADMIN_EMAIL?"admin":"user",passHash:_hash(p.password),createdAt:now,lastLogin:now};
      if(p.phone) user.phone = p.phone;
      if(p.avatar) user.avatar = p.avatar;
      await setDoc(doc(db,'users',user.id), user);
      const users=this.getUsers(); users.push(user); this.saveUsers(users);
      return {ok:true as const,user,token:this._issueToken(user.id)};
    }catch(err:any){
      const code=err.code||'';
      if(code==='auth/email-already-in-use') return {ok:false as const,error:"Bu email allaqachon ro'yxatdan o'tgan"};
      return {ok:false as const,error:"Ro'yxatdan o'tishda xato"};
    }
  },

  async login(p:{email:string;password:string}){
    const email=(p.email||"").trim().toLowerCase();
    if(email===ADMIN_EMAIL&&p.password===ADMIN_PASS){
      try{ await signInAnonymously(auth); }catch{}
      let users=this.getUsers(); let admin=users.find(u=>u.email===ADMIN_EMAIL);
      const now=new Date().toISOString();
      if(!admin){
        admin={id:'admin',name:'Admin',email:ADMIN_EMAIL,provider:'email',role:'admin',passHash:_hash(ADMIN_PASS),createdAt:now,lastLogin:now};
        users.push(admin); this.saveUsers(users);
      }else{
        admin.role='admin'; admin.lastLogin=now; this.saveUsers(users);
      }
      return {ok:true as const,user:admin,token:this._issueToken(admin.id)};
    }

    try{
      const cred = await signInWithEmailAndPassword(auth,email,p.password);
      const user = await fetchUserByUid(cred.user.uid);
      if(!user) return {ok:false as const,error:"Foydalanuvchi topilmadi."};
      user.lastLogin = new Date().toISOString();
      await updateDoc(doc(db,'users',user.id), {lastLogin:user.lastLogin});
      const users=this.getUsers(); const idx=users.findIndex(u=>u.id===user.id);
      if(idx>=0) users[idx]=user; else users.push(user);
      this.saveUsers(users);
      return {ok:true as const,user,token:this._issueToken(user.id)};
    }catch(err:any){
      const code=err.code||'';
      if(code==='auth/user-not-found') return {ok:false as const,error:"Foydalanuvchi topilmadi."};
      if(code==='auth/wrong-password') return {ok:false as const,error:"Parol noto'g'ri."};
      return {ok:false as const,error:"Kirishda xato"};
    }
  },

  async googleSignIn(){
    try{
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      const email = (firebaseUser.email||'').trim().toLowerCase();
      const name = firebaseUser.displayName||email.split("@")[0]||'Google User';
      const avatar = firebaseUser.photoURL||`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4285F4&color=fff&bold=true&size=128`;
      const existing = await fetchUserByUid(firebaseUser.uid);
      const now = new Date().toISOString();
      const user:User={id:firebaseUser.uid,name,email,avatar,provider:'google',role:email===ADMIN_EMAIL?'admin':'user',passHash:null,createdAt:existing?.createdAt||now,lastLogin:now};
      if(firebaseUser.phoneNumber) user.phone = firebaseUser.phoneNumber;
      await setDoc(doc(db,'users',user.id), user, {merge:true});
      const users=this.getUsers(); const idx=users.findIndex(u=>u.id===user.id||u.email===email);
      if(idx>=0) users[idx]=user; else users.push(user);
      this.saveUsers(users);
      return {ok:true as const,user,token:this._issueToken(user.id)};
    }catch(err:any){
      const code=err.code||'';
      if(code==='auth/popup-closed-by-user' || code==='auth/cancelled-popup-request') return {ok:false as const,error:'Google sign-in bekor qilindi.'};
      return {ok:false as const,error:`Google bilan kirishda xato: ${err.message || code || 'Noma\'lum xato'}`};
    }
  },

  async sendPhoneVerification(phoneNumber:string){
    try{
      if(!window.recaptchaVerifier){
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {
            console.log("reCAPTCHA solved");
          },
          'expired-callback': () => {
            console.log("reCAPTCHA expired");
          }
        });
      }
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
      return {ok:true as const,confirmationResult};
    }catch(err:any){
      return {ok:false as const,error:`SMS yuborishda xato: ${err.message || err.code || 'Noma\'lum xato'}`};
    }
  },

  async verifyPhoneCode(confirmationResult:any, code:string){
    try{
      const result = await confirmationResult.confirm(code);
      const firebaseUser = result.user;
      const phone = firebaseUser.phoneNumber;
      const name = `+${phone.slice(-9)}`; // Use last 9 digits as name
      const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=10B981&color=fff&bold=true&size=128`;
      const existing = await fetchUserByUid(firebaseUser.uid);
      const now = new Date().toISOString();
      const user:User={id:firebaseUser.uid,name,phone,avatar,provider:'phone',role:'user',passHash:null,createdAt:existing?.createdAt||now,lastLogin:now};
      await setDoc(doc(db,'users',user.id), user, {merge:true});
      const users=this.getUsers(); const idx=users.findIndex(u=>u.id===user.id||u.phone===phone);
      if(idx>=0) users[idx]=user; else users.push(user);
      this.saveUsers(users);
      return {ok:true as const,user,token:this._issueToken(user.id)};
    }catch(err:any){
      return {ok:false as const,error:`Kod tekshirishda xato: ${err.message || err.code || 'Noto\'g\'ri kod'}`};
    }
  },

  async signOut(){
    try{ await firebaseSignOut(auth);}catch{}
  },

  _issueToken(userId:string){ const token=_genToken(); const tokens=this.getTokens(); tokens[token]={userId,issuedAt:Date.now()}; this.saveTokens(tokens); return token; },
  validate(token:string|null):User|null{ if(!token) return null; const t=this.getTokens()[token]; if(!t) return null; return this.getUsers().find(u=>u.id===t.userId)||null; },
  revoke(token:string){ const tokens=this.getTokens(); delete tokens[token]; this.saveTokens(tokens); },
};

// ─── Chat API (no localStorage) ─────────────────────────────
let _msgsCache: ChatMessage[] = [];
export const ChatAPI = {
  getAll():ChatMessage[]{ return _msgsCache; },
  _setCache(msgs:ChatMessage[]){ _msgsCache = msgs; },
  async sendRemote(msg:ChatMessage){
    try{ 
      const payload = { ...msg, threadId: msg.threadId || getThreadId(msg.from, msg.to), participants: msg.participants || [msg.from, msg.to] };
      await addDoc(messagesCollection, payload);
    }catch(err){ console.error('Firestore xabar xatosi:', err); }
  },
  async send(from:string,to:string,text:string){
    const msg:ChatMessage={id:"m_"+Date.now().toString(36)+Math.random().toString(36).slice(2,5),from,to,text,time:new Date().toISOString(),read:false,threadId:getThreadId(from,to),participants:[from,to]};
    _msgsCache = [..._msgsCache, msg];
    await this.sendRemote(msg);
    return msg;
  },
  async sendMedia(from:string,to:string,mediaUrl:string,mediaType:'image'|'video',caption=''){
    const msg:ChatMessage={id:"m_"+Date.now().toString(36)+Math.random().toString(36).slice(2,5),from,to,text:caption,mediaUrl,mediaType,time:new Date().toISOString(),read:false,threadId:getThreadId(from,to),participants:[from,to]};
    _msgsCache=[..._msgsCache,msg];
    await this.sendRemote(msg);
    return msg;
  },
  getThread(a:string,b:string):ChatMessage[]{
    return _msgsCache.filter(m=>(m.from===a&&m.to===b)||(m.from===b&&m.to===a));
  },
  async fetchThread(a:string,b:string){
    return this.getThread(a,b).sort((x,y)=>new Date(x.time).getTime()-new Date(y.time).getTime());
  },
  getThreads(userId:string):{userId:string;name:string;lastMsg:ChatMessage}[]{
    const msgs=_msgsCache.filter(m=>m.to===userId||m.from===userId);
    const userMap=new Map<string,ChatMessage[]>();
    msgs.forEach(m=>{ const otherId=m.from===userId?m.to:m.from; if(!userMap.has(otherId)) userMap.set(otherId,[]); userMap.get(otherId)!.push(m); });
    const users=AuthAPI.getUsers();
    const threads:{userId:string;name:string;lastMsg:ChatMessage}[]=[];
    userMap.forEach((msgs2,uid)=>{ const u=users.find(x=>x.id===uid); const sorted=msgs2.sort((x,y)=>new Date(y.time).getTime()-new Date(x.time).getTime()); threads.push({userId:uid,name:u?.name||uid,lastMsg:sorted[0]}); });
    return threads.sort((a,b)=>new Date(b.lastMsg.time).getTime()-new Date(a.lastMsg.time).getTime());
  },
  async fetchThreads(userId:string){ return this.getThreads(userId); },
  markRead(from:string,to:string){ this.markReadRemote(from,to); },
  async markReadRemote(from:string,to:string){
    try{
      const q = query(messagesCollection, where('from','==',from), where('to','==',to), where('read','==',false));
      const snap = await getDocs(q);
      if(snap.empty) return;
      await Promise.all(snap.docs.map(d=>updateDoc(d.ref,{read:true})));
    }catch(err){ console.error('Mark read error:', err); }
  },
  unreadCount(forUserId:string):number{ return _msgsCache.filter(m=>m.to===forUserId&&!m.read).length; },
  unreadComplaints(forUserId:string):number{ return _msgsCache.filter(m=>m.to===forUserId&&!m.read&&m.text.startsWith('Shikoyat:')).length; },
  listenMessages(onChange:(msgs:ChatMessage[])=>void){
    return onSnapshot(messagesCollection, snap=>{
      const msgs = snap.docs.map(d=>normalizeMessage(d.data(), d.id)).sort((a,b)=>new Date(a.time).getTime()-new Date(b.time).getTime());
      _msgsCache = msgs;
      onChange(msgs);
    }, err=>console.error('Firestore message listener xatosi:', err));
  },
  async deleteThread(a:string, b:string){
    try{
      const snap = await getDocs(messagesCollection);
      await Promise.all(snap.docs.filter(d=>{ const data = d.data(); return (data.from === a && data.to === b) || (data.from === b && data.to === a); }).map(d=>deleteDoc(d.ref)));
    }catch(err){ console.error('Chat o\'chirishda xato:', err); }
  }
};

// ─── Listing API ────────────────────────────────────────────
export const ListingAPI = {
  async addPending(listing:Listing){
    const cleanData = Object.entries({...listing, createdAt: listing.createdAt || new Date().toISOString()})
      .reduce((acc, [k, v]) => { if(v !== undefined) acc[k] = v; return acc; }, {} as any);
    await addDoc(pendingListingsCollection, cleanData);
  },
  async approveListing(listing:Listing){
    try{
      const cleanData = Object.entries({...listing, status: 'active', approvedAt: new Date().toISOString()})
        .reduce((acc, [k, v]) => { if(v !== undefined) acc[k] = v; return acc; }, {} as any);
      await addDoc(listingsCollection, cleanData);
      const snap = await getDocs(pendingListingsCollection);
      await Promise.all(snap.docs.filter(d=>String((d.data() as any).id)===String(listing.id)).map(doc=>deleteDoc(doc.ref)));
    }catch(err){
      console.error('Error approving listing:', err);
    }
  },
  async fetchApproved():Promise<Listing[]>{
    try{
      const snap = await getDocs(listingsCollection);
      return snap.docs.map(d=>normalizeListing(d.data(), d.id)).sort((a,b)=>(new Date(b.createdAt||0).getTime() - new Date(a.createdAt||0).getTime()));
    }catch{
      return [];
    }
  },
  async fetchPending():Promise<Listing[]>{
    try{
      const snap = await getDocs(pendingListingsCollection);
      return snap.docs.map(d=>normalizeListing(d.data(), d.id)).sort((a,b)=>(new Date(b.createdAt||0).getTime() - new Date(a.createdAt||0).getTime()));
    }catch{
      return [];
    }
  },
  async deleteListing(id:string|number){
    try{
      const [approvedSnap, pendingSnap] = await Promise.all([getDocs(listingsCollection), getDocs(pendingListingsCollection)]);
      await Promise.all([
        ...approvedSnap.docs.filter(d=>String((d.data() as any).id)===String(id)).map(d=>deleteDoc(d.ref)),
        ...pendingSnap.docs.filter(d=>String((d.data() as any).id)===String(id)).map(d=>deleteDoc(d.ref))
      ]);
    }catch(err){
      console.error('Error deleting listing:', err);
    }
  },
  listenApproved(onChange:(listings:Listing[])=>void){
    return onSnapshot(listingsCollection, snap=>{
      const items = snap.docs.map(d=>normalizeListing(d.data(), d.id)).sort((a,b)=>(new Date(b.createdAt||0).getTime() - new Date(a.createdAt||0).getTime()));
      onChange(items);
    }, err=>console.error('Firestore approved listener xatosi:', err));
  },
  listenPending(onChange:(listings:Listing[])=>void){
    return onSnapshot(pendingListingsCollection, snap=>{
      const items = snap.docs.map(d=>normalizeListing(d.data(), d.id)).sort((a,b)=>(new Date(b.createdAt||0).getTime() - new Date(a.createdAt||0).getTime()));
      onChange(items);
    }, err=>console.error('Firestore pending listener xatosi:', err));
  }
};

// ─── Reviews API ────────────────────────────────────────────
export const ReviewsAPI = {
  async add(review:Review){
    try{
      const cleanData = Object.entries(review).reduce((acc,[k,v])=>{if(v!==undefined)acc[k]=v;return acc;},{} as any);
      await addDoc(reviewsCollection, cleanData);
    }catch(err:any){ 
      console.error('Error saving review:', err);
      throw err; // Throw to handle in UI
    }
  },
  async fetchAll():Promise<Review[]>{
    try{
      const snap = await getDocs(reviewsCollection);
      return snap.docs.map(d=>({...d.data(),id:d.id} as Review)).sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
    }catch{ return []; }
  },
  async fetchTop(minStars=4,max=6):Promise<Review[]>{
    try{
      const snap = await getDocs(reviewsCollection);
      return snap.docs.map(d=>({...d.data(),id:d.id} as Review)).filter(r=>r.stars>=minStars).sort((a,b)=>b.stars-a.stars||new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()).slice(0,max);
    }catch{ return []; }
  },
  async remove(id:string){
    try{ await deleteDoc(doc(db,'reviews',id)); }catch(err){ console.error('Error deleting review:', err); }
  },
  async update(id:string, data:Partial<Review>){
    try{ await updateDoc(doc(db,'reviews',id), data); }catch(err){ console.error('Error updating review:', err); }
  },
  async markAllRead(){
    try{
      const snap = await getDocs(query(reviewsCollection, where('read','==',false)));
      await Promise.all(snap.docs.map(d=>updateDoc(d.ref,{read:true})));
    }catch(err){ console.error('Mark reviews read error:', err); }
  },
  listenAll(onChange:(reviews:Review[])=>void){
    return onSnapshot(reviewsCollection, snap=>{
      const items = snap.docs.map(d=>({...d.data(),id:d.id} as Review)).sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
      onChange(items);
    });
  }
};

// ─── Favorites API (per-user Firestore) ─────────────────────
export const FavoritesAPI = {
  async get(userId:string):Promise<string[]>{
    try{
      const ref = doc(db,'users',userId);
      const snap = await getDoc(ref);
      return snap.exists()?(snap.data() as any).favorites||[]:[];
    }catch{ return []; }
  },
  async toggle(userId:string,listingId:string):Promise<string[]>{
    try{
      const current = await this.get(userId);
      const next = current.includes(listingId)?current.filter(x=>x!==listingId):[...current,listingId];
      await updateDoc(doc(db,'users',userId),{favorites:next});
      return next;
    }catch{ return []; }
  }
};

// ─── Requests API (Firestore) ───────────────────────────────
export const RequestsAPI = {
  async add(request:AppRequest){
    try{
      const cleanData = Object.entries(request).reduce((acc,[k,v])=>{if(v!==undefined)acc[k]=v;return acc;},{} as any);
      await addDoc(requestsCollection, cleanData);
    }catch(err){ console.error('Error saving request:', err); }
  },
  async fetchAll():Promise<AppRequest[]>{
    try{
      const snap = await getDocs(requestsCollection);
      return snap.docs.map(d=>({...d.data(),id:d.data().id||Date.now()} as AppRequest)).sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
    }catch{ return []; }
  },
  async remove(id:number){
    try{
      const snap = await getDocs(requestsCollection);
      await Promise.all(snap.docs.filter(d=>d.data().id===id).map(d=>deleteDoc(d.ref)));
    }catch(err){ console.error('Error deleting request:', err); }
  },
  listenAll(onChange:(requests:AppRequest[])=>void){
    return onSnapshot(requestsCollection, snap=>{
      const items = snap.docs.map(d=>({...d.data(),id:d.data().id||Date.now()} as AppRequest)).sort((a,b)=>(b.createdAt?new Date(b.createdAt).getTime():0)-(a.createdAt?new Date(a.createdAt).getTime():0));
      onChange(items);
    });
  }
};

// ─── Viewing Request API ────────────────────────────────────
export const ViewingRequestAPI = {
  async add(req:Omit<ViewingRequest,'id'>):Promise<ViewingRequest>{
    const data={...req,id:'vr_'+Date.now().toString(36),createdAt:new Date().toISOString()};
    try{ await addDoc(viewingRequestsCollection,data); }catch(e){ console.error(e); }
    return data as ViewingRequest;
  },
  async fetchByUser(userId:string):Promise<ViewingRequest[]>{
    try{
      const snap=await getDocs(query(viewingRequestsCollection,where('requesterId','==',userId)));
      return snap.docs.map(d=>({...d.data(),id:d.id}) as ViewingRequest).sort((a,b)=>(b.createdAt?new Date(b.createdAt).getTime():0)-(a.createdAt?new Date(a.createdAt).getTime():0));
    }catch{ return []; }
  },
  async fetchByOwner(ownerId:string):Promise<ViewingRequest[]>{
    try{
      const snap=await getDocs(query(viewingRequestsCollection,where('listingOwnerId','==',ownerId)));
      return snap.docs.map(d=>({...d.data(),id:d.id}) as ViewingRequest).sort((a,b)=>(b.createdAt?new Date(b.createdAt).getTime():0)-(a.createdAt?new Date(a.createdAt).getTime():0));
    }catch{ return []; }
  },
  async updateStatus(id:string,status:ViewingRequest['status']){
    try{
      const snap=await getDocs(viewingRequestsCollection);
      const d=snap.docs.find(x=>x.data().id===id||x.id===id);
      if(d) await updateDoc(d.ref,{status});
    }catch(e){ console.error(e); }
  }
};

// ─── Reports API ────────────────────────────────────────────
export const ReportsAPI = {
  async add(report:Omit<Report,'id'>):Promise<Report>{
    const data={...report,id:'rp_'+Date.now().toString(36),createdAt:new Date().toISOString()};
    try{ await addDoc(reportsCollection,data); }catch(e){ console.error(e); }
    return data as Report;
  },
  async fetchAll():Promise<Report[]>{
    try{
      const snap=await getDocs(reportsCollection);
      return snap.docs.map(d=>({...d.data(),id:d.id}) as Report).sort((a,b)=>(b.createdAt?new Date(b.createdAt).getTime():0)-(a.createdAt?new Date(a.createdAt).getTime():0));
    }catch{ return []; }
  },
  async updateStatus(id:string,status:Report['status']){
    try{
      const snap=await getDocs(reportsCollection);
      const d=snap.docs.find(x=>x.data().id===id||x.id===id);
      if(d) await updateDoc(d.ref,{status});
    }catch(e){ console.error(e); }
  }
};

// ─── Saved Search API ───────────────────────────────────────
export const SavedSearchAPI = {
  async add(search:Omit<SavedSearch,'id'>):Promise<SavedSearch>{
    const data={...search,id:'ss_'+Date.now().toString(36),createdAt:new Date().toISOString()};
    try{ await addDoc(savedSearchesCollection,data); }catch(e){ console.error(e); }
    return data as SavedSearch;
  },
  async fetchByUser(userId:string):Promise<SavedSearch[]>{
    try{
      const snap=await getDocs(query(savedSearchesCollection,where('userId','==',userId)));
      return snap.docs.map(d=>({...d.data(),id:d.id}) as SavedSearch).sort((a,b)=>(b.createdAt?new Date(b.createdAt).getTime():0)-(a.createdAt?new Date(a.createdAt).getTime():0));
    }catch{ return []; }
  },
  async remove(id:string){
    try{
      const snap=await getDocs(savedSearchesCollection);
      const d=snap.docs.find(x=>x.data().id===id||x.id===id);
      if(d) await deleteDoc(d.ref);
    }catch(e){ console.error(e); }
  }
};

// ─── Token API ──────────────────────────────────────────────
export const TokenAPI = {
  async getStatus(userId:string):Promise<{freeTokens:number;paidTokens:number;resetAt:string|null}>{
    try{
      const ref=doc(db,'tokens',userId);
      const snap=await getDoc(ref);
      if(!snap.exists()) return {freeTokens:3,paidTokens:0,resetAt:null};
      const data=snap.data() as any;
      if(data.resetAt&&Date.now()>=new Date(data.resetAt).getTime()){
        await updateDoc(ref,{freeTokens:3,firstUsedAt:null,resetAt:null});
        return {freeTokens:3,paidTokens:data.paidTokens||0,resetAt:null};
      }
      return {freeTokens:data.freeTokens??3,paidTokens:data.paidTokens||0,resetAt:data.resetAt||null};
    }catch{ return {freeTokens:3,paidTokens:0,resetAt:null}; }
  },
  async useToken(userId:string):Promise<{ok:boolean;error?:string;remaining?:number}>{
    try{
      const ref=doc(db,'tokens',userId);
      const snap=await getDoc(ref);
      const now=new Date().toISOString();
      if(!snap.exists()){
        const resetAt=new Date(Date.now()+24*60*60*1000).toISOString();
        await setDoc(ref,{freeTokens:2,paidTokens:0,firstUsedAt:now,resetAt,updatedAt:now});
        return {ok:true,remaining:2};
      }
      const data=snap.data() as any;
      const free=data.freeTokens??3;const paid=data.paidTokens||0;
      if(free>0){
        const newFree=free-1;const upd:any={freeTokens:newFree,updatedAt:now};
        if(!data.firstUsedAt){upd.firstUsedAt=now;upd.resetAt=new Date(Date.now()+24*60*60*1000).toISOString();}
        await updateDoc(ref,upd);return {ok:true,remaining:newFree+paid};
      }else if(paid>0){await updateDoc(ref,{paidTokens:paid-1,updatedAt:now});return {ok:true,remaining:paid-1};}
      return {ok:false,error:'Token tugadi'};
    }catch(e){console.error(e);return {ok:false,error:'Xatolik'};}
  }
};

// ─── Listing View / Ext API ─────────────────────────────────
export const ListingViewAPI = {
  async increment(listingId:string|number){
    try{
      const key=`viewed_${listingId}_${new Date().toISOString().split('T')[0]}`;
      if(localStorage.getItem(key)) return;
      localStorage.setItem(key,'1');
      const snap=await getDocs(listingsCollection);
      const d=snap.docs.find(x=>String((x.data() as any).id)===String(listingId));
      if(d) await updateDoc(d.ref,{viewsCount:((d.data() as any).viewsCount||0)+1});
    }catch(e){ console.error(e); }
  }
};

// Helper: find Firestore doc ref by _docId (direct) or by data.id (fallback)
async function findListingRef(listingId:string|number, docId?:string){
  if(docId){
    // Direct lookup — fastest and most reliable
    const ref=doc(db,'listings',docId);
    const snap=await getDoc(ref);
    if(snap.exists()) return ref;
  }
  // Fallback: scan collection by data.id field
  const snap=await getDocs(listingsCollection);
  const d=snap.docs.find(x=>String((x.data() as any).id)===String(listingId));
  return d?.ref||null;
}

export const ListingExtAPI = {
  async verify(listingId:string|number, adminId:string, docId?:string){
    try{
      const ref=await findListingRef(listingId,docId);
      if(ref) await updateDoc(ref,{verified:true,verifiedAt:new Date().toISOString(),verifiedBy:adminId});
      else console.warn('verify: listing not found in Firestore',listingId,docId);
    }catch(e){ console.error('verify error:',e); }
  },
  async setPremium(listingId:string|number, premiumType:"top"|"featured"|"urgent", days:number, docId?:string){
    try{
      const ref=await findListingRef(listingId,docId);
      if(ref){
        const until=new Date(Date.now()+days*24*60*60*1000).toISOString();
        await updateDoc(ref,{isPremium:true,premiumType,premiumUntil:until});
      } else console.warn('setPremium: listing not found in Firestore',listingId,docId);
    }catch(e){ console.error('setPremium error:',e); }
  },
  async removePremium(listingId:string|number, docId?:string){
    try{
      const ref=await findListingRef(listingId,docId);
      if(ref) await updateDoc(ref,{isPremium:false,premiumType:null,premiumUntil:null});
    }catch(e){ console.error('removePremium error:',e); }
  },
  getLastViewed():number[]{try{return JSON.parse(localStorage.getItem('lastViewed')||'[]');}catch{return [];}},
  addLastViewed(id:number){const p=this.getLastViewed().filter(x=>x!==id);localStorage.setItem('lastViewed',JSON.stringify([id,...p].slice(0,10)));}
};

export const CompareAPI = {
  get():number[]{try{return JSON.parse(localStorage.getItem('compareList')||'[]');}catch{return [];}},
  add(id:number):number[]{const p=this.get().filter(x=>x!==id);const n=[...p,id].slice(-3);localStorage.setItem('compareList',JSON.stringify(n));return n;},
  remove(id:number):number[]{const n=this.get().filter(x=>x!==id);localStorage.setItem('compareList',JSON.stringify(n));return n;},
  clear(){localStorage.removeItem('compareList');}
};

// ─── State ──────────────────────────────────────────────────
export interface AppState {
  page:string; approved:Listing[]; pending:Listing[]; requests:AppRequest[];
  auth:boolean; currentUser:User|null; token:string|null;
  chatSyncTick:number; loading:boolean;
  authTab:string; authNext:string|null; currentDetail:number|null;
  adminTab:string; contactModal:boolean; authRequiredModal:boolean;
  authReqAction:string; googleDemoModal:boolean;
  chatTarget:string|null;
  filters:{rent:{region:string;district:string;rooms:string;minPrice:string;maxPrice:string;propType:string};sale:{region:string;district:string;rooms:string;max:string;propType:string}};
  favorites: string[];
  reviews: Review[];
}

export function buildInitialState():AppState{
  const token=localStorage.getItem(LS.token); const user=AuthAPI.validate(token);
  if(!user) localStorage.removeItem(LS.token);
  return {page:"home",approved:[...SEED],pending:[],requests:[],auth:!!user,currentUser:user,token:user?token:null,chatSyncTick:0,loading:true,authTab:"login",authNext:null,currentDetail:null,adminTab:"overview",contactModal:false,authRequiredModal:false,authReqAction:"",googleDemoModal:false,chatTarget:null,filters:{rent:{region:"",district:"",rooms:"",minPrice:"",maxPrice:"",propType:""},sale:{region:"",district:"",rooms:"",max:"",propType:""}},favorites:[],reviews:[]};
}

export function saveToLS(state:AppState){
  if(state.token) localStorage.setItem(LS.token,state.token); else localStorage.removeItem(LS.token);
}
