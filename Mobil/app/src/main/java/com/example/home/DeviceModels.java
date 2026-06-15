package com.example.home;

import com.google.gson.annotations.SerializedName;

public class DeviceModels {

    @SerializedName("Name")
    private String name;

    @SerializedName("Type")
    private String type;

    @SerializedName("Status")
    private boolean status;

    @SerializedName("UserId")
    private int userId;

    @SerializedName("Feature")
    private String feature;

    public DeviceModels(String name, String type, boolean status, int userId, String feature) {
        this.name = name;
        this.type = type;
        this.status = status;
        this.userId = userId;
        this.feature = feature;
    }

    public String getName() { return name; }
    public String getType() { return type; }
    public boolean isStatus() { return status; }
    public int getUserId() { return userId; }
    public String getFeature() { return feature; }
}