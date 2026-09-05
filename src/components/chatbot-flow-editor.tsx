import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Copy } from "lucide-react";

interface FlowNode {
  id: string;
  type: "message" | "choice" | "condition" | "action";
  content: string;
  config: Record<string, any>;
}

interface FlowEdge {
  from: string;
  to: string;
  condition: Record<string, any> | null;
  label: string | null;
}

interface FlowDefinition {
  nodes: FlowNode[];
  edges: FlowEdge[];
  rootNodeId: string;
}

interface ChatbotFlowEditorProps {
  definition: FlowDefinition | undefined;
  onChange: (definition: FlowDefinition) => void;
  readOnly?: boolean;
}

export function ChatbotFlowEditor({ definition, onChange, readOnly = false }: ChatbotFlowEditorProps) {
  const [nodes, setNodes] = useState<FlowNode[]>(definition?.nodes || []);
  const [edges, setEdges] = useState<FlowEdge[]>(definition?.edges || []);
  const [rootNodeId, setRootNodeId] = useState(definition?.rootNodeId || "n1");
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [newNodeType, setNewNodeType] = useState<"message" | "choice" | "condition" | "action">("message");

  useEffect(() => {
    if (!readOnly) {
      onChange({ nodes, edges, rootNodeId });
    }
  }, [nodes, edges, rootNodeId, readOnly, onChange]);

  const generateNodeId = useCallback(() => {
    const maxNum = Math.max(
      0,
      ...nodes.map((n) => {
        const match = n.id.match(/n(\d+)/);
        return match ? parseInt(match[1]) : 0;
      })
    );
    return `n${maxNum + 1}`;
  }, [nodes]);

  const addNode = useCallback(() => {
    const newId = generateNodeId();
    const newNode: FlowNode = {
      id: newId,
      type: newNodeType,
      content:
        newNodeType === "message"
          ? "Nova mensagem"
          : newNodeType === "choice"
            ? "Escolha uma opção"
            : newNodeType === "condition"
              ? "Verificar condição"
              : "Executar ação",
      config: {},
    };
    setNodes([...nodes, newNode]);
    setSelectedNode(newNode);
  }, [nodes, newNodeType, generateNodeId]);

  const updateNode = useCallback(
    (nodeId: string, updates: Partial<FlowNode>) => {
      setNodes(nodes.map((n) => (n.id === nodeId ? { ...n, ...updates } : n)));
      setSelectedNode({ ...selectedNode!, ...updates });
    },
    [nodes, selectedNode]
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes(nodes.filter((n) => n.id !== nodeId));
      setEdges(edges.filter((e) => e.from !== nodeId && e.to !== nodeId));
      setSelectedNode(null);
    },
    [nodes, edges]
  );

  const addEdge = useCallback(
    (from: string, to: string) => {
      const newEdge: FlowEdge = { from, to, condition: null, label: null };
      setEdges([...edges, newEdge]);
    },
    [edges]
  );

  const deleteEdge = useCallback(
    (index: number) => {
      setEdges(edges.filter((_, i) => i !== index));
    },
    [edges]
  );

  if (readOnly) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold mb-3">Nós ({nodes.length})</h3>
          <div className="grid gap-2 max-h-[300px] overflow-y-auto">
            {nodes.map((node) => (
              <Card key={node.id} className="p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-mono font-semibold text-xs">{node.id}</div>
                    <div className="text-muted-foreground">{node.type}</div>
                  </div>
                  <div className="text-xs bg-muted px-2 py-1 rounded">
                    {node.content.substring(0, 15)}...
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-3">Conexões ({edges.length})</h3>
          <div className="grid gap-2 max-h-[200px] overflow-y-auto">
            {edges.map((edge, idx) => (
              <Card key={idx} className="p-2 text-sm">
                {edge.from} → {edge.to}
                {edge.label && <span className="text-xs text-muted-foreground ml-2">({edge.label})</span>}
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="nodes" className="w-full">
      <TabsList>
        <TabsTrigger value="nodes">Nós</TabsTrigger>
        <TabsTrigger value="edges">Conexões</TabsTrigger>
        <TabsTrigger value="settings">Configuração</TabsTrigger>
      </TabsList>

      {/* Nodes Tab */}
      <TabsContent value="nodes" className="space-y-4">
        <div className="flex gap-2">
          <Select value={newNodeType} onValueChange={(v) => setNewNodeType(v as any)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="message">Mensagem</SelectItem>
              <SelectItem value="choice">Escolha</SelectItem>
              <SelectItem value="condition">Condição</SelectItem>
              <SelectItem value="action">Ação</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={addNode} className="gap-2">
            <Plus className="w-4 h-4" />
            Adicionar Nó
          </Button>
        </div>

        <div className="grid gap-2 max-h-[400px] overflow-y-auto">
          {nodes.map((node) => (
            <Card
              key={node.id}
              className={`p-4 cursor-pointer transition-colors ${
                selectedNode?.id === node.id ? "border-primary bg-primary/5" : ""
              }`}
              onClick={() => setSelectedNode(node)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-2">
                  <div className="font-mono font-semibold text-sm">{node.id}</div>
                  <div className="text-xs px-2 py-1 bg-muted rounded w-fit">{node.type}</div>
                  <Input
                    value={node.content}
                    onChange={(e) => updateNode(node.id, { content: e.target.value })}
                    className="text-sm"
                    placeholder="Conteúdo do nó"
                  />
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteNode(node.id)}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </TabsContent>

      {/* Edges Tab */}
      <TabsContent value="edges" className="space-y-4">
        <div className="flex gap-2">
          <Select>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="De" />
            </SelectTrigger>
            <SelectContent>
              {nodes.map((n) => (
                <SelectItem key={n.id} value={n.id}>
                  {n.id} - {n.content.substring(0, 20)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Para" />
            </SelectTrigger>
            <SelectContent>
              {nodes.map((n) => (
                <SelectItem key={n.id} value={n.id}>
                  {n.id} - {n.content.substring(0, 20)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Conectar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Conexão</DialogTitle>
                <DialogDescription>Defina uma conexão entre dois nós</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Selecione os nós nos dropdowns acima</p>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-2 max-h-[400px] overflow-y-auto">
          {edges.map((edge, idx) => (
            <Card key={idx} className="p-3 flex items-center justify-between">
              <div className="text-sm">
                <strong>{edge.from}</strong> → <strong>{edge.to}</strong>
                {edge.label && <span className="text-xs text-muted-foreground ml-2">({edge.label})</span>}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteEdge(idx)}
                className="h-8 w-8 p-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </Card>
          ))}
        </div>
      </TabsContent>

      {/* Settings Tab */}
      <TabsContent value="settings" className="space-y-4">
        <div>
          <Label>Nó Raiz</Label>
          <Select value={rootNodeId} onValueChange={setRootNodeId}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {nodes.map((n) => (
                <SelectItem key={n.id} value={n.id}>
                  {n.id} - {n.content.substring(0, 30)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-2">O nó onde o fluxo começa</p>
        </div>

        <Card className="p-4 bg-muted">
          <p className="text-sm font-semibold mb-2">Resumo do Fluxo</p>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>Total de nós: {nodes.length}</p>
            <p>Total de conexões: {edges.length}</p>
            <p>Nó raiz: {rootNodeId}</p>
          </div>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
