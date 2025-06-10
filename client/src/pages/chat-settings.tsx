import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiGet, apiPut } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Settings, Brain, Shield, Globe } from "lucide-react";
import { Link, useParams } from "wouter";
import type { ChatSettings } from "@shared/schema";

interface ChatSettingsPageProps {}

export default function ChatSettingsPage({}: ChatSettingsPageProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const { toast } = useToast();
  const [settings, setSettings] = useState<Partial<ChatSettings>>({
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.7,
    max_tokens: 1000,
    system_prompt: "",
    restrict_to_project_data: true,
    enable_web_search: false,
    max_conversation_length: 50,
  });

  // Fetch current settings
  const { data: currentSettings, isLoading } = useQuery({
    queryKey: ["chat-settings", projectId],
    queryFn: async () => {
      return await apiGet<ChatSettings>(`/api/projects/${projectId}/chat-settings`);
    },
    enabled: !!projectId,
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<ChatSettings>) => {
      return await apiPut<ChatSettings>(`/api/projects/${projectId}/chat-settings`, newSettings);
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Chat settings have been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["chat-settings", projectId] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (currentSettings) {
      setSettings(currentSettings);
    }
  }, [currentSettings]);

  const handleSave = () => {
    updateSettingsMutation.mutate(settings);
  };

  const providerModels = {
    openai: [
      { value: "gpt-4o", label: "GPT-4 Omni" },
      { value: "gpt-4o-mini", label: "GPT-4 Omni Mini" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
      { value: "gpt-4", label: "GPT-4" },
      { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    ],
    anthropic: [
      { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
      { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
      { value: "claude-3-opus-20240229", label: "Claude 3 Opus" },
      { value: "claude-3-sonnet-20240229", label: "Claude 3 Sonnet" },
    ],
    gemini: [
      { value: "gemini-pro", label: "Gemini Pro" },
      { value: "gemini-pro-vision", label: "Gemini Pro Vision" },
    ],
    ollama: [
      { value: "llama2", label: "Llama 2" },
      { value: "codellama", label: "Code Llama" },
      { value: "mistral", label: "Mistral" },
    ],
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href={`/project/${projectId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Project
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">Chat Settings</h1>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* LLM Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                AI Model Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="provider">AI Provider</Label>
                <Select
                  value={settings.provider}
                  onValueChange={(value) =>
                    setSettings({ ...settings, provider: value as any, model: providerModels[value as keyof typeof providerModels][0]?.value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                    <SelectItem value="ollama">Ollama (Local)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Select
                  value={settings.model}
                  onValueChange={(value) => setSettings({ ...settings, model: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {providerModels[settings.provider as keyof typeof providerModels]?.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="temperature">
                  Temperature: {settings.temperature}
                </Label>
                <Slider
                  value={[Number(settings.temperature) || 0.7]}
                  onValueChange={([value]) => setSettings({ ...settings, temperature: value })}
                  max={2}
                  min={0}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-sm text-gray-500">
                  Controls randomness. Lower values are more focused, higher values are more creative.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_tokens">Max Tokens</Label>
                <Input
                  type="number"
                  value={settings.max_tokens}
                  onChange={(e) => setSettings({ ...settings, max_tokens: parseInt(e.target.value) })}
                  min="1"
                  max="4000"
                />
                <p className="text-sm text-gray-500">
                  Maximum length of AI responses (1-4000 tokens).
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Chat Behavior */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Chat Restrictions & Behavior
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="restrict_to_project_data">Restrict to Project Data</Label>
                  <p className="text-sm text-gray-500">
                    Only use information from this specific project
                  </p>
                </div>
                <Switch
                  checked={settings.restrict_to_project_data}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, restrict_to_project_data: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="enable_web_search">Enable Web Search</Label>
                  <p className="text-sm text-gray-500">
                    Allow AI to search the web for additional information
                  </p>
                </div>
                <Switch
                  checked={settings.enable_web_search}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enable_web_search: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_conversation_length">Max Conversation Length</Label>
                <Input
                  type="number"
                  value={settings.max_conversation_length}
                  onChange={(e) =>
                    setSettings({ ...settings, max_conversation_length: parseInt(e.target.value) })
                  }
                  min="10"
                  max="100"
                />
                <p className="text-sm text-gray-500">
                  Maximum number of messages to keep in conversation context.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* System Prompt */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-green-600" />
                System Prompt
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="system_prompt">Custom Instructions</Label>
                <Textarea
                  value={settings.system_prompt || ""}
                  onChange={(e) => setSettings({ ...settings, system_prompt: e.target.value })}
                  placeholder="Enter custom instructions for the AI assistant..."
                  rows={6}
                  className="resize-none"
                />
                <p className="text-sm text-gray-500">
                  These instructions will be given to the AI at the start of every conversation.
                  Leave empty to use the default prompt.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={updateSettingsMutation.isPending}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
