import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
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
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { insertFinishSchema } from "@shared/schema";
import type { Room, Finish, InsertFinish } from "@shared/schema";

interface RoomPageProps {
  id?: string;
}

export default function RoomPage({ id }: RoomPageProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<InsertFinish>({
    resolver: zodResolver(insertFinishSchema),
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
      cost: undefined,
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
    mutationFn: async (data: Partial<InsertFinish>) => {
      if (!id) throw new Error("No room ID provided");

      const { error } = await supabase
        .from("finishes")
        .insert([{
          ...data,
          room_id: id,
          project_id: room?.project_id
        }]);

      if (error) throw error;
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
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const onSubmit = async (data: InsertFinish) => {
    try {
      await createFinish.mutateAsync(data);
    } catch (error) {
      console.error('Error creating finish:', error);
    }
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Add New Finish</DialogTitle>
              <h2 className="text-lg font-medium mt-2">Material</h2>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <Button
                  type="submit"
                  className="w-full mb-6"
                  disabled={createFinish.isPending}
                >
                  {createFinish.isPending ? (
                    <>Saving...</>
                  ) : (
                    <>Save Finish</>
                  )}
                </Button>

                <ScrollArea className="h-[60vh]">
                  <div className="space-y-4 pr-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name*</FormLabel>
                          <FormControl>
                            <Input placeholder="Finish name" {...field} value={field.value || ''} />
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
                            <Input placeholder="e.g., Paint, Flooring, Hardware" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="manufacturer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Manufacturer</FormLabel>
                            <FormControl>
                              <Input placeholder="Manufacturer name" {...field} value={field.value || ''} />
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
                              <Input placeholder="Supplier name" {...field} value={field.value || ''} />
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
                              <Input placeholder="Color" {...field} value={field.value || ''} />
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
                              <Input placeholder="Material type" {...field} value={field.value || ''} />
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
                              <Input placeholder="Dimensions" {...field} value={field.value || ''} />
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
                              <Input placeholder="Model number" {...field} value={field.value || ''} />
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
                            <Textarea placeholder="Product specifications" {...field} value={field.value || ''} />
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
                              <Textarea placeholder="Warranty details" {...field} value={field.value || ''} />
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
                              <Textarea placeholder="Maintenance details" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cost (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Cost"
                              {...field}
                              value={field.value === undefined ? '' : field.value}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(value === '' ? undefined : parseFloat(value));
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </ScrollArea>
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
            {finish.cost && (
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