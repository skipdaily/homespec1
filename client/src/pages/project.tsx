import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { Plus, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import type { Project, Room } from "@shared/schema";
import * as XLSX from 'xlsx';

interface ProjectPageProps {
  id?: string;
}

// Define the structure of the items data
interface Item {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  supplier: string | null;
  specifications: string | null;
  cost: number | null;
  warranty_info: string | null;
  installation_date: string | null;
  maintenance_notes: string | null;
  status: string | null;
  room_id: string;
  rooms: {
    name: string;
  };
}

export default function ProjectPage({ id }: ProjectPageProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const { data: project } = useQuery<Project>({
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
    enabled: !!id
  });

  const { data: rooms } = useQuery<Room[]>({
    queryKey: ["rooms", id],
    queryFn: async () => {
      if (!id) throw new Error("No project ID provided");

      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const { data: items } = useQuery<Item[]>({
    queryKey: ["project-items", id],
    queryFn: async () => {
      if (!id) throw new Error("No project ID provided");

      const { data, error } = await supabase
        .from("items")
        .select(`
          id,
          name,
          category,
          brand,
          supplier,
          specifications,
          cost,
          warranty_info,
          installation_date,
          maintenance_notes,
          status,
          room_id,
          rooms!inner (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching items:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!id && !!rooms?.length
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !rooms) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
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
          installation_date?: string;
          maintenance_notes?: string;
          status?: string;
        }>(sheet);

        console.log("Imported data:", jsonData); // Debug log

        // Validate and map room names to IDs
        const roomMap = new Map(rooms.map(room => [room.name.toLowerCase(), room.id]));

        const validItems = jsonData.filter(item => {
          const roomId = roomMap.get(item.area?.toLowerCase());
          if (!roomId) {
            toast({
              title: "Warning",
              description: `Skipped item "${item.name}" - Area "${item.area}" not found`,
              variant: "destructive"
            });
            return false;
          }
          return true;
        }).map(item => ({
          project_id: id,
          room_id: roomMap.get(item.area.toLowerCase())!,
          name: item.name,
          category: item.category,
          brand: item.brand || null,
          supplier: item.supplier || null,
          specifications: item.specifications || null,
          cost: item.cost || null,
          warranty_info: item.warranty_info || null,
          installation_date: item.installation_date || null,
          maintenance_notes: item.maintenance_notes || null,
          status: item.status || null,
          created_at: new Date().toISOString()
        }));

        console.log("Valid items:", validItems); // Debug log

        if (validItems.length === 0) {
          toast({
            title: "Error",
            description: "No valid items found to import",
            variant: "destructive"
          });
          return;
        }

        const { error } = await supabase
          .from('items')
          .insert(validItems);

        if (error) throw error;

        queryClient.invalidateQueries({ queryKey: ["project-items", id] });
        toast({
          title: "Success",
          description: `Imported ${validItems.length} items successfully`
        });
      };
      reader.readAsBinaryString(file);
    } catch (error: any) {
      console.error("Import error:", error); // Debug log
      toast({
        title: "Error",
        description: error.message || "Failed to import items",
        variant: "destructive"
      });
    }
  };

  const handleExport = () => {
    if (!items) {
      toast({
        title: "Error",
        description: "No items to export",
        variant: "destructive"
      });
      return;
    }

    try {
      // Transform items to include room information
      const exportData = items.map(item => ({
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
        status: item.status || ""
      }));

      // Create workbook and add items sheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, "Items");

      // Export the file
      const fileName = `${project?.name || 'project'}_items.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Success",
        description: "Items exported successfully"
      });
    } catch (error: any) {
      console.error("Export error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to export items",
        variant: "destructive"
      });
    }
  };

  const createRoom = useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      floor_number?: number;
      dimensions?: string;
    }) => {
      if (!id) throw new Error("No project ID provided");

      const { error } = await supabase
        .from("rooms")
        .insert([{ ...data, project_id: id }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms", id] });
      setOpen(false);
      toast({
        title: "Success",
        description: "Room added successfully"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const floorNumber = formData.get("floor_number");
    createRoom.mutate({
      name: formData.get("name") as string,
      description: formData.get("description") as string || undefined,
      floor_number: floorNumber ? parseInt(floorNumber as string) : undefined,
      dimensions: formData.get("dimensions") as string || undefined
    });
  };

  if (!project) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground">Address: {project.address}</p>
          <p className="text-muted-foreground">Builder: {project.builder_name}</p>
        </div>

        <div className="flex gap-2">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload">
            <Button variant="outline" asChild>
              <span>
                <Upload className="mr-2 h-4 w-4" />
                Import Items
              </span>
            </Button>
          </label>

          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export Items
          </Button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Area
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Area</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input 
                  name="name"
                  placeholder="Area Name*"
                  required
                />
                <Textarea
                  name="description"
                  placeholder="Description"
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    name="floor_number"
                    type="number"
                    placeholder="Floor Number"
                  />
                  <Input 
                    name="dimensions"
                    placeholder="Dimensions (e.g., 12' x 15')"
                  />
                </div>
                <Button type="submit" className="w-full">
                  Add Area
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms?.map((room) => (
          <Link key={room.id} href={`/room/${room.id}`}>
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardHeader>
                <CardTitle>{room.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{room.description}</p>
                {room.floor_number !== null && (
                  <p className="text-sm text-muted-foreground">
                    Floor: {room.floor_number}
                  </p>
                )}
                {room.dimensions && (
                  <p className="text-sm text-muted-foreground">
                    Size: {room.dimensions}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}