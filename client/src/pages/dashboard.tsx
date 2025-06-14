import { useState, useEffect } from "react";
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
  // All useState hooks
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // All location/navigation hooks
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Query hooks
  const { data: session, isLoading: isSessionLoading } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    }
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

      if (error) throw error;
      return data || [];
    },
    enabled: !!session?.user?.id
  });

  // Effect hooks - removed redundant auth check since PrivateRoute handles it

  // Mutation hooks
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

      if (error) throw error;
      return newProject;
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Project created successfully"
      });
      navigate(`/project/${newProject.id}`);
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
        description: "Project deleted successfully"
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

  // Event handlers
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
    navigate("/login");
  };

  // Loading states
  if (isSessionLoading || isProjectsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <p>Loading...</p>
      </div>
    );
  }

  // Auth check
  if (!session) {
    return null;
  }

  // Render methods
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
      />        <Input
          type="date"
          name="completion_date"
          placeholder="Expected Completion Date (Optional)"
          defaultValue={isEdit ? (selectedProject?.completion_date || '') : ''}
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50/30 to-purple-50/20">
      <header className="border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-2 rounded-xl shadow-md">
              <Home className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              HomeSpec
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10 ring-2 ring-white shadow-md">
                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
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
            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              My Projects
            </h1>
            <p className="text-slate-600 mt-1">
              Manage and track your home renovation projects
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20 transition-all duration-300"
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
              <Card className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 border border-blue-100 bg-white rounded-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50/30 pb-4">
                  <CardTitle className="text-xl flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{project.name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-5">
                  <div className="space-y-3">
                    <p className="text-slate-700 flex items-center">
                      <span className="font-medium mr-2 text-blue-700">Address:</span>
                      {project.address}
                    </p>
                    <p className="text-sm text-slate-600 flex items-center">
                      <span className="font-medium mr-2 text-indigo-600">Builder:</span>
                      {project.builder_name}
                    </p>
                    {project.created_at && (
                      <div className="flex items-center text-sm text-slate-500 space-x-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between bg-gradient-to-r from-blue-50/50 to-indigo-50/50 backdrop-blur supports-[backdrop-filter]:bg-white/5 border-t border-blue-100">
                  <Button
                    variant="ghost"
                    asChild
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50/80 transition-colors duration-200"
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
                      className="hover:bg-blue-50/80 text-blue-600 hover:text-blue-700 transition-colors duration-200"
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
                      className="hover:bg-red-50/80 text-red-500 hover:text-red-600 transition-colors duration-200"
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