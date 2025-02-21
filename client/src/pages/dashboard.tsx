import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import type { Project } from "@shared/schema";

interface ProjectFormData {
  name: string;
  address: string;
  builder_name: string;
  completion_date?: string;
}

export default function Dashboard() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [, setLocation] = useLocation();

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
    mutationFn: async (data: ProjectFormData) => {
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
      setCreateDialogOpen(false);
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

  const updateProject = useMutation({
    mutationFn: async (data: ProjectFormData & { id: string }) => {
      const { data: updatedProject, error } = await supabase
        .from("projects")
        .update({
          name: data.name,
          address: data.address,
          builder_name: data.builder_name,
          completion_date: data.completion_date || null,
        })
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return updatedProject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setEditDialogOpen(false);
      setSelectedProject(null);
      toast({
        title: "Success",
        description: "Project updated successfully"
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

  const deleteProject = useMutation({
    mutationFn: async (projectId: string) => {
      // First, get all rooms for this project
      const { data: rooms } = await supabase
        .from("rooms")
        .select("id")
        .eq('project_id', projectId);

      if (rooms && rooms.length > 0) {
        const roomIds = rooms.map(room => room.id);

        // Delete all item history records for items in these rooms
        const { error: itemHistoryError } = await supabase
          .from("item_history")
          .delete()
          .in('room_id', roomIds);

        if (itemHistoryError) throw itemHistoryError;

        // Delete all items in these rooms
        const { error: itemsError } = await supabase
          .from("items")
          .delete()
          .in('room_id', roomIds);

        if (itemsError) throw itemsError;

        // Delete all rooms
        const { error: roomsError } = await supabase
          .from("rooms")
          .delete()
          .eq('project_id', projectId);

        if (roomsError) throw roomsError;
      }

      // Finally delete the project
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq('id', projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setDeleteDialogOpen(false);
      setSelectedProject(null);
      toast({
        title: "Success",
        description: "Project and all related data deleted successfully"
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>, isEdit: boolean = false) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      address: formData.get("address") as string,
      builder_name: formData.get("builder_name") as string,
      completion_date: formData.get("completion_date") as string || undefined,
    };

    if (isEdit && selectedProject) {
      updateProject.mutate({ ...data, id: selectedProject.id });
    } else {
      createProject.mutate(data);
    }
  };

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    setEditDialogOpen(true);
  };

  const handleDelete = (project: Project) => {
    setSelectedProject(project);
    setDeleteDialogOpen(true);
  };

  if (isSessionLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center">Please <Link href="/login" className="text-primary hover:underline">login</Link> to view your projects</p>
      </div>
    );
  }

  if (isProjectsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center">Loading your projects...</p>
      </div>
    );
  }

  const ProjectForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <form onSubmit={(e) => handleSubmit(e, isEdit)} className="space-y-4">
      <Input
        name="name"
        placeholder="Project Name"
        required
        defaultValue={isEdit ? selectedProject?.name : ''}
      />
      <Input
        name="address"
        placeholder="Property Address"
        required
        defaultValue={isEdit ? selectedProject?.address : ''}
      />
      <Input
        name="builder_name"
        placeholder="Builder Name"
        required
        defaultValue={isEdit ? selectedProject?.builder_name : ''}
      />
      <Input
        type="date"
        name="completion_date"
        placeholder="Expected Completion Date (Optional)"
        defaultValue={isEdit ? selectedProject?.completion_date : ''}
      />
      <Button
        type="submit"
        className="w-full"
        disabled={isEdit ? updateProject.isPending : createProject.isPending}
      >
        {isEdit
          ? (updateProject.isPending ? "Updating..." : "Update Project")
          : (createProject.isPending ? "Creating..." : "Create Project")}
      </Button>
    </form>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Projects</h1>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
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
            <ProjectForm />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects?.map((project) => (
          <Card key={project.id} className="hover:bg-muted/50 transition-colors">
            <CardHeader>
              <CardTitle>{project.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Address: {project.address}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Builder: {project.builder_name}
              </p>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="ghost" asChild>
                <Link href={`/project/${project.id}`}>View Details</Link>
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.preventDefault();
                    handleEdit(project);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete(project);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update your project details.
            </DialogDescription>
          </DialogHeader>
          <ProjectForm isEdit />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project "{selectedProject?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedProject && deleteProject.mutate(selectedProject.id)}
              disabled={deleteProject.isPending}
            >
              {deleteProject.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}