import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/queryClient'
import './index.css'

import WelcomePage from '@/pages/WelcomePage'
import LoginPage from '@/pages/LoginPage'
import CognitoCallbackPage from '@/pages/CognitoCallbackPage'
import OnboardingPage from '@/pages/OnboardingPage'
import PendingReviewPage from '@/pages/PendingReviewPage'
import RejectedPage from '@/pages/RejectedPage'
import DashboardPage from '@/pages/DashboardPage'

const router = createBrowserRouter([
  { path: '/', element: <WelcomePage /> },
  { path: '/entrar', element: <LoginPage /> },
  { path: '/auth/cognito/callback', element: <CognitoCallbackPage /> },
  { path: '/cadastro/profissional', element: <OnboardingPage /> },
  { path: '/em-analise', element: <PendingReviewPage /> },
  { path: '/reprovado', element: <RejectedPage /> },
  { path: '/dashboard', element: <DashboardPage /> },
])

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </StrictMode>,
)
