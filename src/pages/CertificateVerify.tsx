import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const CertificateVerify = () => {
  const { certId } = useParams();
  const [certData, setCertData] = useState<any>(null);
  const [error, setError] = useState("");
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/certificates.json");
        const data = await response.json();
        const match = data.find((cert: any) => cert.id === certId);
        if (match) {
          setCertData(match);
          setVerifiedAt(new Date().toLocaleDateString());
        } else {
          setError("No certificate found with this ID.");
        }
      } catch (err) {
        setError("Failed to load certificate data.");
      }
    };

    if (certId) fetchData();
  }, [certId]);

  const handleDownload = async () => {
    try {
      const res = await fetch(certData.certificateImage);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${certData.name}_Certificate.jpg`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert("Failed to download the certificate.");
    }
  };

  const openPopup = () => setShowPopup(true);
  const closePopup = () => setShowPopup(false);

  return (
    <>
      <Navbar />
      <style>{`
        .page-container {
          margin-top: 90px;
          min-height: 100vh;
          background: #fff;
          font-family: 'Segoe UI', sans-serif;
          padding: 40px 20px;
        }
        .certificate-wrapper {
          display: flex;
          flex-wrap: wrap;
          max-width: 1200px;
          margin: 0 auto;
          gap: 20px;
        }
        .left-section {
          flex: 1 1 40%;
          background: #f9fafb;
          padding: 24px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .profile-img {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #2563eb;
          margin-bottom: 15px;
        }
        .name {
          font-size: 20px;
          font-weight: bold;
          color: #111827;
          margin-bottom: 4px;
        }
        .designation {
          font-size: 14px;
          color: #374151;
          margin-bottom: 10px;
        }
        .status-badge {
          display: inline-block;
          background: #d1fae5;
          color: #065f46;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          margin-bottom: 15px;
        }
        .info-list {
          width: 100%;
          font-size: 14px;
          color: #374151;
        }
        .info-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .info-item strong {
          color: #111827;
        }
        .project-desc {
          margin-top: 15px;
          padding: 12px;
          background: #fff;
          border-radius: 6px;
          border-left: 4px solid #2563eb;
          font-size: 14px;
          color: #374151;
          line-height: 1.4;
        }
        .right-section {
          flex: 1 1 55%;
          background: #fff;
          padding: 24px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .certificate-image {
          max-width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 8px;
        }
        .btn-row {
          display: flex;
          gap: 10px;
          margin-top: 16px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .btn {
          background: #2563eb;
          color: white;
          padding: 10px 14px;
          border-radius: 6px;
          font-size: 14px;
          border: none;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .btn:hover {
          background: #1d4ed8;
        }
        .btn.secondary {
          background: #e5e7eb;
          color: #111827;
        }
        .btn.secondary:hover {
          background: #d1d5db;
        }
        @media(max-width: 768px) {
          .certificate-wrapper {
            flex-direction: column;
          }
          .left-section, .right-section {
            flex: 1 1 100%;
          }
        }
        .error-box {
          color: #dc2626;
          font-size: 18px;
          background: #fff;
          padding: 12px 20px;
          border-radius: 8px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.1);
          text-align: center;
        }
        /* Popup Styles */
        .popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .popup-content {
          background: #fff;
          padding: 20px;
          border-radius: 8px;
          max-width: 90%;
          max-height: 90%;
        }
        .popup-content img {
          max-width: 100%;
          max-height: 80vh;
          border-radius: 6px;
        }
      `}</style>

      <div className="page-container">
        {error && <p className="error-box">{error}</p>}

        {certData && (
          <div className="certificate-wrapper">
            {/* Left Section */}
            <div className="left-section">
              <img
                src={certData.profileImage}
                alt={certData.name}
                className="profile-img"
              />
              <div className="name">{certData.name}</div>
              <div className="designation">{certData.designation}</div>
              <span className="status-badge">✅ Verified</span>

              <div className="info-list">
                <div className="info-item"><strong>Issued By:</strong> <span>{certData.issuedBy}</span></div>
                <div className="info-item"><strong>Duration:</strong> <span>{certData.duration}</span></div>
                <div className="info-item"><strong>Grade:</strong> <span>{certData.grade}%</span></div>
                <div className="info-item"><strong>Location:</strong> <span>{certData.location}</span></div>
                <div className="info-item"><strong>Certificate ID:</strong> <span>{certId}</span></div>
                <div className="info-item"><strong>Verified On:</strong> <span>{verifiedAt}</span></div>
              </div>

              <div className="project-desc">
                <strong>Project Work:</strong> {certData.project}
              </div>
            </div>

            {/* Right Section */}
            <div className="right-section">
              <img
                src={certData.certificateImage}
                alt="Certificate"
                className="certificate-image"
              />
              <div className="btn-row">
                <button className="btn" onClick={openPopup}>
                  View Certificate
                </button>
                <button className="btn secondary" onClick={handleDownload}>
                  Download Certificate
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Popup */}
      {showPopup && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <img src={certData.certificateImage} alt="Certificate Preview" />
          </div>
        </div>
      )}

      <Footer />
    </>
  );
};

export default CertificateVerify;
