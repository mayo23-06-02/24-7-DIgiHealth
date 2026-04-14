import { useState } from 'react';
import { BiFileBlank, BiLoaderAlt } from 'react-icons/bi';
import { toast } from 'react-hot-toast';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';

interface PDFReportButtonProps {
  conversationId: string;
}

export default function PDFReportButton({ conversationId }: PDFReportButtonProps) {
  const [loading, setLoading] = useState(false);
  const { isOffline } = useOfflineQueue();

  const handleDownload = async () => {
    if (isOffline) {
      toast.error("You must be online to generate a PDF report.", { id: 'pdf-offline' });
      return;
    }

    setLoading(true);
    const downloadToastId = toast.loading("Generating comprehensive clinical report...");

    try {
      const response = await fetch(`/api/chat/report/${conversationId}`);
      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'Clinical_Report.pdf';
      if (contentDisposition) {
         const match = contentDisposition.match(/filename="(.+)"/);
         if (match && match[1]) filename = match[1];
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Report downloaded successfully", { id: downloadToastId });
    } catch (error) {
      console.error(error);
      toast.error("Failed to download PDF report", { id: downloadToastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      title="Download Clinical Report"
      className="w-10 h-10 rounded-xl bg-slate-100/50 border border-slate-200 text-slate-500 flex items-center justify-center hover:text-primary hover:border-primary/30 transition-all shadow-sm active:scale-95 disabled:opacity-50 group"
    >
      {loading ? (
        <BiLoaderAlt className="animate-spin" size={18} />
      ) : (
        <BiFileBlank className="group-hover:text-primary" size={20} />
      )}
    </button>
  );
}
