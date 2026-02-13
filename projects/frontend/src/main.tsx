import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WalletProvider } from './use-wallet-react.tsx'
import { WalletManager, WalletId } from '@txnlab/use-wallet'
import './index.css'
import App from './App.tsx'

const walletManager = new WalletManager({
  wallets: [WalletId.METAMASK, WalletId.LUTE],
  defaultNetwork: 'localnet'
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WalletProvider manager={walletManager}>
      <App />
    </WalletProvider>
  </StrictMode>,
)
