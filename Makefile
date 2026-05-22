.PHONY: help metadata ios ipad android start clean-sim check check-routes test lint

# Simulators used for App Store / Play Store screenshots
IOS_PHONE       := iPhone 11 Pro Max
IOS_TABLET      := iPad Pro (12.9-inch) (6th generation)
ANDROID_AVD     := Pixel_3a_API_34_extension_level_7_arm64-v8a
TOKEN     		:= xxxx-xxxxx-xxxxxx-xxxxxx

EXPO            := ./node_modules/.bin/expo

help:
	@echo "Available targets:"
	@echo "  make metadata   Push App Store metadata (screenshots, previews, copy) via EAS"
	@echo "  make ios        Run app on $(IOS_PHONE) (slot APP_IPHONE_65)"
	@echo "  make ipad       Run app on $(IOS_TABLET) (slot APP_IPAD_PRO_3GEN_129)"
	@echo "  make android    Run app on Android emulator $(ANDROID_AVD)"
	@echo "  make start      Start Metro bundler only"
	@echo "  make check      Run lint + route validator + unit tests"
	@echo "  make lint       Run expo lint"
	@echo "  make test       Run unit tests"
	@echo "  make clean-sim  Shut down all booted iOS simulators"

metadata:
	eas metadata:push --non-interactive

ios:
	@xcrun simctl boot "$(IOS_PHONE)" 2>/dev/null || true
	@open -a Simulator
	$(EXPO) run:ios --device "$(IOS_PHONE)"

ipad:
	@xcrun simctl boot "$(IOS_TABLET)" 2>/dev/null || true
	@open -a Simulator
	$(EXPO) run:ios --device "$(IOS_TABLET)"

android:
	@$(ANDROID_HOME)/emulator/emulator -avd $(ANDROID_AVD) >/dev/null 2>&1 &
	$(EXPO) run:android

start:
	$(EXPO) start

connect:
	@xcrun simctl openurl booted "mtm:///connect?token=$(TOKEN)"

check: lint check-routes test

lint:
	@npm run lint --silent

check-routes:
	@node scripts/check-routes.js

test:
	@./node_modules/.bin/jest

clean-sim:
	xcrun simctl shutdown all
