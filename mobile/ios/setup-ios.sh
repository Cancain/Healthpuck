#!/bin/bash

# iOS Setup Script for Healthpuck
# Run this script on macOS to complete iOS project setup

set -e

echo "🚀 Healthpuck iOS Setup"
echo "========================"
echo ""

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ Error: This script must be run on macOS"
    exit 1
fi

# Check if CocoaPods is installed
if ! command -v pod &> /dev/null; then
    echo "📦 CocoaPods not found. Installing..."
    sudo gem install cocoapods
else
    echo "✅ CocoaPods is installed"
fi

# Navigate to mobile directory
cd "$(dirname "$0")/.."
MOBILE_DIR=$(pwd)
IOS_DIR="$MOBILE_DIR/ios"

echo ""
echo "📁 Current directory: $MOBILE_DIR"
echo ""

# Check if iOS directory exists
if [ ! -d "$IOS_DIR" ]; then
    echo "❌ Error: ios/ directory not found"
    exit 1
fi

# Check if Xcode project already exists
if [ -d "$IOS_DIR/Healthpuck.xcodeproj" ] || [ -f "$IOS_DIR/Healthpuck.xcworkspace" ]; then
    echo "⚠️  Xcode project already exists. Skipping generation."
    echo "   If you want to regenerate, delete Healthpuck.xcodeproj and Healthpuck.xcworkspace first"
else
    echo "📱 Generating Xcode project..."
    echo ""
    
    # Create temp directory for React Native init
    TEMP_DIR=$(mktemp -d)
    echo "   Temporary directory: $TEMP_DIR"
    
    # Run React Native init
    echo "   Running: npx react-native init Healthpuck --skip-install --directory $TEMP_DIR"
    npx react-native init Healthpuck --skip-install --directory "$TEMP_DIR" || {
        echo "❌ Failed to generate Xcode project"
        echo "   Make sure you have Node.js 18+ installed"
        rm -rf "$TEMP_DIR"
        exit 1
    }
    
    # Copy iOS files
    echo "   Copying iOS project files..."
    cp -r "$TEMP_DIR/ios/"* "$IOS_DIR/"
    
    # Clean up
    rm -rf "$TEMP_DIR"
    echo "✅ Xcode project generated"
fi

echo ""
echo "📦 Installing CocoaPods dependencies..."
echo ""

cd "$IOS_DIR"
pod install || {
    echo "❌ Failed to install CocoaPods dependencies"
    echo "   Try running: pod install --repo-update"
    exit 1
}

echo ""
echo "✅ iOS setup complete!"
echo ""
echo "Next steps:"
echo "1. Open Healthpuck.xcworkspace in Xcode:"
echo "   open $IOS_DIR/Healthpuck.xcworkspace"
echo ""
echo "2. In Xcode:"
echo "   - Select the Healthpuck target"
echo "   - Go to 'Signing & Capabilities'"
echo "   - Set Bundle Identifier to: com.healthpuck.app"
echo "   - Select your Team"
echo "   - Set iOS Deployment Target to 13.4+"
echo "   - Add 'Background Modes' capability"
echo "   - Check 'Uses Bluetooth LE accessories'"
echo ""
echo "3. Run the app:"
echo "   cd $MOBILE_DIR"
echo "   npm run ios"
echo ""


