import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const uz = {
  // ── Navbar / BottomNav ──
  home: 'Bosh sahifa', rent: 'Ijara', sale: 'Sotuv', map: 'Xarita',
  saved: 'Sevimlilar', chat: 'Chat', profile: 'Profil', post: "E'lon berish",
  nav_home: 'Bosh', nav_rent: 'Ijara', nav_sale: 'Sotuv',
  nav_map: 'Xarita', nav_chat: 'Chat', nav_profile: 'Profil',
  login_btn: 'Kirish', logout_btn: 'Chiqish',
  lang_toggle: '🇺🇿 UZ',

  // ── Card ──
  badge_rent: 'IJARA', badge_sale: 'SOTUV', badge_new: 'YANGI',
  badge_top: 'TOP', badge_urgent: 'SHOSHILINCH',
  verified_label: "Tasdiqlangan e'lon",
  rooms_unit: 'xona', area_unit: 'm²', floor_unit: 'qavat',
  per_month: '/oy', details_btn: "Batafsil",

  // ── Filter bar ──
  filter_prop_type: 'Mulk turi', all_prop_types: 'Barcha turlar',
  filter_region: 'Viloyat', all_regions: 'Barcha viloyatlar',
  filter_district: 'Tuman / Shahar', all_districts: 'Barcha tumanlar',
  filter_rooms: 'Xonalar', any_rooms: 'Istagan',
  filter_min_price: 'Min narx ($)', filter_max_price: 'Maks narx ($/oy)',
  filter_max_price_sale: 'Maks narx ($)',
  filter_clear: 'Tozalash', filter_results: 'ta topildi',

  // ── Pages ──
  rent_page_title: 'Ijara uylar',
  rent_page_sub: "O'zbekiston bo'ylab eng qulay ijaraga uylar",
  sale_page_title: 'Sotuvdagi uylar',
  sale_page_sub: 'Barcha viloyatlarda yangi va ikkilamchi bozor',
  no_results: 'Topilmadi', adjust_filters: "Filtrlarni o'zgartiring",

  // ── Home ──
  hero_title: "Uy qidiryapsiz, lekin hech narsa topolmayapsizmi?",
  hero_sub: "Biz 24 soatda topib beramiz. Sizning mukammal yashash joyingiz bir necha tugma uzoqlikda.",
  hero_cta_rent: 'Ijara uylar', hero_cta_sale: 'Sotuvdagi uylar',
  how_it_works: 'Qanday ishlaydi?',
  how_sub: 'Tez, oson va ishonchli jarayon',
  step1_title: "1. So'rov", step1_desc: "Uy parametrlarini kiriting yoki murojaat qiling.",
  step2_title: '2. Topish', step2_desc: "24 soat ichida eng mos variantlarni topamiz.",
  step3_title: "3. Ko'chish", step3_desc: "Shartnomalarni rasmiylashtiramiz.",
  latest_offers: "So'nggi takliflar", latest_sub: "Toshkent markazidagi eng yaxshi uylar",
  view_all: "Barchasini ko'rish",
  new_buildings: 'Yangi qurilishlar',
  new_buildings_sub: 'LCD va yangi binolar — bevosita qurilish kompaniyasidan',
  for_landlords: 'Uy beruvchilar uchun',
  for_landlords_sub: 'Nima uchun bizni tanlashadi?',
  feature_fast: 'Tez Moslashuv', feature_fast_d: "Uyingizga mos ijarachini rekord vaqtda topamiz.",
  feature_free: "Bepul E'lon", feature_free_d: "E'lon joylash mutlaqo bepul.",
  feature_safe: 'Xavfsiz', feature_safe_d: 'Barcha foydalanuvchilar tekshiriladi.',
  add_listing_cta: "Uy e'loni qo'shish",
  no_time: "Vaqtingiz yo'qmi?",
  no_time_sub: "Bizga talablaringizni yuboring",
  request_btn: "So'rov",

  // ── Detail ──
  viewing_request_btn: "Ko'rik so'rash",
  report_btn: 'Shikoyat', share_btn: 'Ulashish',
  contact_seller: "Sotuvchi bilan bog'lanish",
  similar_listings: "O'xshash e'lonlar",
  price_per_m2: '1 m² narxi',
  mortgage_calc: 'Ipoteka kalkulyatori',
  infrastructure: 'Infratuzilma',

  // ── Submit ──
  submit_title: "E'lon qo'shish",
  form_type: "E'lon turi", form_rent: 'Ijara', form_sale: 'Sotuv',
  form_region: 'Viloyat', form_district: 'Tuman',
  form_prop_type: 'Mulk turi',
  form_title_label: 'Sarlavha', form_address: 'Manzil',
  form_price: 'Narx ($)', form_rooms: 'Xonalar',
  form_area: 'Maydon (m²)', form_floor: 'Qavat',
  form_floors_total: 'Umumiy qavatlar',
  form_desc: 'Tavsif', form_photos: 'Rasmlar',
  form_amenities: 'Qulayliklar',
  form_submit_btn: "E'lon joylash",
  form_submitting: 'Joylashmoqda...',

  // ── Auth ──
  auth_login: 'Kirish', auth_register: "Ro'yxatdan o'tish",
  auth_email: 'Email', auth_password: 'Parol',
  auth_full_name: "To'liq ism",
  auth_login_loading: 'Kirmoqda...',
  auth_reg_loading: 'Yaratilmoqda...',
  auth_google: 'Google bilan davom etish',
  auth_or: 'yoki',
  auth_users: "foydalanuvchi ro'yxatdan o'tgan",
  auth_min_pass: 'Kamida 6 belgi',

  // ── Modals ──
  auth_req_title: "Avval ro'yxatdan o'ting",
  auth_req_login: 'Kirish', auth_req_register: "Ro'yxatdan o'tish",

  // ── Profile ──
  my_listings: "Mening e'lonlarim",
  notifications: 'Bildirishnomalar',
  settings_label: 'Sozlamalar',
  telegram_connect: "Telegram ulash",
  phone_connect: "Telefon ulash",
  disconnect: 'Uzish',

  // ── Chat ──
  chat_placeholder: 'Xabar yozing...',
  chat_send: 'Yuborish',
  chat_no_msgs: "Xabarlar yo'q",
  chat_complaint: 'Shikoyat',

  // ── Install PWA ──
  install_app: "UyNest ilovasini o'rnatish",
  install_sub: 'Tez ishlaydi, oflayn ham',
  install_btn: "O'rnatish",
  ios_hint: "Safari → 'Ulashish' → 'Ekranga qo'shish'",

  // ── Footer ──
  footer_pages: 'Sahifalar',
  footer_help_section: 'Yordam',
  footer_contact_section: 'Aloqa',
  footer_slogan: "Toshkentdagi talabalar va ijarachilar uchun ishonchli uy-joy platformasi.",
  footer_copyright: 'Barcha huquqlar himoyalangan.',

  // ── General ──
  loading: 'Yuklanmoqda...', error_text: 'Xatolik',
  cancel_btn: 'Bekor qilish', save_btn: 'Saqlash', send_btn: 'Yuborish',
  confirm_btn: 'Tasdiqlash', close_btn: 'Yopish',
  search_placeholder: "Tuman, manzil yoki kalit so'z...",

  // ── Cities ──
  city_tashkent: 'Toshkent', city_samarkand: 'Samarqand',
  city_andijan: 'Andijon', city_namangan: 'Namangan',
  city_bukhara: 'Buxoro', city_fergana: "Farg'ona",

  // ── Categories ──
  cat_apartment: 'Kvartira', cat_house: 'Uy',
  cat_newbuild: 'Yangi bino', cat_commercial: 'Ofis/Tijorat',
  cat_land: 'Yer uchastkasi',

  // ── AI ──
  ai_price: 'AI narx baholash', ai_desc: 'AI tavsif yozish',
  ai_assess_btn: 'Baholash', ai_loading: 'Tahlil qilinmoqda...',
};

const ru: typeof uz = {
  home: 'Главная', rent: 'Аренда', sale: 'Продажа', map: 'Карта',
  saved: 'Избранное', chat: 'Чат', profile: 'Профиль', post: 'Подать объявление',
  nav_home: 'Главная', nav_rent: 'Аренда', nav_sale: 'Продажа',
  nav_map: 'Карта', nav_chat: 'Чат', nav_profile: 'Профиль',
  login_btn: 'Войти', logout_btn: 'Выйти',
  lang_toggle: '🇷🇺 RU',

  badge_rent: 'АРЕНДА', badge_sale: 'ПРОДАЖА', badge_new: 'НОВЫЙ',
  badge_top: 'ТОП', badge_urgent: 'СРОЧНО',
  verified_label: 'Подтверждённое объявление',
  rooms_unit: 'комн.', area_unit: 'м²', floor_unit: 'эт.',
  per_month: '/мес', details_btn: 'Подробнее',

  filter_prop_type: 'Тип недвижимости', all_prop_types: 'Все типы',
  filter_region: 'Область', all_regions: 'Все области',
  filter_district: 'Район / Город', all_districts: 'Все районы',
  filter_rooms: 'Комнаты', any_rooms: 'Любое',
  filter_min_price: 'Мин цена ($)', filter_max_price: 'Макс цена ($/мес)',
  filter_max_price_sale: 'Макс цена ($)',
  filter_clear: 'Сбросить', filter_results: 'найдено',

  rent_page_title: 'Квартиры в аренду',
  rent_page_sub: 'Доступные квартиры по всему Узбекистану',
  sale_page_title: 'Квартиры на продажу',
  sale_page_sub: 'Первичный и вторичный рынок по всем регионам',
  no_results: 'Не найдено', adjust_filters: 'Измените фильтры',

  hero_title: 'Ищете жильё, но ничего не находите?',
  hero_sub: 'Найдём за 24 часа. Ваш идеальный дом — в нескольких кликах.',
  hero_cta_rent: 'Аренда', hero_cta_sale: 'Купить',
  how_it_works: 'Как это работает?',
  how_sub: 'Быстро, просто и надёжно',
  step1_title: '1. Заявка', step1_desc: 'Укажите параметры или оставьте заявку.',
  step2_title: '2. Поиск', step2_desc: 'За 24 часа подберём лучшие варианты.',
  step3_title: '3. Заезд', step3_desc: 'Оформим документы.',
  latest_offers: 'Последние предложения', latest_sub: 'Лучшие объекты в центре Ташкента',
  view_all: 'Смотреть все',
  new_buildings: 'Новостройки',
  new_buildings_sub: 'ЖК и новые дома — напрямую от застройщика',
  for_landlords: 'Для арендодателей',
  for_landlords_sub: 'Почему нас выбирают?',
  feature_fast: 'Быстрый подбор', feature_fast_d: 'Найдём арендатора в рекордное время.',
  feature_free: 'Бесплатно', feature_free_d: 'Размещение объявлений полностью бесплатно.',
  feature_safe: 'Безопасно', feature_safe_d: 'Все пользователи проходят проверку.',
  add_listing_cta: 'Подать объявление',
  no_time: 'Нет времени?',
  no_time_sub: 'Отправьте нам ваши требования',
  request_btn: 'Заявка',

  viewing_request_btn: 'Запросить просмотр',
  report_btn: 'Жалоба', share_btn: 'Поделиться',
  contact_seller: 'Связаться с продавцом',
  similar_listings: 'Похожие объявления',
  price_per_m2: 'Цена за м²',
  mortgage_calc: 'Ипотечный калькулятор',
  infrastructure: 'Инфраструктура',

  submit_title: 'Подать объявление',
  form_type: 'Тип объявления', form_rent: 'Аренда', form_sale: 'Продажа',
  form_region: 'Область', form_district: 'Район',
  form_prop_type: 'Тип недвижимости',
  form_title_label: 'Заголовок', form_address: 'Адрес',
  form_price: 'Цена ($)', form_rooms: 'Комнаты',
  form_area: 'Площадь (м²)', form_floor: 'Этаж',
  form_floors_total: 'Этажность',
  form_desc: 'Описание', form_photos: 'Фотографии',
  form_amenities: 'Удобства',
  form_submit_btn: 'Опубликовать',
  form_submitting: 'Публикация...',

  auth_login: 'Войти', auth_register: 'Регистрация',
  auth_email: 'Email', auth_password: 'Пароль',
  auth_full_name: 'Полное имя',
  auth_login_loading: 'Вход...',
  auth_reg_loading: 'Создание...',
  auth_google: 'Войти через Google',
  auth_or: 'или',
  auth_users: 'пользователей зарегистрировано',
  auth_min_pass: 'Минимум 6 символов',

  auth_req_title: 'Войдите в аккаунт',
  auth_req_login: 'Войти', auth_req_register: 'Регистрация',

  my_listings: 'Мои объявления',
  notifications: 'Уведомления',
  settings_label: 'Настройки',
  telegram_connect: 'Подключить Telegram',
  phone_connect: 'Подключить телефон',
  disconnect: 'Отключить',

  chat_placeholder: 'Написать сообщение...',
  chat_send: 'Отправить',
  chat_no_msgs: 'Нет сообщений',
  chat_complaint: 'Жалоба',

  install_app: 'Установить приложение UyNest',
  install_sub: 'Работает быстро, даже офлайн',
  install_btn: 'Установить',
  ios_hint: "Safari → «Поделиться» → «На экран»",

  footer_pages: 'Страницы',
  footer_help_section: 'Помощь',
  footer_contact_section: 'Контакты',
  footer_slogan: 'Надёжная платформа недвижимости в Ташкенте.',
  footer_copyright: 'Все права защищены.',

  loading: 'Загрузка...', error_text: 'Ошибка',
  cancel_btn: 'Отмена', save_btn: 'Сохранить', send_btn: 'Отправить',
  confirm_btn: 'Подтвердить', close_btn: 'Закрыть',
  search_placeholder: 'Район, адрес или ключевое слово...',

  city_tashkent: 'Ташкент', city_samarkand: 'Самарканд',
  city_andijan: 'Андижан', city_namangan: 'Наманган',
  city_bukhara: 'Бухара', city_fergana: 'Фергана',

  cat_apartment: 'Квартира', cat_house: 'Дом',
  cat_newbuild: 'Новостройка', cat_commercial: 'Офис/Коммерческая',
  cat_land: 'Земельный участок',

  ai_price: 'Оценка цены AI', ai_desc: 'Описание от AI',
  ai_assess_btn: 'Оценить', ai_loading: 'Анализ...',
};

i18n.use(initReactI18next).init({
  resources: { uz: { translation: uz }, ru: { translation: ru } },
  lng: localStorage.getItem('lang') || 'uz',
  fallbackLng: 'uz',
  interpolation: { escapeValue: false },
});

export default i18n;
export type TKey = keyof typeof uz;
