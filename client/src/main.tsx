import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools' 
import { queryClient } from '@/lib/queryClient'
import './index.css'

async function enableMocking() {
  if (!import.meta.env.DEV || import.meta.env.VITE_API_MOCKING !== 'enabled') return
  const { worker } = await import('@/mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass' })
}

import WelcomePage from '@/pages/WelcomePage'
import LoginPage from '@/pages/LoginPage'
import RoutesTestPage from '@/pages/RoutesTestPage'
import CognitoCallbackPage from '@/pages/CognitoCallbackPage'
import OnboardingPage from '@/pages/OnboardingPage'
import PendingReviewPage from '@/pages/PendingReviewPage'
import RejectedPage from '@/pages/RejectedPage'
import DashboardPage from '@/pages/DashboardPage' 
import PaymentPage from '@/pages/PaymentPage'
import { RouteGuard } from '@/components/RouteGuard'

const router = createBrowserRouter([
  { path: '/', element: <WelcomePage /> },
  { path: '/rotas', element: <RoutesTestPage /> },
  { path: '/entrar', element: <LoginPage /> },
  { path: '/auth/cognito/callback', element: <CognitoCallbackPage /> },
  {
    path: '/cadastro/profissional',
    element: (
      <RouteGuard allow={['PENDING_PROFILE']}>
        <OnboardingPage />
      </RouteGuard>
    ),
  },
  {
    path: '/em-analise',
    element: (
      <RouteGuard allow={['PROFILE_REVIEW']}>
        <PendingReviewPage />
      </RouteGuard>
    ),
  },
  {
    path: '/reprovado',
    element: (
      <RouteGuard allow={['REJECTED', 'INACTIVE']}>
        <RejectedPage />
      </RouteGuard>
    ),
  },
  {
    path: '/dashboard',
    element: (
      <RouteGuard allow={['APPROVED', 'ACTIVE']}>
        <DashboardPage />
      </RouteGuard>
    ),
  }, 
  {
    path: '/pagamento/:sessionId',
    element: (
      <RouteGuard allow={['APPROVED']}>
        <PaymentPage />
      </RouteGuard>
    ),
  },
])

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

void enableMocking().then(() => {
  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </StrictMode>,
  )
})
