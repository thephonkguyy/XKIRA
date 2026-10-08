import React, { useEffect, useState } from "react";
import { useJobStore } from "../../store/jobStore";
import { CheckCircle2, AlertCircle, Clock, Server, Info } from "lucide-react";

export default function ToolHealthDiagnostics() {
  const { jobs } = useJobStore();
  const [healthData, setHealthData] = useState<any[]>([]);

  useEffect(() => {
    // Group jobs by tool
    const tools = new Set(Object.values(jobs).map(j => j.tool));
    const data: any[] = [];

    tools.forEach(tool => {
      const toolJobs = Object.values(jobs).filter(j => j.tool === tool);
      const latestJob = toolJobs.sort((a, b) => b.createdAt - a.createdAt)[0];
      const successfulJobs = toolJobs.filter(j => j.status === 'COMPLETED');
      const latestSuccess = successfulJobs.sort((a, b) => b.completedAt! - a.completedAt!)[0];
      const errors = toolJobs.filter(j => j.status === 'FAILED' || j.error);

      // Estimate latency from latest successful job
      let latency = 'N/A';
      if (latestSuccess && latestSuccess.startedAt && latestSuccess.completedAt) {
        latency = `${((latestSuccess.completedAt - latestSuccess.startedAt) / 1000).toFixed(1)}s`;
      }

      data.push({
        tool,
        backend: "READY", // simplified check
        model: latestJob?.model || "N/A",
        endpoint: latestJob?.type === 'video' ? "/api/agnes/videos" : "/api/agnes/images/generations",
        lastRequest: latestJob ? new Date(latestJob.createdAt).toLocaleTimeString() : "Never",
        lastResponse: latestJob?.completedAt ? new Date(latestJob.completedAt).toLocaleTimeString() : "N/A",
        latency,
        status: latestJob?.status || "UNKNOWN",
        progressSource: latestJob?.type === 'video' ? "PROVIDER_REPORTED" : "INDETERMINATE",
        errorCount: errors.length,
        lastSuccessfulRun: latestSuccess ? new Date(latestSuccess.completedAt!).toLocaleString() : "Never",
      });
    });

    setHealthData(data);
  }, [jobs]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Server className="w-5 h-5 text-indigo-400" />
        <h3 className="text-sm font-semibold text-white">Global Tool Health</h3>
      </div>
      
      {healthData.length === 0 ? (
        <p className="text-xs text-zinc-500">No tools have been executed yet.</p>
      ) : (
        <div className="grid gap-4">
          {healthData.map(data => (
            <div key={data.tool} className="bg-zinc-900/50 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white">{data.tool}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                  {data.model}
                </span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-zinc-500 uppercase">Status</span>
                  <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                    {data.status === 'COMPLETED' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Info className="w-3.5 h-3.5 text-amber-400" />}
                    {data.status}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-zinc-500 uppercase">Errors</span>
                  <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                    {data.errorCount > 0 ? <AlertCircle className="w-3.5 h-3.5 text-red-400" /> : null}
                    {data.errorCount}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-zinc-500 uppercase">Latency</span>
                  <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    {data.latency}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-zinc-500 uppercase">Progress Source</span>
                  <span className="text-xs font-medium text-zinc-300">
                    {data.progressSource}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-2 pt-2 border-t border-white/5">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-zinc-500 uppercase">Last Request</span>
                  <span className="text-xs text-zinc-400">{data.lastRequest}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-zinc-500 uppercase">Last Success</span>
                  <span className="text-xs text-zinc-400">{data.lastSuccessfulRun}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
