import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Toast configuration
export const toastConfig = {
  position: "top-right",
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: "light",
};

// Success toast
export const showSuccess = (message, options = {}) => {
  toast.success(message, { ...toastConfig, ...options });
};

// Error toast
export const showError = (message, options = {}) => {
  toast.error(message, { ...toastConfig, ...options });
};

// Info toast
export const showInfo = (message, options = {}) => {
  toast.info(message, { ...toastConfig, ...options });
};

// Warning toast
export const showWarning = (message, options = {}) => {
  toast.warning(message, { ...toastConfig, ...options });
};

// Custom toast
export const showCustom = (message, options = {}) => {
  toast(message, { ...toastConfig, ...options });
};

// Dismiss all toasts
export const dismissAllToasts = () => {
  toast.dismiss();
};

// Confirmation dialog with custom modal (Advanced)
export const showConfirm = (message, onConfirm, onCancel = null, options = {}) => {
  // Create a custom toast with buttons
  const toastId = toast.info(
    <div>
      <p className="mb-2">{message}</p>
      <div className="d-flex gap-2 mt-2">
        <button 
          className="btn btn-sm btn-success" 
          onClick={() => {
            if (onConfirm) onConfirm();
            toast.dismiss(toastId);
          }}
        >
          Yes, Confirm
        </button>
        <button 
          className="btn btn-sm btn-danger" 
          onClick={() => {
            if (onCancel) onCancel();
            toast.dismiss(toastId);
          }}
        >
          Cancel
        </button>
      </div>
    </div>,
    { 
      ...toastConfig, 
      autoClose: false,
      closeOnClick: false,
      draggable: false,
      ...options 
    }
  );
  return toastId;
};

// Simple confirmation using window.confirm (Fallback)
export const showConfirmSimple = (message, onConfirm, onCancel = null) => {
  if (window.confirm(message)) {
    if (onConfirm) onConfirm();
    return true;
  } else {
    if (onCancel) onCancel();
    return false;
  }
};