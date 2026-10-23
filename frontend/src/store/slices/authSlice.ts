import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'cashier' | 'manager'
  avatar?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  token: string | null
}

// Public portfolio demo: there is no sign-in, so the UI shows a fixed display-only profile.
// It is not a session - no token exists and nothing is sent anywhere.
const initialState: AuthState = {
  user: { id: 'demo', name: 'Demo Visitor', email: 'demo@vyron.example', role: 'admin' },
  isAuthenticated: false,
  loading: false,
  token: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login: (state, action: PayloadAction<User>) => {
      state.user = action.payload
      state.isAuthenticated = true
    },
    logout: (state) => {
      state.user = null
      state.isAuthenticated = false
      state.token = null
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setToken: (state, action: PayloadAction<string | null>) => {
      state.token = action.payload
    },
  },
})

export const { login, logout, setLoading, setToken } = authSlice.actions
export default authSlice.reducer
