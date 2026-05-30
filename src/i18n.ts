import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const uz = {
  // Nav
  home: "Bosh sahifa", rent: "Ijara", sale: "Sotuv", map: "Xarita",
  saved: "Sevimlilar", chat: "Chat", profile: "Profil", post: "E'lon berish",
  // Home
  hero_title: "O'zingizga uy toping", hero_sub: "Toshkent va boshqa shaharlar bo'yicha ijara va sotuv e'lonlari",
  search_placeholder: "Tuman, manzil yoki kalit so'z...",
  rent_listings: "Ijara e'lonlari", sale_listings: "Sotuv e'lonlari",
  view_all: "Barchasini ko'rish",
  // Filters
  all_districts: "Barcha tumanlar", all_cities: "Barcha shaharlar",
  rooms: "Xona", price_from: "Narxdan", price_to: "Narxgacha",
  area_from: "Maydoni (m²)", search: "Qidirish", filter: "Filtrlash",
  // Listing card
  rooms_short: "xona", area_short: "m²", floor_short: "qavat",
  per_month: "/oy", save: "Saqlash", saved_label: "Saqlangan",
  // Detail page
  mortgage_calc: "Ipoteka kalkulyatori", viewing_request: "Ko'rik so'rash",
  share: "Ulashish", report: "Shikoyat", contact_seller: "Sotuvchi bilan bog'lanish",
  // Auth
  login: "Kirish", register: "Ro'yxatdan o'tish", logout: "Chiqish",
  email: "Email", password: "Parol", name: "Ism",
  // Submit
  submit_ad: "E'lon joylash", photo: "Rasm", title: "Sarlavha",
  address: "Manzil", description: "Tavsif", price: "Narx",
  // General
  loading: "Yuklanmoqda...", error: "Xatolik", success: "Muvaffaqiyatli",
  cancel: "Bekor qilish", save_btn: "Saqlash", send: "Yuborish",
  install_app: "Ilovani o'rnatish", install_sub: "Tez ishlaydi, oflayn ham",
  install_btn: "O'rnatish",
  // Cities
  city_tashkent: "Toshkent", city_samarkand: "Samarqand", city_andijan: "Andijon",
  city_namangan: "Namangan", city_bukhara: "Buxoro", city_fergana: "Farg'ona",
  // Categories
  cat_apartment: "Kvartira", cat_house: "Uy", cat_newbuild: "Yangi qurilish",
  cat_commercial: "Tijorat", cat_land: "Yer uchastkasi",
  // AI
  ai_price: "AI narx baholash", ai_desc: "AI tavsif yozish",
};

const ru: typeof uz = {
  home: "Главная", rent: "Аренда", sale: "Продажа", map: "Карта",
  saved: "Избранное", chat: "Чат", profile: "Профиль", post: "Подать объявление",
  hero_title: "Найдите своё жильё", hero_sub: "Объявления об аренде и продаже по Ташкенту и другим городам",
  search_placeholder: "Район, адрес или ключевое слово...",
  rent_listings: "Объявления об аренде", sale_listings: "Объявления о продаже",
  view_all: "Посмотреть все",
  all_districts: "Все районы", all_cities: "Все города",
  rooms: "Комнаты", price_from: "Цена от", price_to: "Цена до",
  area_from: "Площадь (м²)", search: "Поиск", filter: "Фильтр",
  rooms_short: "комн.", area_short: "м²", floor_short: "этаж",
  per_month: "/мес", save: "Сохранить", saved_label: "Сохранено",
  mortgage_calc: "Ипотечный калькулятор", viewing_request: "Запросить просмотр",
  share: "Поделиться", report: "Жалоба", contact_seller: "Связаться с продавцом",
  login: "Войти", register: "Регистрация", logout: "Выйти",
  email: "Email", password: "Пароль", name: "Имя",
  submit_ad: "Подать объявление", photo: "Фото", title: "Заголовок",
  address: "Адрес", description: "Описание", price: "Цена",
  loading: "Загрузка...", error: "Ошибка", success: "Успешно",
  cancel: "Отмена", save_btn: "Сохранить", send: "Отправить",
  install_app: "Установить приложение", install_sub: "Быстро работает, даже офлайн",
  install_btn: "Установить",
  city_tashkent: "Ташкент", city_samarkand: "Самарканд", city_andijan: "Андижан",
  city_namangan: "Наманган", city_bukhara: "Бухара", city_fergana: "Фергана",
  cat_apartment: "Квартира", cat_house: "Дом", cat_newbuild: "Новостройка",
  cat_commercial: "Коммерческая", cat_land: "Земельный участок",
  ai_price: "Оценка цены AI", ai_desc: "Написать описание AI",
};

i18n.use(initReactI18next).init({
  resources: { uz: { translation: uz }, ru: { translation: ru } },
  lng: localStorage.getItem('lang') || 'uz',
  fallbackLng: 'uz',
  interpolation: { escapeValue: false },
});

export default i18n;
export type TKey = keyof typeof uz;
