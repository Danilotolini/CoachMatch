import { lazy, StrictMode, Suspense } from 'react'
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
import CognitoCallbackPage from '@/pages/CognitoCallbackPage'
import CoachOnboardingPage from '@/pages/CoachOnboardingPage'
import ClientOnboardingPage from '@/pages/ClientOnboardingPage'
import ClientHealthFormPage from '@/pages/ClientHealthFormPage'
import CoachPendingReviewPage from '@/pages/CoachPendingReviewPage'
import CoachRejectedPage from '@/pages/CoachRejectedPage'
import CoachDashboardPage from '@/pages/CoachDashboardPage'
import ClientHomePage from '@/pages/ClientHomePage'
import PaymentPage from '@/pages/PaymentPage'
import { RouteGuard } from '@/components/RouteGuard'
import { ClientRouteGuard } from '@/components/ClientRouteGuard'
import { AppShell } from '@/components/AppShell'
import ClientSearchPage from '@/pages/ClientSearchPage'

function getDevRoutes() {
  if (!import.meta.env.DEV) return []
  const DevToolsPage = lazy(() => import('@/pages/DevToolsPage'))
  return [
    {
      path: '/dev',
      element: (
        <Suspense fallback={null}>
          <DevToolsPage />
        </Suspense>
      ),
    },
  ]
}

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <WelcomePage /> },
      ...getDevRoutes(),
      { path: '/coach/login', element: <LoginPage audience="coach" /> },
      { path: '/client/login', element: <LoginPage audience="client" /> },
      { path: '/auth/cognito/callback', element: <CognitoCallbackPage audience="coach" /> },
      {
        path: '/auth/cognito/student/callback',
        element: <CognitoCallbackPage audience="client" />,
      },
      {
        path: '/client/onboarding',
        element: (
          <ClientRouteGuard>
            <ClientOnboardingPage />
          </ClientRouteGuard>
        ),
      },
      {
        path: '/client/health',
        element: (
          <ClientRouteGuard>
            <ClientHealthFormPage />
          </ClientRouteGuard>
        ),
      },
      {
        path: '/client',
        element: (
          <ClientRouteGuard requireOnboarded>
            <ClientHomePage />
          </ClientRouteGuard>
        ),
      },
      {
        path: '/client/search',
        element: (
          <ClientRouteGuard requireOnboarded>
              <ClientSearchPage />
          </ClientRouteGuard>
        ),
      },
      {
        path: '/coach/onboarding',
        element: (
          <RouteGuard allow={['ONBOARDING_PROFILE']}>
            <CoachOnboardingPage />
          </RouteGuard>
        ),
      },
      {
        path: '/coach/pending-review',
        element: (
          <RouteGuard allow={['PENDING_REVIEW']}>
            <CoachPendingReviewPage />
          </RouteGuard>
        ),
      },
      {
        path: '/coach/rejected',
        element: (
          <RouteGuard allow={['REJECTED']}>
            <CoachRejectedPage />
          </RouteGuard>
        ),
      },
      {
        path: '/coach',
        element: (
          <RouteGuard allow={['APPROVED']}>
            <CoachDashboardPage />
          </RouteGuard>
        ),
      },
      {
        path: '/pagamento/:sessionId',
        element: (
          <ClientRouteGuard requireOnboarded>
            <PaymentPage />
          </ClientRouteGuard>
        ),
      },
    ],
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
