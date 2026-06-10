import UIKit
import Capacitor
import FirebaseCore
import FirebaseMessaging
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, MessagingDelegate {

    var window: UIWindow?
    private var latestFCMToken: String?
    private var pendingTokenDispatch: DispatchWorkItem?

    // Stable device ID shared with JS layer via window._nativeDeviceId
    private var nativeDeviceId: String {
        let key = "mcNativeDeviceId"
        if let existing = UserDefaults.standard.string(forKey: key) { return existing }
        let newId = UUID().uuidString.lowercased()
        UserDefaults.standard.set(newId, forKey: key)
        return newId
    }

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        FirebaseApp.configure()
        Messaging.messaging().delegate = self
        return true
    }

    // Firebase gives us the real FCM token here
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken, !token.isEmpty else { return }
        latestFCMToken = token
        print("[FCM] Token received: \(token.prefix(20))...")

        // Save directly from native — no JS bridge dependency
        saveTokenNative(token: token)

        // Also dispatch to JS after WebView loads (5s delay)
        scheduleTokenDispatch(token: token, delay: 5.0)
    }

    // Save FCM token to Firestore via REST API — result visible in Xcode logs
    private func saveTokenNative(token: String) {
        let docId = nativeDeviceId
        let projectId = "money-coach-aaa8c"
        let apiKey = "AIzaSyCi2YckhXYnZk8Fis4PE3SB7A2QrGdn_wI"
        let encodedDocId = docId.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? docId
        let urlStr = "https://firestore.googleapis.com/v1/projects/\(projectId)/databases/(default)/documents/fcmTokens/\(encodedDocId)?key=\(apiKey)"
        guard let url = URL(string: urlStr) else { return }

        var req = URLRequest(url: url)
        req.httpMethod = "PATCH"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let ts = Int(Date().timeIntervalSince1970 * 1000)
        let body: [String: Any] = ["fields": [
            "token":     ["stringValue": token],
            "platform":  ["stringValue": "ios"],
            "updatedAt": ["integerValue": "\(ts)"],
            "userId":    ["nullValue": NSNull()],
            "source":    ["stringValue": "native"],
        ]]
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: req) { data, response, error in
            if let error = error {
                print("[FCM] Native save error: \(error.localizedDescription)")
            } else if let http = response as? HTTPURLResponse {
                print("[FCM] Native save HTTP \(http.statusCode) — docId: \(docId.prefix(20))")
                if http.statusCode != 200, let data = data,
                   let body = String(data: data, encoding: .utf8) {
                    print("[FCM] Response: \(body.prefix(300))")
                }
            }
        }.resume()
    }

    private func dispatchFCMTokenToWebView(token: String) {
        let escaped = token.replacingOccurrences(of: "'", with: "\\'")
        let devId   = nativeDeviceId
        // Inject nativeDeviceId so JS uses the same doc ID as native save
        let js = """
            window._nativeDeviceId = '\(devId)';
            window._fcmToken = '\(escaped)';
            window.dispatchEvent(new CustomEvent('fcmTokenReady', {detail: {token: '\(escaped)'}}));
        """
        if let wv = findWebView(in: rootViewController()) {
            wv.evaluateJavaScript(js, completionHandler: { _, err in
                if let err = err { print("[FCM] JS dispatch error: \(err)") }
                else { print("[FCM] Token dispatched to JS: \(token.prefix(20))...") }
            })
        } else {
            print("[FCM] WebView not found")
        }
    }

    private func rootViewController() -> UIViewController? {
        if #available(iOS 13.0, *) {
            return UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .flatMap { $0.windows }
                .first { $0.isKeyWindow }?.rootViewController
        }
        return UIApplication.shared.keyWindow?.rootViewController
    }

    private func findWebView(in vc: UIViewController?) -> WKWebView? {
        guard let vc = vc else { return nil }
        if let cap = vc as? CAPBridgeViewController {
            return cap.webView as? WKWebView
        }
        for child in vc.children {
            if let found = findWebView(in: child) { return found }
        }
        if let presented = vc.presentedViewController {
            return findWebView(in: presented)
        }
        return nil
    }

    // Pass APNs token to Firebase so it can exchange for FCM token
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {
        // Retry dispatching stored token on every foreground (covers app re-opens).
        // Cancel any pending dispatch first so rapid foreground/background cycles
        // don't stack up multiple overlapping DispatchWorkItems.
        if let token = latestFCMToken {
            scheduleTokenDispatch(token: token, delay: 3.0)
        }
    }

    private func scheduleTokenDispatch(token: String, delay: TimeInterval) {
        pendingTokenDispatch?.cancel()
        let item = DispatchWorkItem { [weak self] in
            guard let self = self else { return }
            print("[FCM] Dispatching token to WebView...")
            self.dispatchFCMTokenToWebView(token: token)
        }
        pendingTokenDispatch = item
        DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: item)
    }
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
