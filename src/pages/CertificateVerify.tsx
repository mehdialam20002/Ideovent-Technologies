import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import React, { useState } from 'react';

const CertificateVerify = () => {
  const [certId, setCertId] = useState('');
  const [certData, setCertData] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    setError('');
    const response = await fetch('/certificates.json');
    const data = await response.json();
    const match = data.find((cert: any) => cert.id === certId.trim());
    if (match) {
      setCertData(match);
    } else {
      setCertData(null);
      setError('No certificate found with this ID.');
    }
  };

  return (
    <>
    <Navbar/>
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-100">
      <h1 className="text-3xl font-bold mb-4">Verify Internship Certificate</h1>
      <input
        type="text"
        placeholder="Enter Certificate ID"
        value={certId}
        onChange={(e) => setCertId(e.target.value)}
        className="p-2 border rounded mb-2 w-80"
      />
      <button
        onClick={handleSearch}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Verify
      </button>

      {error && <p className="text-red-600 mt-4">{error}</p>}

      {certData && (
        <div className="mt-6 p-4 border bg-white shadow rounded w-96">
          <h2 className="text-xl font-semibold mb-2 text-green-600">Certificate Found</h2>
          <p><strong>Name:</strong> {certData.name}</p>
          <p><strong>Designation:</strong> {certData.designation}</p>
          <p><strong>Duration:</strong> {certData.duration}</p>
          <p><strong>Issued By:</strong> {certData.issuedBy}</p>
        </div>
      )}
    </div>
    <Footer/>
    </>
  );
};

export default CertificateVerify;
