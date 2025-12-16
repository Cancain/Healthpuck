#!/bin/bash

# Complete iOS Setup Script
# This script completes the iOS setup after prerequisites are installed

set -e

echo "🚀 Completing iOS Setup"
echo "======================"
echo ""

MOBILE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
IOS_DIR="$MOBILE_DIR/ios"

cd "$IOS_DIR"

# Check if CocoaPods is installed
if ! command -v pod &> /dev/null; then
    echo "❌ CocoaPods is not installed"
    echo ""
    echo "Please run the following command (requires your password):"
    echo "  sudo gem install cocoapods"
    echo ""
    echo "Or run: ./run-sudo-setup.sh"
    exit 1
fi

echo "✅ CocoaPods is installed: $(pod --version)"
echo ""

# Check if Xcode is properly configured
if ! xcodebuild -version > /dev/null 2>&1; then
    echo "⚠️  Xcode may not be properly configured"
    echo "   Run: sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer"
    echo "   Or run: ./run-sudo-setup.sh"
    echo ""
fi

# Install CocoaPods dependencies
echo "📦 Installing CocoaPods dependencies..."
echo "   This may take 5-15 minutes on first run..."
echo ""

pod install || {
    echo "❌ Failed to install CocoaPods dependencies"
    echo ""
    echo "Try running:"
    echo "  pod install --repo-update"
    exit 1
}

echo ""
echo "✅ CocoaPods dependencies installed!"
echo ""

# Check if workspace was created
if [ -f "Healthpuck.xcworkspace" ]; then
    echo "✅ Xcode workspace created: Healthpuck.xcworkspace"
else
    echo "❌ Xcode workspace not found"
    exit 1
fi

echo ""
echo "🎉 iOS setup complete!"
echo ""
echo "Next steps:"
echo ""
echo "1. Open Xcode workspace:"
echo "   open $IOS_DIR/Healthpuck.xcworkspace"
echo ""
echo "2. In Xcode, configure the project:"
echo "   - Select 'Healthpuck' target"
echo "   - Go to 'Signing & Capabilities' tab"
echo "   - Set Bundle Identifier to: com.healthpuck.app"
echo "   - Select your Team (sign in with Apple ID if needed)"
echo "   - Set iOS Deployment Target to 13.4+"
echo "   - Add 'Background Modes' capability"
echo "   - Check 'Uses Bluetooth LE accessories'"
echo ""
echo "3. Build and run:"
echo "   cd $MOBILE_DIR"
echo "   npm run ios"
echo ""

