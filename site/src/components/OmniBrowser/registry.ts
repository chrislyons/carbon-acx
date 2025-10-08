import type { OmniNavigationState, OmniNodeDescriptor, OmniNodeType } from './types';

let sequence = 0;

export function resetRegistryOrder(): void {
  sequence = 0;
}

function nextOrder(): number {
  sequence += 1;
  return sequence;
}

export class OmniRegistry {
  private nodes = new Map<string, OmniNodeDescriptor>();

  private rootId: string | null = null;

  public registerNode(
    id: string,
    parentId: string | null,
    type: OmniNodeType,
    label: string,
    options: Partial<Omit<OmniNodeDescriptor, 'id' | 'parentId' | 'type' | 'label'>> = {}
  ): OmniNodeDescriptor {
    const descriptor: OmniNodeDescriptor = {
      id,
      parentId,
      type,
      label,
      searchableText: options.searchableText ?? `${label}`.toLowerCase(),
      description: options.description,
      refCount: options.refCount,
      hasChildren: options.hasChildren ?? false,
      isLoaded: options.isLoaded,
      children: options.children ? [...options.children] : [],
      loadChildren: options.loadChildren,
      order: options.order ?? nextOrder(),
      metadata: options.metadata,
    };
    this.nodes.set(id, descriptor);
    if (parentId) {
      const parent = this.nodes.get(parentId);
      if (parent) {
        parent.children = parent.children ? [...parent.children, id] : [id];
        parent.hasChildren = true;
      }
    } else {
      this.rootId = id;
    }
    return descriptor;
  }

  public ensureRoot(id: string, label: string): OmniNodeDescriptor {
    const existing = this.nodes.get(id);
    if (existing) {
      return existing;
    }
    return this.registerNode(id, null, 'group', label, { hasChildren: true, isLoaded: true });
  }

  public setChildren(id: string, childIds: string[]): void {
    const node = this.nodes.get(id);
    if (!node) {
      return;
    }
    node.children = [...childIds];
    node.hasChildren = childIds.length > 0;
    node.isLoaded = true;
  }

  public getNode(id: string): OmniNodeDescriptor | undefined {
    return this.nodes.get(id);
  }

  public finalise(): OmniNavigationState {
    if (!this.rootId) {
      throw new Error('Omni navigation root not defined');
    }
    return { rootId: this.rootId, nodes: this.nodes } satisfies OmniNavigationState;
  }
}
