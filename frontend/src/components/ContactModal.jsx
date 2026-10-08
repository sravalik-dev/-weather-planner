function ContactModal({
  showContact,
  setShowContact,
}) {
  if (!showContact) {
    return null;
  }

  return (
    <div
      className="info-overlay"
      onClick={() =>
        setShowContact(false)
      }
    >
      <div
        className="info-modal contact-modal"
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        <button
          className="modal-close"
          onClick={() =>
            setShowContact(false)
          }
        >
          ×
        </button>

        <div className="modal-icon">
          📞
        </div>

        <h2>
          Contact Us
        </h2>

        <p>
          Have a question, suggestion, or
          feedback? We'd love to hear from you.
        </p>

        <div className="contact-details">
          <div className="contact-item">
            <span>📧</span>

            <div>
              <small>Email</small>

              <a href="mailto:weathervsks@gmail.com">
                weathervsks@gmail.com
              </a>
            </div>
          </div>

          <div className="contact-item">
            <span>📱</span>

            <div>
              <small>Phone</small>

              <a href="tel:9095050274">
                9095050274
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContactModal;