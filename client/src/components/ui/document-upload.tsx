import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "./button";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";

interface DocumentUploadProps {
  itemId: string;
  onUploadComplete: () => void;
}

export function DocumentUpload({ itemId, onUploadComplete }: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${itemId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('item-documents')
          .upload(filePath, file);

        if (uploadError) {
          // Provide specific error messages based on error type
          if (uploadError.message.includes('not found') || uploadError.message.includes('does not exist')) {
            throw new Error(`Storage bucket 'item-documents' does not exist. Please create it in your Supabase dashboard or use the debug tool to fix this.`);
          } else if (uploadError.message.includes('policy') || uploadError.message.includes('permission')) {
            throw new Error(`Permission denied: Please check your storage bucket policies. You may need to set up Row Level Security policies for authenticated users.`);
          } else if (uploadError.message.includes('size')) {
            throw new Error(`File too large: ${file.name} exceeds the bucket size limit.`);
          } else {
            throw new Error(`Upload failed: ${uploadError.message}`);
          }
        }
      }

      toast({
        title: "Success",
        description: "Document(s) uploaded successfully"
      });
      onUploadComplete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload document",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center w-full">
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
            <p className="mb-2 text-sm text-muted-foreground">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">PDF (Max 20MB)</p>
          </div>
          <input
            type="file"
            className="hidden"
            accept=".pdf"
            multiple
            onChange={handleFileUpload}
            disabled={isUploading}
          />
        </label>
      </div>
      {isUploading && (
        <div className="text-center text-sm text-muted-foreground">
          Uploading...
        </div>
      )}
    </div>
  );
}