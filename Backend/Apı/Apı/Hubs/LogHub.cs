using Microsoft.AspNetCore.SignalR;

namespace Api.Hubs
{
    /// <summary>
    /// Gerçek zamanlı log akışı için SignalR Hub.
    /// Frontend'den bağlantı: new HubConnection("/hubs/logs")
    /// </summary>
    public class LogHub : Hub
    {
        /// <summary>Admin paneli log akışına abone olur.</summary>
        public async Task Subscribe()
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, "LogViewers");
        }

        /// <summary>Log akışından çıkar.</summary>
        public async Task Unsubscribe()
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, "LogViewers");
        }
    }
}
