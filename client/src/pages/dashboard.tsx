import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { Plus, Pencil, Trash2, Home, User, Settings, LogOut, Clock } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { motion } from "framer-motion";
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
      const { data: rooms } = await supabase
        .from("rooms")
        .select("id")
        .eq('project_id', projectId);

      if (rooms && rooms.length > 0) {
        const roomIds = rooms.map(room => room.id);

        const { error: itemHistoryError } = await supabase
          .from("item_history")
          .delete()
          .in('room_id', roomIds);

        if (itemHistoryError) throw itemHistoryError;

        const { error: itemsError } = await supabase
          .from("items")
          .delete()
          .in('room_id', roomIds);

        if (itemsError) throw itemsError;

        const { error: roomsError } = await supabase
          .from("rooms")
          .delete()
          .eq('project_id', projectId);

        if (roomsError) throw roomsError;
      }

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLocation("/login");
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-2 rounded-xl shadow-sm">
              <Home className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">
              HomeSpec
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10 ring-2 ring-background">
                    <AvatarFallback className="bg-gradient-to-r from-primary/20 to-primary/10 text-primary">
                      {session?.user?.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex items-center text-destructive focus:text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80">
              My Projects
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage and track your home renovation projects
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary/85 text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300"
              >
                <Plus className="mr-2 h-5 w-5" />
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
          {projects?.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50 bg-gradient-to-br from-card to-card/95">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/2 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader>
                  <CardTitle className="text-xl flex items-center justify-between">
                    <span className="font-semibold text-foreground/90">{project.name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-muted-foreground flex items-center">
                      <span className="font-medium mr-2">Address:</span>
                      {project.address}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center">
                      <span className="font-medium mr-2">Builder:</span>
                      {project.builder_name}
                    </p>
                    {project.created_at && (
                      <div className="flex items-center text-sm text-muted-foreground space-x-2">
                        <Clock className="h-4 w-4 text-primary/60" />
                        <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between bg-muted/50 backdrop-blur supports-[backdrop-filter]:bg-white/5">
                  <Button
                    variant="ghost"
                    asChild
                    className="text-primary hover:text-primary hover:bg-primary/10 transition-colors duration-200"
                  >
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
                      className="hover:bg-primary/10 text-primary hover:text-primary transition-colors duration-200"
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
                      className="hover:bg-destructive/10 text-destructive hover:text-destructive transition-colors duration-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </motion.div>
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
                This will permanently delete the project "{selectedProject?.name}" and all associated data. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedProject && deleteProject.mutate(selectedProject.id)}
                disabled={deleteProject.isPending}
                className="bg-destructive hover:bg-destructive/90"
              >
                {deleteProject.isPending ? "Deleting..." : "Delete Project"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}