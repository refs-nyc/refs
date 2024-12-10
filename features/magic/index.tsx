import { createContext, useContext, useState } from 'react'
import { Magic } from '@magic-sdk/react-native-expo'
import { Web3Provider } from '@ethersproject/providers'
import { ethers } from 'ethers'
import { SIWESigner } from '@canvas-js/chain-ethereum'
import { REFS_TOPIC } from '@/features/const'

const magic = new Magic(process.env.EXPO_PUBLIC_MAGIC_KEY)

export enum LOGIN_STATE {
  LOGGED_OUT,
  LOGGING_IN,
  LOGGED_IN,
  LOGGING_OUT,
}

type MagicContextFields = {
  magic: Magic
  sessionSigner: SIWESigner | null
  loginState: LOGIN_STATE
  login: (email: string) => void
  logout: () => void
  setSessionSigner: (s: SIWESigner | null) => void
  LOGIN_STATE: typeof LOGIN_STATE
}

// Create the context
const MagicContext = createContext<MagicContextFields | null>(null)

function useMagicContext() {
  return useContext(MagicContext)
}

const MagicProvider = ({ children }: { children: React.ReactNode }) => {
  const [sessionSigner, setSessionSigner] = useState<SIWESigner | null>(null)
  const [loginState, setLoginState] = useState<LOGIN_STATE>(LOGIN_STATE.LOGGED_OUT)

  const login = async (email: string) => {
    try {
      setLoginState(LOGIN_STATE.LOGGING_IN)
      const bearer = await magic.auth.loginWithEmailOTP({ email })
      const metadata = await magic.user.getMetadata()

      if (!metadata.publicAddress)
        throw new Error('internal error: magic did not assign an address')

      if (!magic) throw new Error('Could not instantiate Magic')

      const provider = new Web3Provider(magic.rpcProvider)
      const signer = provider.getSigner()
      const checksumAddress = ethers.getAddress(metadata.publicAddress) // checksum-capitalized eth address
      const sessionSigner = new SIWESigner({ signer })

      let sessionObject = await sessionSigner.getSession(REFS_TOPIC)
      if (!sessionObject) {
        sessionObject = await sessionSigner.newSession(REFS_TOPIC)
      }
      const session = sessionObject.payload

      setSessionSigner(sessionSigner)
      setLoginState(LOGIN_STATE.LOGGED_IN)

      console.log('login done', session)
    } catch (error) {
      console.error(error)
      setLoginState(LOGIN_STATE.LOGGED_OUT)
    }
  }

  // magic
  const logout = async () => {
    setLoginState(LOGIN_STATE.LOGGING_OUT)
    try {
      await magic.user.logout()
      setSessionSigner(null)
    } finally {
      setLoginState(LOGIN_STATE.LOGGED_OUT)
    }
  }

  return (
    <MagicContext.Provider
      value={{
        magic,
        sessionSigner,
        loginState,
        login,
        logout,
        setSessionSigner,
        LOGIN_STATE,
      }}
    >
      {children}
      <magic.Relayer />
    </MagicContext.Provider>
  )
}

export { MagicContext, MagicProvider, useMagicContext }
