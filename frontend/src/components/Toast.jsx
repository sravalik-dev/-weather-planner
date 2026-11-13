import { useEffect } from "react";
import "../styles/Toast.css";

/* Small non-blocking notification. Renders nothing when `message` is empty.
   Auto-dismisses after `duration` ms and can be closed with the button. */
function Toast({ message, onClose, duration = 4500, tone = "success" }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className={`toast toast-${tone}`} role="status" aria-live="polite">
      <span aria-hidden="true">{tone === "success" ? "✓" : "ℹ"}</span>
      <p>{message}</p>
      <button type="button" onClick={onClose} aria-label="Dismiss notification">
        ✕
      </button>
    </div>
  );
}

export default Toast;
