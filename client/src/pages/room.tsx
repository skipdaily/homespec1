import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import type { Room, Finish } from "@shared/schema";

interface RoomPageProps {
  id?: string;
}

export default function RoomPage({ id }: RoomPageProps) {
  const [open, setOpen] = useState(false);

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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Finish</DialogTitle>
            </DialogHeader>
            {/* We'll implement the finish form in the next step */}
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
            {finish.color && (
              <p className="text-sm text-muted-foreground">
                Color: {finish.color}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}