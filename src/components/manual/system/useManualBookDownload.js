import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { SYSTEM_CHAPTERS } from "./systemChapters";
import { HOWTO_CHAPTERS } from "./howToChapters";
import { downloadManualBook } from "./SystemManualPdfExporter";

const BOOKS = {
  reference: { subtitle: "Reference Manual", filename: "User-Manual-Reference.pdf", parts: [{ label: "Reference", chapters: SYSTEM_CHAPTERS }] },
  howto: { subtitle: "How-To Guide", filename: "User-Manual-HowTo.pdf", parts: [{ label: "How-To", chapters: HOWTO_CHAPTERS }] },
  all: {
    subtitle: "Complete User Manual",
    filename: "User-Manual-Complete.pdf",
    parts: [
      { label: "Reference", chapters: SYSTEM_CHAPTERS },
      { label: "How-To Guides", chapters: HOWTO_CHAPTERS },
    ],
  },
};

// Shared by the SystemManual header and the Support → User Manual tab.
export default function useManualBookDownload() {
  const [busy, setBusy] = useState(null);

  const { data: brand } = useQuery({
    queryKey: ["restaurantInfo"],
    queryFn: async () => {
      const info = await base44.entities.RestaurantInfo.list();
      return info[0] || null;
    },
  });

  const download = async (kind) => {
    const book = BOOKS[kind];
    if (!book || busy) return;
    setBusy(kind);
    try {
      await downloadManualBook({ ...book, brand: brand || {} });
    } catch (e) {
      toast.error("Could not generate the PDF. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  return { download, busy };
}