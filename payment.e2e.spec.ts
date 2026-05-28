import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:5173'

test.describe('Payment E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/pagamento`)
  })

  test('E1: Complete Approved Payment Flow', async ({ page }) => {
    // Fill card form
    await page.fill('input[placeholder*="0000"]', '4111111111111111')
    await page.fill('input[placeholder*="Como está"]', 'JOÃO SILVA')
    await page.fill('input[placeholder*="MM/AA"]', '1225')
    await page.fill('input[placeholder*="000"]', '123')

    // Submit
    await page.click('button:has-text("Pagar")')

    // Wait and verify success
    await page.waitForSelector('text=Pagamento Confirmado!')
    expect(await page.isVisible('text=Pagamento Confirmado!')).toBeTruthy()
    expect(await page.isVisible('a:has-text("Ir para o Dashboard")')).toBeTruthy()
  })

  test('E2: Complete Refused Payment Flow', async ({ page }) => {
    await page.fill('input[placeholder*="0000"]', '4222222222222222')
    await page.fill('input[placeholder*="Como está"]', 'JANE DOE')
    await page.fill('input[placeholder*="MM/AA"]', '0126')
    await page.fill('input[placeholder*="000"]', '456')

    await page.click('button:has-text("Pagar")')

    await page.waitForSelector('text=Pagamento Recusado')
    expect(await page.isVisible('text=Pagamento Recusado')).toBeTruthy()
    expect(await page.isVisible('button:has-text("Tentar novamente")')).toBeTruthy()
  })

  test('E3: PIX Payment Complete Flow', async ({ page }) => {
    // Select PIX
    await page.click('button:has-text("PIX")')

    // Verify QR code
    await page.waitForSelector('text=pix_mock_')
    expect(await page.isVisible('text=pix_mock_')).toBeTruthy()

    // Click confirm
    await page.click('button:has-text("Já realizei")')

    // Verify success
    await page.waitForSelector('text=Pagamento Confirmado!')
    expect(await page.isVisible('text=Pagamento Confirmado!')).toBeTruthy()
  })

  test('E4: Form Validation - Blocks Invalid Card', async ({ page }) => {
    await page.fill('input[placeholder*="0000"]', '1234')
    await page.click('button:has-text("Pagar")')

    // Should show error
    expect(await page.isVisible('text=Número deve ter 16 dígitos')).toBeTruthy()
  })

  test('E5: Retry Functionality', async ({ page }) => {
    // Submit refused card
    await page.fill('input[placeholder*="0000"]', '4222222222222222')
    await page.fill('input[placeholder*="Como está"]', 'TEST')
    await page.fill('input[placeholder*="MM/AA"]', '1225')
    await page.fill('input[placeholder*="000"]', '123')
    await page.click('button:has-text("Pagar")')

    // Wait for refused state
    await page.waitForSelector('text=Pagamento Recusado')

    // Click retry
    await page.click('button:has-text("Tentar novamente")')

    // Form should be visible again
    await page.waitForSelector('input[placeholder*="0000"]')
  })

  test('E6: Method Selection Switching', async ({ page }) => {
    await page.click('button:has-text("Cartão de Crédito")')
    expect(await page.isVisible('input[placeholder*="0000"]')).toBeTruthy()

    await page.click('button:has-text("PIX")')
    expect(await page.isVisible('text=pix_mock_')).toBeTruthy()
  })

  test('E7: Pending Payment State', async ({ page }) => {
    await page.fill('input[placeholder*="0000"]', '4333333333333333')
    await page.fill('input[placeholder*="Como está"]', 'PENDING TEST')
    await page.fill('input[placeholder*="MM/AA"]', '1226')
    await page.fill('input[placeholder*="000"]', '789')

    await page.click('button:has-text("Pagar")')

    await page.waitForSelector('text=Aguardando Confirmação')
    expect(await page.isVisible('text=Aguardando Confirmação')).toBeTruthy()
  })
})
