#!/bin/bash

# Script to run sudo commands needed for iOS setup
# This will prompt for your password

set -e

echo "🔐 Running setup commands that require administrator privileges..."
echo ""

# Configure Xcode to use full Xcode.app instead of command line tools
echo "Configuring Xcode..."
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer

# Verify Xcode is configured
if xcodebuild -version > /dev/null 2>&1; then
    echo "✅ Xcode configured successfully"
    xcodebuild -version
else
    echo "❌ Failed to configure Xcode"
    exit 1
fi

echo ""

# Install CocoaPods
echo "Installing CocoaPods..."
if command -v pod &> /dev/null; then
    echo "✅ CocoaPods already installed: $(pod --version)"
else
    sudo gem install cocoapods
    echo "✅ CocoaPods installed successfully"
fi

echo ""
echo "✅ Setup complete! You can now proceed with iOS project setup."

