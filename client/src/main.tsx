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
import CoachDashboardPage from '@/pages/CoachDashboardPage'
import CoachSchedulePage from '@/pages/CoachSchedulePage'
import CoachProfilePage from '@/pages/CoachProfilePage'
import ClientHomePage from '@/pages/ClientHomePage'
import ClientProfilePage from '@/pages/ClientProfilePage'
import PaymentPage from '@/pages/PaymentPage'
import { CoachRouteGuard } from '@/components/CoachRouteGuard'
import { COACH_ONBOARDING_STATUSES } from '@/lib/coachStatus'
import { ClientRouteGuard } from '@/components/ClientRouteGuard'
import { AppShell } from '@/components/AppShell'
import ClientSearchPage from '@/pages/ClientSearchPage'
import ClientCoachDetailPage from '@/pages/ClientCoachDetailPage'
import ClientSchedulePage from '@/pages/ClientSchedulePage'
import NotFoundPage from '@/pages/NotFoundPage'

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
        path: '/client/schedule',
        element: (
          <ClientRouteGuard requireOnboarded>
            <ClientSchedulePage />
          </ClientRouteGuard>
        ),
      },
      {
        path: '/client/profile',
        element: (
          <ClientRouteGuard requireOnboarded>
            <ClientProfilePage />
          </ClientRouteGuard>
        ),
      },
      {
        path: '/client/coaches/:coachId',
        element: (
          <ClientRouteGuard requireOnboarded>
            <ClientCoachDetailPage />
          </ClientRouteGuard>
        ),
      },
      {
        path: '/coach/onboarding',
        element: (
          <CoachRouteGuard allow={COACH_ONBOARDING_STATUSES}>
            <CoachOnboardingPage />
          </CoachRouteGuard>
        ),
      },
      {
        path: '/coach',
        element: (
          <CoachRouteGuard allow={['APPROVED']}>
            <CoachDashboardPage />
          </CoachRouteGuard>
        ),
      },
      {
        path: '/coach/schedule',
        element: (
          <CoachRouteGuard allow={['APPROVED']}>
            <CoachSchedulePage />
          </CoachRouteGuard>
        ),
      },
      {
        path: '/coach/profile',
        element: (
          <CoachRouteGuard allow={['APPROVED']}>
            <CoachProfilePage />
          </CoachRouteGuard>
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
      { path: '*', element: <NotFoundPage /> },
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
