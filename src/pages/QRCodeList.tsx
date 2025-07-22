import React, { useEffect, useState } from "react";
import QRGenerator from "@/components/QR/QRGenerator";

const QRCodeList = () => {
  const [certificates, setCertificates] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/certificates.json");
        const data = await response.json();
        setCertificates(data);
      } catch (error) {
        console.error("Error fetching certificates:", error);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-center text-blue-700">QR Code Generator for Certificates</h1>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {certificates.map((cert) => (
          <div key={cert.id} className="bg-white p-4 rounded-lg shadow-md hover:shadow-xl transition duration-300">
            <div className="flex flex-col items-center">
              {/* Profile Image */}
              {cert.image && (
                <img
                  src={cert.image}
                  alt={cert.name}
                  className="w-24 h-24 rounded-full border-2 border-blue-400 mb-4 object-cover"
                />
              )}
              <h2 className="text-lg font-semibold text-gray-800">{cert.name}</h2>
              <p className="text-sm text-gray-500 mb-2">{cert.designation}</p>
              <QRGenerator id={cert.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QRCodeList;
