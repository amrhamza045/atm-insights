// Global numeral style preference: "english" (0-9) or "arabic" (٠-٩)

const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
const STORAGE_KEY = "numeral_style";
export const NUMERAL_EVENT = "numeralstylechange";

export const getNumeralStyle = () => localStorage.getItem(STORAGE_KEY) || "english";

export const setNumeralStyle = (style) => {
  localStorage.setItem(STORAGE_KEY, style);
  window.dispatchEvent(new CustomEvent(NUMERAL_EVENT, { detail: style }));
};

export const toArabicDigits = (text) => text.replace(/[0-9]/g, (d) => AR_DIGITS[+d]);

export const toEnglishDigits = (text) => text.replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));

export const convertDigits = (text, style) =>
  style === "arabic" ? toArabicDigits(text) : toEnglishDigits(text);