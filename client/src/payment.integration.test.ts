import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import PaymentPage from '../pages/PaymentPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
})

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </BrowserRouter>
)

describe('Payment Integration Tests', () => {
  beforeEach(() => {
    queryClient.clear()
  })

  test('S1: Card Approved Flow', async () => {
    const user = userEvent.setup()
    render(<PaymentPage />, { wrapper: Wrapper })
    
    await user.type(screen.getByPlaceholderText('0000 0000 0000 0000'), '4111111111111111')
    await user.type(screen.getByPlaceholderText('Como está no cartão'), 'JOÃO SILVA')
    await user.type(screen.getByPlaceholderText('MM/AA'), '1225')
    await user.type(screen.getByPlaceholderText('000'), '123')
    await user.click(screen.getByText(/Pagar/i))

    await waitFor(() => {
      expect(screen.getByText('Pagamento Confirmado!')).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  test('S2: Card Refused Flow', async () => {
    const user = userEvent.setup()
    render(<PaymentPage />, { wrapper: Wrapper })
    
    await user.type(screen.getByPlaceholderText('0000 0000 0000 0000'), '4222222222222222')
    await user.type(screen.getByPlaceholderText('Como está no cartão'), 'MARIA SILVA')
    await user.type(screen.getByPlaceholderText('MM/AA'), '0126')
    await user.type(screen.getByPlaceholderText('000'), '456')
    await user.click(screen.getByText(/Pagar/i))

    await waitFor(() => {
      expect(screen.getByText('Pagamento Recusado')).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  test('S3: Card Pending Flow', async () => {
    const user = userEvent.setup()
    render(<PaymentPage />, { wrapper: Wrapper })
    
    await user.type(screen.getByPlaceholderText('0000 0000 0000 0000'), '4333333333333333')
    await user.type(screen.getByPlaceholderText('Como está no cartão'), 'PEDRO OLIVEIRA')
    await user.type(screen.getByPlaceholderText('MM/AA'), '1226')
    await user.type(screen.getByPlaceholderText('000'), '789')
    await user.click(screen.getByText(/Pagar/i))

    await waitFor(() => {
      expect(screen.getByText('Aguardando Confirmação')).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  test('S4: PIX Payment Flow', async () => {
    const user = userEvent.setup()
    render(<PaymentPage />, { wrapper: Wrapper })
    
    await user.click(screen.getByRole('button', { name: /pix/i }))
    expect(screen.getByText(/pix_mock_/i)).toBeInTheDocument()
    
    await user.click(screen.getByText(/Já realizei/i))

    await waitFor(() => {
      expect(screen.getByText('Pagamento Confirmado!')).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  test('S5: Form Validation - Invalid Card', async () => {
    const user = userEvent.setup()
    render(<PaymentPage />, { wrapper: Wrapper })
    
    await user.type(screen.getByPlaceholderText('0000 0000 0000 0000'), '1234')
    await user.click(screen.getByText(/Pagar/i))

    expect(screen.getByText(/16 dígitos/i)).toBeInTheDocument()
  })

  test('S6: Form Validation - Short Name', async () => {
    const user = userEvent.setup()
    render(<PaymentPage />, { wrapper: Wrapper })
    
    await user.type(screen.getByPlaceholderText('0000 0000 0000 0000'), '4111111111111111')
    await user.type(screen.getByPlaceholderText('Como está no cartão'), 'AB')
    await user.click(screen.getByText(/Pagar/i))

    expect(screen.getByText(/muito curto/i)).toBeInTheDocument()
  })

  test('S7: Retry After Failure', async () => {
    const user = userEvent.setup()
    render(<PaymentPage />, { wrapper: Wrapper })
    
    await user.type(screen.getByPlaceholderText('0000 0000 0000 0000'), '4222222222222222')
    await user.type(screen.getByPlaceholderText('Como está no cartão'), 'TEST CARD')
    await user.type(screen.getByPlaceholderText('MM/AA'), '1225')
    await user.type(screen.getByPlaceholderText('000'), '123')
    await user.click(screen.getByText(/Pagar/i))

    await waitFor(() => {
      expect(screen.getByText('Pagamento Recusado')).toBeInTheDocument()
    })

    await user.click(screen.getByText(/Tentar novamente/i))
    expect(screen.getByPlaceholderText('0000 0000 0000 0000')).toBeInTheDocument()
  })

  test('S8: Loading State During Request', async () => {
    const user = userEvent.setup()
    render(<PaymentPage />, { wrapper: Wrapper })
    
    await user.type(screen.getByPlaceholderText('0000 0000 0000 0000'), '4111111111111111')
    await user.type(screen.getByPlaceholderText('Como está no cartão'), 'TEST CARD')
    await user.type(screen.getByPlaceholderText('MM/AA'), '1225')
    await user.type(screen.getByPlaceholderText('000'), '123')
    
    const button = screen.getByText(/Pagar/i)
    await user.click(button)

    expect(button).toBeDisabled()
    
    await waitFor(() => {
      expect(screen.getByText('Pagamento Confirmado!')).toBeInTheDocument()
    })
  })

  test('S9: Card Number Formatting', async () => {
    const user = userEvent.setup()
    render(<PaymentPage />, { wrapper: Wrapper })
    
    const input = screen.getByPlaceholderText('0000 0000 0000 0000') as HTMLInputElement
    await user.type(input, '41111111111111111111')
    
    expect(input.value).toBe('4111 1111 1111 1111')
  })

  test('S10: Expiry Date Formatting', async () => {
    const user = userEvent.setup()
    render(<PaymentPage />, { wrapper: Wrapper })
    
    const input = screen.getByPlaceholderText('MM/AA') as HTMLInputElement
    await user.type(input, '122025')
    
    expect(input.value).toBe('12/20')
  })
})
