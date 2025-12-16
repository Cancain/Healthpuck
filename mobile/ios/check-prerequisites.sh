#!/bin/bash

# Prerequisites Checker for iOS Build
# This script checks if all required tools are installed

echo "🔍 Checking iOS Build Prerequisites"
echo "===================================="
echo ""

ERRORS=0

# Check Node.js
echo -n "Checking Node.js... "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Found: $NODE_VERSION"
    
    # Check if version is 18+
    MAJOR_VERSION=$(echo $NODE_VERSION | sed 's/v\([0-9]*\).*/\1/')
    if [ "$MAJOR_VERSION" -lt 18 ]; then
        echo "   ⚠️  Warning: Node.js 18+ recommended (found v$MAJOR_VERSION)"
    fi
else
    echo "❌ Not found"
    echo "   Install with: brew install node"
    echo "   Or download from: https://nodejs.org/"
    ERRORS=$((ERRORS + 1))
fi

# Check npm
echo -n "Checking npm... "
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "✅ Found: $NPM_VERSION"
else
    echo "❌ Not found (usually comes with Node.js)"
    ERRORS=$((ERRORS + 1))
fi

# Check CocoaPods
echo -n "Checking CocoaPods... "
if command -v pod &> /dev/null; then
    POD_VERSION=$(pod --version)
    echo "✅ Found: $POD_VERSION"
else
    echo "❌ Not found"
    echo "   Install with: sudo gem install cocoapods"
    ERRORS=$((ERRORS + 1))
fi

# Check Xcode
echo -n "Checking Xcode... "
if command -v xcodebuild &> /dev/null; then
    XCODE_PATH=$(xcode-select -p 2>/dev/null)
    if [[ "$XCODE_PATH" == *"Xcode.app"* ]]; then
        XCODE_VERSION=$(xcodebuild -version 2>/dev/null | head -1)
        echo "✅ Found: $XCODE_VERSION"
    else
        echo "⚠️  Command line tools only (full Xcode recommended)"
        echo "   Install Xcode from Mac App Store"
    fi
else
    echo "❌ Not found"
    echo "   Install Xcode from Mac App Store"
    ERRORS=$((ERRORS + 1))
fi

# Check if node_modules exists
echo -n "Checking node_modules... "
MOBILE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [ -d "$MOBILE_DIR/node_modules" ]; then
    echo "✅ Found"
else
    echo "❌ Not found"
    echo "   Run: cd $MOBILE_DIR && npm install"
    ERRORS=$((ERRORS + 1))
fi

# Check if Xcode workspace exists
echo -n "Checking Xcode workspace... "
IOS_DIR="$MOBILE_DIR/ios"
if [ -f "$IOS_DIR/Healthpuck.xcworkspace" ]; then
    echo "✅ Found"
else
    echo "❌ Not found"
    echo "   Run: cd $IOS_DIR && ./setup-ios.sh"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "===================================="
if [ $ERRORS -eq 0 ]; then
    echo "✅ All prerequisites met! Ready to build."
    echo ""
    echo "Next steps:"
    echo "1. Open Xcode workspace:"
    echo "   open $IOS_DIR/Healthpuck.xcworkspace"
    echo ""
    echo "2. Configure signing in Xcode (Signing & Capabilities tab)"
    echo ""
    echo "3. Build and run:"
    echo "   cd $MOBILE_DIR && npm run ios"
else
    echo "❌ Found $ERRORS missing prerequisites"
    echo ""
    echo "Please install the missing tools above, then run this script again."
    echo ""
    echo "For detailed instructions, see:"
    echo "  - COMPILE_GUIDE.md"
    echo "  - FRIDAY_SETUP_GUIDE.md"
fi

exit $ERRORS

