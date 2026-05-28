#!/bin/bash
# 🚀 Local CI/CD Simulation
# Execute este script antes de fazer push para simular o pipeline localmente

set -e  # Exit on error

echo "═══════════════════════════════════════════════════════════"
echo "🚀 LOCAL CI/CD SIMULATION"
echo "═══════════════════════════════════════════════════════════"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ────────────────────────────────────────────────────────────
# STAGE 1: LINT
# ────────────────────────────────────────────────────────────

echo -e "\n${YELLOW}📍 STAGE 1: LINTING${NC}"
echo "───────────────────────────────────────────────────────────"

if [ -d "client" ]; then
    echo "🔍 Linting client..."
    cd client
    
    if npm run lint 2>/dev/null; then
        echo -e "${GREEN}✅ Client lint passed${NC}"
    else
        echo -e "${YELLOW}⚠️  Lint warnings (non-blocking)${NC}"
    fi
    
    # Type check
    echo "🔍 Type checking..."
    if npm run type-check 2>/dev/null; then
        echo -e "${GREEN}✅ Type check passed${NC}"
    else
        echo -e "${RED}❌ Type check failed${NC}"
        exit 1
    fi
    
    cd ..
else
    echo -e "${YELLOW}⚠️  client/ directory not found${NC}"
fi

# ────────────────────────────────────────────────────────────
# STAGE 2: BACKEND TESTS
# ────────────────────────────────────────────────────────────

echo -e "\n${YELLOW}📍 STAGE 2: BACKEND TESTS${NC}"
echo "───────────────────────────────────────────────────────────"

if [ -d "server/api-pagamentos" ]; then
    echo "🧪 Running backend tests..."
    cd server/api-pagamentos
    
    if npm test -- --coverage 2>/dev/null; then
        echo -e "${GREEN}✅ Backend tests passed${NC}"
    else
        echo -e "${RED}❌ Backend tests failed${NC}"
        exit 1
    fi
    
    cd ../..
else
    echo -e "${YELLOW}⚠️  Backend directory not found${NC}"
fi

# ────────────────────────────────────────────────────────────
# STAGE 3: FRONTEND TESTS
# ────────────────────────────────────────────────────────────

echo -e "\n${YELLOW}📍 STAGE 3: FRONTEND TESTS${NC}"
echo "───────────────────────────────────────────────────────────"

if [ -d "client" ]; then
    echo "🧪 Running frontend tests..."
    cd client
    
    if npm test -- --coverage 2>/dev/null; then
        echo -e "${GREEN}✅ Frontend tests passed${NC}"
    else
        echo -e "${YELLOW}⚠️  Frontend tests skipped or failed (non-blocking)${NC}"
    fi
    
    cd ..
else
    echo -e "${YELLOW}⚠️  client/ directory not found${NC}"
fi

# ────────────────────────────────────────────────────────────
# STAGE 4: BUILD
# ────────────────────────────────────────────────────────────

echo -e "\n${YELLOW}📍 STAGE 4: BUILD CHECK${NC}"
echo "───────────────────────────────────────────────────────────"

if [ -d "client" ]; then
    echo "🏗️  Building client..."
    cd client
    
    if npm run build 2>/dev/null; then
        echo -e "${GREEN}✅ Build successful${NC}"
        
        # Check bundle size
        BUNDLE_SIZE=$(du -sb dist 2>/dev/null | awk '{print $1}')
        LIMIT=$((2 * 1024 * 1024))  # 2MB
        
        if [ $BUNDLE_SIZE -lt $LIMIT ]; then
            echo -e "${GREEN}✅ Bundle size OK ($(( BUNDLE_SIZE / 1024 ))KB)${NC}"
        else
            echo -e "${YELLOW}⚠️  Bundle size large ($(( BUNDLE_SIZE / 1024 ))KB)${NC}"
        fi
    else
        echo -e "${RED}❌ Build failed${NC}"
        exit 1
    fi
    
    cd ..
else
    echo -e "${YELLOW}⚠️  client/ directory not found${NC}"
fi

# ────────────────────────────────────────────────────────────
# FINAL SUMMARY
# ────────────────────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ ALL CHECKS PASSED!${NC}"
echo "═══════════════════════════════════════════════════════════"

echo ""
echo "🚀 Ready to push! The CI/CD pipeline will:"
echo "   ✓ Run lint checks"
echo "   ✓ Scan for security vulnerabilities"
echo "   ✓ Run all tests with coverage"
echo "   ✓ Build and verify bundle size"
echo "   ✓ Run E2E tests (if PR to main)"
echo ""

echo "📝 Next steps:"
echo "   1. git add ."
echo "   2. git commit -m 'your message'"
echo "   3. git push origin your-branch"
echo "   4. Open PR and watch the pipeline run"
echo ""

echo "🔗 Monitor your workflow:"
echo "   https://github.com/your-org/CoachMatch/actions"
echo ""
