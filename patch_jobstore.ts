import fs from "fs";
const file = "src/store/jobStore.ts";
let content = fs.readFileSync(file, "utf8");

content = content.replace(
  `  pendingJobs.forEach(job => {
    if (job.type === 'video' && (job.videoId || job.jobId)) {
      startJobPolling(job.jobId);
    }
  });`,
  `  let modified = false;
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
  }`
);

fs.writeFileSync(file, content);
