import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { Plus } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { Room, Finish } from "@shared/schema";

// Create a schema for the form that matches the database
const finishFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  manufacturer: z.string().optional(),
  supplier: z.string().optional(),
  color: z.string().optional(),
  material: z.string().optional(),
  dimensions: z.string().optional(),
  model_number: z.string().optional(),
  specifications: z.string().optional(),
  warranty_info: z.string().optional(),
  maintenance_instructions: z.string().optional(),
  installation_date: z.string().optional(),
  cost: z.number().optional(),
  document_urls: z.array(z.string()).optional(),
  image_url: z.string().optional(),
});

type FinishFormValues = z.infer<typeof finishFormSchema>;

interface RoomPageProps {
  id?: string;
}

export default function RoomPage({ id }: RoomPageProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  console.log("Room ID from props:", id);


  const form = useForm<FinishFormValues>({
    resolver: zodResolver(finishFormSchema),
    defaultValues: {
      name: "",
      category: "",
      manufacturer: "",
      supplier: "",
      color: "",
      material: "",
      dimensions: "",
      model_number: "",
      specifications: "",
      warranty_info: "",
      maintenance_instructions: "",
      installation_date: "",
      cost: undefined,
      document_urls: [],
      image_url: "",
    },
  });

  const { data: room } = useQuery<Room>({
    queryKey: ["room", id],
    queryFn: async () => {
      if (!id) throw new Error("No room ID provided");

      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id
  });
  console.log("Room data from query:", room);

  const { data: finishes } = useQuery<Finish[]>({
    queryKey: ["finishes", id],
    queryFn: async () => {
      if (!id) throw new Error("No room ID provided");

      const { data, error } = await supabase
        .from("finishes")
        .select("*")
        .eq("room_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const createFinish = useMutation({
    mutationFn: async (values: FinishFormValues) => {
      console.log("Creating finish with values:", values);
      if (!id || !room) throw new Error("No room ID provided");

      try {
        const { data, error } = await supabase
          .from("finishes")
          .insert([{
            name: values.name,
            category: values.category,
            manufacturer: values.manufacturer || null,
            supplier: values.supplier || null,
            color: values.color || null,
            material: values.material || null,
            dimensions: values.dimensions || null,
            model_number: values.model_number || null,
            specifications: values.specifications || null,
            warranty_info: values.warranty_info || null,
            maintenance_instructions: values.maintenance_instructions || null,
            installation_date: values.installation_date || null,
            cost: values.cost || null,
            room_id: id, // This should already be a UUID from the route
            document_urls: [],
            image_url: null
          }])
          .select()
          .single();

        if (error) {
          console.error("Supabase error details:", {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          throw new Error(`Failed to save finish: ${error.message}`);
        }

        if (!data) {
          throw new Error("No data returned from database");
        }

        console.log("Successfully created finish:", data);
        return data;
      } catch (error: any) {
        console.error("Error creating finish:", {
          name: error.name,
          message: error.message,
          stack: error.stack,
          cause: error.cause
        });
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Mutation succeeded with data:", data);
      queryClient.invalidateQueries({ queryKey: ["finishes", id] });
      setOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Finish added successfully"
      });
    },
    onError: (error: Error) => {
      console.error("Mutation failed:", error);
      toast({
        title: "Failed to save finish",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const onSubmit = (values: FinishFormValues) => {
    console.log("Form submitted with values:", values);
    console.log("Current room ID:", id);
    console.log("Current room data:", room);
    createFinish.mutate(values);
  };

  if (!room) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">{room.name}</h1>
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
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Finish
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Add New Finish</DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <ScrollArea className="h-[65vh] px-4">
                  <div className="space-y-4 pr-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name*</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter finish name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category*</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Paint, Flooring" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="manufacturer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Manufacturer</FormLabel>
                            <FormControl>
                              <Input placeholder="Manufacturer name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="supplier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Supplier</FormLabel>
                            <FormControl>
                              <Input placeholder="Supplier name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Color</FormLabel>
                            <FormControl>
                              <Input placeholder="Color" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="material"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Material</FormLabel>
                            <FormControl>
                              <Input placeholder="Material type" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="dimensions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dimensions</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 10x12" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="model_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Model Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Model number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="specifications"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Specifications</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Product specifications" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="warranty_info"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Warranty Information</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Warranty details" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="maintenance_instructions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Maintenance Instructions</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Maintenance details" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="installation_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Installation Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="cost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cost</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...field}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value === "" ? undefined : parseFloat(value));
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </ScrollArea>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createFinish.isPending}
                >
                  {createFinish.isPending ? "Saving..." : "Save Finish"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {finishes?.map((finish) => (
          <div key={finish.id} className="border rounded-lg p-4">
            <h3 className="font-semibold">{finish.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Category: {finish.category}
            </p>
            {finish.manufacturer && (
              <p className="text-sm text-muted-foreground">
                Manufacturer: {finish.manufacturer}
              </p>
            )}
            {finish.supplier && (
              <p className="text-sm text-muted-foreground">
                Supplier: {finish.supplier}
              </p>
            )}
            {finish.color && (
              <p className="text-sm text-muted-foreground">
                Color: {finish.color}
              </p>
            )}
            {finish.material && (
              <p className="text-sm text-muted-foreground">
                Material: {finish.material}
              </p>
            )}
            {finish.dimensions && (
              <p className="text-sm text-muted-foreground">
                Dimensions: {finish.dimensions}
              </p>
            )}
            {finish.model_number && (
              <p className="text-sm text-muted-foreground">
                Model: {finish.model_number}
              </p>
            )}
            {finish.specifications && (
              <p className="text-sm text-muted-foreground">
                Specifications: {finish.specifications}
              </p>
            )}
            {finish.warranty_info && (
              <p className="text-sm text-muted-foreground">
                Warranty: {finish.warranty_info}
              </p>
            )}
            {finish.maintenance_instructions && (
              <p className="text-sm text-muted-foreground">
                Maintenance: {finish.maintenance_instructions}
              </p>
            )}
            {finish.installation_date && (
              <p className="text-sm text-muted-foreground">
                Installed: {finish.installation_date}
              </p>
            )}
            {finish.cost !== null && (
              <p className="text-sm text-muted-foreground">
                Cost: ${typeof finish.cost === 'number' ? finish.cost.toFixed(2) : finish.cost}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}