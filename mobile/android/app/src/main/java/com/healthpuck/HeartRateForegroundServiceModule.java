package com.healthpuck;

import android.content.Intent;
import android.app.Activity;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

public class HeartRateForegroundServiceModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "HeartRateForegroundService";
    private ReactApplicationContext reactContext;

    public HeartRateForegroundServiceModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void startService(Promise promise) {
        try {
            Activity currentActivity = getCurrentActivity();
            if (currentActivity == null) {
                promise.reject("NO_ACTIVITY", "No current activity");
                return;
            }

            Intent serviceIntent = new Intent(reactContext, HeartRateForegroundService.class);
            currentActivity.startForegroundService(serviceIntent);
            promise.resolve(null);
        } catch (Exception e) {
            promise.reject("START_SERVICE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void stopService(Promise promise) {
        try {
            Intent serviceIntent = new Intent(reactContext, HeartRateForegroundService.class);
            reactContext.stopService(serviceIntent);
            promise.resolve(null);
        } catch (Exception e) {
            promise.reject("STOP_SERVICE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void updateNotification(String heartRate, Promise promise) {
        try {
            Intent serviceIntent = new Intent(reactContext, HeartRateForegroundService.class);
            serviceIntent.putExtra("heartRate", heartRate);
            serviceIntent.setAction("UPDATE_NOTIFICATION");
            reactContext.startService(serviceIntent);
            promise.resolve(null);
        } catch (Exception e) {
            promise.reject("UPDATE_NOTIFICATION_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void isServiceRunning(Promise promise) {
        // This is a simplified check - in production you might want to track service state
        promise.resolve(false);
    }
}

