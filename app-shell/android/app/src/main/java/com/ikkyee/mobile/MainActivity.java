package com.ikkyee.mobile;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.content.pm.ApplicationInfo;

public class MainActivity extends BridgeActivity {
    enum BootStage {
        WATCHDOG_READY, MODULE_READY, BOOT_START, EVENTS_READY, RUNTIME_READY,
        AUTH_READY, SESSION_READY, PROFILE_READY, DATA_READY, BOOT_COMPLETE,
        BOOT_ERROR, SCRIPT_ERROR, RESOURCE_ERROR, BOOT_TIMEOUT,
        MAP_LOADING, MAP_CONFIG_READY, MAP_READY, MAP_AUTH_ERROR, MAP_CONFIG_ERROR, MAP_SCRIPT_ERROR, MAP_TIMEOUT
    }

    public static final class BootDiagnostics {
        @JavascriptInterface
        public void bridgeState(boolean header, boolean listener, boolean callback) {
            Log.i("IkkyeeBoot", "BRIDGE_STATE header=" + header + " listener=" + listener + " callback=" + callback);
        }
        @JavascriptInterface
        public void failure(String kind, int line, int column) {
            if (kind != null && kind.matches("(TypeError|ReferenceError|SyntaxError|Error)_(APP|SDK|BRIDGE|OTHER)")
                && line >= 0 && line < 100000 && column >= 0 && column < 1000000) {
                Log.i("IkkyeeBoot", "SCRIPT_FAILURE " + kind + " " + line + ":" + column);
            }
        }

        @JavascriptInterface
        public void mark(String stage) {
            try {
                Log.i("IkkyeeBoot", BootStage.valueOf(stage).name());
            } catch (IllegalArgumentException | NullPointerException ignored) {
                // Never log arbitrary script contents, URLs, credentials or errors.
            }
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (bridge != null && (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            bridge.getWebView().addJavascriptInterface(new BootDiagnostics(), "IkkyeeBoot");
            boolean nativeListener = bridge.getPlugin("App") != null
                && bridge.getPlugin("App").getMethods().stream().anyMatch(method -> method.getName().equals("addListener"));
            Log.i("IkkyeeBoot", "NATIVE_LISTENER " + nativeListener);
        }
    }
}
