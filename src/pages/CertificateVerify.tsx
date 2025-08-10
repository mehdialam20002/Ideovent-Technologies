import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const CertificateVerify = () => {
  const { certId } = useParams();
  const [certData, setCertData] = useState<any>(null);
  const [error, setError] = useState("");
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);

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

    if (certId) {
      fetchData();
    }
  }, [certId]);

  return (
    <>
      <Navbar />
      <style>{`
        .verify-container {
          min-height: 100vh;
          background: linear-gradient(to bottom, #f0f4f8, #dbeafe);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          font-family: 'Segoe UI', sans-serif;
        }
        .verify-title {
          font-size: 32px;
          font-weight: 700;
          color: #2563eb;
          margin-bottom: 30px;
        }
        .error-box {
          color: #dc2626;
          font-size: 18px;
          background: #fff;
          padding: 12px 20px;
          border-radius: 8px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        }
        .card {
          background: #fff;
          border: 1px solid #bfdbfe;
          border-radius: 16px;
          padding: 24px;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 8px 20px rgba(0,0,0,0.1);
          animation: fadeIn 0.4s ease-in-out;
        }
        .card h2 {
          font-size: 24px;
          color: #16a34a;
          margin-bottom: 16px;
        }
        .card p {
          font-size: 16px;
          margin-bottom: 10px;
          color: #374151;
        }
        .verified-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }
        .verified-icon {
          width: 28px;
          height: 28px;
          margin-right: 10px;
          color: #16a34a;
        }
        .profile-img {
          width: 80px;
          height: 80px;
          object-fit: cover;
          border-radius: 50%;
          border: 2px solid #3b82f6;
          margin: 0 auto 20px auto;
          display: block;
        }
        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="verify-container">
        <h1 className="verify-title">Internship Certificate Verification</h1>

        {error && <p className="error-box">{error}</p>}

        {certData && (
          <div className="card">
            <div className="verified-badge">
              <svg
                className="verified-icon"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <h2>Certificate Verified</h2>
            </div>

            {certData.image && (
              <img
                src={certData.image}
                alt={certData.name}
                className="profile-img"
              />
            )}

            <p><strong>👤 Name:</strong> {certData.name}</p>
            <p><strong>🏷️ Designation:</strong> {certData.designation}</p>
            <p><strong>🕒 Duration:</strong> {certData.duration}</p>
            <p><strong>🏢 Issued By:</strong> {certData.issuedBy}</p>
            <p><strong>🆔 Certificate ID:</strong> {certId}</p>
            <p><strong>📅 Verified On:</strong> {verifiedAt}</p>

            <div style={{ marginTop: "20px", fontSize: "14px", color: "#2563eb" }}>
              ✅ This certificate is officially verified.
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
};

export default CertificateVerify;
