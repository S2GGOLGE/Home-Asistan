using Microsoft.AspNetCore.SignalR;

namespace Jarvis.Backend.DeviceMonitoring;

public sealed class DeviceStatusHub : Hub
{
    public Task SubscribeToHome(Guid homeId)
    {
        return Groups.AddToGroupAsync(Context.ConnectionId, $"home:{homeId}");
    }

    public Task UnsubscribeFromHome(Guid homeId)
    {
        return Groups.RemoveFromGroupAsync(Context.ConnectionId, $"home:{homeId}");
    }
}

