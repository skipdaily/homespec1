import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";

export default function QRTest() {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const testUrl = "https://example.com/test";

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const qrDataUrl = await QRCode.toDataURL(testUrl, {
          width: 200,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });
        setQrCodeDataUrl(qrDataUrl);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    };
    generateQRCode();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">QR Code Test Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">SVG QR Code (qrcode.react)</h2>
          <div style={{ background: 'white', padding: '16px', borderRadius: '8px', display: 'inline-block' }}>
            <QRCodeSVG 
              value={testUrl} 
              size={200} 
              level="M"
              marginSize={1}
              fgColor="#000000"
              bgColor="#ffffff"
            />
          </div>
          <p className="text-sm text-muted-foreground">URL: {testUrl}</p>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Canvas QR Code (qrcode)</h2>
          <div style={{ background: 'white', padding: '16px', borderRadius: '8px', display: 'inline-block' }}>
            {qrCodeDataUrl ? (
              <img 
                src={qrCodeDataUrl} 
                alt="QR Code" 
                style={{ width: 200, height: 200, display: 'block' }}
              />
            ) : (
              <div style={{ width: 200, height: 200, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span>Loading...</span>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground">URL: {testUrl}</p>
        </div>
      </div>
      
      <div className="space-y-4">
        <Button onClick={handlePrint} className="w-full">
          Test Print
        </Button>
        <p className="text-sm text-muted-foreground">
          Click "Test Print" to see how the QR codes appear in print preview.
          Both QR codes should be visible and scannable when printed.
        </p>
      </div>
    </div>
  );
}
