import { renderToString } from 'react-dom/server'
import App from './App.jsx'
import { LanguageProvider } from './i18n/LanguageProvider.jsx'

export function render() {
  return renderToString(
    <LanguageProvider>
      <App />
    </LanguageProvider>,
  )
}
