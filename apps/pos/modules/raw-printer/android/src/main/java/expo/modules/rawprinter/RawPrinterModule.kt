package expo.modules.rawprinter

import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.net.InetSocketAddress
import java.net.Socket

// Direct printing: raw ESC/POS bytes to a network printer (Devices → Printers, port 9100), the same as the current POS's RawPrinter plugin.
// AsyncFunction runs off the main thread, so the socket never blocks the screen.
class RawPrinterModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("RawPrinter")
    AsyncFunction("print") { host: String, port: Int, data: String, timeout: Int ->
      Socket().use { s ->
        s.connect(InetSocketAddress(host, port), timeout)
        s.soTimeout = timeout
        val out = s.getOutputStream()
        out.write(Base64.decode(data, Base64.DEFAULT))
        out.flush()
      }
      true
    }
  }
}
