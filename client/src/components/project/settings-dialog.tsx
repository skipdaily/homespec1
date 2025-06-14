import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";

interface SettingsDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requirePin: boolean;
  editPin: string | null;
}

export function SettingsDialog({
  projectId,
  open,
  onOpenChange,
  requirePin,
  editPin,
}: SettingsDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(requirePin);
  const [pin, setPin] = useState(editPin || "");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (pinEnabled && (pin.length !== 4 || !/^\d+$/.test(pin))) {
      toast({
        title: "Invalid PIN",
        description: "Please enter a 4-digit PIN",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({
          require_pin: pinEnabled,
          edit_pin: pinEnabled ? pin : null,
        })
        .eq("id", projectId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast({
        title: "Success",
        description: "Project settings updated successfully",
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Project Settings</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="pin-required">Require PIN for Editing</Label>
            <Switch
              id="pin-required"
              checked={pinEnabled}
              onCheckedChange={setPinEnabled}
            />
          </div>
          
          {pinEnabled && (
            <div className="space-y-2">
              <Label htmlFor="edit-pin">Edit PIN (4 digits)</Label>
              <Input
                id="edit-pin"
                type="text"
                maxLength={4}
                pattern="\d{4}"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter 4-digit PIN"
                className="text-center text-2xl tracking-widest"
              />
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
