'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function QRModal({ qr, status, connectedPhone, connectedName, onClose }) {
  const [qrImage, setQrImage] = useState(null);

  useEffect(() => {
    if (qr) {
      QRCode.toDataURL(qr, {
        width: 240,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      }).then(setQrImage);
    } else {
      setQrImage(null);
    }
  }, [qr]);

  const isConnected = status === 'connected';

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card">
        {/* Logo */}
        <div style={{ marginBottom: 20 }}>
          <img
            src="https://mediasoftbd.com/wp-content/uploads/2025/06/mediasoft-logo.png"
            alt="Mediasoft"
            style={{ height: 36, objectFit: 'contain' }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        </div>

        {isConnected ? (
          <>
            <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
            <div className="modal-title">WhatsApp Connected!</div>
            <div className="modal-subtitle">
              Your WhatsApp account is linked and ready.
            </div>
            {connectedPhone && (
              <div className="connected-badge" style={{ justifyContent: 'center', marginBottom: 20 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#128C7E">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                {connectedName && <strong>{connectedName}</strong>}
                {connectedPhone && <span>· +{connectedPhone}</span>}
              </div>
            )}
            <button className="btn-primary" onClick={onClose} style={{ width: 'auto', padding: '12px 32px' }}>
              Go to Messenger
            </button>
          </>
        ) : (
          <>
            <div className="modal-title">Link WhatsApp</div>
            <div className="modal-subtitle">
              Scan this QR code with your WhatsApp app to connect your account.
            </div>

            <div className="qr-box">
              {qrImage ? (
                <img src={qrImage} alt="WhatsApp QR Code" />
              ) : (
                <div className="qr-loading">
                  <div className="spinner" />
                  <span style={{ fontSize: 13 }}>Generating QR…</span>
                </div>
              )}
            </div>

            <ol className="modal-steps">
              <li>Open WhatsApp on your phone</li>
              <li>Tap Menu (⋮) or Settings → Linked Devices</li>
              <li>Tap <strong>Link a Device</strong></li>
              <li>Point your phone camera at the QR code above</li>
            </ol>

            <button className="btn-outline" onClick={onClose}>
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
