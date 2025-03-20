import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { QRCodeSVG } from "qrcode.react";
import {
  Plus,
  Download,
  Upload,
  Pencil,
  Trash2,
  Search,
  ChevronsUpDown,
  Check,
  Printer,
  HomeIcon,
  Calendar,
  User,
  AlertCircle,
  Link as LinkIcon
} from "lucide-react";
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
import * as XLSX from "xlsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import PrintView from "@/components/project/print-view";
import { NavBreadcrumb } from "@/components/layout/nav-breadcrumb";

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
  notes: string | null;
  link: string | null;
  room_id: string;
  rooms: {
    name: string;
    project_id: string;
  };
}

interface ProjectPageProps {
  id?: string;
}

export default function ProjectPage({ id }: ProjectPageProps) {
  // All useState hooks first
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [openAreaCombobox, setOpenAreaCombobox] = useState(false);
  const [areaValue, setAreaValue] = useState("");
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Hook usage
  const { toast } = useToast();

  // Authentication effect
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();
  }, []);

  // Data fetching queries
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
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
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
          notes,
          link,
          room_id,
          rooms!inner (
            name,
            project_id
          )
        `)
        .eq('rooms.project_id', id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // All mutations at top level
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
      setAreaValue("");
      toast({
        title: "Success",
        description: "Area added successfully",
      });
    },
  });

  const updateRoom = useMutation({
    mutationFn: async (data: {
      id: string;
      name: string;
      description?: string;
      floor_number?: number;
      dimensions?: string;
    }) => {
      const { error } = await supabase
        .from("rooms")
        .update({
          name: data.name,
          description: data.description,
          floor_number: data.floor_number,
          dimensions: data.dimensions,
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms", id] });
      toast({
        title: "Success",
        description: "Area updated successfully",
      });
    },
  });

  const deleteRoom = useMutation({
    mutationFn: async (roomId: string) => {
      const { error } = await supabase
        .from("rooms")
        .delete()
        .eq("id", roomId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms", id] });
      queryClient.invalidateQueries({ queryKey: ["project-items", id] });
      toast({
        title: "Success",
        description: "Area and all related items deleted successfully",
      });
    },
  });

  // Loading and error states
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

  // Event handlers
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createRoom.mutate({
      name: areaValue || (formData.get("name") as string),
      description: (formData.get("description") as string) || undefined,
      floor_number: formData.get("floor_number") ? parseInt(formData.get("floor_number") as string) : undefined,
      dimensions: (formData.get("dimensions") as string) || undefined,
    });
  };

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

        console.log("Imported data:", jsonData);

        const importedAreas = new Set(
          jsonData.map((item) => item.area?.toLowerCase()).filter(Boolean),
        );
        const existingRoomNames = new Set(
          rooms.map((room) => room.name.toLowerCase()),
        );

        for (const area of Array.from(importedAreas)) {
          if (!existingRoomNames.has(area)) {
            const { error } = await supabase.from("rooms").insert([
              {
                project_id: id,
                name: area.charAt(0).toUpperCase() + area.slice(1),
                created_at: new Date().toISOString(),
              },
            ]);

            if (error) {
              console.error("Error creating area:", error);
              toast({
                title: "Warning",
                description: `Failed to create area "${area}"`,
                variant: "destructive",
              });
            }
          }
        }

        const { data: updatedRooms, error: roomsError } = await supabase
          .from("rooms")
          .select("*")
          .eq("project_id", id)
          .order("created_at", { ascending: false });

        if (roomsError) {
          throw roomsError;
        }

        const roomMap = new Map(
          updatedRooms.map((room) => [room.name.toLowerCase(), room.id]),
        );

        const processExcelDate = (
          excelDate: string | number | undefined,
        ): string | null => {
          if (!excelDate) return null;

          if (typeof excelDate === "string" && !isNaN(Date.parse(excelDate))) {
            return new Date(excelDate).toISOString().split("T")[0];
          }

          const numericDate =
            typeof excelDate === "string" ? parseInt(excelDate) : excelDate;
          if (isNaN(numericDate)) return null;

          const date = new Date(1900, 0, 1);
          date.setDate(date.getDate() + numericDate - 2);

          return date.toISOString().split("T")[0];
        };

        const { data: existingItems, error: existingItemsError } =
          await supabase.from("items").select(`
            id,
            name,
            room_id,
            rooms!inner (
              name
            )
          `);

        if (existingItemsError) throw existingItemsError;

        const existingItemsMap = new Map(
          existingItems?.map((item) => [
            `${item.room_id}-${item.name.toLowerCase()}`,
            item,
          ]) || [],
        );

        let skippedCount = 0;
        const validItems = jsonData
          .filter((item) => {
            const roomId = roomMap.get(item.area?.toLowerCase());
            if (!roomId) {
              toast({
                title: "Warning",
                description: `Skipped item "${item.name}" - Area "${item.area}" not found`,
                variant: "destructive",
              });
              return false;
            }

            const itemKey = `${roomId}-${item.name.toLowerCase()}`;
            if (existingItemsMap.has(itemKey)) {
              skippedCount++;
              return false;
            }

            return true;
          })
          .map((item) => ({
            room_id: roomMap.get(item.area.toLowerCase())!,
            name: item.name,
            category: item.category,
            brand: item.brand || null,
            supplier: item.supplier || null,
            specifications: item.specifications || null,
            cost: item.cost || null,
            warranty_info: item.warranty_info || null,
            installation_date: processExcelDate(item.installation_date),
            maintenance_notes: item.maintenance_notes || null,
            status: item.status || null,
            notes: item.notes || null,
            link: item.links || null,
            created_at: new Date().toISOString(),
          }));

        console.log("Valid items:", validItems);

        if (validItems.length === 0) {
          toast({
            title: "Error",
            description:
              skippedCount > 0
                ? `All items were duplicates (${skippedCount} skipped)`
                : "No valid items found to import",
            variant: "destructive",
          });
          return;
        }

        const { error } = await supabase.from("items").insert(validItems);

        if (error) throw error;

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
      const exportData = items.map((item) => ({
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


  const handleEdit = (room:Room) => {
    //Implementation for editing a room.  This would likely involve opening a modal or similar.
    console.log("Edit room:", room);
  }

  const handleDelete = (room:Room) => {
    //Implementation for deleting a room.  This would likely involve opening a confirmation modal.
    console.log("Delete room:", room);
  }

  const AreaCard = ({ room, itemCount }: { room: Room; itemCount: number }) => {
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [openAreaCombobox, setOpenAreaCombobox] = useState(false);
    const [areaValue, setAreaValue] = useState(room.name || "");
    const { toast } = useToast();


    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const floorNumber = formData.get("floor_number");
      updateRoom.mutate({
        id: room.id,
        name: areaValue,
        description: (formData.get("description") as string) || undefined,
        floor_number: floorNumber ? parseInt(floorNumber as string) : undefined,
        dimensions: (formData.get("dimensions") as string) || undefined,
      });
    };

    return (
      <div className="relative">
        <Link href={`/room/${room.id}`}>
          <Card className="group cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="group-hover:text-primary transition-colors">
                    {room.name}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="rounded-md">
                      {itemCount} {itemCount === 1 ? "item" : "items"}
                    </Badge>
                    {room.floor_number !== null && (
                      <Badge variant="outline" className="rounded-md">
                        Floor {room.floor_number}
                      </Badge>
                    )}
                  </div>
                </div>
                {isAuthenticated && (
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowEditDialog(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {room.description && (
                <p className="text-muted-foreground line-clamp-2">
                  {room.description}
                </p>
              )}
              {room.dimensions && (
                <p className="text-sm text-muted-foreground mt-2">
                  Size: {room.dimensions}
                </p>
              )}
            </CardContent>
          </Card>
        </Link>

        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Area</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col space-y-2">
                <Label>Area Name*</Label>
                <Popover
                  open={openAreaCombobox}
                  onOpenChange={setOpenAreaCombobox}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openAreaCombobox}
                      className={cn(
                        "w-full justify-between",
                        !areaValue && "text-muted-foreground",
                      )}
                    >
                      {areaValue || "Select or enter area name..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput
                        placeholder="Search or enter new area..."
                        onValueChange={(value) => {
                          setAreaValue(value);
                        }}
                      />
                      <CommandEmpty>
                        Press enter to use "{areaValue}" as a new area
                      </CommandEmpty>
                      {/* areaTemplates is missing - needs to be defined */}
                      {false && <ScrollArea className="h-[300px] w-full overflow-y-auto" type="hover">
                        <CommandGroup>
                          {/* Area template rendering */}
                        </CommandGroup>
                      </ScrollArea>}
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <Textarea
                name="description"
                placeholder="Description"
                defaultValue={room.description || ""}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  name="floor_number"
                  type="number"
                  placeholder="Floor Number"
                  defaultValue={room.floor_number || ""}
                />
                <Input
                  name="dimensions"
                  placeholder="Dimensions (e.g., 12' x 15')"
                  defaultValue={room.dimensions || ""}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={updateRoom.isPending}
              >
                {updateRoom.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the area "{room.name}" and all its related items.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteRoom.mutate(room.id)}
                disabled={deleteRoom.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteRoom.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  };

  // Filter items based on search query
  const filteredItems = items?.filter((item) => {
    if (!searchQuery.trim()) return true;
    const searchLower = searchQuery.toLowerCase();
    const roomName = rooms?.find((r) => r.id === item.room_id)?.name.toLowerCase() || '';
    return (
      item.name.toLowerCase().includes(searchLower) ||
      item.category.toLowerCase().includes(searchLower) ||
      (item.brand?.toLowerCase() || '').includes(searchLower) ||
      (item.supplier?.toLowerCase() || '').includes(searchLower) ||
      (item.specifications?.toLowerCase() || '').includes(searchLower) ||
      (item.status?.toLowerCase() || '').includes(searchLower) ||
      roomName.includes(searchLower)
    );
  });

  // Calculate item counts for each room
  const itemCounts = rooms?.reduce((acc, room) => {
    acc[room.id] = filteredItems?.filter((item) => item.room_id === room.id).length || 0;
    return acc;
  }, {} as Record<string, number>) || {};

  const baseUrl = window.location.origin;
  const projectUrl = `${baseUrl}/project/${id}`;

  return (
    <div className="container mx-auto px-4 py-8">
      <NavBreadcrumb
        items={[
          ...(isAuthenticated ? [{ label: "Projects", href: "/dashboard" }] : []),
          { label: project?.name || "Project" },
        ]}
      />

      <div className="mb-8 bg-card rounded-lg p-6 shadow-sm border">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Project Info */}
          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80">
                {project?.name}
              </h1>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <HomeIcon className="h-4 w-4" />
                  <span>{project?.address}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Builder: {project?.builder_name}</span>
                </div>
                {project?.completion_date && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Expected completion: {new Date(project.completion_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* QR Code Section - Always visible */}
          <div className="lg:w-[200px] flex flex-col items-center gap-4 p-4 bg-muted/10 rounded-lg">
            <div className="text-center">
              <QRCodeSVG value={`${window.location.origin}/project/${id}`} size={150} />
              <div className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <LinkIcon className="h-4 w-4" />
                <span>Scan to view project</span>
              </div>
            </div>
          </div>

          {/* Action Buttons - Only for authenticated users */}
          {isAuthenticated && (
            <div className="lg:w-[200px] flex flex-col gap-3">
              <Button
                variant="outline"
                onClick={() => setShowPrintDialog(true)}
                className="w-full flex items-center justify-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Print Project
              </Button>

              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="w-full">
                <Button variant="outline" className="w-full" asChild>
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    Import Items
                  </span>
                </Button>
              </label>

              <Button variant="outline" onClick={handleExport} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Export Items
              </Button>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          {isAuthenticated && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="default">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Area
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Area</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex flex-col space-y-2">
                    <Label>Area Name*</Label>
                    <Popover
                      open={openAreaCombobox}
                      onOpenChange={setOpenAreaCombobox}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openAreaCombobox}
                          className={cn(
                            "w-full justify-between",
                            !areaValue && "text-muted-foreground",
                          )}
                        >
                          {areaValue || "Select or enter area name..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput
                            placeholder="Search or enter new area..."
                            name="name"
                            onValueChange={(value) => {
                              setAreaValue(value);
                            }}
                          />
                          <CommandEmpty>
                            Press enter to use "{areaValue}" as a new area
                          </CommandEmpty>
                          {/* areaTemplates is missing - needs to be defined */}
                          {false && <ScrollArea className="h-[300px] w-full overflow-y-auto" type="hover">
                            <CommandGroup>
                              {/* Area template rendering */}
                            </CommandGroup>
                          </ScrollArea>}
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Textarea name="description" placeholder="Description" />
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
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createRoom.isPending}
                  >
                    {createRoom.isPending ? "Adding..." : "Add Area"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {searchQuery.trim() && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold">Search Results</h2>
            <div className="grid gap-4">
              {filteredItems?.map((item) => {
                const room = rooms?.find((r) => r.id === item.room_id);
                return (
                  <Card key={item.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Area: {room?.name}
                        </p>
                        {item.category && (
                          <p className="text-sm text-muted-foreground">
                            Category: {item.category}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Link href={`/room/${item.room_id}`}>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {!searchQuery.trim() && (
          <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms?.map((room) => {
              const itemCount = itemCounts[room.id] || 0;
              return <AreaCard key={room.id} room={room} itemCount={itemCount} />;
            })}
          </div>
        )}
      </div>

      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Print Project Details</DialogTitle>
          </DialogHeader>
          <div className="relative">
            {project && rooms && (
              <PrintView
                project={project}
                rooms={rooms}
                itemCounts={itemCounts}
                baseUrl={window.location.origin}
                items={items}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}