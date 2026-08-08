import StatusDot from "@/components/ui/StatusDot";

const statusConfig: Record<
  string,
  { status: "online" | "offline" | "syncing" | "busy"; text: string }
> = {
  connected: { status: "online", text: "Connected" },
  connecting: { status: "syncing", text: "Connecting..." },
  disconnected: { status: "offline", text: "Disconnected" },
  failed: { status: "busy", text: "Connection Failed" },
  initializing: { status: "offline", text: "Initializing..." },
};

export default function ConnectionStatus({
  isConnected,
  connectionState,
}: {
  isConnected: boolean;
  connectionState: string;
}) {
  const config = statusConfig[connectionState] || statusConfig.disconnected;

  return <StatusDot status={config.status} label={config.text} className="text-xs" />;
}
