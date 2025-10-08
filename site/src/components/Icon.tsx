import { memo } from 'react';
import type { ImgHTMLAttributes } from 'react';

import { ASSETS } from '../basePath';

type IconDescriptor = {
  id: string;
  slug: string;
  layerId?: string;
  activityId?: string;
};

const ICON_REGISTRY: IconDescriptor[] = [
  { id: 'professional', slug: 'professional.svg', layerId: 'professional' },
  { id: 'online', slug: 'online.svg', layerId: 'online' },
  { id: 'industrial_light', slug: 'industrial_light.svg', layerId: 'industrial_light' },
  { id: 'industrial_heavy', slug: 'industrial_heavy.svg', layerId: 'industrial_heavy' },
  { id: 'military_ops', slug: 'military_ops.svg', layerId: 'industrial_heavy_military' },
  { id: 'defense_embodied', slug: 'defense_embodied.svg', layerId: 'industrial_heavy_embodied' },
  { id: 'defense_building', slug: 'defense_building.svg', layerId: 'buildings_defense' },
  { id: 'conflict_modeled', slug: 'conflict_modeled.svg', layerId: 'modeled_events' },
  { id: 'chemicals_defense', slug: 'chemicals_defense.svg', layerId: 'materials_chemicals' },
  { id: 'personal_security', slug: 'personal_security.svg', layerId: 'personal_security_layer' },
  { id: 'biosphere_feedbacks', slug: 'online.svg', layerId: 'biosphere_feedbacks' },
  { id: 'industrial_externalities', slug: 'industrial_heavy.svg', layerId: 'industrial_externalities' }
];

const ICON_BY_ID = new Map<string, IconDescriptor>();
const ICON_BY_LAYER = new Map<string, IconDescriptor>();
const ICON_BY_ACTIVITY = new Map<string, IconDescriptor>();

for (const entry of ICON_REGISTRY) {
  ICON_BY_ID.set(entry.id, entry);
  if (entry.layerId) {
    ICON_BY_LAYER.set(entry.layerId, entry);
  }
  if (entry.activityId) {
    ICON_BY_ACTIVITY.set(entry.activityId, entry);
  }
}

type BaseImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'id'>;

export interface IconProps extends BaseImageProps {
  iconId?: string;
  layerId?: string;
  activityId?: string;
  imageId?: string;
}

function resolveIconSlug(props: IconProps): string | null {
  const id = props.iconId?.trim();
  if (id) {
    const descriptor = ICON_BY_ID.get(id) ?? { slug: id };
    return descriptor.slug;
  }
  const layerId = props.layerId?.trim();
  if (layerId) {
    const descriptor = ICON_BY_LAYER.get(layerId);
    if (descriptor) {
      return descriptor.slug;
    }
  }
  const activityId = props.activityId?.trim();
  if (activityId) {
    const descriptor = ICON_BY_ACTIVITY.get(activityId);
    if (descriptor) {
      return descriptor.slug;
    }
  }
  return null;
}

function IconComponent({ iconId, layerId, activityId, alt = '', imageId, ...rest }: IconProps): JSX.Element | null {
  const slug = resolveIconSlug({ iconId, layerId, activityId });
  if (!slug) {
    return null;
  }
  const src = `${ASSETS()}/layers/${slug}`;
  return <img id={imageId} src={src} alt={alt} {...rest} />;
}

export const Icon = memo(IconComponent);
