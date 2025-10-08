export type OmniNodeType =
  | 'group'
  | 'layer'
  | 'activity'
  | 'figure'
  | 'scenario'
  | 'reference';

export interface OmniNodeActionContext {
  focusMainPane?: () => void;
}

export interface OmniNodeActionHandlers {
  open: (id: string, context?: OmniNodeActionContext) => void;
  focus: (id: string, context?: OmniNodeActionContext) => void;
}

export interface OmniNodeMetadata {
  summary?: string | null;
  layerId?: string | null;
  activityId?: string | null;
  figureId?: string | null;
  scenarioId?: string | null;
  referenceId?: string | null;
}

export interface OmniNodeDescriptor {
  id: string;
  parentId: string | null;
  type: OmniNodeType;
  label: string;
  description?: string | null;
  searchableText: string;
  refCount?: number;
  order: number;
  hasChildren: boolean;
  isLoaded?: boolean;
  children?: string[];
  metadata?: OmniNodeMetadata;
  loadChildren?: () => Promise<void> | void;
}

export interface OmniNavigationState {
  rootId: string;
  nodes: Map<string, OmniNodeDescriptor>;
}
