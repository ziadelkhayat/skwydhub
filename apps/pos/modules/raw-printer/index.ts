// The RawPrinter native module (Android); missing in the web preview, where printing falls back to the browser's print window.
import { requireOptionalNativeModule } from "expo";
type RawPrinter = { print(host: string, port: number, data: string, timeout: number): Promise<boolean> };
export default requireOptionalNativeModule<RawPrinter>("RawPrinter");
