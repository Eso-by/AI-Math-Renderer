# AI Math Renderer Android (prototype 0.1)

Android companion prototype for the AI Math Renderer browser extension.

## Target

- Android 10 / API 29 tested first
- minSdk 26
- Kotlin + Android AccessibilityService
- V0.1 only inspects the accessibility node tree of the ChatGPT Android app
- No OCR, no overlay replacement, no network requests

## Build

Requirements: Android Studio with JDK 17 and Android SDK Platform 35.

Open the `android/` directory in Android Studio, allow Gradle sync, then build:

```bash
gradlew.bat :app:assembleDebug
```

APK output:

```
app/build/outputs/apk/debug/app-debug.apk
```

## Install and test

1. Install the debug APK on the Android device.
2. Open AI Math Renderer.
3. Tap **打开无障碍服务设置**, then enable **AI Math Renderer 节点诊断**.
4. Return to the app and tap **开始 / 停止 ChatGPT 节点诊断** once to enable capture.
5. Open the ChatGPT Android app (`com.openai.chatgpt`) and navigate to a response containing inline and display equations.
6. Return to AI Math Renderer and tap **刷新诊断结果**.
7. Inspect whether formula delimiters and TeX source appear in node text, and whether formulas occupy separate nodes.

The diagnostic capture is opt-in and local-only. The latest snapshot is stored in app-private SharedPreferences and overwritten by the next capture. It is not uploaded.

## Known limitations

- ChatGPT may expose rendered accessibility text rather than raw TeX.
- A formula may share one accessibility node with surrounding prose. Node bounds are not character-level bounds.
- The prototype currently captures only the ChatGPT package.
- Formula matching is heuristic; it is a diagnostic hint, not a parser or proof of complete TeX extraction.
- Android 10 uses the legacy `TYPE_ACCESSIBILITY_OVERLAY` route for the later overlay phase; API 34 window-attached overlays are unavailable on this device.

## Next gate

Do not implement pixel-perfect replacement until a real device report confirms that the accessibility tree exposes enough source text and geometry.
