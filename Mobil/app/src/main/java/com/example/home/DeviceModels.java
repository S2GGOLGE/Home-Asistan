package com.example.home;

import com.google.gson.annotations.SerializedName;

public class DeviceModels {
    @SerializedName("DeviceName")
    private String deviceName;

    @SerializedName("DeviceVersion")
    private String deviceVersion;

    @SerializedName("Device_Status")
    private boolean deviceStatus;

    public DeviceModels(String deviceName, String deviceVersion, boolean deviceStatus) {
        this.deviceName = deviceName;
        this.deviceVersion = deviceVersion;
        this.deviceStatus = deviceStatus;
    }

    public String getDeviceName() { return deviceName; }
    public String getDeviceVersion() { return deviceVersion; }
    public boolean isDeviceStatus() { return deviceStatus; }
}