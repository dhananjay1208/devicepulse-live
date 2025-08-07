import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Zap, Wifi, WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DeviceMessage {
  id: number;
  received_at: string;
  gsrno: string;
  gmacid: string;
  device_state: string;
  bat_stat: string;
  ts: string;
}

const DeviceDashboard = () => {
  const [devices, setDevices] = useState<DeviceMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('device_messages')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setDevices(data || []);
    } catch (error) {
      toast({
        title: "Error fetching device data",
        description: "Failed to load device information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();

    // Set up real-time subscription
    const channel = supabase
      .channel('device-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'device_messages'
        },
        (payload) => {
          const newDevice = payload.new as DeviceMessage;
          setDevices(prev => [newDevice, ...prev.slice(0, 99)]);
          toast({
            title: "New device data received",
            description: `Updated data for device ${newDevice.gsrno}`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const getDeviceStats = () => {
    const uniqueDevices = new Map();
    
    // Get latest state for each unique device (by MAC ID)
    devices.forEach(device => {
      if (!uniqueDevices.has(device.gmacid) || 
          new Date(device.received_at) > new Date(uniqueDevices.get(device.gmacid).received_at)) {
        uniqueDevices.set(device.gmacid, device);
      }
    });

    const deviceArray = Array.from(uniqueDevices.values());
    const onlineDevices = deviceArray.filter(d => d.device_state.toLowerCase().includes('online') || d.device_state === '1');
    const totalDevices = deviceArray.length;
    
    // Calculate average battery percentage
    const batteryValues = deviceArray
      .map(d => {
        const batStr = d.bat_stat.toLowerCase();
        if (batStr.includes('%')) {
          return parseInt(batStr.replace('%', ''));
        }
        // If it's a decimal like 0.85, convert to percentage
        const batNum = parseFloat(d.bat_stat);
        if (batNum <= 1) return Math.round(batNum * 100);
        return batNum;
      })
      .filter(val => !isNaN(val));
    
    const avgBattery = batteryValues.length > 0 
      ? Math.round(batteryValues.reduce((a, b) => a + b, 0) / batteryValues.length)
      : 0;

    return {
      totalDevices,
      onlineDevices: onlineDevices.length,
      offlineDevices: totalDevices - onlineDevices.length,
      avgBattery
    };
  };

  const stats = getDeviceStats();

  const getStatusBadge = (deviceState: string) => {
    const state = deviceState.toLowerCase();
    if (state.includes('online') || state === '1') {
      return <Badge className="bg-success text-success-foreground">Online</Badge>;
    }
    return <Badge variant="secondary">Offline</Badge>;
  };

  const getBatteryColor = (batStat: string) => {
    const batStr = batStat.toLowerCase();
    let percentage = 0;
    
    if (batStr.includes('%')) {
      percentage = parseInt(batStr.replace('%', ''));
    } else {
      const batNum = parseFloat(batStat);
      percentage = batNum <= 1 ? Math.round(batNum * 100) : batNum;
    }

    if (percentage > 50) return "text-success";
    if (percentage > 20) return "text-warning";
    return "text-destructive";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Device Pulse
          </h1>
          <p className="text-muted-foreground mt-2">
            Real-time device monitoring and status dashboard
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-card shadow-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDevices}</div>
              <p className="text-xs text-muted-foreground">
                Active in network
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Online</CardTitle>
              <Wifi className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.onlineDevices}</div>
              <p className="text-xs text-muted-foreground">
                Currently connected
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Offline</CardTitle>
              <WifiOff className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">{stats.offlineDevices}</div>
              <p className="text-xs text-muted-foreground">
                Disconnected devices
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Battery</CardTitle>
              <Zap className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.avgBattery}%</div>
              <p className="text-xs text-muted-foreground">
                Fleet average
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Device Data Table */}
        <Card className="bg-gradient-card shadow-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Latest Device Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Timestamp</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Serial Number</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">MAC ID</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Battery</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Device Time</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((device) => (
                    <tr key={device.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="p-3 text-sm">
                        {new Date(device.received_at).toLocaleString()}
                      </td>
                      <td className="p-3 text-sm font-mono">{device.gsrno}</td>
                      <td className="p-3 text-sm font-mono text-primary">{device.gmacid}</td>
                      <td className="p-3 text-sm">
                        {getStatusBadge(device.device_state)}
                      </td>
                      <td className={`p-3 text-sm font-medium ${getBatteryColor(device.bat_stat)}`}>
                        {device.bat_stat}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">{device.ts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {devices.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No device data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DeviceDashboard;