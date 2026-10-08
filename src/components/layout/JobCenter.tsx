import React, { useState } from "react";
import { useJobStore, AIJob } from "../../store/jobStore";
import { Activity, CheckCircle2, AlertCircle, RefreshCw, Trash2, Video, ImageIcon, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import ResponsiveDialog from "../responsive/ResponsiveDialog";

export default function JobCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const { jobs, cancelJob, removeJob, clearCompletedJobs } = useJobStore();

  const allJobsList = Object.values(jobs).sort((a, b) => b.createdAt - a.createdAt);
  const activeJobs = allJobsList.filter(j => j.status === 'QUEUED' || j.status === 'STARTING' || j.status === 'PROCESSING');
  const completedJobs = allJobsList.filter(j => j.status === 'COMPLETED');

  return (
    <>
      {/* Non-intrusive Floating Indicator */}
      <div className="fixed bottom-20 md:bottom-6 right-3 sm:right-6 z-40 flex items-center gap-3">
        {activeJobs.length > 0 ? (
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2.5 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full font-medium text-xs shadow-[0_0_25px_rgba(99,102,241,0.5)] border border-white/20 hover:scale-105 active:scale-95 transition-all cursor-pointer animate-pulse min-h-[44px]"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-200 flex-shrink-0" />
            <span className="text-[11px] sm:text-xs font-semibold whitespace-nowrap">
              {activeJobs.length} {activeJobs.length === 1 ? 'Job' : 'Jobs'} Processing
            </span>
          </button>
        ) : allJobsList.length > 0 ? (
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-zinc-900/95 hover:bg-zinc-800 text-zinc-300 rounded-full text-xs font-medium border border-white/15 backdrop-blur-xl transition-all cursor-pointer shadow-lg active:scale-95 min-h-[40px]"
          >
            <Activity className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
            <span className="text-[11px] sm:text-xs font-semibold">Jobs</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
          </button>
        ) : null}
      </div>

      {/* Generation Center Responsive Dialog */}
      <ResponsiveDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="AI Generation Center"
        subtitle="Background tasks & generation manager"
        icon={<Activity className="w-5 h-5" />}
        size="xl"
        footer={
          completedJobs.length > 0 ? (
            <div className="flex items-center justify-between gap-3 w-full">
              <span className="text-xs text-zinc-400">
                {completedJobs.length} completed {completedJobs.length === 1 ? 'job' : 'jobs'}
              </span>
              <button
                onClick={clearCompletedJobs}
                className="px-3 py-1.5 text-xs text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors flex items-center gap-1.5 min-h-[36px]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Completed</span>
              </button>
            </div>
          ) : undefined
        }
      >
        <div className="flex flex-col gap-3 min-w-0">
          {allJobsList.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs sm:text-sm">
              No active or recent AI jobs.
            </div>
          ) : (
            allJobsList.map((job) => (
              <JobCard key={job.jobId} job={job} onCancel={cancelJob} onRemove={removeJob} />
            ))
          )}
        </div>
      </ResponsiveDialog>
    </>
  );
}

const JobCard: React.FC<{ job: AIJob; onCancel: (id: string) => void; onRemove: (id: string) => void }> = ({ job, onCancel, onRemove }) => {
  const isRunning = job.status === 'QUEUED' || job.status === 'STARTING' || job.status === 'PROCESSING';

  return (
    <div className="p-3.5 sm:p-4 bg-zinc-950/70 border border-zinc-800/90 rounded-2xl flex flex-col gap-2.5 transition-all min-w-0">
      <div className="flex items-start justify-between gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2 min-w-0">
          {job.type === 'video' ? (
            <Video className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <ImageIcon className="w-4 h-4 text-purple-400 flex-shrink-0" />
          )}
          <span className="text-xs font-semibold text-white truncate">{job.tool}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono truncate">
            {job.model}
          </span>
          {job.duration && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono truncate border border-indigo-500/30">
              {job.duration}s
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isRunning && (
            <span className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
              <RefreshCw className="w-3 h-3 animate-spin flex-shrink-0" />
              <span className="truncate max-w-[120px]">{job.progress || job.status}</span>
            </span>
          )}
          {job.status === 'COMPLETED' && (
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> Done
            </span>
          )}
          {(job.status === 'FAILED' || job.status === 'CANCELLED') && (
            <span className="flex items-center gap-1 text-xs text-red-400 font-medium">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {job.status}
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-zinc-300 line-clamp-2 italic break-anywhere">
        "{job.prompt}"
      </p>

      {job.error && (
        <div className="text-[11px] text-red-400 bg-red-500/10 p-2.5 rounded-xl font-mono break-anywhere">
          {job.error}
        </div>
      )}

      {job.resultUrl && (
        <div className="mt-1">
          {job.type === 'video' ? (
            <video src={job.resultUrl} controls className="w-full h-36 sm:h-44 object-cover rounded-xl border border-white/10 bg-black/40" />
          ) : (
            <img src={job.resultUrl} alt="Result" className="w-full h-36 sm:h-44 object-cover rounded-xl border border-white/10" />
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-[10px] sm:text-xs text-zinc-500 gap-2">
        <span className="truncate">{formatDistanceToNow(job.createdAt, { addSuffix: true })}</span>

        <div className="flex items-center gap-3 flex-shrink-0">
          {isRunning && (
            <button
              onClick={() => onCancel(job.jobId)}
              className="text-xs text-red-400 hover:text-red-300 font-medium min-h-[32px] px-2 py-1"
            >
              Cancel Job
            </button>
          )}
          {job.resultUrl && (
            <a
              href={job.resultUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium min-h-[32px] px-2 py-1"
            >
              Open <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {!isRunning && (
            <button
              onClick={() => onRemove(job.jobId)}
              className="text-xs text-zinc-400 hover:text-zinc-200 min-h-[32px] px-2 py-1"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
