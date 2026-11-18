/**
 * Formats a number as currency with thousand separators
 * @param {number} amount - The amount to format
 * @param {boolean} includeCurrency - Whether to include "EGP" suffix (default: true)
 * @returns {string} Formatted currency string (e.g., "1,234.56 EGP")
 */
export const formatCurrency = (amount, includeCurrency = true) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return includeCurrency ? "0.00 EGP" : "0.00";
  }
  
  const formatted = Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return includeCurrency ? `${formatted} EGP` : formatted;
};