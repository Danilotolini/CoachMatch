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
import ClientOnboardingPage from '@/pages/ClientOnboardingPage'
import ClientHealthFormPage from '@/pages/ClientHealthFormPage'
import PendingReviewPage from '@/pages/PendingReviewPage'
import RejectedPage from '@/pages/RejectedPage'
import DashboardPage from '@/pages/DashboardPage'
import ClientHomePage from '@/pages/ClientHomePage'
import PaymentPage from '@/pages/PaymentPage'
import { RouteGuard } from '@/components/RouteGuard'
import { AppShell } from '@/components/AppShell'

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <WelcomePage /> },
      { path: '/rotas', element: <RoutesTestPage /> },
      { path: '/coach/login', element: <LoginPage /> },
      { path: '/client/login', element: <LoginPage audience="client" /> },
      { path: '/auth/cognito/callback', element: <CognitoCallbackPage /> },
      {
        path: '/auth/cognito/student/callback',
        element: <CognitoCallbackPage audience="client" />,
      },
      { path: '/client/onboarding', element: <ClientOnboardingPage /> },
      { path: '/client/health', element: <ClientHealthFormPage /> },
      { path: '/client', element: <ClientHomePage /> },
      {
        path: '/coach/onboarding',
        element: (
          <RouteGuard allow={['PENDING_PROFILE']}>
            <OnboardingPage />
          </RouteGuard>
        ),
      },
      {
        path: '/coach/pending-review',
        element: (
          <RouteGuard allow={['PROFILE_REVIEW']}>
            <PendingReviewPage />
          </RouteGuard>
        ),
      },
      {
        path: '/coach/rejected',
        element: (
          <RouteGuard allow={['REJECTED', 'INACTIVE']}>
            <RejectedPage />
          </RouteGuard>
        ),
      },
      {
        path: '/coach',
        element: (
          <RouteGuard allow={['APPROVED', 'ACTIVE']}>
            <DashboardPage />
          </RouteGuard>
        ),
      },
    ],
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
