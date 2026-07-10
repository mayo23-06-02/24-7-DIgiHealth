export default function ConnectionStatus({ 
  isConnected, 
  connectionState 
}: { 
  isConnected: boolean; 
  connectionState: string;
}) {
  const statusConfig = {
    connected: { color: 'bg-emerald-500', text: 'Connected' },
    connecting: { color: 'bg-amber-500', text: 'Connecting...' },
    disconnected: { color: 'bg-rose-500', text: 'Disconnected' },
    failed: { color: 'bg-rose-600', text: 'Connection Failed' },
    initializing: { color: 'bg-slate-400', text: 'Initializing...' },
  };

  const config = statusConfig[connectionState as keyof typeof statusConfig] || statusConfig.disconnected;

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={`w-2 h-2 rounded-full ${config.color} ${isConnected ? 'animate-pulse' : ''}`} />
      <span className="text-slate-600">{config.text}</span>
    </div>
  );
}
