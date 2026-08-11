import { useState, useEffect } from 'react'
import { LanguageContext } from './languageContext.js'
import ko from './ko.json'
import en from './en.json'

const LANGUAGE_KEY = 'cp-language'
const RESOURCES = { ko, en }

function resolve(obj, path) {
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj)
}

function interpolate(str, params) {
  if (!params) return str
  return str.replace(/\{(\w+)\}/g, (_, key) => (params[key] !== undefined ? params[key] : `{${key}}`))
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem(LANGUAGE_KEY) || 'ko')

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language)
  }, [language])

  const t = (key, params) => {
    const value = resolve(RESOURCES[language], key) ?? resolve(RESOURCES.ko, key) ?? key
    return interpolate(value, params)
  }

  const toggleLanguage = () => setLanguage(l => (l === 'ko' ? 'en' : 'ko'))

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}
