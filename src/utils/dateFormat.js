import { format } from 'date-fns';

// Format date from YYYY-MM-DD to DD/MM/YYYY
export const formatDateToDMY = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return format(date, 'dd/MM/yyyy');
  } catch (error) {
    return dateString;
  }
};

// Format date from DD/MM/YYYY to YYYY-MM-DD (for input fields)
export const formatDateToYMD = (dateString) => {
  if (!dateString) return '';
  try {
    const [day, month, year] = dateString.split('/');
    return `${year}-${month}-${day}`;
  } catch (error) {
    return dateString;
  }
};

// Get current date in YYYY-MM-DD format
export const getCurrentDateYMD = () => {
  return format(new Date(), 'yyyy-MM-dd');
};

// Get current date in DD/MM/YYYY format
export const getCurrentDateDMY = () => {
  return format(new Date(), 'dd/MM/yyyy');
};

// Format date for display (DD/MM/YYYY)
export const displayDate = (dateString) => {
  if (!dateString) return '';
  // Check if date is already in DD/MM/YYYY format
  if (dateString.includes('/')) return dateString;
  // Convert from YYYY-MM-DD to DD/MM/YYYY
  return formatDateToDMY(dateString);
};