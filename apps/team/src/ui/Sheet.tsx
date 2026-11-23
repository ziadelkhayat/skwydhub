// A window over the screen (bottom sheet on phones), no animation.
import { Modal, Pressable, ScrollView, View } from "react-native";
import { C, R } from "../lib/theme";
import { Icon } from "./Icon";
import { T } from "./kit";

export function Sheet({ title, onClose, width = 680, children, footer }: { title: string; onClose: () => void; width?: number; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <Modal transparent animationType="none" visible onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(16,24,40,0.45)", alignItems: "center", justifyContent: "center", padding: 12 }}>
        <Pressable onPress={() => {}} style={{ width: "100%", maxWidth: width, maxHeight: "92%", backgroundColor: "#fff", borderRadius: R.lg, overflow: "hidden" }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderColor: C.line }}>
            <T w="s" size={18} style={{ flex: 1 }} numberOfLines={1}>{title}</T>
            <Pressable accessibilityLabel="Close" onPress={onClose} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}><Icon name="x" size={20} /></Pressable>
          </View>
          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ padding: 20 }}>{children}</ScrollView>
          {footer ? <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderColor: C.line }}>{footer}</View> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

