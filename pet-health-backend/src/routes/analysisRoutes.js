import { createAnalysisRouter } from './createAnalysisRouter.js';
import { requireUser } from '../middleware/auth.js';
import {
  analyzePetHealthImages,
  buildHealthContextAppendix,
  validateImageFile,
  validateVideoFile,
} from '../services/aiDiagnosisService.js';
import {
  createAnalysisRecord,
  getAnalysisByIdForUser,
  listAnalysesByPet,
  mergeAnalysisDisplayTranslation,
  mergeDisplayLocaleRow,
} from '../repositories/analysisRepository.js';
import {
  extractTranslatablePayload,
  translateAnalysisFieldsToVietnamese,
  translateManyAnalysisRecordsToVietnamese,
} from '../services/analysisTranslationService.js';
import { getPetByIdForUser } from '../repositories/petRepository.js';
import { storeDiagnosisImage, storeDiagnosisVideo } from '../services/imageStorageService.js';
import { buildAnalysisCacheKey, getCachedAnalysis, setCachedAnalysis } from '../services/analysisCacheService.js';
import { getAnalysisProgress, setAnalysisProgress } from '../services/analysisProgressService.js';
import {
  acquireAnalysisLock,
  checkAnalysisCooldown,
  checkUserAnalysisRateLimit,
  getAnalysisGuardConfig,
  markAnalysisCompleted,
  markUserAnalysisAttempt,
  releaseAnalysisLock,
} from '../services/analysisTrafficGuardService.js';

export default createAnalysisRouter({
  requireUser,
  analyzePetHealthImages,
  buildHealthContextAppendix,
  validateImageFile,
  validateVideoFile,
  createAnalysisRecord,
  getAnalysisByIdForUser,
  listAnalysesByPet,
  mergeAnalysisDisplayTranslation,
  mergeDisplayLocaleRow,
  extractTranslatablePayload,
  translateAnalysisFieldsToVietnamese,
  translateManyAnalysisRecordsToVietnamese,
  getPetByIdForUser,
  storeDiagnosisImage,
  storeDiagnosisVideo,
  buildAnalysisCacheKey,
  getCachedAnalysis,
  setCachedAnalysis,
  getAnalysisProgress,
  setAnalysisProgress,
  acquireAnalysisLock,
  checkAnalysisCooldown,
  checkUserAnalysisRateLimit,
  getAnalysisGuardConfig,
  markAnalysisCompleted,
  markUserAnalysisAttempt,
  releaseAnalysisLock,
});
