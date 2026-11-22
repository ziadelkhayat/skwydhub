package expo.modules.rawprinter

import android.util.Base64
import io.github.expo.modules.v2.ExpoModule
import io.github.expo.modules.v2.JS
import io.github.expo.modules.v2.Module
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.InetSocketAddress
import java.net.Socket

// Direct printing: raw ESC/POS bytes to a network printer (Devices → Printers, port 9100), the same as the current POS's RawPrinter plugin.
@ExpoModule("RawPrinter")
class RawPrinterModule : Module() {
  @JS
  suspend fun print(host: String, port: Int, data: String, timeout: Int): Boolean = withContext(Dispatchers.IO) {
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
