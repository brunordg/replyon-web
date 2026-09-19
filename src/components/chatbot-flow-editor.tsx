import { useState, useCallback, useRef, useMemo, useEffect, useLayoutEffect } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Handle,
  Position,
  ConnectionMode,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Save,
  MessageSquare,
  ListChecks,
  GitBranch,
  Split,
  Zap,
  Flag,
  Settings2,
  X,
  Maximize2,
  Minimize2,
  Search,
  Clock,
  Users,
  Star,
  Webhook,
  FileText,
  Radio,
  Bell,
  Calendar,
  Wrench,
  CheckCircle2,
  XCircle,
} from "lucide-react";

type NodeType = "MESSAGE" | "CHOICE" | "CONDITION" | "ACTION" | "WAIT" | "TRANSFER" | "CONDITION_ADVANCED" | "FEEDBACK" | "WEBHOOK" | "FORM" | "BROADCAST" | "NOTIFICATION" | "TEMPORAL" | "UTILITIES";

interface FlowNode {
  id: string;
  type: NodeType;
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

const NODE_META: Record<
  NodeType,
  { label: string; icon: typeof MessageSquare; color: string; border: string; accent: string; hex: string }
> = {
  MESSAGE: { label: "Mensagem", icon: MessageSquare, color: "bg-blue-50/90 dark:bg-blue-950/60", border: "border-blue-400", accent: "bg-blue-500", hex: "#3b82f6" },
  CHOICE: { label: "Escolha", icon: ListChecks, color: "bg-emerald-50/90 dark:bg-emerald-950/60", border: "border-emerald-400", accent: "bg-emerald-500", hex: "#10b981" },
  CONDITION: { label: "Condição", icon: GitBranch, color: "bg-amber-50/90 dark:bg-amber-950/60", border: "border-amber-400", accent: "bg-amber-500", hex: "#f59e0b" },
  CONDITION_ADVANCED: { label: "Condição Avançada", icon: Split, color: "bg-indigo-50/90 dark:bg-indigo-950/60", border: "border-indigo-400", accent: "bg-indigo-500", hex: "#6366f1" },
  ACTION: { label: "Ação", icon: Zap, color: "bg-purple-50/90 dark:bg-purple-950/60", border: "border-purple-400", accent: "bg-purple-500", hex: "#a855f7" },
  WAIT: { label: "Esperar", icon: Clock, color: "bg-cyan-50/90 dark:bg-cyan-950/60", border: "border-cyan-400", accent: "bg-cyan-500", hex: "#06b6d4" },
  TRANSFER: { label: "Transferir", icon: Users, color: "bg-pink-50/90 dark:bg-pink-950/60", border: "border-pink-400", accent: "bg-pink-500", hex: "#ec4899" },
  FEEDBACK: { label: "Feedback", icon: Star, color: "bg-orange-50/90 dark:bg-orange-950/60", border: "border-orange-400", accent: "bg-orange-500", hex: "#f97316" },
  WEBHOOK: { label: "Webhook", icon: Webhook, color: "bg-red-50/90 dark:bg-red-950/60", border: "border-red-400", accent: "bg-red-500", hex: "#ef4444" },
  FORM: { label: "Formulário", icon: FileText, color: "bg-lime-50/90 dark:bg-lime-950/60", border: "border-lime-400", accent: "bg-lime-500", hex: "#84cc16" },
  BROADCAST: { label: "Transmitir", icon: Radio, color: "bg-teal-50/90 dark:bg-teal-950/60", border: "border-teal-400", accent: "bg-teal-500", hex: "#14b8a6" },
  NOTIFICATION: { label: "Notificação", icon: Bell, color: "bg-rose-50/90 dark:bg-rose-950/60", border: "border-rose-400", accent: "bg-rose-500", hex: "#f43f5e" },
  TEMPORAL: { label: "Temporal", icon: Calendar, color: "bg-violet-50/90 dark:bg-violet-950/60", border: "border-violet-400", accent: "bg-violet-500", hex: "#a78bfa" },
  UTILITIES: { label: "Utilitários", icon: Wrench, color: "bg-slate-50/90 dark:bg-slate-950/60", border: "border-slate-400", accent: "bg-slate-500", hex: "#64748b" },
};

const NODE_DESCRIPTIONS: Record<NodeType, string> = {
  MESSAGE: "Envia uma mensagem de texto para o contato.",
  CHOICE: "Apresenta opções para o contato escolher.",
  CONDITION: "Direciona o fluxo com base numa condição simples.",
  CONDITION_ADVANCED: "Direciona o fluxo com lógica combinada (E/OU).",
  ACTION: "Executa uma ação do sistema (agendar, validar, etc).",
  WAIT: "Pausa o fluxo por um tempo antes de continuar.",
  TRANSFER: "Transfere a conversa para setor, atendente ou IA.",
  FEEDBACK: "Coleta uma avaliação do atendimento.",
  WEBHOOK: "Chama uma URL externa (API) e usa a resposta.",
  FORM: "Coleta dados estruturados do contato.",
  BROADCAST: "Envia uma mensagem em massa para vários contatos.",
  NOTIFICATION: "Notifica a equipe por email, painel ou WhatsApp.",
  TEMPORAL: "Verifica dia da semana ou horário atual.",
  UTILITIES: "Anota, define contexto ou dispara fluxo paralelo.",
};

const ADD_NODE_CATEGORIES: { label: string; types: NodeType[] }[] = [
  { label: "Início", types: ["MESSAGE", "CHOICE"] },
  { label: "Condição", types: ["CONDITION", "CONDITION_ADVANCED", "TEMPORAL"] },
  { label: "Ação", types: ["ACTION", "WEBHOOK", "FORM", "BROADCAST"] },
  { label: "Finalização", types: ["FEEDBACK"] },
  { label: "Utilitários", types: ["UTILITIES", "WAIT"] },
  { label: "Integrações", types: ["TRANSFER", "NOTIFICATION"] },
];

const DEFAULT_CONFIG: Partial<Record<NodeType, Record<string, any>>> = {
  CHOICE: { options: { "1": "Opção 1", "2": "Opção 2" } },
  WEBHOOK: { url: "", method: "POST", headers: {}, body: "", timeoutSeconds: 30, maxRetries: 0, postScript: "" },
  WAIT: { waitType: "interval", intervalSeconds: 60 },
  FORM: { fields: [{ name: "nome", type: "text", label: "Nome", required: true }], submitButtonLabel: "Enviar", persistToContact: true },
  FEEDBACK: { feedbackType: "RATING", minRating: 1, maxRating: 5, promptText: "" },
  NOTIFICATION: { notificationType: "STAFF", message: "", channels: [] },
  TRANSFER: { transferType: "SECTOR" },
  BROADCAST: { message: "", channels: [] },
  UTILITIES: { utilityType: "NOTE", noteText: "" },
  ACTION: { actionType: "CALL_API", parameters: {} },
};

const ACTION_TYPES = [
  "CREATE_APPOINTMENT", "HANDOFF", "CALL_API", "VALIDATE", "SET_CONTEXT", "CHECK_AVAILABILITY",
  "SEND_MESSAGE", "SEND_FORM", "TRANSFER_SECTOR", "TRANSFER_ATTENDANT", "TRANSFER_AI",
  "NOTIFY_STAFF", "NOTIFY_CONTACT", "SEND_FEEDBACK_PROMPT", "CALL_WEBHOOK", "SET_CONTEXT_VARIABLE",
  "ADD_ETIQUETA", "CHANGE_STATUS", "LOCK_CONVERSATION", "BROADCAST_MESSAGE", "FINALIZE_CONVERSATION", "VALIDATE_CONTEXT",
];

const HANDLE_SIDES: { id: string; position: Position }[] = [
  { id: "top", position: Position.Top },
  { id: "right", position: Position.Right },
  { id: "bottom", position: Position.Bottom },
  { id: "left", position: Position.Left },
];

type TriggerType = "AUTO" | "ON_REPLY" | "ON_TIMEOUT" | "ON_OPTION" | "ON_NO_MATCH" | "ON_SUCCESS" | "ON_ERROR";

const TRIGGER_META: Record<TriggerType, { label: string; hint: string }> = {
  AUTO: { label: "Chamar próximo bloco", hint: "Avança sozinho, assim que o nó anterior termina — sem esperar nada." },
  ON_REPLY: { label: "Quando responder", hint: "Dispara assim que o usuário enviar qualquer mensagem." },
  ON_TIMEOUT: { label: "Sem resposta em X segundos", hint: "Dispara sozinho se ninguém responder dentro do prazo — envia a mensagem seguinte proativamente." },
  ON_OPTION: { label: "Opção específica", hint: "Dispara quando a resposta do usuário for exatamente este valor (ex.: \"1\")." },
  ON_NO_MATCH: { label: "Nenhuma opção corresponde", hint: "Dispara quando a resposta não bate com nenhuma opção configurada." },
  ON_SUCCESS: { label: "Webhook: sucesso", hint: "Dispara quando a chamada do webhook responder com status 2xx." },
  ON_ERROR: { label: "Webhook: falha", hint: "Dispara quando a chamada do webhook falhar, der timeout ou responder com erro." },
};

function triggerTypeOf(condition: Record<string, any> | null | undefined): TriggerType {
  if (!condition || Object.keys(condition).length === 0) return "AUTO";
  if (typeof condition.trigger === "string" && condition.trigger in TRIGGER_META) {
    return condition.trigger as TriggerType;
  }
  if (condition.field && condition.operator) return "AUTO";
  if (condition.value !== undefined) return "ON_OPTION";
  return "AUTO";
}

const DEFAULT_CONTENT: Record<NodeType, string> = {
  MESSAGE: "Nova mensagem",
  CHOICE: "Escolha uma opção",
  CONDITION: "Verificar condição",
  ACTION: "Executar ação",
  WAIT: "Esperar...",
  TRANSFER: "Transferir conversa",
  CONDITION_ADVANCED: "Condição avançada",
  FEEDBACK: "Coletar feedback",
  WEBHOOK: "Chamar webhook",
  FORM: "Formulário",
  BROADCAST: "Transmitir mensagem",
  NOTIFICATION: "Enviar notificação",
  TEMPORAL: "Verificação temporal",
  UTILITIES: "Utilitários",
};

interface FlowNodeData extends Record<string, unknown> {
  nodeType: NodeType;
  content: string;
  config: Record<string, any>;
  isRoot: boolean;
  readOnly: boolean;
  onContentChange: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onSetRoot: (id: string) => void;
  onOpenSettings: (id: string) => void;
  onOptionLabelChange: (id: string, key: string, label: string) => void;
  onAddOption: (id: string) => void;
  onDeleteOption: (id: string, key: string) => void;
}

/** Uma linha do card com seu próprio ponto de conexão (opção do Choice, ou Sucesso/Falha do Webhook). */
interface BranchRow {
  handleId: string;
  label: string;
  color: string;
  removable: boolean;
  onLabelChange?: (label: string) => void;
  onRemove?: () => void;
}

function FlowNodeCard({ id, data, selected }: NodeProps<Node<FlowNodeData>>) {
  const meta = NODE_META[data.nodeType];
  const Icon = meta.icon;
  const isChoice = data.nodeType === "CHOICE";
  const isWebhook = data.nodeType === "WEBHOOK";

  const branchRows: BranchRow[] = isChoice
    ? Object.entries(data.config?.options ?? {}).map(([key, label]) => ({
        handleId: `opt-${key}`,
        label: String(label),
        color: meta.hex,
        removable: true,
        onLabelChange: (v: string) => data.onOptionLabelChange(id, key, v),
        onRemove: () => data.onDeleteOption(id, key),
      }))
    : isWebhook
      ? [
          { handleId: "success", label: "Sucesso", color: "#22c55e", removable: false },
          { handleId: "error", label: "Falha", color: "#ef4444", removable: false },
        ]
      : [];

  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [rowTops, setRowTops] = useState<Record<string, number>>({});
  const rowKeysSignature = branchRows.map((r) => r.handleId).join(",");

  useLayoutEffect(() => {
    if (branchRows.length === 0) return;
    const next: Record<string, number> = {};
    branchRows.forEach((row) => {
      const el = rowRefs.current[row.handleId];
      if (el) next[row.handleId] = el.offsetTop + el.offsetHeight / 2;
    });
    setRowTops(next);
    // Recalcula quando o conjunto de linhas muda (adicionar/remover opção) — a altura de
    // cada linha é fixa, então o texto digitado dentro dela não precisa disparar isso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowKeysSignature, data.content]);

  return (
    <div
      className={`group relative rounded-xl border w-[230px] backdrop-blur-sm transition-shadow ${meta.color} ${
        data.isRoot
          ? "border-primary shadow-[0_0_0_3px] shadow-primary/20"
          : selected
            ? `${meta.border} shadow-lg`
            : "border-black/10 dark:border-white/10 shadow-md hover:shadow-lg"
      }`}
    >
      <div className={`absolute left-0 top-0 h-full w-1 rounded-l-xl ${meta.accent}`} />

      {HANDLE_SIDES.filter(({ id: handleId }) => !(branchRows.length > 0 && handleId === "right")).map(
        ({ id: handleId, position }) => (
          <Handle
            key={handleId}
            id={handleId}
            type="source"
            position={position}
            isConnectableStart
            isConnectableEnd
            style={{ background: meta.hex }}
            className="!w-2.5 !h-2.5 !border-2 !border-background opacity-0 group-hover:opacity-100 !transition-opacity hover:!scale-150"
          />
        )
      )}

      {branchRows.map((row) => (
        <Handle
          key={row.handleId}
          id={row.handleId}
          type="source"
          position={Position.Right}
          isConnectableStart
          isConnectableEnd={false}
          style={{ top: rowTops[row.handleId] ?? 0, background: row.color }}
          className="!w-2.5 !h-2.5 !border-2 !border-background opacity-80 hover:opacity-100 !transition-opacity hover:!scale-150"
        />
      ))}

      <div
        className="flex items-center justify-between gap-1 px-2.5 py-2 border-b border-black/5 dark:border-white/10 cursor-pointer"
        onDoubleClick={() => data.onOpenSettings(id)}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <div className={`flex items-center justify-center w-5 h-5 rounded-md ${meta.accent} text-white flex-shrink-0`}>
            <Icon className="w-3 h-3" />
          </div>
          <span className="text-xs font-semibold truncate">{meta.label}</span>
          {data.isRoot && (
            <Badge variant="default" className="text-[10px] px-1 py-0 h-4 gap-0.5">
              <Flag className="w-2.5 h-2.5" />
              Início
            </Badge>
          )}
        </div>
        {!data.readOnly && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {!data.isRoot && (
              <button
                title="Definir como início"
                onClick={() => data.onSetRoot(id)}
                className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
              >
                <Flag className="w-3 h-3" />
              </button>
            )}
            <button
              title="Configurar nó"
              onClick={() => data.onOpenSettings(id)}
              className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
            >
              <Settings2 className="w-3 h-3" />
            </button>
            <button
              title="Excluir nó"
              onClick={() => data.onDelete(id)}
              className="p-1 rounded hover:bg-destructive/20 text-destructive"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      <div className="p-2.5">
        <div className="text-[10px] font-mono text-muted-foreground/70 mb-1">{id}</div>
        {isChoice && <div className="text-[10px] font-medium text-muted-foreground mb-1">Mensagem</div>}
        {data.readOnly ? (
          <p className="text-xs whitespace-pre-wrap break-words">{data.content}</p>
        ) : (
          <Textarea
            value={data.content}
            onChange={(e) => data.onContentChange(id, e.target.value)}
            className="nodrag text-xs min-h-[54px] resize-none bg-background/80 border-black/10 dark:border-white/10"
            placeholder="Conteúdo do nó"
          />
        )}

        {isChoice && (
          <div className="mt-2 space-y-1">
            {branchRows.map((row) => (
              <div key={row.handleId} ref={(el) => { rowRefs.current[row.handleId] = el; }} className="flex items-center gap-1">
                {!data.readOnly && (
                  <button
                    title="Remover opção"
                    onClick={row.onRemove}
                    className="p-1 rounded hover:bg-destructive/20 text-destructive flex-shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
                {data.readOnly ? (
                  <span className="flex-1 text-xs border rounded px-2 py-1 bg-background/60 truncate">{row.label}</span>
                ) : (
                  <input
                    value={row.label}
                    onChange={(e) => row.onLabelChange?.(e.target.value)}
                    className="nodrag flex-1 text-xs border rounded px-2 py-1 bg-background/80 border-black/10 dark:border-white/10"
                  />
                )}
              </div>
            ))}
            {!data.readOnly && (
              <button onClick={() => data.onAddOption(id)} className="text-[11px] text-primary hover:underline">
                + Opção
              </button>
            )}
          </div>
        )}

        {isWebhook && (
          <div className="mt-2 space-y-1">
            {branchRows.map((row) => (
              <div key={row.handleId} ref={(el) => { rowRefs.current[row.handleId] = el; }} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded border border-black/10 dark:border-white/10 bg-background/60">
                {row.handleId === "success" ? (
                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color: row.color }} />
                ) : (
                  <XCircle className="w-3.5 h-3.5" style={{ color: row.color }} />
                )}
                <span>{row.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  MESSAGE: FlowNodeCard,
  CHOICE: FlowNodeCard,
  CONDITION: FlowNodeCard,
  ACTION: FlowNodeCard,
  WAIT: FlowNodeCard,
  TRANSFER: FlowNodeCard,
  CONDITION_ADVANCED: FlowNodeCard,
  FEEDBACK: FlowNodeCard,
  WEBHOOK: FlowNodeCard,
  FORM: FlowNodeCard,
  BROADCAST: FlowNodeCard,
  NOTIFICATION: FlowNodeCard,
  TEMPORAL: FlowNodeCard,
  UTILITIES: FlowNodeCard,
};

function gridPosition(index: number) {
  const col = index % 4;
  const row = Math.floor(index / 4);
  return { x: col * 260 + 40, y: row * 200 + 40 };
}

function toRFNodes(flowNodes: FlowNode[], rootNodeId: string): Node<FlowNodeData>[] {
  return flowNodes.map((n, i) => {
    const savedPosition = n.config?.__position;
    const position =
      savedPosition && typeof savedPosition.x === "number" && typeof savedPosition.y === "number"
        ? savedPosition
        : gridPosition(i);
    return {
      id: n.id,
      type: n.type,
      position,
      data: {
        nodeType: n.type,
        content: n.content,
        config: n.config ?? {},
        isRoot: n.id === rootNodeId,
        readOnly: false,
        onContentChange: () => {},
        onDelete: () => {},
        onSetRoot: () => {},
        onOpenSettings: () => {},
        onOptionLabelChange: () => {},
        onAddOption: () => {},
        onDeleteOption: () => {},
      },
    };
  });
}

function edgeAutoLabel(condition: Record<string, any> | null | undefined): string | undefined {
  const trigger = triggerTypeOf(condition);
  if (trigger === "AUTO") return undefined;
  if (trigger === "ON_TIMEOUT") return `⏱ ${condition?.seconds ?? "?"}s sem resposta`;
  if (trigger === "ON_OPTION") return `🔢 opção "${condition?.value ?? "?"}"`;
  if (trigger === "ON_SUCCESS") return "✅ sucesso";
  if (trigger === "ON_ERROR") return "❌ falha";
  return TRIGGER_META[trigger].label;
}

function toRFEdges(flowEdges: FlowEdge[]): Edge[] {
  return flowEdges.map((e, i) => ({
    id: `e-${e.from}-${e.to}-${i}`,
    source: e.from,
    target: e.to,
    label: e.label ?? edgeAutoLabel(e.condition),
    data: { condition: e.condition ?? null },
    animated: false,
  }));
}

function generateId(existing: string[]) {
  const nums = existing.map((id) => {
    const m = id.match(/n(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  });
  const max = nums.length > 0 ? Math.max(0, ...nums) : 0;
  return `n${max + 1}`;
}

function mapToPairs(obj: Record<string, any> | undefined | null): { key: string; value: string }[] {
  if (!obj) return [];
  return Object.entries(obj).map(([key, value]) => ({ key, value: String(value ?? "") }));
}

function pairsToMap(pairs: { key: string; value: string }[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const { key, value } of pairs) {
    if (key.trim()) result[key.trim()] = value;
  }
  return result;
}

/** Painel lateral que aparece ao clicar em "+"; categorizado como Início/Condição/Ação/Finalização/Utilitários/Integrações. */
function AddNodePanel({
  search,
  onSearchChange,
  onSelect,
  onClose,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  onSelect: (type: NodeType) => void;
  onClose: () => void;
}) {
  const term = search.trim().toLowerCase();
  const filteredCategories = useMemo(() => {
    if (!term) return ADD_NODE_CATEGORIES;
    return ADD_NODE_CATEGORIES.map((cat) => ({
      ...cat,
      types: cat.types.filter(
        (t) => NODE_META[t].label.toLowerCase().includes(term) || NODE_DESCRIPTIONS[t].toLowerCase().includes(term)
      ),
    })).filter((cat) => cat.types.length > 0);
  }, [term]);

  return (
    <Card className="absolute top-2 left-2 bottom-2 w-[380px] z-20 flex flex-col shadow-xl overflow-hidden">
      <div className="p-3 border-b border-black/5 dark:border-white/10 space-y-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            Adicionar nó
          </span>
          <button onClick={onClose} className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Pesquisar tipo de nó"
            className="w-full text-sm border rounded-lg pl-8 pr-2 py-1.5 bg-background"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">Clique num tipo para adicionar ao fluxo.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {filteredCategories.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">Nenhum tipo encontrado.</p>
        )}
        {filteredCategories.map((cat) => (
          <div key={cat.label}>
            <h4 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">{cat.label}</h4>
            <div className="grid grid-cols-2 gap-2">
              {cat.types.map((type) => {
                const meta = NODE_META[type];
                const Icon = meta.icon;
                return (
                  <button
                    key={type}
                    onClick={() => onSelect(type)}
                    className="text-left p-2.5 rounded-lg border border-black/10 dark:border-white/10 hover:border-primary hover:shadow-md transition-all bg-background"
                  >
                    <div className={`w-6 h-6 rounded-md ${meta.accent} text-white flex items-center justify-center mb-1.5`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xs font-semibold">{meta.label}</div>
                    <div className="text-[10px] text-muted-foreground leading-snug mt-0.5">{NODE_DESCRIPTIONS[type]}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

const inputCls = "w-full text-sm border rounded px-2 py-1.5 bg-background";

/** Painel de configuração específico por tipo de nó — abre ao clicar na engrenagem do nó. */
const NO_MATCH_KEY = "__NO_MATCH__";

function NodeConfigPanel({
  node,
  allNodes,
  optionTargets,
  onChangeConfig,
  onSetOptionTarget,
  onClose,
}: {
  node: Node<FlowNodeData>;
  allNodes: { id: string; label: string }[];
  optionTargets: Record<string, string>;
  onChangeConfig: (id: string, partial: Record<string, any>) => void;
  onSetOptionTarget: (optionKey: string, targetNodeId: string) => void;
  onClose: () => void;
}) {
  const type = node.data.nodeType;
  const meta = NODE_META[type];
  const Icon = meta.icon;
  const config = node.data.config ?? {};
  const set = (partial: Record<string, any>) => onChangeConfig(node.id, partial);

  return (
    <Card className="absolute top-2 right-2 bottom-2 w-[360px] z-20 flex flex-col shadow-xl overflow-hidden">
      <div className="p-3 border-b border-black/5 dark:border-white/10 flex items-center justify-between flex-shrink-0">
        <span className="text-sm font-semibold flex items-center gap-1.5">
          <span className={`w-5 h-5 rounded-md ${meta.accent} text-white flex items-center justify-center`}>
            <Icon className="w-3 h-3" />
          </span>
          Configurar {meta.label} · <span className="font-mono text-xs text-muted-foreground">{node.id}</span>
        </span>
        <button onClick={onClose} className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {type === "WEBHOOK" && (
          <>
            <Field label="Endpoint (URL) *" hint="URL completa que será chamada quando este nó executar.">
              <input
                value={config.url ?? ""}
                onChange={(e) => set({ url: e.target.value })}
                placeholder="https://api.exemplo.com/webhook"
                className={inputCls}
              />
            </Field>
            <Field label="Método HTTP">
              <select value={config.method ?? "POST"} onChange={(e) => set({ method: e.target.value })} className={inputCls}>
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
                <option>DELETE</option>
                <option>PATCH</option>
              </select>
            </Field>
            <Field label="Cabeçalhos (headers)">
              <PairListEditor
                pairs={mapToPairs(config.headers)}
                onChange={(pairs) => set({ headers: pairsToMap(pairs) })}
                keyPlaceholder="Authorization"
                valuePlaceholder="Bearer token123"
              />
            </Field>
            <Field label="Corpo (body / JSON)" hint="Use {{variavel}} para inserir valores do contexto da conversa.">
              <Textarea
                value={config.body ?? ""}
                onChange={(e) => set({ body: e.target.value })}
                className="font-mono text-xs min-h-[100px]"
                placeholder={'{"name": "{{name}}"}'}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Timeout (s)">
                <input
                  type="number"
                  value={config.timeoutSeconds ?? 30}
                  onChange={(e) => set({ timeoutSeconds: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
              <Field label="Tentativas">
                <input
                  type="number"
                  value={config.maxRetries ?? 0}
                  onChange={(e) => set({ maxRetries: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
            </div>

            <Field
              label="Mapeamento pós-execução"
              hint={
                'Uma linha por variável: nomeDaVariavel = json.caminho.no.campo — extrai valores da resposta ' +
                'do webhook (quando ela é JSON) e deixa disponíveis como {{nomeDaVariavel}} nos nós seguintes. ' +
                'Não é um script de código livre (por segurança) — só esse mapeamento simples.'
              }
            >
              <Textarea
                value={config.postScript ?? ""}
                onChange={(e) => set({ postScript: e.target.value })}
                className="font-mono text-xs min-h-[70px]"
                placeholder={"pedidoId = json.id\nstatus = json.status"}
              />
            </Field>

            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              Os caminhos <strong>Sucesso</strong> e <strong>Falha</strong> aparecem como conectores na lateral
              direita do card, no canvas — arraste de cada um até o próximo nó.
            </div>
          </>
        )}

        {type === "CHOICE" && (
          <>
            <Field label="Opções" hint="Chave = valor que o usuário digita, Rótulo = texto exibido.">
              <PairListEditor
                pairs={mapToPairs(config.options)}
                onChange={(pairs) => set({ options: pairsToMap(pairs) })}
                keyPlaceholder="1"
                valuePlaceholder="Consulta geral"
              />
            </Field>

            <Field
              label="Para onde cada opção leva"
              hint="Escolher um destino aqui cria (ou atualiza) automaticamente a conexão no canvas."
            >
              {Object.keys(config.options ?? {}).length === 0 ? (
                <p className="text-[11px] text-muted-foreground">Adicione opções acima primeiro.</p>
              ) : (
                <div className="space-y-1.5">
                  {Object.entries(config.options ?? {}).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <span
                        className="text-[11px] font-mono w-14 flex-shrink-0 truncate text-muted-foreground"
                        title={String(label)}
                      >
                        {key}
                      </span>
                      <select
                        value={optionTargets[key] ?? ""}
                        onChange={(e) => onSetOptionTarget(key, e.target.value)}
                        className={`${inputCls} flex-1`}
                      >
                        <option value="">— selecione o destino —</option>
                        {allNodes
                          .filter((n) => n.id !== node.id)
                          .map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.label}
                            </option>
                          ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </Field>

            <Field label="Se a resposta não bater com nenhuma opção">
              <select
                value={optionTargets[NO_MATCH_KEY] ?? ""}
                onChange={(e) => onSetOptionTarget(NO_MATCH_KEY, e.target.value)}
                className={inputCls}
              >
                <option value="">— sem tratamento (repete a pergunta) —</option>
                {allNodes
                  .filter((n) => n.id !== node.id)
                  .map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label}
                    </option>
                  ))}
              </select>
            </Field>
          </>
        )}

        {type === "WAIT" && (
          <>
            <Field label="Tipo de espera">
              <select value={config.waitType ?? "interval"} onChange={(e) => set({ waitType: e.target.value })} className={inputCls}>
                <option value="interval">Intervalo (segundos)</option>
                <option value="timestamp">Até data/hora específica</option>
              </select>
            </Field>
            {config.waitType === "timestamp" ? (
              <Field label="Até quando" hint="⚠️ Modo data/hora ainda não pausa a execução automaticamente — em desenvolvimento.">
                <input
                  type="datetime-local"
                  value={config.untilTimestamp ?? ""}
                  onChange={(e) => set({ untilTimestamp: e.target.value })}
                  className={inputCls}
                />
              </Field>
            ) : (
              <Field label="Segundos de espera">
                <input
                  type="number"
                  value={config.intervalSeconds ?? 60}
                  onChange={(e) => set({ intervalSeconds: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
            )}
          </>
        )}

        {type === "TRANSFER" && (
          <>
            <Field label="Transferir para">
              <select value={config.transferType ?? "SECTOR"} onChange={(e) => set({ transferType: e.target.value })} className={inputCls}>
                <option value="SECTOR">Setor</option>
                <option value="ATTENDANT">Atendente</option>
                <option value="AI">Agente de IA</option>
              </select>
            </Field>
            {config.transferType === "SECTOR" && (
              <Field label="ID do setor">
                <input value={config.sectorId ?? ""} onChange={(e) => set({ sectorId: e.target.value })} className={inputCls} />
              </Field>
            )}
            {config.transferType === "ATTENDANT" && (
              <Field label="ID do atendente">
                <input value={config.attendantId ?? ""} onChange={(e) => set({ attendantId: e.target.value })} className={inputCls} />
              </Field>
            )}
            {config.transferType === "AI" && (
              <Field label="Agente de IA">
                <input value={config.aiAgent ?? ""} onChange={(e) => set({ aiAgent: e.target.value })} className={inputCls} />
              </Field>
            )}
            <Field label="Se falhar (fallback)">
              <input
                value={config.fallbackBehavior ?? ""}
                onChange={(e) => set({ fallbackBehavior: e.target.value })}
                placeholder="Ex.: ERROR, RETRY..."
                className={inputCls}
              />
            </Field>
          </>
        )}

        {type === "FORM" && (
          <>
            <Field label="Campos do formulário">
              <FormFieldsEditor
                fields={config.fields ?? []}
                onChange={(fields) => set({ fields })}
              />
            </Field>
            <Field label="Texto do botão">
              <input
                value={config.submitButtonLabel ?? "Enviar"}
                onChange={(e) => set({ submitButtonLabel: e.target.value })}
                className={inputCls}
              />
            </Field>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={!!config.persistToContact}
                onChange={(e) => set({ persistToContact: e.target.checked })}
              />
              Salvar respostas no cadastro do contato
            </label>
          </>
        )}

        {type === "FEEDBACK" && (
          <>
            <Field label="Tipo de feedback">
              <select value={config.feedbackType ?? "RATING"} onChange={(e) => set({ feedbackType: e.target.value })} className={inputCls}>
                <option value="RATING">Avaliação (estrelas)</option>
                <option value="TEXT">Texto livre</option>
                <option value="NPS">NPS</option>
              </select>
            </Field>
            {config.feedbackType === "RATING" && (
              <div className="grid grid-cols-2 gap-2">
                <Field label="Mínimo">
                  <input type="number" value={config.minRating ?? 1} onChange={(e) => set({ minRating: Number(e.target.value) })} className={inputCls} />
                </Field>
                <Field label="Máximo">
                  <input type="number" value={config.maxRating ?? 5} onChange={(e) => set({ maxRating: Number(e.target.value) })} className={inputCls} />
                </Field>
              </div>
            )}
            <Field label="Pergunta exibida">
              <input value={config.promptText ?? ""} onChange={(e) => set({ promptText: e.target.value })} className={inputCls} />
            </Field>
          </>
        )}

        {type === "NOTIFICATION" && (
          <>
            <Field label="Notificar">
              <select value={config.notificationType ?? "STAFF"} onChange={(e) => set({ notificationType: e.target.value })} className={inputCls}>
                <option value="STAFF">Equipe interna</option>
                <option value="CONTACT">Contato</option>
              </select>
            </Field>
            <Field label="Mensagem">
              <Textarea value={config.message ?? ""} onChange={(e) => set({ message: e.target.value })} className="text-xs min-h-[70px]" />
            </Field>
            <Field label="Canais">
              <ChannelCheckboxes selected={config.channels ?? []} onChange={(channels) => set({ channels })} />
            </Field>
          </>
        )}

        {type === "BROADCAST" && (
          <>
            <Field label="Mensagem">
              <Textarea value={config.message ?? ""} onChange={(e) => set({ message: e.target.value })} className="text-xs min-h-[70px]" />
            </Field>
            <Field label="Canais">
              <ChannelCheckboxes selected={config.channels ?? []} onChange={(channels) => set({ channels })} />
            </Field>
          </>
        )}

        {type === "UTILITIES" && (
          <>
            <Field label="Tipo de utilitário">
              <select value={config.utilityType ?? "NOTE"} onChange={(e) => set({ utilityType: e.target.value })} className={inputCls}>
                <option value="NOTE">Anotação interna</option>
                <option value="SET_CONTEXT">Definir variável de contexto</option>
                <option value="PARALLEL_FLOW">Disparar fluxo paralelo</option>
              </select>
            </Field>
            {config.utilityType === "NOTE" && (
              <Field label="Texto da nota">
                <Textarea value={config.noteText ?? ""} onChange={(e) => set({ noteText: e.target.value })} className="text-xs min-h-[70px]" />
              </Field>
            )}
            {config.utilityType === "PARALLEL_FLOW" && (
              <Field label="ID do fluxo paralelo">
                <input value={config.parallelFlowId ?? ""} onChange={(e) => set({ parallelFlowId: e.target.value })} className={inputCls} />
              </Field>
            )}
          </>
        )}

        {type === "ACTION" && (
          <>
            <Field label="Tipo de ação">
              <select value={config.actionType ?? "CALL_API"} onChange={(e) => set({ actionType: e.target.value })} className={inputCls}>
                {ACTION_TYPES.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </Field>
            <Field label="Parâmetros (JSON)" hint="Estrutura livre — depende do tipo de ação escolhido.">
              <JsonTextarea value={config.parameters ?? {}} onChange={(parameters) => set({ parameters })} />
            </Field>
          </>
        )}

        {(type === "CONDITION" || type === "CONDITION_ADVANCED" || type === "TEMPORAL") && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
            Este nó decide o caminho pelas <strong>conexões (setas)</strong> que saem dele, não por config aqui.
            Clique numa seta saindo deste nó no canvas para definir a condição de disparo.
          </div>
        )}

        {type === "MESSAGE" && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
            O texto da mensagem é editado diretamente no card do nó, no canvas.
          </div>
        )}
      </div>
    </Card>
  );
}

let pairRowSeq = 0;

/**
 * Mantém as linhas em estado local (com id próprio, independente da chave digitada).
 * Necessário porque `onChange` grava um Record<string,string> — uma linha com chave
 * vazia (ex.: recém-criada pelo "+ Adicionar") seria descartada nesse Record e, se a
 * lista fosse só derivada da prop a cada render, a linha sumiria antes do usuário
 * conseguir digitar a chave. Guardando localmente, a linha permanece visível até ter
 * uma chave preenchida, quando passa a ser persistida para cima.
 */
function PairListEditor({
  pairs,
  onChange,
  keyPlaceholder,
  valuePlaceholder,
}: {
  pairs: { key: string; value: string }[];
  onChange: (pairs: { key: string; value: string }[]) => void;
  keyPlaceholder: string;
  valuePlaceholder: string;
}) {
  const [rows, setRows] = useState(() => pairs.map((p) => ({ ...p, id: `row-${pairRowSeq++}` })));

  const emit = (next: { id: string; key: string; value: string }[]) => {
    setRows(next);
    onChange(next.map(({ key, value }) => ({ key, value })));
  };

  return (
    <div className="space-y-1.5">
      {rows.map((p, idx) => (
        <div key={p.id} className="flex gap-1.5">
          <input
            value={p.key}
            onChange={(e) => {
              const next = [...rows];
              next[idx] = { ...next[idx], key: e.target.value };
              emit(next);
            }}
            placeholder={keyPlaceholder}
            className={`${inputCls} flex-1`}
          />
          <input
            value={p.value}
            onChange={(e) => {
              const next = [...rows];
              next[idx] = { ...next[idx], value: e.target.value };
              emit(next);
            }}
            placeholder={valuePlaceholder}
            className={`${inputCls} flex-1`}
          />
          <button
            onClick={() => emit(rows.filter((_, i) => i !== idx))}
            className="p-1.5 text-destructive hover:bg-destructive/10 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button
        onClick={() => emit([...rows, { id: `row-${pairRowSeq++}`, key: "", value: "" }])}
        className="text-xs text-primary hover:underline"
      >
        + Adicionar
      </button>
    </div>
  );
}

function FormFieldsEditor({
  fields,
  onChange,
}: {
  fields: { name: string; type: string; label: string; required: boolean }[];
  onChange: (fields: { name: string; type: string; label: string; required: boolean }[]) => void;
}) {
  return (
    <div className="space-y-2">
      {fields.map((f, idx) => (
        <div key={idx} className="border rounded-lg p-2 space-y-1.5 bg-muted/30">
          <div className="flex gap-1.5">
            <input
              value={f.name}
              onChange={(e) => {
                const next = [...fields];
                next[idx] = { ...next[idx], name: e.target.value };
                onChange(next);
              }}
              placeholder="nome_do_campo"
              className={`${inputCls} flex-1`}
            />
            <button onClick={() => onChange(fields.filter((_, i) => i !== idx))} className="p-1.5 text-destructive hover:bg-destructive/10 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <input
            value={f.label}
            onChange={(e) => {
              const next = [...fields];
              next[idx] = { ...next[idx], label: e.target.value };
              onChange(next);
            }}
            placeholder="Rótulo exibido"
            className={inputCls}
          />
          <div className="flex gap-1.5 items-center">
            <select
              value={f.type}
              onChange={(e) => {
                const next = [...fields];
                next[idx] = { ...next[idx], type: e.target.value };
                onChange(next);
              }}
              className={`${inputCls} flex-1`}
            >
              <option value="text">Texto</option>
              <option value="email">Email</option>
              <option value="tel">Telefone</option>
              <option value="date">Data</option>
              <option value="number">Número</option>
            </select>
            <label className="flex items-center gap-1 text-[11px] whitespace-nowrap">
              <input
                type="checkbox"
                checked={f.required}
                onChange={(e) => {
                  const next = [...fields];
                  next[idx] = { ...next[idx], required: e.target.checked };
                  onChange(next);
                }}
              />
              Obrigatório
            </label>
          </div>
        </div>
      ))}
      <button
        onClick={() => onChange([...fields, { name: "", type: "text", label: "", required: false }])}
        className="text-xs text-primary hover:underline"
      >
        + Adicionar campo
      </button>
    </div>
  );
}

const CHANNEL_OPTIONS = ["email", "sms", "dashboard", "whatsapp"];

function ChannelCheckboxes({ selected, onChange }: { selected: string[]; onChange: (channels: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-3">
      {CHANNEL_OPTIONS.map((ch) => (
        <label key={ch} className="flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={selected.includes(ch)}
            onChange={(e) => onChange(e.target.checked ? [...selected, ch] : selected.filter((c) => c !== ch))}
          />
          <span className="capitalize">{ch}</span>
        </label>
      ))}
    </div>
  );
}

function JsonTextarea({ value, onChange }: { value: Record<string, any>; onChange: (v: Record<string, any>) => void }) {
  const [draft, setDraft] = useState(() => JSON.stringify(value ?? {}, null, 2));
  const [invalid, setInvalid] = useState(false);
  return (
    <div>
      <Textarea
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          try {
            onChange(JSON.parse(e.target.value || "{}"));
            setInvalid(false);
          } catch {
            setInvalid(true);
          }
        }}
        className={`font-mono text-xs min-h-[80px] ${invalid ? "border-destructive" : ""}`}
      />
      {invalid && <p className="text-[11px] text-destructive mt-1">JSON inválido — alterações não serão salvas até corrigir.</p>}
    </div>
  );
}

function FlowCanvas({ definition, onChange, readOnly = false }: ChatbotFlowEditorProps) {
  const initialFlowNodes = definition?.nodes ?? [];
  const initialFlowEdges = definition?.edges ?? [];
  const initialRootId = definition?.rootNodeId ?? initialFlowNodes[0]?.id ?? "";

  const { screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FlowNodeData>>(
    toRFNodes(initialFlowNodes, initialRootId)
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(toRFEdges(initialFlowEdges));
  const [rootNodeId, setRootNodeId] = useState(initialRootId);
  const [settingsNodeId, setSettingsNodeId] = useState<string | null>(null);
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
  const [addPanelSearch, setAddPanelSearch] = useState("");
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [edgeLabelDraft, setEdgeLabelDraft] = useState("");
  const [edgeTriggerDraft, setEdgeTriggerDraft] = useState<TriggerType>("AUTO");
  const [edgeSecondsDraft, setEdgeSecondsDraft] = useState("5");
  const [edgeOptionValueDraft, setEdgeOptionValueDraft] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  const handleContentChange = useCallback(
    (id: string, content: string) => {
      setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, content } } : n)));
    },
    [setNodes]
  );

  const handleDeleteNode = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
      setRootNodeId((cur) => (cur === id ? "" : cur));
      setSettingsNodeId((cur) => (cur === id ? null : cur));
    },
    [setNodes, setEdges]
  );

  const handleSetRoot = useCallback((id: string) => {
    setRootNodeId(id);
  }, []);

  const handleOpenSettings = useCallback((id: string) => {
    setIsAddPanelOpen(false);
    setSelectedEdgeId(null);
    setSettingsNodeId(id);
  }, []);

  const handleChangeConfig = useCallback(
    (id: string, partial: Record<string, any>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, config: { ...n.data.config, ...partial } } } : n))
      );
    },
    [setNodes]
  );

  const handleOptionLabelChange = useCallback(
    (id: string, key: string, label: string) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, config: { ...n.data.config, options: { ...(n.data.config?.options ?? {}), [key]: label } } } }
            : n
        )
      );
    },
    [setNodes]
  );

  const handleAddOption = useCallback(
    (id: string) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== id) return n;
          const options = n.data.config?.options ?? {};
          const nextKey = String(Math.max(0, ...Object.keys(options).map((k) => parseInt(k, 10) || 0)) + 1);
          return { ...n, data: { ...n.data, config: { ...n.data.config, options: { ...options, [nextKey]: `Opção ${nextKey}` } } } };
        })
      );
    },
    [setNodes]
  );

  const handleDeleteOption = useCallback(
    (id: string, key: string) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== id) return n;
          const options = { ...(n.data.config?.options ?? {}) };
          delete options[key];
          return { ...n, data: { ...n.data, config: { ...n.data.config, options } } };
        })
      );
      setEdges((eds) =>
        eds.filter((e) => {
          if (e.source !== id) return true;
          const condition = (e.data as any)?.condition as Record<string, any> | null | undefined;
          return !(condition?.trigger === "ON_OPTION" && condition?.value === key);
        })
      );
    },
    [setNodes, setEdges]
  );

  const displayNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          isRoot: n.id === rootNodeId,
          readOnly,
          onContentChange: handleContentChange,
          onDelete: handleDeleteNode,
          onSetRoot: handleSetRoot,
          onOpenSettings: handleOpenSettings,
          onOptionLabelChange: handleOptionLabelChange,
          onAddOption: handleAddOption,
          onDeleteOption: handleDeleteOption,
        },
      })),
    [
      nodes,
      rootNodeId,
      readOnly,
      handleContentChange,
      handleDeleteNode,
      handleSetRoot,
      handleOpenSettings,
      handleOptionLabelChange,
      handleAddOption,
      handleDeleteOption,
    ]
  );

  /** Arrastar de um handle de opção do Choice ou de Sucesso/Falha do Webhook já cria a edge com o gatilho certo. */
  const onConnect = useCallback(
    (connection: Connection) => {
      let condition: Record<string, any> | null = null;
      if (connection.sourceHandle?.startsWith("opt-")) {
        condition = { trigger: "ON_OPTION", value: connection.sourceHandle.slice(4) };
      } else if (connection.sourceHandle === "success") {
        condition = { trigger: "ON_SUCCESS" };
      } else if (connection.sourceHandle === "error") {
        condition = { trigger: "ON_ERROR" };
      }
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: `e-${connection.source}-${connection.target}-${Date.now()}`,
            label: edgeAutoLabel(condition),
            data: { condition },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const addNode = useCallback(
    (type: NodeType) => {
      const id = generateId(nodesRef.current.map((n) => n.id));
      const center = screenToFlowPosition({ x: window.innerWidth / 2, y: 250 });
      const newNode: Node<FlowNodeData> = {
        id,
        type,
        position: { x: center.x + Math.random() * 40 - 20, y: center.y + Math.random() * 40 - 20 },
        data: {
          nodeType: type,
          content: DEFAULT_CONTENT[type],
          config: DEFAULT_CONFIG[type] ? { ...DEFAULT_CONFIG[type] } : {},
          isRoot: false,
          readOnly: false,
          onContentChange: handleContentChange,
          onDelete: handleDeleteNode,
          onSetRoot: handleSetRoot,
          onOpenSettings: handleOpenSettings,
          onOptionLabelChange: handleOptionLabelChange,
          onAddOption: handleAddOption,
          onDeleteOption: handleDeleteOption,
        },
      };
      setNodes((nds) => [...nds, newNode]);
      setRootNodeId((cur) => cur || id);
      setIsAddPanelOpen(false);
      setAddPanelSearch("");
      setSettingsNodeId(id);
    },
    [
      screenToFlowPosition,
      handleContentChange,
      handleDeleteNode,
      handleSetRoot,
      handleOpenSettings,
      handleOptionLabelChange,
      handleAddOption,
      handleDeleteOption,
      setNodes,
    ]
  );

  /** Lê, a partir das edges atuais, para onde cada opção (ou o "não corresponde") de um nó CHOICE aponta hoje. */
  const optionTargetsFor = useCallback(
    (nodeId: string): Record<string, string> => {
      const map: Record<string, string> = {};
      edges.forEach((e) => {
        if (e.source !== nodeId) return;
        const condition = (e.data as any)?.condition as Record<string, any> | null | undefined;
        if (condition?.trigger === "ON_OPTION" && typeof condition.value === "string") {
          map[condition.value] = e.target;
        } else if (condition?.trigger === "ON_NO_MATCH") {
          map[NO_MATCH_KEY] = e.target;
        }
      });
      return map;
    },
    [edges]
  );

  /** Cria/substitui a edge ON_OPTION (ou ON_NO_MATCH) de um nó CHOICE para o nó de destino escolhido no painel. */
  const handleSetOptionTarget = useCallback(
    (sourceId: string, optionKey: string, targetNodeId: string) => {
      setEdges((eds) => {
        const matchesOld = (e: Edge) => {
          if (e.source !== sourceId) return false;
          const condition = (e.data as any)?.condition as Record<string, any> | null | undefined;
          if (optionKey === NO_MATCH_KEY) return condition?.trigger === "ON_NO_MATCH";
          return condition?.trigger === "ON_OPTION" && condition?.value === optionKey;
        };
        const filtered = eds.filter((e) => !matchesOld(e));
        if (!targetNodeId) return filtered;
        const condition =
          optionKey === NO_MATCH_KEY ? { trigger: "ON_NO_MATCH" } : { trigger: "ON_OPTION", value: optionKey };
        const newEdge: Edge = {
          id: `e-${sourceId}-${targetNodeId}-opt-${optionKey}-${Date.now()}`,
          source: sourceId,
          target: targetNodeId,
          label: edgeAutoLabel(condition),
          data: { condition },
        };
        return [...filtered, newEdge];
      });
    },
    [setEdges]
  );

  const nodeOptionsForSelect = useMemo(
    () => nodes.map((n) => ({ id: n.id, label: `${NODE_META[n.data.nodeType].label} · ${n.id}` })),
    [nodes]
  );

  const onEdgeClick = useCallback((_: unknown, edge: Edge) => {
    setIsAddPanelOpen(false);
    setSettingsNodeId(null);
    setSelectedEdgeId(edge.id);
    setEdgeLabelDraft(typeof edge.label === "string" ? edge.label : "");
    const condition = (edge.data as any)?.condition as Record<string, any> | null | undefined;
    const trigger = triggerTypeOf(condition);
    setEdgeTriggerDraft(trigger);
    setEdgeSecondsDraft(condition?.seconds != null ? String(condition.seconds) : "5");
    setEdgeOptionValueDraft(condition?.value != null ? String(condition.value) : "");
  }, []);

  const handleSaveEdgeConfig = useCallback(() => {
    if (!selectedEdgeId) return;
    let condition: Record<string, any> | null;
    switch (edgeTriggerDraft) {
      case "AUTO":
        condition = null;
        break;
      case "ON_TIMEOUT":
        condition = { trigger: "ON_TIMEOUT", seconds: Math.max(1, parseInt(edgeSecondsDraft, 10) || 5) };
        break;
      case "ON_OPTION":
        condition = { trigger: "ON_OPTION", value: edgeOptionValueDraft };
        break;
      default:
        condition = { trigger: edgeTriggerDraft };
    }
    setEdges((eds) =>
      eds.map((e) =>
        e.id === selectedEdgeId
          ? { ...e, label: edgeLabelDraft || edgeAutoLabel(condition), data: { ...e.data, condition } }
          : e
      )
    );
    setSelectedEdgeId(null);
  }, [selectedEdgeId, edgeLabelDraft, edgeTriggerDraft, edgeSecondsDraft, edgeOptionValueDraft, setEdges]);

  const handleDeleteEdge = useCallback(() => {
    if (!selectedEdgeId) return;
    setEdges((eds) => eds.filter((e) => e.id !== selectedEdgeId));
    setSelectedEdgeId(null);
  }, [selectedEdgeId, setEdges]);

  const handleSave = useCallback(() => {
    const flowNodes: FlowNode[] = nodes.map((n) => ({
      id: n.id,
      type: n.data.nodeType,
      content: n.data.content,
      config: { ...n.data.config, __position: n.position },
    }));
    const flowEdges: FlowEdge[] = edges.map((e) => ({
      from: e.source,
      to: e.target,
      condition: (e.data as any)?.condition ?? null,
      label: typeof e.label === "string" ? e.label : null,
    }));
    onChange({ nodes: flowNodes, edges: flowEdges, rootNodeId: rootNodeId || flowNodes[0]?.id || "" });
  }, [nodes, edges, rootNodeId, onChange]);

  const settingsNode = settingsNodeId ? nodes.find((n) => n.id === settingsNodeId) : null;

  const nodeColorForMiniMap = useCallback((n: Node) => {
    const t = (n.data as any)?.nodeType as NodeType | undefined;
    return t ? NODE_META[t].hex : "#999999";
  }, []);

  return (
    <div className={isFullscreen ? "fixed inset-0 z-50 bg-background p-4 flex flex-col gap-3" : "space-y-3"}>
      <div className="flex flex-wrap items-center gap-2">
        {!readOnly && (
          <Button
            size="sm"
            onClick={() => {
              setSettingsNodeId(null);
              setSelectedEdgeId(null);
              setIsAddPanelOpen((v) => !v);
            }}
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Adicionar nó
          </Button>
        )}
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={() => setIsFullscreen((f) => !f)} className="gap-2">
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          {isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
        </Button>
        {!readOnly && (
          <Button size="sm" onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" />
            Salvar alterações
          </Button>
        )}
      </div>

      <div
        className={`relative border rounded-xl overflow-hidden shadow-sm ${isFullscreen ? "flex-1" : ""}`}
        style={isFullscreen ? undefined : { height: 560 }}
      >
        <ReactFlow
          nodes={displayNodes}
          edges={edges}
          onNodesChange={readOnly ? undefined : onNodesChange}
          onEdgesChange={readOnly ? undefined : onEdgesChange}
          onConnect={readOnly ? undefined : onConnect}
          onEdgeClick={readOnly ? undefined : onEdgeClick}
          nodeTypes={nodeTypes}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable={!readOnly}
          connectionMode={ConnectionMode.Loose}
          defaultEdgeOptions={{ style: { strokeWidth: 2 }, type: "smoothstep" }}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={18} size={1.5} className="opacity-60" />
          <Controls showInteractive={!readOnly} className="!shadow-md !rounded-lg overflow-hidden" />
          <MiniMap
            pannable
            zoomable
            nodeColor={nodeColorForMiniMap}
            className="!bg-background !border !border-black/10 dark:!border-white/10 !rounded-lg !shadow-md"
          />
        </ReactFlow>

        {isAddPanelOpen && !readOnly && (
          <AddNodePanel
            search={addPanelSearch}
            onSearchChange={setAddPanelSearch}
            onSelect={addNode}
            onClose={() => setIsAddPanelOpen(false)}
          />
        )}

        {settingsNode && !readOnly && (
          <NodeConfigPanel
            key={settingsNode.id}
            node={settingsNode}
            allNodes={nodeOptionsForSelect}
            optionTargets={optionTargetsFor(settingsNode.id)}
            onChangeConfig={handleChangeConfig}
            onSetOptionTarget={(key, target) => handleSetOptionTarget(settingsNode.id, key, target)}
            onClose={() => setSettingsNodeId(null)}
          />
        )}

        {selectedEdgeId && (
          <Card className="absolute top-2 right-2 w-72 p-3 space-y-2.5 shadow-lg z-10">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Conexão</h4>
              <button onClick={() => setSelectedEdgeId(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Quando disparar</label>
              <select
                value={edgeTriggerDraft}
                onChange={(e) => setEdgeTriggerDraft(e.target.value as TriggerType)}
                className="w-full mt-1 text-sm border rounded px-2 py-1.5 bg-background"
              >
                {(Object.keys(TRIGGER_META) as TriggerType[]).map((t) => (
                  <option key={t} value={t}>
                    {TRIGGER_META[t].label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground mt-1">{TRIGGER_META[edgeTriggerDraft].hint}</p>
            </div>

            {edgeTriggerDraft === "ON_TIMEOUT" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Segundos sem resposta</label>
                <input
                  type="number"
                  min={1}
                  value={edgeSecondsDraft}
                  onChange={(e) => setEdgeSecondsDraft(e.target.value)}
                  className="w-full mt-1 text-sm border rounded px-2 py-1.5 bg-background"
                />
              </div>
            )}

            {edgeTriggerDraft === "ON_OPTION" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Valor da opção (ex.: 1)</label>
                <input
                  value={edgeOptionValueDraft}
                  onChange={(e) => setEdgeOptionValueDraft(e.target.value)}
                  placeholder="1"
                  className="w-full mt-1 text-sm border rounded px-2 py-1.5 bg-background"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground">Rótulo (opcional, só visual)</label>
              <input
                value={edgeLabelDraft}
                onChange={(e) => setEdgeLabelDraft(e.target.value)}
                placeholder="Ex.: quando responder"
                className="w-full mt-1 text-sm border rounded px-2 py-1.5 bg-background"
              />
            </div>

            <div className="flex justify-between gap-2 pt-1">
              <Button size="sm" variant="destructive" onClick={handleDeleteEdge} className="gap-1">
                <Trash2 className="w-3.5 h-3.5" />
                Remover
              </Button>
              <Button size="sm" onClick={handleSaveEdgeConfig}>
                Aplicar
              </Button>
            </div>
          </Card>
        )}
      </div>

      {!isFullscreen && (
        <p className="text-xs text-muted-foreground">
          Clique em <strong>Adicionar nó</strong> para escolher o tipo por categoria. Depois de criado, clique na
          engrenagem do nó (ou dê duplo clique no cabeçalho) para configurá-lo — ex.: URL do webhook, opções da
          escolha, campos do formulário. Clique numa conexão para definir quando ela dispara.
        </p>
      )}
    </div>
  );
}

export function ChatbotFlowEditor(props: ChatbotFlowEditorProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvas {...props} />
    </ReactFlowProvider>
  );
}
