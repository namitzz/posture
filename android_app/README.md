# Android Wrapper App (Beta)

This folder contains a native Android wrapper for the deployed Postur web app.

## What it does

- Hosts `https://posture-dusky.vercel.app/` in a full-screen `WebView`
- Requests camera + microphone permissions at runtime
- Enables JS + DOM storage so MediaPipe/web app features work
- Keeps hardware acceleration enabled for WebGL/MediaPipe performance

## Prerequisites

- Android Studio Koala+ (or equivalent supporting AGP 8.7+)
- Android SDK 35
- JDK 17

## Build and run

1. Open `android_app/` in Android Studio.
2. Sync Gradle.
3. Run the `app` target on a physical Android device.
4. Grant camera/microphone permissions when prompted.

## Notes

- This is a wrapper approach for beta reliability and quick distribution.
- If your domain changes, update the URL in `MainActivity.kt`.
- If you need external link support, expand `shouldOverrideUrlLoading` accordingly.
