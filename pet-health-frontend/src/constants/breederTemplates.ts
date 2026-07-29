export type BreederTemplateId = 'T1' | 'T2' | 'T3' | 'T4' | 'T5';

export const DEFAULT_TEMPLATE_ID: BreederTemplateId = 'T1';

export type BreederTemplateDef = {
  id: BreederTemplateId;
  nameKey: string;
  nameEnKey: string;
  descKey: string;
  fitKey: string;
  color: string;
};

export const TEMPLATES: BreederTemplateDef[] = [
  {
    id: 'T1',
    nameKey: 'breederTemplates.T1.name',
    nameEnKey: 'breederTemplates.T1.nameEn',
    descKey: 'breederTemplates.T1.desc',
    fitKey: 'breederTemplates.T1.fit',
    color: '#1E6FE8',
  },
  {
    id: 'T2',
    nameKey: 'breederTemplates.T2.name',
    nameEnKey: 'breederTemplates.T2.nameEn',
    descKey: 'breederTemplates.T2.desc',
    fitKey: 'breederTemplates.T2.fit',
    color: '#0F172A',
  },
  {
    id: 'T3',
    nameKey: 'breederTemplates.T3.name',
    nameEnKey: 'breederTemplates.T3.nameEn',
    descKey: 'breederTemplates.T3.desc',
    fitKey: 'breederTemplates.T3.fit',
    color: '#7C3AED',
  },
  {
    id: 'T4',
    nameKey: 'breederTemplates.T4.name',
    nameEnKey: 'breederTemplates.T4.nameEn',
    descKey: 'breederTemplates.T4.desc',
    fitKey: 'breederTemplates.T4.fit',
    color: '#059669',
  },
  {
    id: 'T5',
    nameKey: 'breederTemplates.T5.name',
    nameEnKey: 'breederTemplates.T5.nameEn',
    descKey: 'breederTemplates.T5.desc',
    fitKey: 'breederTemplates.T5.fit',
    color: '#B45309',
  },
];

const TEMPLATE_IDS = new Set<string>(TEMPLATES.map((item) => item.id));

export function isBreederTemplateId(value: unknown): value is BreederTemplateId {
  return typeof value === 'string' && TEMPLATE_IDS.has(value);
}

export function getBreederTemplateId(metadata: Record<string, unknown> | undefined): BreederTemplateId {
  const raw = metadata?.templateId;
  return isBreederTemplateId(raw) ? raw : DEFAULT_TEMPLATE_ID;
}

export function templateAccent(templateId: BreederTemplateId): string {
  if (templateId === 'T3') return '#7C3AED';
  if (templateId === 'T4') return '#059669';
  if (templateId === 'T5') return '#D97706';
  return '#1E6FE8';
}
