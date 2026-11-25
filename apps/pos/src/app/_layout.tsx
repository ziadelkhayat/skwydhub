import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from "@expo-google-fonts/inter";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { Screen } from "../lib/screen";
import { StoreProvider } from "../lib/store";
import { C } from "../lib/theme";

export default function Layout() {
  const [ok] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  if (!ok) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  return (
    <StoreProvider>
      <StatusBar style="dark" />
      <Screen><Stack screenOptions={{ headerShown: false, animation: "none", contentStyle: { backgroundColor: C.bg } }} /></Screen>
    </StoreProvider>
  );
}
