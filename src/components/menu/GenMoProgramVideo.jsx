import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";

export default function GenMoProgramVideo() {
  const location = useLocation();
  const [isMinimized, setIsMinimized] = useState(false);
  const [videoIndex, setVideoIndex] = useState(0);
  const [playedVideos, setPlayedVideos] = useState([]);
  const [isClosed, setIsClosed] = useState(false);
  
  const videos = [
    { src: "https://media.base44.com/videos/public/69709def3c5445d198d66244/f6119c69b_generated_video.mp4", title: "البرنامج كامل" },
    { src: "https://media.base44.com/videos/public/69709def3c5445d198d66244/002ec7797_generated_video.mp4", title: "الشبكة والتوسع" }
  ];

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me()
  });

  const { data: client } = useQuery({
    queryKey: ["client", currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      const clients = await base44.entities.Client.filter({ email: currentUser.email });
      return clients[0] || null;
    },
    enabled: !!currentUser?.email
  });

  // Initialize from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('genmo_played_videos');
    if (stored) {
      setPlayedVideos(JSON.parse(stored));
    }
    const closed = sessionStorage.getItem('genmo_closed');
    if (closed === 'true') {
      setIsClosed(true);
    }
  }, []);

  // Clean up old instances on page load
  useEffect(() => {
    const allVideoInstances = document.querySelectorAll('[data-genmo-video]');
    allVideoInstances.forEach((instance, index) => {
      if (index > 0) {
        instance.remove();
      }
    });
  }, []);

  const handleShareWhatsApp = () => {
    const registrationLink = `${window.location.origin}/Register${client?.referral_code ? `?referrer=${client.referral_code}` : ''}`;
    const message = `🎥 شوف برنامج GenMo الكاش باك بتاعنا! 💰\n\n${client?.referral_code ? `كود الدعوة بتاعي: ${client.referral_code}\n` : ''}سجل الآن واكسب كاش باك على كل طلب:\n${registrationLink}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Only show on Menu page
  if (isClosed || !location.pathname.includes('/Menu')) {
    return null;
  }

  return (
    <div
      className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] bg-black rounded-xl overflow-hidden shadow-2xl border-2 border-amber-500 transition-all duration-300 ${
        isMinimized ? "w-24 h-24" : "w-80 md:w-96"
      }`}
      data-genmo-video
    >
      {/* Video Container */}
      <div className={`${isMinimized ? "hidden" : "block"}`}>
        <video
          key={videoIndex}
          src={videos[videoIndex].src}
          controls
          controlsList="nodownload"
          className="w-full h-auto bg-black"
          style={{ maxHeight: "400px" }}
          onEnded={() => {
            const updated = [...playedVideos, videoIndex];
            setPlayedVideos(updated);
            sessionStorage.setItem('genmo_played_videos', JSON.stringify(updated));

            // Find next unplayed video
            let nextIndex = (videoIndex + 1) % videos.length;
            let attempts = 0;
            while (updated.includes(nextIndex) && attempts < videos.length) {
              nextIndex = (nextIndex + 1) % videos.length;
              attempts++;
            }

            // If all videos played, restart
            if (attempts === videos.length) {
              sessionStorage.setItem('genmo_played_videos', JSON.stringify([]));
              setPlayedVideos([]);
              nextIndex = 0;
            }

            setVideoIndex(nextIndex);
          }}
        >
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Minimized Preview */}
      {isMinimized && (
        <div className="w-full h-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center cursor-pointer hover:from-amber-600 hover:to-orange-700 transition-all"
          onClick={() => setIsMinimized(false)}
        >
          <span className="text-white font-bold text-xs text-center px-1">GenMo Video</span>
        </div>
      )}

      {/* Controls */}
      <div className="bg-slate-900 px-3 py-2 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white truncate">{videos[videoIndex].title}</span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-white hover:bg-slate-700"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? "+" : "−"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-white hover:bg-red-600"
              onClick={() => {
                sessionStorage.setItem('genmo_closed', 'true');
                setIsClosed(true);
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {!isMinimized && (
          <div className="flex gap-1 justify-center">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-white hover:bg-slate-700 text-xs"
              onClick={() => setVideoIndex(0)}
            >
              <ChevronLeft className="w-3 h-3" />
            </Button>
            <div className="flex gap-1">
              {videos.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setVideoIndex(idx)}
                  className={`w-2 h-2 rounded-full transition ${
                    idx === videoIndex ? "bg-amber-500" : "bg-slate-600"
                  }`}
                />
              ))}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-white hover:bg-slate-700 text-xs"
              onClick={() => setVideoIndex((prev) => (prev + 1) % videos.length)}
            >
              <ChevronRight className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-white hover:bg-green-600 text-xs"
              onClick={handleShareWhatsApp}
              title="Share on WhatsApp"
            >
              <MessageCircle className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}