// The printer bridge for the web POS. In the Android app (Capacitor) a native plugin "RawPrinter" sends raw ESC/POS bytes to a
// network printer on port 9100; in a browser there is none, and printing falls back to showing the receipt text.
type RawPrinter = { print(host: string, port: number, data: string, timeout: number): Promise<boolean> };
const plugin = (globalThis as any).Capacitor?.Plugins?.RawPrinter as { print(o: { host: string; port: number; data: string; timeout: number }): Promise<{ ok: boolean }> } | undefined;
const RawPrinter: RawPrinter | null = plugin ? { print: async (host, port, data, timeout) => !!(await plugin.print({ host, port, data, timeout })).ok } : null;
export default RawPrinter;
