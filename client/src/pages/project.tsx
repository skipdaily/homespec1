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
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import type { Project, Room } from "@shared/schema";

export default function ProjectPage({ params }: { params: { id: string } }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const projectId = params.id;

  const { data: project } = useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error) throw error;
      return data;
    }
  });

  const { data: rooms } = useQuery<Room[]>({
    queryKey: ["rooms", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const createRoom = useMutation({
    mutationFn: async (data: {
      name: string;
      description: string;
      floor_number?: number;
      room_type?: string;
      dimensions?: string;
    }) => {
      const { error } = await supabase
        .from("rooms")
        .insert([{ ...data, project_id: projectId }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms", projectId] });
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
      description: formData.get("description") as string,
      floor_number: floorNumber ? parseInt(floorNumber as string) : undefined,
      room_type: formData.get("room_type") as string || undefined,
      dimensions: formData.get("dimensions") as string || undefined
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">{project?.name}</h1>
          <p className="text-muted-foreground">{project?.description}</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Room
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Room</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input 
                name="name"
                placeholder="Room Name*"
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
                  name="room_type"
                  placeholder="Room Type"
                />
              </div>
              <Input 
                name="dimensions"
                placeholder="Dimensions (e.g., 12' x 15')"
              />
              <Button type="submit" className="w-full">
                Add Room
              </Button>
            </form>
          </DialogContent>
        </Dialog>
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
                {room.room_type && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Type: {room.room_type}
                  </p>
                )}
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
