import { useEffect, useSyncExternalStore } from 'react'
import { LanguageContext } from './languageContext.js'
import ko from './ko.json'
import en from './en.json'
import { getLanguageSnapshot, getServerLanguageSnapshot, subscribeLanguage, chooseLanguage } from './languageStore.js'

const RESOURCES = { ko, en }

function resolve(obj, path) {
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj)
}

function interpolate(str, params) {
  if (!params) return str
  return str.replace(/\{(\w+)\}/g, (_, key) => (params[key] !== undefined ? params[key] : `{${key}}`))
}

export function LanguageProvider({ children }) {
  const language = useSyncExternalStore(subscribeLanguage, getLanguageSnapshot, getServerLanguageSnapshot)

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const setLanguage = (next) => chooseLanguage(typeof next === 'function' ? next(language) : next)

  const t = (key, params) => {
    const value = resolve(RESOURCES[language], key) ?? resolve(RESOURCES.ko, key) ?? key
    return interpolate(value, params)
  }

  const toggleLanguage = () => setLanguage(language === 'ko' ? 'en' : 'ko')

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}
