// Basic formatting utilities for displaying data

/**
 * Format a date string or number into a readable date format
 */
export const formatDate = (date: string | number | Date | null | undefined): string => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    console.error('Date formatting error:', e);
    return 'Invalid date';
  }
};

/**
 * Format a number as currency
 */
export const formatCurrency = (amount: number | string | null | undefined): string => {
  if (amount === null || amount === undefined) return 'N/A';
  
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return 'N/A';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(numAmount);
};

/**
 * Format a string with proper capitalization
 */
export const formatTitle = (text: string | null | undefined): string => {
  if (!text) return '';
  
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Truncate a long string with ellipsis
 */
export const truncateText = (text: string | null | undefined, maxLength: number = 50): string => {
  if (!text) return '';
  
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

/**
 * Export a data array to Excel file
 */
export const exportToExcel = (data: any[], filename: string = 'export'): void => {
  // This is a placeholder - in a real implementation, you'd use a library like xlsx
  console.log('Exporting data to Excel:', data, filename);
  alert('Excel export functionality will be implemented soon.');
};
