import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { QRCodeSVG } from "qrcode.react";
import QRCode from "qrcode";
import {
  Download,
  Upload,
  Printer,
  Calendar,
  User,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import type { Project, Room } from "@shared/schema";
import * as XLSX from "xlsx";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import PrintView from "@/components/project/print-view";
import { NavBreadcrumb } from "@/components/layout/nav-breadcrumb";

interface Item {
  id: string;
  room_id: string;
  name: string;
  category: string;
  brand?: string;
  supplier?: string;
  specifications?: string;
  cost?: number;
  warranty_info?: string;
  installation_date?: string;
  maintenance_notes?: string;
  status?: string;
  link?: string;
  notes?: string;
  rooms: Room;
}

interface ProjectManagementPageProps {
  id: string;
}

export default function ProjectManagementPage({ id }: ProjectManagementPageProps) {
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();
  }, []);

  // Generate QR code data URL
  useEffect(() => {
    const generateQRCode = async () => {
      if (id && typeof window !== 'undefined') {
        try {
          const url = `${window.location.origin}/project/${id}`;
          const qrDataUrl = await QRCode.toDataURL(url, {
            width: 120,
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
      }
    };
    generateQRCode();
  }, [id]);

  const { data: project, isLoading: isProjectLoading, isError: isProjectError } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      if (!id) throw new Error("No project ID provided");
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: rooms } = useQuery<Room[]>({
    queryKey: ["rooms", id],
    queryFn: async () => {
      if (!id) throw new Error("No project ID provided");
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("project_id", id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: items } = useQuery<Item[]>({
    queryKey: ["project-items", id],
    queryFn: async () => {
      if (!id) throw new Error("No project ID provided");
      const { data, error } = await supabase
        .from("items")
        .select(`
          *,
          rooms!inner (
            name,
            project_id
          )
        `)
        .eq('rooms.project_id', id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        rooms: Array.isArray(item.rooms) ? item.rooms[0] : item.rooms
      })) as Item[];
    },
    enabled: !!id,
  });

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !rooms) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<{
          area: string;
          name: string;
          category: string;
          brand?: string;
          supplier?: string;
          specifications?: string;
          cost?: number;
          warranty_info?: string;
          installation_date?: string | number;
          maintenance_notes?: string;
          status?: string;
        }>(sheet);

        const importedAreas = new Set(
          jsonData.map((item) => item.area?.toLowerCase()).filter(Boolean),
        );
        const existingRoomNames = new Set(
          rooms.map((room) => room.name.toLowerCase()),
        );

        // Create new rooms for areas that don't exist
        const newAreas = [...importedAreas].filter(
          (area) => !existingRoomNames.has(area),
        );

        for (const areaName of newAreas) {
          const { error } = await supabase.from("rooms").insert([
            {
              name: areaName.charAt(0).toUpperCase() + areaName.slice(1),
              project_id: id,
            },
          ]);
          if (error) {
            console.error("Error creating room:", error);
            throw error;
          }
        }

        // Refresh rooms data if new areas were created
        if (newAreas.length > 0) {
          await queryClient.invalidateQueries({ queryKey: ["rooms", id] });
        }

        // Get updated rooms list
        const { data: updatedRooms, error: roomsError } = await supabase
          .from("rooms")
          .select("*")
          .eq("project_id", id);

        if (roomsError) throw roomsError;

        const roomNameToId = updatedRooms?.reduce((acc, room) => {
          acc[room.name.toLowerCase()] = room.id;
          return acc;
        }, {} as Record<string, string>) || {};

        // Get existing items to check for duplicates
        const { data: existingItems, error: existingItemsError } = await supabase
          .from("items")
          .select("name, room_id")
          .in("room_id", Object.values(roomNameToId));

        if (existingItemsError) throw existingItemsError;

        const existingItemsSet = new Set(
          existingItems?.map((item) => `${item.name.toLowerCase()}-${item.room_id}`) || []
        );

        // Process items
        const validItems = jsonData
          .filter((item) => item.area && item.name)
          .map((item) => {
            const roomId = roomNameToId[item.area.toLowerCase()];
            const itemKey = `${item.name.toLowerCase()}-${roomId}`;
            
            // Skip if duplicate
            if (existingItemsSet.has(itemKey)) {
              return null;
            }

            let installationDate = null;
            if (item.installation_date) {
              if (typeof item.installation_date === "number") {
                // Excel date serial number
                const excelDate = new Date((item.installation_date - 25569) * 86400 * 1000);
                installationDate = excelDate.toISOString().split("T")[0];
              } else if (typeof item.installation_date === "string") {
                const parsedDate = new Date(item.installation_date);
                if (!isNaN(parsedDate.getTime())) {
                  installationDate = parsedDate.toISOString().split("T")[0];
                }
              }
            }

            return {
              room_id: roomId,
              name: item.name,
              category: item.category || "Uncategorized",
              brand: item.brand || null,
              supplier: item.supplier || null,
              specifications: item.specifications || null,
              cost: item.cost || null,
              warranty_info: item.warranty_info || null,
              installation_date: installationDate,
              maintenance_notes: item.maintenance_notes || null,
              status: item.status || null,
            };
          })
          .filter(Boolean);

        const skippedCount = jsonData.length - validItems.length;

        if (validItems.length > 0) {
          const { error: insertError } = await supabase
            .from("items")
            .insert(validItems);

          if (insertError) throw insertError;
        }

        queryClient.invalidateQueries({ queryKey: ["project-items", id] });
        queryClient.invalidateQueries({ queryKey: ["rooms", id] });

        toast({
          title: "Success",
          description: `Imported ${validItems.length} items successfully${
            skippedCount > 0 ? ` (${skippedCount} duplicates skipped)` : ""
          }`,
        });
      };
      reader.readAsBinaryString(file);
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to import items",
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    if (!items) {
      toast({
        title: "Error",
        description: "No items to export",
        variant: "destructive",
      });
      return;
    }

    try {
      const exportData = (items || []).map((item) => ({
        area: item.rooms.name,
        name: item.name,
        category: item.category,
        brand: item.brand || "",
        supplier: item.supplier || "",
        specifications: item.specifications || "",
        cost: item.cost?.toString() || "",
        warranty_info: item.warranty_info || "",
        installation_date: item.installation_date || "",
        maintenance_notes: item.maintenance_notes || "",
        status: item.status || "",
        notes: item.notes || "",
        links: item.link || "",
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, "Items");

      const fileName = `${project?.name || "project"}_items.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Success",
        description: "Items exported successfully",
      });
    } catch (error: any) {
      console.error("Export error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to export items",
        variant: "destructive",
      });
    }
  };

  const itemCounts = rooms?.reduce((acc, room) => {
    acc[room.id] = items?.filter((item) => item.room_id === room.id).length || 0;
    return acc;
  }, {} as Record<string, number>) || {};

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleDownloadPDF = () => {
    if (!project) return;
    
    const element = document.getElementById('print-content');
    if (!element) {
      return;
    }

    window.print();
  };

  if (isProjectLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <p>Loading project details...</p>
      </div>
    );
  }

  if (isProjectError || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex mb-4 gap-2">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <h1 className="text-2xl font-bold text-gray-900">Project Not Found</h1>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              The project you're looking for could not be found or you may not have permission to view it.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <NavBreadcrumb
        items={[
          ...(isAuthenticated ? [{ label: "Projects", href: "/dashboard" }] : []),
          { label: project?.name || "Project", href: `/project/${id}` },
          { label: "Project Management" },
        ]}
      />

      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="outline"
          size="sm"
          asChild
          className="flex items-center gap-2"
        >
          <Link href={`/project/${id}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to Project
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Project Management</h1>
      </div>

      <div className="grid gap-6">
        {/* Project Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-lg">{project.name}</h3>
                <p className="text-muted-foreground">{project.address}</p>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>Builder: {project.builder_name}</span>
                  </div>
                  {project.completion_date && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Expected completion: {new Date(project.completion_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-center justify-center text-center">
                <Badge variant="secondary" className="mb-2">
                  {rooms?.length || 0} Areas
                </Badge>
                <Badge variant="secondary">
                  {items?.length || 0} Items
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Management Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Management Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {/* Print Project */}
              <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setShowPrintDialog(true)}>
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Printer className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Print Project</h3>
                    <p className="text-sm text-muted-foreground">Generate a printable report of the entire project</p>
                  </div>
                </div>
              </Card>

              {/* Import Items */}
              <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="p-3 bg-green-100 rounded-full">
                    <Upload className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Import Items</h3>
                    <p className="text-sm text-muted-foreground">Upload items from CSV or Excel file</p>
                  </div>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button variant="outline" size="sm" className="cursor-pointer" asChild>
                      <span>Choose File</span>
                    </Button>
                  </label>
                </div>
              </Card>

              {/* Export Items */}
              <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={handleExport}>
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="p-3 bg-purple-100 rounded-full">
                    <Download className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Export Items</h3>
                    <p className="text-sm text-muted-foreground">Download all items as Excel file</p>
                  </div>
                </div>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Project Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{rooms?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Total Areas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{items?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Total Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {new Set(items?.map(item => item.category)).size || 0}
                </div>
                <div className="text-sm text-muted-foreground">Categories</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  ${items?.reduce((sum, item) => sum + (item.cost || 0), 0).toLocaleString() || '0'}
                </div>
                <div className="text-sm text-muted-foreground">Total Cost</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Print Dialog */}
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center no-print">
              <span>Print Project Details</span>
              <Button 
                variant="outline" 
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 no-print"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div id="print-content" className="p-8 print-content">
            {project && rooms && (
              <PrintView 
                project={project} 
                rooms={rooms} 
                itemCounts={itemCounts} 
                baseUrl={baseUrl}
                items={items || []}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
