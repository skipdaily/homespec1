import { useState } from "react";
import { useLocation, Link } from "wouter";
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
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { Project } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

  // Get current user session with proper loading state
  const { data: session, isLoading: isSessionLoading } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
    retry: false
  });

  const { data: projects, isLoading: isProjectsLoading } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      if (!session?.user?.id) return [];

      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq('user_id', session.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching projects:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!session?.user?.id
  });

  const createProject = useMutation({
    mutationFn: async (data: { 
      name: string; 
      address: string; 
      builder_name: string; 
      completion_date?: string; 
    }) => {
      if (!session?.user?.id) {
        throw new Error("Please login to create a project");
      }

      const access_code = Math.random().toString(36).substring(2, 12);

      const { data: newProject, error } = await supabase
        .from("projects")
        .insert([{
          user_id: session.user.id,
          name: data.name,
          address: data.address,
          builder_name: data.builder_name,
          completion_date: data.completion_date || null,
          access_code,
        }])
        .select()
        .single();

      if (error) {
        console.error("Project creation error:", error);
        throw error;
      }

      return newProject;
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setOpen(false);
      toast({
        title: "Success",
        description: "Project created successfully"
      });
      setLocation(`/project/${newProject.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createProject.mutate({
      name: formData.get("name") as string,
      address: formData.get("address") as string,
      builder_name: formData.get("builder_name") as string,
      completion_date: formData.get("completion_date") as string || undefined,
    });
  };

  // Show loading state while checking session
  if (isSessionLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center">Loading...</p>
      </div>
    );
  }

  // Show login message if no session
  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center">Please <Link href="/login" className="text-primary hover:underline">login</Link> to view your projects</p>
      </div>
    );
  }

  // Show loading state while fetching projects
  if (isProjectsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center">Loading your projects...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Projects</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Add a new home project to document its finishes and materials.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                name="name"
                placeholder="Project Name"
                required
              />
              <Input
                name="address"
                placeholder="Property Address"
                required
              />
              <Input
                name="builder_name"
                placeholder="Builder Name"
                required
              />
              <Input
                type="date"
                name="completion_date"
                placeholder="Expected Completion Date (Optional)"
              />
              <Button
                type="submit"
                className="w-full"
                disabled={createProject.isPending}
              >
                {createProject.isPending ? "Creating..." : "Create Project"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects?.map((project) => (
          <Link key={project.id} href={`/project/${project.id}`}>
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardHeader>
                <CardTitle>{project.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Address: {project.address}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Builder: {project.builder_name}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}