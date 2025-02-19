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

// Create a simplified schema for the form
const finishFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  manufacturer: z.string().optional(),
  supplier: z.string().optional(),
  color: z.string().optional(),
  material: z.string().optional(),
});

type FinishFormValues = z.infer<typeof finishFormSchema>;

interface RoomPageProps {
  id?: string;
}

export default function RoomPage({ id }: RoomPageProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<FinishFormValues>({
    resolver: zodResolver(finishFormSchema),
    defaultValues: {
      name: "",
      category: "",
      manufacturer: "",
      supplier: "",
      color: "",
      material: "",
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

      const { data, error } = await supabase
        .from("finishes")
        .insert([{
          ...values,
          room_id: id,
          project_id: room.project_id
        }])
        .select()
        .single();

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finishes", id] });
      setOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Finish added successfully"
      });
    },
    onError: (error: Error) => {
      console.error("Error creating finish:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const onSubmit = (values: FinishFormValues) => {
    console.log("Form submitted with values:", values);
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Finish</DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name*</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter finish name" />
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
                        <Input {...field} placeholder="e.g., Paint, Flooring" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="manufacturer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manufacturer</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Manufacturer name" />
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
                        <Input {...field} placeholder="Supplier name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Color" />
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
                        <Input {...field} placeholder="Material type" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
          </div>
        ))}
      </div>
    </div>
  );
}