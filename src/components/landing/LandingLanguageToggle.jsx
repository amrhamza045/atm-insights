import { useLanguage } from "@/components/LanguageProvider";

export default function LandingLanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const next = language === "ar" ? "en" : "ar";
  return (
    <button
      type="button"
      data-no-translate
      onClick={() => setLanguage(next)}
      aria-label={next === "ar" ? "التبديل إلى العربية" : "Switch to English"}
      title={next === "ar" ? "العربية" : "English"}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[hsl(var(--landing-ivory)/0.6)] text-lg leading-none text-white shadow-md shadow-black/25 hover:shadow-lg hover:bg-[hsl(var(--landing-ivory)/0.12)] transition-all duration-300"
    >
      {language === "ar" ? "AR" : "EN"}
    </button>
  );
}