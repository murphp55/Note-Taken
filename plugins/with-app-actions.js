const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

// Android App Actions (shortcuts.xml) — enables Gemini on Pixel to say:
//   "Hey Google, create a note in NoteTaken about X"
// and have the app open at the new-note screen with title/content pre-filled.
//
// Supported Built-in Intents:
//   actions.intent.CREATE_NOTE  → notetaken://new-note?title=...&content=...
//
// After adding this plugin, run: npx expo prebuild --platform android
// Then build the APK: npx expo run:android

const SHORTCUTS_XML = `<?xml version="1.0" encoding="utf-8"?>
<shortcuts xmlns:android="http://schemas.android.com/apk/res/android">

  <!-- "Hey Google, create a note [about X] in NoteTaken" -->
  <capability android:name="actions.intent.CREATE_NOTE">
    <intent
      android:action="android.intent.action.VIEW"
      android:targetPackage="com.notetaken.app"
      android:targetClass="com.notetaken.app.MainActivity">
      <url-template android:value="notetaken://new-note{?title,content}">
        <parameter android:name="note.name" android:key="title" />
        <parameter android:name="note.text" android:key="content" />
      </url-template>
    </intent>
  </capability>

</shortcuts>
`;

/**
 * Writes shortcuts.xml into the Android res/xml/ directory.
 * This file is created during `expo prebuild`.
 */
function withShortcutsXml(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const xmlDir = path.join(
        config.modRequest.platformProjectRoot,
        "app/src/main/res/xml"
      );
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(path.join(xmlDir, "shortcuts.xml"), SHORTCUTS_XML);
      return config;
    }
  ]);
}

/**
 * Adds the <meta-data android:name="android.app.shortcuts" .../> entry to
 * MainActivity in AndroidManifest.xml so Android picks up shortcuts.xml.
 */
function withAppActionsManifest(config) {
  return withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application?.[0];
    if (!app) return config;

    const mainActivity = app.activity?.find(
      (a) => a.$["android:name"] === ".MainActivity"
    );
    if (!mainActivity) return config;

    if (!mainActivity["meta-data"]) mainActivity["meta-data"] = [];

    const alreadyAdded = mainActivity["meta-data"].some(
      (m) => m.$?.["android:name"] === "android.app.shortcuts"
    );
    if (!alreadyAdded) {
      mainActivity["meta-data"].push({
        $: {
          "android:name": "android.app.shortcuts",
          "android:resource": "@xml/shortcuts"
        }
      });
    }

    return config;
  });
}

module.exports = (config) => withAppActionsManifest(withShortcutsXml(config));
