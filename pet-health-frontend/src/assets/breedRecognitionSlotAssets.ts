import type { BreedRecognitionSlot } from '../constants/petBreedRecognitionSlots';

const SLOT_EXAMPLE_IMAGES: Partial<Record<BreedRecognitionSlot, number>> = {
  face: require('../../assets/breed-recognition/face.png'),
  fullBodySide: require('../../assets/breed-recognition/fullBodySide.png'),
  coat: require('../../assets/breed-recognition/coat.png'),
};

export function getBreedRecognitionSlotExampleImage(slot: BreedRecognitionSlot): number | undefined {
  return SLOT_EXAMPLE_IMAGES[slot];
}
