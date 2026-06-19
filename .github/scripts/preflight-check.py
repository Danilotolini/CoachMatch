#!/usr/bin/env python3
"""
🔍 CI/CD Pre-flight Check Script

Verifica se o repositório está pronto para CI/CD:
- Workflows exist
- Scripts configured
- Dependencies resolved
- No breaking issues
"""

import os
import json
import sys
from pathlib import Path

def check_file_exists(path: str, name: str) -> bool:
    """Check if file exists."""
    exists = Path(path).exists()
    status = "✅" if exists else "❌"
    print(f"{status} {name}: {path}")
    return exists

def check_json_file(path: str, name: str) -> bool:
    """Check if JSON file is valid."""
    if not Path(path).exists():
        print(f"❌ {name}: File not found - {path}")
        return False
    
    try:
        with open(path) as f:
            json.load(f)
        print(f"✅ {name}: Valid JSON - {path}")
        return True
    except json.JSONDecodeError as e:
        print(f"❌ {name}: Invalid JSON - {e}")
        return False

def check_script_exists(path: str, script: str) -> bool:
    """Check if npm/pnpm script exists."""
    if not Path(path).exists():
        print(f"❌ Script '{script}': package.json not found - {path}")
        return False
    
    try:
        with open(path) as f:
            data = json.load(f)
            exists = script in data.get('scripts', {})
            status = "✅" if exists else "⚠️"
            print(f"{status} Script '{script}': {path}")
            return exists
    except Exception as e:
        print(f"❌ Error reading {path}: {e}")
        return False

def main():
    """Run all checks."""
    print("🚀 CI/CD Pre-flight Check\n")
    print("=" * 60)
    
    all_passed = True
    
    # ────────────────────────────────────────────────────────────
    print("\n📁 Workflow Files:")
    print("-" * 60)
    
    workflows = [
        (".github/workflows/ci-cd-pipeline.yml", "Main CI/CD Pipeline"),
        (".github/workflows/dependencies.yml", "Dependencies Update"),
        (".github/workflows/performance.yml", "Performance Monitoring"),
    ]
    
    for path, name in workflows:
        if not check_file_exists(path, name):
            all_passed = False
    
    # ────────────────────────────────────────────────────────────
    print("\n📋 Configuration Files:")
    print("-" * 60)
    
    configs = [
        (".github/CICD_SETUP.md", "Setup Documentation"),
        (".github/CI_CD_CHECKLIST.md", "Implementation Checklist"),
        (".github/lighthouse-config.json", "Lighthouse Config"),
    ]
    
    for path, name in configs:
        check_file_exists(path, name)
    
    # ────────────────────────────────────────────────────────────
    print("\n📦 NPM/PNPM Scripts - Client:")
    print("-" * 60)
    
    client_scripts = [
        "lint",
        "type-check",
        "test",
        "build",
    ]
    
    for script in client_scripts:
        if not check_script_exists("client/package.json", script):
            all_passed = False
    
    # ────────────────────────────────────────────────────────────
    print("\n📦 NPM/PNPM Scripts - Server:")
    print("-" * 60)
    
    server_scripts = [
        "test",
    ]
    
    for script in server_scripts:
        if not check_script_exists("server/coachmatch/package.json", script):
            all_passed = False
    
    # ────────────────────────────────────────────────────────────
    print("\n🔧 Dev Dependencies Check:")
    print("-" * 60)
    
    required_packages = {
        "client": ["eslint", "typescript", "vitest"],
        "server/coachmatch": ["vitest", "@vitest/coverage-v8"],
    }
    
    for path, packages in required_packages.items():
        pkg_path = f"{path}/package.json"
        if Path(pkg_path).exists():
            with open(pkg_path) as f:
                data = json.load(f)
                deps = {**data.get('devDependencies', {}), **data.get('dependencies', {})}
                for pkg in packages:
                    status = "✅" if pkg in deps else "⚠️"
                    print(f"{status} {pkg}: {pkg_path}")
        else:
            print(f"⚠️ {pkg_path} not found")
    
    # ────────────────────────────────────────────────────────────
    print("\n📊 Summary:")
    print("-" * 60)
    
    if all_passed:
        print("✅ All critical checks passed!")
        print("\n📝 Next steps:")
        print("1. Configure GitHub Secrets (Settings → Secrets)")
        print("2. Setup Branch Protection (Settings → Branches)")
        print("3. Create Environments (Settings → Environments)")
        print("4. Run first PR to test workflows")
        print("\n📚 See .github/CICD_SETUP.md for detailed setup")
        return 0
    else:
        print("❌ Some checks failed. Please review and fix.")
        print("\n📝 Action items:")
        print("1. Create missing workflow files")
        print("2. Add missing npm scripts")
        print("3. Install required dev dependencies")
        return 1

if __name__ == "__main__":
    sys.exit(main())
