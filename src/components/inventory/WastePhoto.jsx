import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
export default function WastePhoto({ uri, className = "w-14 h-14 object-cover rounded border flex-shrink-0" }) {
  const { data: url } = useQuery({ queryKey: ['waste-photo', uri], queryFn: async () => /^https?:\/\//.test(uri) ? uri : (await base44.integrations.Core.CreateFileSignedUrl({ file_uri: uri, expires_in: 300 })).signed_url, staleTime: 240000 });
  if (!url) return <span className="text-xs text-muted-foreground">Loading photo…</span>;
  return <a href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt="Waste" className={className} /></a>;
}