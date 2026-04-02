import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ko from './locales/ko.json'
import ja from './locales/ja.json'

const savedLang = localStorage.getItem('companyLanguage') || 'ko'

i18n.use(initReactI18next).init({
  resources: {
    ko: { translation: ko },
    ja: { translation: ja },
  },
  lng: savedLang,
  fallbackLng: 'ko',
  interpolation: { escapeValue: false },
})

export default i18n
