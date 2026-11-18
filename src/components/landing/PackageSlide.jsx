import React from "react";
import { ImageIcon } from "lucide-react";
import { resolvePackageMedia } from "./packageImages";

// Media slot: uses pkg.cover_video_url / pkg.cover_image_url once supplied, else a placeholder.
function Media({ pkg }) {
  const { image, video } = resolvePackageMedia(pkg);
  if (video) {
    return <video src={video} poster={image} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" />;
  }
  if (image) {
    return <img src={image} alt={pkg.name} className="absolute inset-0 w-full h-full object-cover" />;
  }
  return (
    <div className="absolute inset-0 bg-[hsl(var(--landing-navy))] flex items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-[hsl(var(--landing-ivory)/0.35)]">
        <ImageIcon className="w-10 h-10" />
        <span className="text-xs tracking-[0.3em] uppercase">Media coming soon · 16:9</span>
      </div>
    </div>
  );
}

export default function PackageSlide({ pkg, onOpen }) {
  return (
    <button onClick={() => onOpen(pkg)} className="group relative block w-full aspect-[4/5] sm:aspect-video overflow-hidden rounded-3xl text-left">
      <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
        <Media pkg={pkg} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent transition-opacity duration-700 group-hover:opacity-0" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/75 to-black/50 opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
      <div className="relative h-full flex flex-col justify-end p-8 md:p-14">
        {pkg.package_category && <p className="text-xs tracking-[0.3em] uppercase text-[hsl(var(--landing-ivory)/0.8)] group-hover:text-[hsl(var(--landing-gold))] transition-colors">{pkg.package_category}</p>}
        <h3 className="font-heading mt-3 text-4xl md:text-6xl font-medium text-[hsl(var(--landing-ivory))] transition-colors duration-500">{pkg.name}</h3>
        <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-700">
          <p className="overflow-hidden max-w-2xl text-lg text-[hsl(var(--landing-ivory)/0.9)] opacity-0 group-hover:opacity-100 group-hover:mt-5 transition-all duration-700 line-clamp-5">{pkg.description}</p>
        </div>
      </div>
    </button>
  );
}