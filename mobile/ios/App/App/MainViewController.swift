import Capacitor
import UIKit

// STO-76: this app is a client-side-routed SPA (SvelteKit), so WKWebView's own pushState-based
// history already tracks in-app navigation the same way a stack of real page loads would — that
// makes its native edge-swipe back/forward gesture a correct fit here, not just a visual trick.
// It's off by default on CAPBridgeViewController, hence this subclass.
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        webView?.allowsBackForwardNavigationGestures = true
    }
}
