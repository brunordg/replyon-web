import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, Trash2, Send, CheckCircle2, Edit2 } from "lucide-react";
import { useChatbotFlows, useCreateFlow, usePublishFlow, useDeleteFlow, useUpdateFlow } from "@/lib/api/hooks/chatbot-flows";
import { Badge } from "@/components/ui/badge";
import { ChatbotFlowEditor } from "@/components/chatbot-flow-editor";

export const Route = createFileRoute("/chatbot-flows")({
  component: ChatbotFlowsPage,
  head: () => ({
    meta: [
      { title: "Fluxos de Chatbot — Replyon" },
      { name: "description", content: "Crie e gerencie fluxos de conversa personalizados para sua empresa." },
    ],
  }),
});

function ChatbotFlowsPage() {
  const { data: flows = [], isLoading, refetch } = useChatbotFlows();
  const createFlow = useCreateFlow();
  const updateFlow = useUpdateFlow("");
  const publishFlow = usePublishFlow();
  const deleteFlow = useDeleteFlow();

  const [selectedFlow, setSelectedFlow] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newFlowName, setNewFlowName] = useState("");

  const handleCreateFlow = () => {
    if (!newFlowName.trim()) return;

    createFlow.mutate(
      {
        name: newFlowName,
        description: "",
        definition: {
          nodes: [
            {
              id: "n1",
              type: "message",
              content: "Olá! Bem-vindo. Qual é o seu nome?",
              config: {},
            },
          ],
          edges: [],
          rootNodeId: "n1",
        },
      },
      {
        onSuccess: (data) => {
          setSelectedFlow(data);
          setNewFlowName("");
          setIsCreating(false);
          refetch();
        },
      }
    );
  };

  const handlePublish = (flowId: string) => {
    publishFlow.mutate(flowId, {
      onSuccess: () => {
        refetch();
      },
    });
  };

  const handleDelete = (flowId: string) => {
    deleteFlow.mutate(flowId, {
      onSuccess: () => {
        setSelectedFlow(null);
        refetch();
      },
    });
  };

  const handleSaveEdits = (definition: any) => {
    if (!selectedFlow) return;
    updateFlow.mutate(
      { definition },
      {
        onSuccess: () => {
          setIsEditing(false);
          refetch();
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fluxos de Chatbot"
        description="Crie e gerencie fluxos de conversa personalizados para sua empresa"
      />

      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        {/* Left Panel: Flow List */}
        <Card className="p-4 h-fit">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Fluxos</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsCreating(true)}
                disabled={isCreating}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {isCreating && (
              <div className="space-y-2 p-3 border rounded-lg bg-muted">
                <Input
                  placeholder="Nome do fluxo"
                  value={newFlowName}
                  onChange={(e) => setNewFlowName(e.target.value)}
                  disabled={createFlow.isPending}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleCreateFlow}
                    disabled={!newFlowName.trim() || createFlow.isPending}
                  >
                    {createFlow.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Criar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsCreating(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {flows.map((flow: any) => (
                  <button
                    key={flow.id}
                    onClick={() => setSelectedFlow(flow)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedFlow?.id === flow.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-muted border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 truncate">
                        <div className="font-medium text-sm truncate">{flow.name}</div>
                        <div className="text-xs opacity-70">{flow.description || "Sem descrição"}</div>
                      </div>
                      {flow.isActive && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
                    </div>
                    <Badge variant="secondary" className="text-xs mt-2">
                      {flow.status}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Right Panel: Flow Editor */}
        <div className="space-y-4">
          {selectedFlow ? (
            <>
              <Card className="p-6">
                <div className="space-y-4">
                  <div>
                    <Label>Nome</Label>
                    <Input value={selectedFlow.name} readOnly className="mt-1" />
                  </div>

                  <div>
                    <Label>Descrição</Label>
                    <Input value={selectedFlow.description || ""} readOnly className="mt-1" />
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{selectedFlow.definition?.nodes?.length || 0}</div>
                      <div className="text-xs text-muted-foreground">Nós</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{selectedFlow.definition?.edges?.length || 0}</div>
                      <div className="text-xs text-muted-foreground">Conexões</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{selectedFlow.version}</div>
                      <div className="text-xs text-muted-foreground">Versão</div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Editor Visual</h3>
                  {selectedFlow.status === "DRAFT" && (
                    <Button
                      size="sm"
                      variant={isEditing ? "default" : "outline"}
                      onClick={() => setIsEditing(!isEditing)}
                      className="gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      {isEditing ? "Visualizar" : "Editar"}
                    </Button>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-4">
                    <ChatbotFlowEditor
                      definition={selectedFlow.definition}
                      onChange={handleSaveEdits}
                      readOnly={false}
                    />
                  </div>
                ) : (
                  <ChatbotFlowEditor
                    definition={selectedFlow.definition}
                    onChange={() => {}}
                    readOnly={true}
                  />
                )}
              </Card>

              <div className="flex gap-2 pt-4">
                {selectedFlow.status === "DRAFT" && (
                  <Button
                    onClick={() => handlePublish(selectedFlow.id)}
                    disabled={publishFlow.isPending}
                    className="gap-2"
                  >
                    {publishFlow.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Send className="w-4 h-4" />
                    Publicar
                  </Button>
                )}

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="gap-2">
                      <Trash2 className="w-4 h-4" />
                      Deletar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Deletar fluxo?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. O fluxo "{selectedFlow.name}" será deletado permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(selectedFlow.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Deletar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          ) : (
            <Card className="p-12 flex items-center justify-center text-center">
              <div className="space-y-2">
                <p className="text-muted-foreground">Nenhum fluxo selecionado</p>
                <p className="text-sm text-muted-foreground">Crie um novo fluxo ou selecione um existente para começar</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Info Section */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>💡 Dica:</strong> Os fluxos de chatbot permitem que você customize o comportamento da conversa com seus clientes.
          Use nós de mensagem, escolha, condição e ação para criar fluxos complexos.
        </p>
      </Card>
    </div>
  );
}
