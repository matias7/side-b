#!/bin/sh
set -eu
mkdir -p build
xcrun clang -fobjc-arc native/AudioEngine.m -o build/retro-audio -framework Foundation -framework AppKit -framework AVFoundation -framework MediaPlayer
