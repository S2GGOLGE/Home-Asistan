package com.example.home;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.POST;

public interface ApiService {
    @POST("api/DeviceRegistration")
    Call<DeviceModels> addDevice(@Body DeviceModels model);
}