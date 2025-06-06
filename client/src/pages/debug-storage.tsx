import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { AlertCircle, CheckCircle, Upload, FileText } from "lucide-react";

export function DebugStorage() {
  const [results, setResults] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const runDiagnostics = async () => {
    setIsLoading(true);
    setResults("");
    
    const logResults: string[] = [];
    
    try {
      logResults.push("🔍 STORAGE DIAGNOSTICS STARTED\n");
      
      // Test 1: Check if user is authenticated
      logResults.push("1. Checking authentication...");
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        logResults.push("❌ Authentication failed - User must be logged in to upload files");
        logResults.push(`   Error: ${authError?.message || "No user found"}\n`);
      } else {
        logResults.push(`✅ User authenticated: ${user.email}\n`);
      }
      
      // Test 2: Check if buckets exist
      logResults.push("2. Checking storage buckets...");
      try {
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        if (bucketsError) {
          logResults.push(`❌ Failed to list buckets: ${bucketsError.message}`);
        } else {
          const imageBucket = buckets?.find(b => b.name === 'item-images');
          const documentBucket = buckets?.find(b => b.name === 'item-documents');
          
          if (imageBucket) {
            logResults.push(`✅ 'item-images' bucket exists (Public: ${imageBucket.public})`);
          } else {
            logResults.push("❌ 'item-images' bucket does not exist");
          }
          
          if (documentBucket) {
            logResults.push(`✅ 'item-documents' bucket exists (Public: ${documentBucket.public})`);
          } else {
            logResults.push("❌ 'item-documents' bucket does not exist");
          }
          
          logResults.push(`   All buckets: ${buckets?.map(b => b.name).join(', ')}\n`);
        }
      } catch (error: any) {
        logResults.push(`❌ Exception listing buckets: ${error.message}\n`);
      }
      
      // Test 3: Try to list files in each bucket
      logResults.push("3. Testing bucket access...");
      
      // Test item-images bucket
      try {
        const { data: imageFiles, error: imageError } = await supabase.storage
          .from('item-images')
          .list('', { limit: 1 });
        
        if (imageError) {
          logResults.push(`❌ Cannot access 'item-images' bucket: ${imageError.message}`);
        } else {
          logResults.push(`✅ Can list files in 'item-images' bucket (${imageFiles?.length || 0} files found)`);
        }
      } catch (error: any) {
        logResults.push(`❌ Exception accessing 'item-images': ${error.message}`);
      }
      
      // Test item-documents bucket
      try {
        const { data: docFiles, error: docError } = await supabase.storage
          .from('item-documents')
          .list('', { limit: 1 });
        
        if (docError) {
          logResults.push(`❌ Cannot access 'item-documents' bucket: ${docError.message}`);
        } else {
          logResults.push(`✅ Can list files in 'item-documents' bucket (${docFiles?.length || 0} files found)`);
        }
      } catch (error: any) {
        logResults.push(`❌ Exception accessing 'item-documents': ${error.message}`);
      }
      
      logResults.push("");
      
      // Test 4: Try a test upload
      logResults.push("4. Testing file upload...");
      if (user) {
        try {
          const testFileName = `test-${Date.now()}.txt`;
          const testFile = new File(['This is a test file'], testFileName, { type: 'text/plain' });
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('item-images')
            .upload(`test/${testFileName}`, testFile);
          
          if (uploadError) {
            logResults.push(`❌ Test upload failed: ${uploadError.message}`);
            logResults.push(`   Error details: ${JSON.stringify(uploadError, null, 2)}`);
          } else {
            logResults.push(`✅ Test upload successful: ${uploadData.path}`);
            
            // Clean up test file
            await supabase.storage
              .from('item-images')
              .remove([`test/${testFileName}`]);
            logResults.push("   Test file cleaned up");
          }
        } catch (error: any) {
          logResults.push(`❌ Test upload exception: ${error.message}`);
        }
      } else {
        logResults.push("⏭️  Skipping upload test - no authenticated user");
      }
      
      logResults.push("");
      
      // Test 5: Environment check
      logResults.push("5. Environment configuration...");
      logResults.push(`   Supabase URL: ${import.meta.env.VITE_SUPABASE_URL || 'Not set'}`);
      logResults.push(`   Has Anon Key: ${import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Yes' : 'No'}`);
      logResults.push(`   Environment: ${import.meta.env.MODE}`);
      
      logResults.push("\n🏁 DIAGNOSTICS COMPLETE");
      
    } catch (error: any) {
      logResults.push(`\n💥 CRITICAL ERROR: ${error.message}`);
      logResults.push(`Stack trace: ${error.stack}`);
    } finally {
      setResults(logResults.join('\n'));
      setIsLoading(false);
    }
  };

  const createBuckets = async () => {
    setIsLoading(true);
    const logResults: string[] = [];
    
    try {
      logResults.push("🛠️  CREATING STORAGE BUCKETS\n");
      
      // Create item-images bucket
      const { data: imageBucket, error: imageError } = await supabase.storage
        .createBucket('item-images', {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
          fileSizeLimit: 5242880 // 5MB
        });
      
      if (imageError) {
        if (imageError.message.includes('already exists')) {
          logResults.push("✅ 'item-images' bucket already exists");
        } else {
          logResults.push(`❌ Failed to create 'item-images' bucket: ${imageError.message}`);
        }
      } else {
        logResults.push("✅ 'item-images' bucket created successfully");
      }
      
      // Create item-documents bucket
      const { data: docBucket, error: docError } = await supabase.storage
        .createBucket('item-documents', {
          public: true,
          allowedMimeTypes: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
          fileSizeLimit: 20971520 // 20MB
        });
      
      if (docError) {
        if (docError.message.includes('already exists')) {
          logResults.push("✅ 'item-documents' bucket already exists");
        } else {
          logResults.push(`❌ Failed to create 'item-documents' bucket: ${docError.message}`);
        }
      } else {
        logResults.push("✅ 'item-documents' bucket created successfully");
      }
      
      logResults.push("\n🏁 BUCKET CREATION COMPLETE");
      logResults.push("\nNOTE: You may need to set up RLS policies manually in Supabase dashboard:");
      logResults.push("1. Go to Storage > Policies");
      logResults.push("2. Create policies for both buckets:");
      logResults.push("   - SELECT: Enable access for authenticated users");
      logResults.push("   - INSERT: Enable uploads for authenticated users");
      logResults.push("   - UPDATE: Enable updates for authenticated users");
      logResults.push("   - DELETE: Enable deletes for authenticated users");
      
    } catch (error: any) {
      logResults.push(`\n💥 ERROR: ${error.message}`);
    } finally {
      setResults(logResults.join('\n'));
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Storage Debug & Fix Tool
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>File Upload Issues</AlertTitle>
            <AlertDescription>
              This tool will diagnose why file uploads are returning 404: NOT_FOUND errors and help fix the configuration.
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-2">
            <Button onClick={runDiagnostics} disabled={isLoading}>
              {isLoading ? "Running..." : "Run Diagnostics"}
            </Button>
            <Button onClick={createBuckets} disabled={isLoading} variant="outline">
              {isLoading ? "Creating..." : "Create Buckets"}
            </Button>
          </div>
          
          {results && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Results:</h3>
              <pre className="bg-muted p-4 rounded-md text-sm overflow-auto max-h-96 whitespace-pre-wrap">
                {results}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default DebugStorage;
