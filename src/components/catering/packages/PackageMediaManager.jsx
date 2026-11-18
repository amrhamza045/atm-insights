import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Image as ImageIcon,
  Video,
  Upload,
  Trash2,
  ArrowUp,
  ArrowDown,
  Star,
  Plus,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  CURATED_PACKAGE_IMAGES,
  CURATED_PACKAGE_VIDEOS,
  resolvePackageMedia,
} from "@/components/landing/packageImages";

export default function PackageMediaManager({ form, onChange }) {
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [uploadingTarget, setUploadingTarget] = useState(null);
  const [newGalleryUrl, setNewGalleryUrl] = useState("");
  const [newGalleryType, setNewGalleryType] = useState("image");
  const [newGalleryCaption, setNewGalleryCaption] = useState("");

  const resolved = resolvePackageMedia(form);
  const gallery = Array.isArray(form.media_gallery) ? form.media_gallery : [];

  const handleUploadFile = async (file, target) => {
    if (!file) return;
    setUploadingTarget(target);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      if (target === "cover_image") {
        onChange("cover_image_url", file_url);
        toast.success("Cover image uploaded");
      } else if (target === "cover_video") {
        onChange("cover_video_url", file_url);
        toast.success("Cover video uploaded");
      } else if (target === "gallery") {
        const isVideo = file.type.startsWith("video/");
        onChange("media_gallery", [
          ...gallery,
          { type: isVideo ? "video" : "image", url: file_url, caption: file.name.replace(/\.[^.]+$/, "") },
        ]);
        toast.success("Added media to gallery");
      }
    } catch (e) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploadingTarget(null);
    }
  };

  const addGalleryUrl = () => {
    const url = newGalleryUrl.trim();
    if (!url) return;
    onChange("media_gallery", [
      ...gallery,
      { type: newGalleryType, url, caption: newGalleryCaption.trim() },
    ]);
    setNewGalleryUrl("");
    setNewGalleryCaption("");
  };

  const moveGalleryItem = (index, delta) => {
    const nextIdx = index + delta;
    if (nextIdx < 0 || nextIdx >= gallery.length) return;
    const copy = [...gallery];
    const [moved] = copy.splice(index, 1);
    copy.splice(nextIdx, 0, moved);
    onChange("media_gallery", copy);
  };

  const removeGalleryItem = (index) => {
    onChange(
      "media_gallery",
      gallery.filter((_, i) => i !== index)
    );
  };

  const promoteToCover = (item) => {
    if (item.type === "video") {
      onChange("cover_video_url", item.url);
      toast.success("Set as cover video");
    } else {
      onChange("cover_image_url", item.url);
      toast.success("Set as cover image");
    }
  };

  return (
    <div className="space-y-5 rounded-xl border border-[#e5dfd2] bg-[#f7f5ef]/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-[#18314b] flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#b29a62]" />
            Landing Page Media (Cover Image, Cover Video & Gallery)
          </h4>
          <p className="text-xs text-slate-500">
            Configure the visuals visitors see for this package on the public landing page and catalog.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {resolved.image ? (
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-xs">
              Cover Image Active
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-amber-700 border-amber-300">
              Missing Cover Image
            </Badge>
          )}
          {resolved.video ? (
            <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100 text-xs">
              Cover Video Active
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-slate-500">
              No Cover Video
            </Badge>
          )}
        </div>
      </div>

      {/* Live 16:9 Landing Page Slide Preview */}
      <div className="grid lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-5 space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Live Landing Page Card Preview (16:9)
          </Label>
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[#18314b] shadow-md border border-[#d9d3c6]">
            {resolved.video ? (
              <video
                src={resolved.video}
                poster={resolved.image}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : resolved.image ? (
              <img
                src={resolved.image}
                alt={form.name || "Package preview"}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/40">
                <ImageIcon className="w-8 h-8" />
                <span className="text-[11px] tracking-[0.25em] uppercase">Media coming soon · 16:9</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
            <div className="relative h-full flex flex-col justify-end p-5 text-white">
              {form.package_category && (
                <p className="text-[10px] tracking-[0.25em] uppercase text-[#b29a62] font-semibold">
                  {form.package_category}
                </p>
              )}
              <h3 className="font-heading text-xl font-medium mt-1">
                {form.name || "Untitled Package"}
              </h3>
              {form.description && (
                <p className="text-xs text-white/80 line-clamp-2 mt-1">{form.description}</p>
              )}
            </div>
          </div>
          {!form.cover_image_url && resolved.image && (
            <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 border border-slate-200 text-xs">
              <span className="text-slate-600">Using default Rosemary preset media</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => {
                  onChange("cover_image_url", resolved.image);
                  if (resolved.video && !form.cover_video_url) {
                    onChange("cover_video_url", resolved.video);
                  }
                  toast.success("Pinned preset media to this package record");
                }}
              >
                Save preset to package
              </Button>
            </div>
          )}
        </div>

        {/* Cover Image & Cover Video Controls */}
        <div className="lg:col-span-7 space-y-4">
          {/* Cover Image */}
          <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <ImageIcon className="w-3.5 h-3.5 text-[#b29a62]" />
                Cover Image (Poster & Card Photo)
              </Label>
              {form.cover_image_url && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-red-600"
                  onClick={() => onChange("cover_image_url", "")}
                >
                  Clear custom image
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                value={form.cover_image_url || ""}
                onChange={(e) => onChange("cover_image_url", e.target.value)}
                placeholder={resolved.image || "https://... or upload an image"}
                className="flex-1 min-w-[200px] h-8 text-xs"
              />
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUploadFile(e.target.files?.[0], "cover_image")}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                disabled={uploadingTarget === "cover_image"}
                onClick={() => imageInputRef.current?.click()}
              >
                {uploadingTarget === "cover_image" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                Upload Photo
              </Button>
              <Select onValueChange={(v) => onChange("cover_image_url", v)}>
                <SelectTrigger className="w-44 h-8 text-xs">
                  <SelectValue placeholder="Pick preset photo…" />
                </SelectTrigger>
                <SelectContent>
                  {CURATED_PACKAGE_IMAGES.map((item) => (
                    <SelectItem key={item.url} value={item.url}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cover Video */}
          <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <Video className="w-3.5 h-3.5 text-[#b29a62]" />
                Cover Video (Autoplay Loop on Landing Page)
              </Label>
              {form.cover_video_url && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-red-600"
                  onClick={() => onChange("cover_video_url", "")}
                >
                  Clear custom video
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                value={form.cover_video_url || ""}
                onChange={(e) => onChange("cover_video_url", e.target.value)}
                placeholder={resolved.video || "https://... (.mp4) or upload a video"}
                className="flex-1 min-w-[200px] h-8 text-xs"
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => handleUploadFile(e.target.files?.[0], "cover_video")}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                disabled={uploadingTarget === "cover_video"}
                onClick={() => videoInputRef.current?.click()}
              >
                {uploadingTarget === "cover_video" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                Upload Video
              </Button>
              <Select onValueChange={(v) => onChange("cover_video_url", v)}>
                <SelectTrigger className="w-44 h-8 text-xs">
                  <SelectValue placeholder="Pick preset video…" />
                </SelectTrigger>
                <SelectContent>
                  {CURATED_PACKAGE_VIDEOS.map((item) => (
                    <SelectItem key={item.url} value={item.url}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Additional Gallery Items */}
          <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <Label className="text-xs font-semibold text-slate-800">
                  Additional Package Gallery ({gallery.length})
                </Label>
                <p className="text-[11px] text-slate-500">
                  Extra photos and videos shown inside the package details view on the landing page.
                </p>
              </div>
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => handleUploadFile(e.target.files?.[0], "gallery")}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                disabled={uploadingTarget === "gallery"}
                onClick={() => galleryInputRef.current?.click()}
              >
                {uploadingTarget === "gallery" ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Upload className="w-3 h-3" />
                )}
                Upload to Gallery
              </Button>
            </div>

            {gallery.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-2">
                {gallery.map((item, idx) => (
                  <div
                    key={`${item.url}-${idx}`}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 bg-slate-50/70"
                  >
                    <div className="h-12 w-16 rounded overflow-hidden bg-slate-900 shrink-0">
                      {item.type === "video" ? (
                        <video src={item.url} muted className="w-full h-full object-cover" />
                      ) : (
                        <img src={item.url} alt={item.caption || ""} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-800 truncate">
                        {item.caption || (item.type === "video" ? "Gallery Video" : "Gallery Photo")}
                      </p>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {item.type || "image"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        disabled={idx === 0}
                        onClick={() => moveGalleryItem(idx, -1)}
                        title="Move earlier"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        disabled={idx === gallery.length - 1}
                        onClick={() => moveGalleryItem(idx, 1)}
                        title="Move later"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-amber-600"
                        onClick={() => promoteToCover(item)}
                        title="Use as primary cover"
                      >
                        <Star className="w-3 h-3" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-red-500"
                        onClick={() => removeGalleryItem(idx)}
                        title="Remove from gallery"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Select value={newGalleryType} onValueChange={setNewGalleryType}>
                <SelectTrigger className="w-24 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={newGalleryUrl}
                onChange={(e) => setNewGalleryUrl(e.target.value)}
                placeholder="Paste image or video URL…"
                className="flex-1 min-w-[160px] h-8 text-xs"
              />
              <Input
                value={newGalleryCaption}
                onChange={(e) => setNewGalleryCaption(e.target.value)}
                placeholder="Caption (optional)"
                className="w-36 h-8 text-xs"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1"
                onClick={addGalleryUrl}
                disabled={!newGalleryUrl.trim()}
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}