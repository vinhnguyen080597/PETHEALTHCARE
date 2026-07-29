import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TEMPLATES, type BreederTemplateId } from '../constants/breederTemplates';

type TemplatePickerScreenProps = {
  selectedTemplateId: BreederTemplateId;
  onBack: () => void;
  onApply: (templateId: BreederTemplateId) => void | Promise<void>;
};

export function TemplatePickerScreen({ selectedTemplateId, onBack, onApply }: TemplatePickerScreenProps) {
  const { t, i18n } = useTranslation();
  const [pendingId, setPendingId] = useState<BreederTemplateId>(selectedTemplateId);
  const [showConfirm, setShowConfirm] = useState(false);
  const [applying, setApplying] = useState(false);
  const pending = TEMPLATES.find((item) => item.id === pendingId) ?? TEMPLATES[0];
  const pendingName = i18n.language.startsWith('en') ? t(pending.nameEnKey) : t(pending.nameKey);

  async function handleApply() {
    if (applying) return;
    setApplying(true);
    try {
      await onApply(pendingId);
      setShowConfirm(false);
    } finally {
      setApplying(false);
    }
  }

  return (
    <View testID="breeder-template-screen" style={{ flex: 1, backgroundColor: '#F2F4F8' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 8 }}>
        <Pressable className="w-14 rounded-lg p-2" onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>
          {t('breederTemplates.pickerTitle')}
        </Text>
        <View className="w-14" />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
          <Text style={{ fontSize: 13, color: '#64748B', lineHeight: 20 }}>{t('breederTemplates.pickerIntro')}</Text>
        </View>
        <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 12 }}>
          {TEMPLATES.map((template) => (
            <TemplatePreviewCard
              key={template.id}
              id={template.id}
              name={i18n.language.startsWith('en') ? t(template.nameEnKey) : t(template.nameKey)}
              desc={t(template.descKey)}
              fit={t(template.fitKey)}
              selected={pendingId === template.id}
              isApplied={selectedTemplateId === template.id}
              onSelect={() => setPendingId(template.id)}
            />
          ))}
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowConfirm(true)}
          style={{ backgroundColor: '#1E6FE8', borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
            {t('breederTemplates.apply', { name: pendingName })}
          </Text>
        </Pressable>
      </View>

      <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' }} onPress={() => setShowConfirm(false)}>
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32 }}
          >
            <View style={{ width: 36, height: 4, backgroundColor: '#E2E8F0', borderRadius: 999, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 8 }}>
              {t('breederTemplates.confirmTitle', { name: pendingName })}
            </Text>
            <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 20, lineHeight: 20 }}>{t('breederTemplates.confirmBody')}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void handleApply()}
              disabled={applying}
              style={{ backgroundColor: '#1E6FE8', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginBottom: 10, opacity: applying ? 0.7 : 1 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{t('breederTemplates.confirmApply')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowConfirm(false)}
              style={{ backgroundColor: '#F1F5F9', borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}
            >
              <Text style={{ color: '#64748B', fontWeight: '600', fontSize: 14 }}>{t('common.cancel')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function TemplatePreviewCard({
  id,
  name,
  desc,
  fit,
  selected,
  isApplied,
  onSelect,
}: {
  id: BreederTemplateId;
  name: string;
  desc: string;
  fit: string;
  selected: boolean;
  isApplied: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onSelect}
      style={{
        backgroundColor: '#fff',
        borderRadius: 18,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? '#1E6FE8' : '#E2E8F0',
        overflow: 'hidden',
        shadowColor: '#1E6FE8',
        shadowOpacity: selected ? 0.12 : 0,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 0 },
      }}
    >
      <TemplateMiniPreview id={id} />
      <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>{name}</Text>
            {isApplied ? (
              <View style={{ backgroundColor: '#D1FAE5', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#065F46' }}>{t('breederTemplates.inUse')}</Text>
              </View>
            ) : null}
          </View>
          {selected ? (
            <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#1E6FE8', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>✓</Text>
            </View>
          ) : null}
        </View>
        <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 8, lineHeight: 18 }}>{desc}</Text>
        <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ fontSize: 10, color: '#94A3B8' }}>{t('breederTemplates.fitLabel')}</Text>
          <Text style={{ fontSize: 10, color: '#475569', fontWeight: '600' }}>{fit}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function TemplateMiniPreview({ id }: { id: BreederTemplateId }) {
  if (id === 'T2') {
    return (
      <View style={{ height: 72, backgroundColor: '#0F172A', justifyContent: 'flex-end', paddingHorizontal: 10, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <View style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: '#1E6FE8', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 8, fontWeight: '800', color: '#fff' }}>MH</Text>
          </View>
          <View style={{ width: 55, height: 4, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 2 }} />
        </View>
      </View>
    );
  }
  if (id === 'T3') {
    return (
      <View style={{ height: 72, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', justifyContent: 'center', paddingHorizontal: 12 }}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: '#7C3AED' }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 9, fontWeight: '800', color: '#fff' }}>MH</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ width: 65, height: 5, backgroundColor: '#0F172A', borderRadius: 3, marginBottom: 4, opacity: 0.8 }} />
            <View style={{ width: 45, height: 3, backgroundColor: '#E2E8F0', borderRadius: 2 }} />
          </View>
          <View style={{ backgroundColor: '#F5F3FF', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#7C3AED', lineHeight: 16 }}>78</Text>
            <Text style={{ fontSize: 7, color: '#A78BFA' }}>/100</Text>
          </View>
        </View>
      </View>
    );
  }
  if (id === 'T4') {
    return (
      <View style={{ height: 72, backgroundColor: '#A7F3D0', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 10 }}>
        <View style={{ backgroundColor: '#059669', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
          <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>♡</Text>
        </View>
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#059669', borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 9, fontWeight: '800', color: '#fff' }}>MH</Text>
        </View>
        <View style={{ width: 55, height: 5, backgroundColor: '#064E3B', borderRadius: 3, opacity: 0.7 }} />
      </View>
    );
  }
  if (id === 'T5') {
    return (
      <View style={{ height: 72, backgroundColor: '#0F172A', overflow: 'hidden' }}>
        <View style={{ height: 14, backgroundColor: '#B45309', justifyContent: 'center', paddingHorizontal: 10 }}>
          <Text style={{ fontSize: 7, color: '#fff', fontWeight: '700' }}>🏅</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingTop: 8 }}>
          <View style={{ width: 26, height: 26, borderRadius: 8, borderWidth: 1.5, borderColor: 'rgba(245,158,11,0.5)', backgroundColor: 'rgba(30,111,232,0.3)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 8, fontWeight: '800', color: '#fff' }}>MH</Text>
          </View>
          <View>
            <View style={{ width: 60, height: 4, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 2, marginBottom: 4 }} />
            <View style={{ width: 40, height: 3, backgroundColor: 'rgba(245,158,11,0.5)', borderRadius: 2 }} />
          </View>
        </View>
      </View>
    );
  }
  return (
    <View style={{ height: 72, backgroundColor: '#1E6FE8', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', right: -10, top: -10, width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.08)' }} />
      <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff' }}>MH</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ width: 70, height: 5, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 3, marginBottom: 4 }} />
        <View style={{ width: 50, height: 4, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 3 }} />
      </View>
      <View style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff', lineHeight: 12 }}>78</Text>
        <Text style={{ fontSize: 7, color: 'rgba(255,255,255,0.6)' }}>/100</Text>
      </View>
    </View>
  );
}
