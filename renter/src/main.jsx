import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.jsx'
import { PrivyProvider } from '@privy-io/react-auth'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PrivyProvider
      appId="cmmtxys5k00a50djyxhziw4xs"
      config={{
        loginMethods: ['email'],
        embeddedWallets: {
          createOnLogin: 'all-users',
        },
      }}
    >
      <App />
    </PrivyProvider>
  </StrictMode>,
)
