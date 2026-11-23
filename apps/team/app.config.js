// EXPO_PUBLIC_SKWYD_APP=driver builds the SKWYD Driver app from the same code (team.html + SKWYD_APP="driver").
const base = {
  "name": "SKWYD Team",
  "slug": "skwyd-team",
  "version": "1.0.0",
  "orientation": "portrait",
  "icon": "./assets/icon.png",
  "userInterfaceStyle": "light",
  "ios": {
    "supportsTablet": true
  },
  "android": {
    "adaptiveIcon": {
      "backgroundColor": "#E6F4FE",
      "foregroundImage": "./assets/android-icon-foreground.png",
      "backgroundImage": "./assets/android-icon-background.png",
      "monochromeImage": "./assets/android-icon-monochrome.png"
    },
    "predictiveBackGestureEnabled": false,
    "package": "com.skwydhub.teamrn"
  },
  "web": {
    "favicon": "./assets/favicon.png",
    "output": "single",
    "bundler": "metro"
  },
  "plugins": [
    "expo-router",
    "expo-font",
    [
      "expo-location",
      {
        "locationWhenInUsePermission": "SKWYD Team checks you are at the store when you clock in or out."
      }
    ],
    [
      "expo-image-picker",
      {
        "cameraPermission": "SKWYD Team takes a picture of the order when a driver leaves the store."
      }
    ]
  ],
  "scheme": "skwydteam",
  "experiments": {
    "typedRoutes": false
  }
};
const driver = (process.env.EXPO_PUBLIC_SKWYD_APP || process.env.SKWYD_APP) === "driver";
module.exports = { expo: { ...base, ...(driver ? { name: "SKWYD Driver", slug: "skwyd-driver", scheme: "skwyddriver", android: { ...base.android, package: "com.skwydhub.driverrn" } } : {}), extra: { ...(base.extra || {}), app: driver ? "driver" : "team" } } };
