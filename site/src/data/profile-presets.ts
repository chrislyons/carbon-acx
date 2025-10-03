export interface ProfilePreset {
  id: string;
  title: string;
  summary: string;
  profileId: string;
  region: string;
  layerId: string;
  layerLabel: string;
  officeDays?: number;
}

export interface PresetGroup {
  id: string;
  title: string;
  description: string;
  presets: ProfilePreset[];
}

export const PRESET_GROUPS: PresetGroup[] = [
  {
    id: 'professional-cohorts',
    title: 'Professional cohorts',
    description: 'Compare regional office workers with different commute mixes and cohort ages.',
    presets: [
      {
        id: 'pro-to-24-39',
        title: 'Toronto professionals 24–39',
        summary: 'Hybrid cohort anchored in downtown Toronto with regional grid defaults.',
        profileId: 'PRO.TO.24_39.HYBRID.2025',
        region: 'Toronto, Ontario',
        layerId: 'professional',
        layerLabel: 'Professional layer',
        officeDays: 3
      },
      {
        id: 'pro-qc-40-56',
        title: 'Quebec professionals 40–56',
        summary: 'Mature professionals balancing office travel with provincial rail share.',
        profileId: 'PRO.QC.40_56.HYBRID.2025',
        region: 'Montréal, Quebec',
        layerId: 'professional',
        layerLabel: 'Professional layer',
        officeDays: 3
      },
      {
        id: 'pro-bc-24-39',
        title: 'British Columbia professionals 24–39',
        summary: 'Pacific Northwest commuters with higher active transport adoption.',
        profileId: 'PRO.BC.24_39.HYBRID.2025',
        region: 'Vancouver, British Columbia',
        layerId: 'professional',
        layerLabel: 'Professional layer',
        officeDays: 3
      }
    ]
  },
  {
    id: 'online-services',
    title: 'Online services',
    description: 'Switch to digital infrastructure demand profiles across provinces.',
    presets: [
      {
        id: 'online-to-consumer',
        title: 'Toronto consumer bandwidth',
        summary: 'Residential load curve for streaming and SaaS in the Greater Toronto Area.',
        profileId: 'ONLINE.TO.CONSUMER.2025',
        region: 'Toronto, Ontario',
        layerId: 'online',
        layerLabel: 'Online services layer'
      },
      {
        id: 'online-qc-consumer',
        title: 'Quebec consumer bandwidth',
        summary: 'Francophone market mix reflecting Hydro-Québec grid intensity.',
        profileId: 'ONLINE.QC.CONSUMER.2025',
        region: 'Quebec, Canada',
        layerId: 'online',
        layerLabel: 'Online services layer'
      },
      {
        id: 'online-bc-consumer',
        title: 'British Columbia consumer bandwidth',
        summary: 'Pacific fibre routes and hydro-dominant energy powering streaming workloads.',
        profileId: 'ONLINE.BC.CONSUMER.2025',
        region: 'British Columbia, Canada',
        layerId: 'online',
        layerLabel: 'Online services layer'
      }
    ]
  },
  {
    id: 'lifestyle-spotlights',
    title: 'Lifestyle spotlights',
    description: 'Explore focused consumption scenarios for wardrobe and home energy.',
    presets: [
      {
        id: 'adult-clothing',
        title: 'Adult clothing wardrobe',
        summary: 'Annualized apparel purchases for the representative adult cohort.',
        profileId: 'PROFILE.ADULT.CLOTHING.2025',
        region: 'Canada-wide',
        layerId: 'professional',
        layerLabel: 'Professional layer'
      },
      {
        id: 'senior-clothing',
        title: 'Senior clothing wardrobe',
        summary: 'Lower-volume clothing mix reflecting senior purchasing behaviour.',
        profileId: 'PROFILE.SENIOR.CLOTHING.2025',
        region: 'Canada-wide',
        layerId: 'professional',
        layerLabel: 'Professional layer'
      },
      {
        id: 'base-to-hybrid',
        title: 'Toronto hybrid baseline',
        summary: 'Reference baseline used for hybrid commuters in central Toronto.',
        profileId: 'BASE.TO.PROF.HYBRID.2025',
        region: 'Toronto, Ontario',
        layerId: 'professional',
        layerLabel: 'Professional layer',
        officeDays: 3
      }
    ]
  }
];
