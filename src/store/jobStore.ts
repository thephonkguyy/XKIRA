import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeExtractError } from '../lib/utils';
import { safeParseApiResponse } from '../lib/safeResponseParser';

export type JobStatus = 'QUEUED' | 'STARTING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'STALE' | 'EXPIRED';

export interface AIJob {
  jobId: string;
  projectId?: string;
  videoId?: string;
  taskId?: string;
  type: 'image' | 'video' | 'prompt' | 'chat' | 'analysis';
  tool: string; // e.g. 'Video Studio', 'Image Studio', 'Tools', 'Chat'
  model: string;
  prompt: string;
  duration?: number;
  inputUri?: string;
  status: JobStatus;
  progress?: string;
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;
  lastHeartbeatAt?: number;
  retryCount?: number;
  resultUrl?: string;
  error?: string;
  requestId?: string;
  data?: any; // For structured results like scene breakdown
}

interface JobState {
  jobs: Record<string, AIJob>;
  activeJobId: string | null;
  
  // Actions
  createJob: (jobData: Omit<AIJob, "jobId" | "createdAt" | "updatedAt"> & { jobId?: string }) => string;
  updateJob: (jobId: string, updates: Partial<AIJob>) => void;
  cancelJob: (jobId: string) => void;
  removeJob: (jobId: string) => void;
  clearCompletedJobs: () => void;
  setActiveJobId: (jobId: string | null) => void;
  auditJobs: () => void;
}

/**
 * Robust video response URL parser.
 * Accepts: url, response.url, result.url, video.url, output.url, data[0].url, video_url, metadata.url
 */
export function extractVideoUrl(data: any): string | null {
  if (!data || typeof data !== 'object') return null;

  if (typeof data.url === 'string' && data.url.trim().length > 0) return data.url.trim();
  if (typeof data.result?.url === 'string' && data.result.url.trim().length > 0) return data.result.url.trim();
  if (typeof data.video?.url === 'string' && data.video.url.trim().length > 0) return data.video.url.trim();
  if (typeof data.output?.url === 'string' && data.output.url.trim().length > 0) return data.output.url.trim();
  if (typeof data.metadata?.url === 'string' && data.metadata.url.trim().length > 0) return data.metadata.url.trim();

  if (Array.isArray(data.data) && data.data.length > 0) {
    const first = data.data[0];
    if (typeof first === 'string' && first.trim().length > 0) return first.trim();
    if (first && typeof first.url === 'string' && first.url.trim().length > 0) return first.url.trim();
  }

  if (typeof data.video_url === 'string' && data.video_url.trim().length > 0) return data.video_url.trim();

  return null;
}

// Global active polling registry to prevent duplicate polling loops
const activePollers = new Set<string>();

export const useJobStore = create<JobState>()(
  persist(
    (set, get) => ({
      jobs: {},
      activeJobId: null,

      createJob: (jobData) => {
        const jobId = jobData.jobId || `job_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const now = Date.now();
        const newJob: AIJob = {
          jobId,
          videoId: jobData.videoId || jobId,
          createdAt: now,
          updatedAt: now,
          startedAt: now,
          lastHeartbeatAt: now,
          ...jobData,
        };

        set((state) => ({
          jobs: { ...state.jobs, [jobId]: newJob },
          activeJobId: jobId
        }));

        // If it's a polling job (video), start background polling loop
        if (newJob.type === 'video' && (newJob.status === 'QUEUED' || newJob.status === 'PROCESSING' || newJob.status === 'STARTING')) {
          startJobPolling(jobId);
        }

        return jobId;
      },

      updateJob: (jobId, updates) => {
        set((state) => {
          const existing = state.jobs[jobId];
          if (!existing) return state;

          const now = Date.now();
          const updatedJob: AIJob = {
            ...existing,
            ...updates,
            updatedAt: now,
            lastHeartbeatAt: updates.status === 'PROCESSING' || updates.progress ? now : existing.lastHeartbeatAt,
            completedAt: (updates.status === 'COMPLETED' || updates.status === 'FAILED' || updates.status === 'CANCELLED') ? now : existing.completedAt
          };

          return {
            jobs: { ...state.jobs, [jobId]: updatedJob }
          };
        });
      },

      auditJobs: () => {
        const now = Date.now();
        const state = get();
        const updatedJobs = { ...state.jobs };
        let modified = false;

        Object.values(updatedJobs).forEach(job => {
          const isPending = job.status === 'QUEUED' || job.status === 'PROCESSING' || job.status === 'STARTING';
          if (!isPending) return;

          // 1. Timeout for jobs created very long ago (e.g. yesterday)
          const isFromYesterday = new Date(job.createdAt).toDateString() !== new Date(now).toDateString();
          // 2. Timeout for jobs with no recent activity (30 mins)
          const isInactive = now - (job.lastHeartbeatAt || job.updatedAt || job.createdAt) > 1800000;

          if (isFromYesterday || isInactive) {
            updatedJobs[job.jobId] = {
              ...job,
              status: isFromYesterday ? 'EXPIRED' : 'STALE',
              error: isFromYesterday ? 'Job expired from previous session.' : 'Job became stale due to inactivity.',
              updatedAt: now
            };
            modified = true;
            activePollers.delete(job.jobId);
          }
        });

        if (modified) {
          set({ jobs: updatedJobs });
        }
      },

      cancelJob: (jobId) => {
        activePollers.delete(jobId);
        set((state) => {
          const existing = state.jobs[jobId];
          if (!existing) return state;
          return {
            jobs: {
              ...state.jobs,
              [jobId]: { 
                ...existing, 
                status: 'CANCELLED', 
                updatedAt: Date.now(),
                completedAt: Date.now()
              }
            }
          };
        });
      },

      removeJob: (jobId) => {
        activePollers.delete(jobId);
        set((state) => {
          const newJobs = { ...state.jobs };
          delete newJobs[jobId];
          return { jobs: newJobs };
        });
      },

      clearCompletedJobs: () => {
        set((state) => {
          const newJobs: Record<string, AIJob> = {};
          Object.values(state.jobs).forEach(j => {
            if (j.status === 'QUEUED' || j.status === 'PROCESSING' || j.status === 'STARTING') {
              newJobs[j.jobId] = j;
            }
          });
          return { jobs: newJobs };
        });
      },

      setActiveJobId: (jobId) => set({ activeJobId: jobId })
    }),
    {
      name: 'xkira-job-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Independent Background Poller Service
export function startJobPolling(jobId: string) {
  if (activePollers.has(jobId)) {
    return; // Already polling
  }

  activePollers.add(jobId);

  let attempts = 0;
  const maxAttempts = 180; // Up to 15 minutes (5s polling)
  let consecutiveNetworkErrors = 0;
  let missingUrlCount = 0;

  const runPollStep = async () => {
    const job = useJobStore.getState().jobs[jobId];

    // Check if job was removed or cancelled or completed
    if (!job || job.status === 'CANCELLED' || job.status === 'COMPLETED' || (job.status === 'FAILED' && !job.error?.includes('Connection lost') && !job.error?.includes('network'))) {
      activePollers.delete(jobId);
      return;
    }

    attempts++;
    if (attempts > maxAttempts) {
      activePollers.delete(jobId);
      useJobStore.getState().updateJob(jobId, {
        status: 'FAILED',
        error: 'Video generation timed out after 15 minutes.'
      });
      return;
    }

    const targetVideoId = job.videoId || job.jobId;
    const pollUrl = `/api/agnes/videos/generations/${encodeURIComponent(targetVideoId)}?model_name=${encodeURIComponent(job.model || 'agnes-video-v2.0')}`;

    try {
      const res = await fetch(pollUrl);
      
      // Handle non-200 HTTP responses safely without immediate job failure
      if (!res.ok) {
        if (res.status === 404 && attempts < 5) {
          scheduleNextPoll(5000);
          return;
        }
      }

      const parsed = await safeParseApiResponse(res, "Failed to poll video generation status.");
      if (!parsed.success || !parsed.data) {
        throw new Error(parsed.error || `Status check failed with HTTP ${res.status}`);
      }

      const data = parsed.data;
      consecutiveNetworkErrors = 0; // Reset network error counter

      const rawStatus = String(data.status || data.internal_status || '').toLowerCase();

      if (rawStatus === 'completed' || rawStatus === 'success' || rawStatus === 'succeeded') {
        const resultUrl = extractVideoUrl(data);
        
        if (resultUrl) {
          activePollers.delete(jobId);
          useJobStore.getState().updateJob(jobId, {
            status: 'COMPLETED',
            resultUrl,
            progress: '100%',
            updatedAt: Date.now()
          });

          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('XKIRA Video Complete', {
                body: `Your video for "${job.prompt.substring(0, 40)}..." is ready!`,
                icon: '/icon.png'
              });
            } catch (e) {}
          }
          return;
        } else {
          // Status is completed BUT output URL is missing on this pulse.
          // DO NOT mark FAILED immediately! Continue polling.
          missingUrlCount++;
          console.warn(`[JobManager] Job ${jobId} marked completed by server, awaiting URL output (pulse ${missingUrlCount})...`);

          if (missingUrlCount > 24) {
            activePollers.delete(jobId);
            useJobStore.getState().updateJob(jobId, {
              status: 'FAILED',
              error: 'Video marked completed by server, but no URL was returned after timeout.'
            });
            return;
          }

          useJobStore.getState().updateJob(jobId, {
            status: 'PROCESSING',
            progress: 'Finalizing video output URL...'
          });

          scheduleNextPoll(5000);
          return;
        }
      } else if (rawStatus === 'failed' || rawStatus === 'cancelled' || rawStatus === 'error') {
        activePollers.delete(jobId);
        const errorMsg = data.error?.message || data.error || data.message || `Video generation ${rawStatus}.`;
        useJobStore.getState().updateJob(jobId, {
          status: 'FAILED',
          error: String(errorMsg)
        });
        return;
      } else {
        // Still processing
        const progressVal = data.progress !== undefined ? data.progress : data.internal_progress;
        const progressStr = progressVal !== undefined && progressVal !== null ? `Processing: ${progressVal}%` : 'Rendering video frames...';
        
        useJobStore.getState().updateJob(jobId, {
          status: 'PROCESSING',
          progress: progressStr
        });

        scheduleNextPoll(5000);
      }
    } catch (err: any) {
      console.warn(`[JobManager] Polling warning for job ${jobId}:`, err);
      consecutiveNetworkErrors++;

      // Network retry logic with exponential backoff
      if (consecutiveNetworkErrors > 15) {
        activePollers.delete(jobId);
        useJobStore.getState().updateJob(jobId, {
          status: 'FAILED',
          error: `Network error during status check: ${err.message}`
        });
        return;
      }

      useJobStore.getState().updateJob(jobId, {
        progress: 'Reconnecting to video service...'
      });

      const delay = Math.min(30000, 5000 * Math.pow(1.3, consecutiveNetworkErrors));
      scheduleNextPoll(delay);
    }
  };

  const scheduleNextPoll = (delayMs: number) => {
    setTimeout(runPollStep, delayMs);
  };

  runPollStep();
}

// Resume any active pending jobs on store initialization or app startup
export function initializeJobManager() {
  const store = useJobStore.getState();
  
  // 1. Audit jobs to clear stale/expired ones from previous sessions
  store.auditJobs();

  // 2. Restart polling for actually pending jobs
  const pendingJobs = Object.values(store.jobs).filter(
    j => j.status === 'QUEUED' || j.status === 'STARTING' || j.status === 'PROCESSING'
  );

  let modified = false;
  const updatedJobs = { ...store.jobs };

  pendingJobs.forEach(job => {
    if (job.type === 'video' && (job.videoId || job.jobId)) {
      startJobPolling(job.jobId);
    } else {
      // Sync jobs (image, analysis, chat) lose their HTTP connection on reload.
      updatedJobs[job.jobId] = {
        ...job,
        status: 'FAILED',
        error: 'Job was interrupted by page reload or navigation.',
        updatedAt: Date.now()
      };
      modified = true;
    }
  });

  if (modified) {
    useJobStore.setState({ jobs: updatedJobs });
  }
}

// Run initializer once
initializeJobManager();
