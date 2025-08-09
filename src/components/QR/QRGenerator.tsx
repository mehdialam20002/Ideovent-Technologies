import React, { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";

interface QRGeneratorProps {
  id: string;
}

const QRGenerator: React.FC<QRGeneratorProps> = ({ id }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const url = `https://ideovent.com/verify/${id}`;

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const pngUrl = canvas
        .toDataURL("image/png")
        .replace("image/png", "image/octet-stream");

      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `${id}_qr.png`;
      downloadLink.click();
    }
  };

  return (
    <div className="m-4 p-4 border rounded text-center bg-white shadow">
      <p className="mb-2 font-semibold">{id}</p>
      <QRCodeCanvas
        value={url}
        size={128}
        ref={canvasRef}
        includeMargin={true}
      />
      <p className="text-sm text-gray-500 mt-2">{url}</p>
      <button
        onClick={handleDownload}
        className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
      >
        Download QR
      </button>
    </div>
  );
};

export default QRGenerator;
