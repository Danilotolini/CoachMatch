# Integration Tests Config

## Unit Tests (Jest)
```bash
npm run test -- payment.integration.test.ts
```

10 scenarios:
- S1: Card Approved
- S2: Card Refused  
- S3: Card Pending
- S4: PIX Payment
- S5: Form Validation (invalid card)
- S6: Form Validation (short name)
- S7: Retry After Failure
- S8: Loading State
- S9: Card Formatting
- S10: Expiry Formatting

## E2E Tests (Playwright)
```bash
npx playwright test payment.e2e.spec.ts
```

7 flows:
- E1: Approved Payment Complete
- E2: Refused Payment Complete
- E3: PIX Payment Complete
- E4: Form Validation UI
- E5: Retry Flow
- E6: Method Switching
- E7: Pending State

## CI/CD Setup

### GitHub Actions
- Runs on: push to main/develop, all PRs
- Jobs: unit-tests, lint, build
- Free tier: ✅ No cost

### AWS CodeBuild (Free Tier)
- buildspec.yml: Runs tests + build
- 100 build minutes/month free
- Setup: Connect GitHub → CodeBuild

### Local Testing
```bash
# Unit tests
npm run test

# E2E tests (requires dev server)
npm run dev &
npx playwright test
```

## Coverage Goals
- Lines: 90%+
- Branches: 80%+
- Functions: 90%+

## No Cost Setup
✅ GitHub Actions (free)
✅ AWS CodeBuild (100 min free/month)
✅ Playwright (free)
✅ Jest (free)
❌ No paid services needed
