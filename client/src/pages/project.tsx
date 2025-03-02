import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
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
  HomeIcon, // Import HomeIcon
  Calendar, // Import Calendar
  User //Import User
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

// Update the ProjectPageProps interface
interface ProjectPageProps {
  id?: string;
}

export default function ProjectPage({ id }: ProjectPageProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [openAreaCombobox, setOpenAreaCombobox] = useState(false);
  const [areaValue, setAreaValue] = useState("");
  const [showPrintDialog, setShowPrintDialog] = useState(false);

  // Add areas query
  const { data: areaTemplates } = useQuery({
    queryKey: ["areas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("areas")
        .select("name")
        .order("name");

      if (error) throw error;
      return data.map((area) => area.name);
    },
  });

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
    enabled: !!id,
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
    enabled: !!id,
  });

  const { data: items } = useQuery<Item[]>({
    queryKey: ["project-items", id],
    queryFn: async () => {
      if (!id) throw new Error("No project ID provided");

      const { data, error } = await supabase
        .from("items")
        .select(
          `
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
        `,
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching items:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!id && !!rooms?.length,
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

        console.log("Imported data:", jsonData);

        // Get unique areas from import data
        const importedAreas = new Set(
          jsonData.map((item) => item.area?.toLowerCase()).filter(Boolean),
        );
        const existingRoomNames = new Set(
          rooms.map((room) => room.name.toLowerCase()),
        );

        // Create missing areas first
        for (const area of Array.from(importedAreas)) {
          if (!existingRoomNames.has(area)) {
            const { error } = await supabase.from("rooms").insert([
              {
                project_id: id,
                name: area.charAt(0).toUpperCase() + area.slice(1), // Capitalize first letter
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

        // Refresh rooms data
        const { data: updatedRooms, error: roomsError } = await supabase
          .from("rooms")
          .select("*")
          .eq("project_id", id)
          .order("created_at", { ascending: false });

        if (roomsError) {
          throw roomsError;
        }

        // Create updated room map with new areas
        const roomMap = new Map(
          updatedRooms.map((room) => [room.name.toLowerCase(), room.id]),
        );

        // Process dates and convert to ISO format
        const processExcelDate = (
          excelDate: string | number | undefined,
        ): string | null => {
          if (!excelDate) return null;

          // If it's already a valid date string, return it
          if (typeof excelDate === "string" && !isNaN(Date.parse(excelDate))) {
            return new Date(excelDate).toISOString().split("T")[0];
          }

          // Convert Excel serial number to date
          const numericDate =
            typeof excelDate === "string" ? parseInt(excelDate) : excelDate;
          if (isNaN(numericDate)) return null;

          // Excel dates start from 1900-01-01
          const date = new Date(1900, 0, 1);
          date.setDate(date.getDate() + numericDate - 2); // Subtract 2 to account for Excel's date system quirks

          return date.toISOString().split("T")[0];
        };

        // Fetch existing items to check for duplicates
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

        // Create a map of existing items using room_id + name as key
        const existingItemsMap = new Map(
          existingItems?.map((item) => [
            `${item.room_id}-${item.name.toLowerCase()}`,
            item,
          ]) || [],
        );

        // Process items with duplicate checking
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

            // Check for duplicates using room_id + name combination
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
      // Transform items to include room information
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
      }));

      // Create workbook and add items sheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, "Items");

      // Export the file
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
      setAreaValue(""); // Reset area value after successful creation
      toast({
        title: "Success",
        description: "Area added successfully",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const floorNumber = formData.get("floor_number");
    createRoom.mutate({
      name: areaValue || (formData.get("name") as string),
      description: (formData.get("description") as string) || undefined,
      floor_number: floorNumber ? parseInt(floorNumber as string) : undefined,
      dimensions: (formData.get("dimensions") as string) || undefined,
    });
  };

  if (!project) {
    return <div>Loading...</div>;
  }

  const AreaCard = ({ room, itemCount }: { room: Room; itemCount: number }) => {
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [openAreaCombobox, setOpenAreaCombobox] = useState(false);
    const [areaValue, setAreaValue] = useState(room.name || "");
    const { toast } = useToast();

    // Add areas query
    const { data: areaTemplates } = useQuery({
      queryKey: ["areas"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("areas")
          .select("name")
          .order("name");

        if (error) throw error;
        return data.map((area) => area.name);
      },
    });

    const updateRoom = useMutation({
      mutationFn: async (data: {
        name: string;
        description?: string;
        floor_number?: number;
        dimensions?: string;
      }) => {
        const { error } = await supabase
          .from("rooms")
          .update(data)
          .eq("id", room.id);

        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["rooms", room.project_id] });
        setShowEditDialog(false);
        toast({
          title: "Success",
          description: "Area updated successfully",
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Error",
          description: error.message || "Failed to update area",
          variant: "destructive",
        });
      },
    });

    const deleteRoom = useMutation({
      mutationFn: async () => {
        const { error } = await supabase
          .from("rooms")
          .delete()
          .eq("id", room.id);

        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["rooms", room.project_id] });
        setShowDeleteDialog(false);
        toast({
          title: "Success",
          description: "Area deleted successfully",
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Error",
          description: error.message || "Failed to delete area",
          variant: "destructive",
        });
      },
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);

      const floorNumber = formData.get("floor_number");
      updateRoom.mutate({
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

        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
          <Button
            variant="ghost"
            size="icon"
            className="bg-background/80 backdrop-blur hover:bg-background/90"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowEditDialog(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="bg-background/80 backdrop-blur hover:bg-background/90 text-destructive"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowDeleteDialog(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

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
                      {areaTemplates?.length > 0 && (
                        <ScrollArea className="h-[300px] w-full overflow-y-auto">
                          {/* Height increased */}
                          <CommandGroup>
                            {areaTemplates.map((area) => (
                              <CommandItem
                                key={area}
                                value={area}
                                onSelect={(value) => {
                                  setAreaValue(value);
                                  setOpenAreaCombobox(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    areaValue === area
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                                {area}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </ScrollArea>
                      )}
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
                This will permanently delete "{room.name}" and all its items.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteRoom.mutate()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
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

  // Group filtered items by room
  const itemsByRoom = rooms?.reduce((acc, room) => {
    acc[room.id] = filteredItems?.filter((item) => item.room_id === room.id) || [];
    return acc;
  }, {} as Record<string, Item[]>);

  // Get total count of filtered items
  const totalFilteredItems = filteredItems?.length || 0;

  // Get base URL for QR code
  const baseUrl = window.location.origin;

  return (
    <div className="container mx-auto px-4 py-8">
      <NavBreadcrumb
        items={[
          { label: "Projects", href: "/dashboard" },
          { label: project?.name || "Project" },
        ]}
      />

      <div className="mb-8 bg-card rounded-lg p-6 shadow-sm border">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Project Info */}
          <div className="space-y-4">
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

          {/* Right Column - Actions */}
          <div className="flex flex-col gap-4 lg:items-end">
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => setShowPrintDialog(true)}
                className="flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Print Project
              </Button>

              <div className="flex items-center gap-2">
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
              </div>
            </div>
          </div>
        </div>

        {/* Search and Add Area Section */}
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
                        {areaTemplates?.length > 0 && (
                          <ScrollArea className="h-[300px] w-full overflow-y-auto">
                            <CommandGroup>
                              {areaTemplates.map((area) => (
                                <CommandItem
                                  key={area}
                                  value={area}
                                  onSelect={(value) => {
                                    setAreaValue(value);
                                    setOpenAreaCombobox(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      areaValue === area
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  {area}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </ScrollArea>
                        )}
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
        </div>

        {/* Display search results if there's a search query */}
        {searchQuery.trim() && (
          <div className="mt-6 space-y-4">
            <h2 className="text-lg font-semibold">Search Results</h2>
            <div className="grid gap-4">
              {filteredItems?.map((item) => {
                const room = rooms?.find(r => r.id === item.room_id);
                return (
                  <Card key={item.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h3 className="font-medium">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">Room: {room?.name}</p>
                        <p className="text-sm text-muted-foreground">Category: {item.category}</p>
                        {item.brand && (
                          <p className="text-sm text-muted-foreground">Brand: {item.brand}</p>
                        )}
                        {item.specifications && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {item.specifications}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Link href={`/room/${item.room_id}`}>
                          <Button variant="ghost" size="sm">View Details</Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                );
              })}
              {filteredItems?.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No items found matching your search.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Areas Grid - Only show if no search query */}
        {!searchQuery.trim() && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms?.map((room) => {
              const itemCount = itemCounts[room.id] || 0;
              return <AreaCard key={room.id} room={room} itemCount={itemCount} />;
            })}
          </div>
        )}
      </div>

      {/* Print Dialog */}
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Print Project Details</DialogTitle>
          </DialogHeader>
          <div className="h-[80vh] overflow-y-auto">
            {project && rooms && (
              <PrintView
                project={project!}
                rooms={rooms || []}
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