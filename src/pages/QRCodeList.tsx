import React, { useEffect, useState } from "react";
import QRGenerator from "@/components/QR/QRGenerator";

const QRCodeList = () => {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

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

  const categories = [
    "All",
    "Content Writer Intern",
    "Software Development Interns",
    "Graphic Designer Interns",
    "Business Development Interns",
  ];

  const filteredCertificates = certificates.filter((cert) => {
    const matchesSearch =
      cert.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.designation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" ||
      cert.designation.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-center text-blue-700">
        QR Code Generator for Certificates
      </h1>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <input
          type="text"
          placeholder="Search by name or designation..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 p-2 rounded-md w-full sm:w-1/2"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border border-gray-300 p-2 rounded-md w-full sm:w-1/3"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Certificate Cards */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {filteredCertificates.map((cert) => (
          <div
            key={cert.id}
            className="bg-white p-4 rounded-lg shadow-md hover:shadow-xl transition duration-300"
          >
            <div className="flex flex-col items-center">
              {cert.image && (
                <img
                  src={cert.image}
                  alt={cert.name}
                  className="w-24 h-24 rounded-full border-2 border-blue-400 mb-4 object-cover"
                />
              )}
              <h2 className="text-lg font-semibold text-gray-800">
                {cert.name}
              </h2>
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
