import { motion } from "framer-motion";
import { MessageSquare, ImageIcon, Video, Wand2, Wrench, Cpu, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";
import { useProjectStore } from "../store/projectStore";
import ResumeProjectBanner from "../components/common/ResumeProjectBanner";
import RecentActivitySection from "../components/common/RecentActivitySection";

const FEATURES = [
  {
    title: "AI Chat",
    description: "Multimodal conversation with advanced reasoning and vision.",
    icon: MessageSquare,
    path: "/chat",
    color: "from-blue-500/20 to-indigo-500/20",
    border: "group-hover:border-indigo-500/50"
  },
  {
    title: "Image Studio",
    description: "Generate, edit, and analyze images with precision.",
    icon: ImageIcon,
    path: "/image-studio",
    color: "from-purple-500/20 to-pink-500/20",
    border: "group-hover:border-purple-500/50"
  },
  {
    title: "Video Studio",
    description: "Create cinematic video from text and images.",
    icon: Video,
    path: "/video-studio",
    color: "from-emerald-500/20 to-teal-500/20",
    border: "group-hover:border-emerald-500/50"
  },
  {
    title: "Prompt Lab",
    description: "Engineer perfect prompts for optimal generation.",
    icon: Wand2,
    path: "/prompt-lab",
    color: "from-amber-500/20 to-orange-500/20",
    border: "group-hover:border-amber-500/50"
  }
];

export default function Home() {
  const navigate = useNavigate();
  const { lastActiveProjectId, projects, setActiveProject, createProject } = useProjectStore();

  const lastProject = lastActiveProjectId ? projects[lastActiveProjectId] : null;

  const handleResume = () => {
    if (!lastProject) return;
    setActiveProject(lastProject.tool, lastProject.projectId);
    if (lastProject.type === 'video' || lastProject.type === 'story' || lastProject.type === 'long-form-video') {
      navigate('/video-studio');
    } else if (lastProject.type === 'image') {
      navigate('/image-studio');
    } else if (lastProject.type === 'chat') {
      navigate('/chat');
    } else {
      navigate('/video-studio');
    }
  };

  const handleStartNew = () => {
    const newProj = createProject('video', 'Video Studio');
    navigate('/video-studio');
  };

  return (
    <div className="flex flex-col gap-8 sm:gap-12 pb-16 relative w-full">
      
      {/* Resume Banner if user has a recent work */}
      {lastProject && (
        <ResumeProjectBanner
          project={lastProject}
          onResume={handleResume}
          onStartNew={handleStartNew}
        />
      )}

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center text-center mt-2 sm:mt-4 px-2"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-zinc-300 mb-4 sm:mb-6">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          Powered by Agnes AI
        </div>
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-white/90 to-white/60 mb-3 sm:mb-4">
          XKIRA
        </h1>
        <p className="text-base sm:text-xl md:text-2xl text-zinc-400 font-light max-w-2xl px-2">
          Create. Think. Generate. The multimodal AI creative operating system.
        </p>
      </motion.div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {FEATURES.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link 
              to={feature.path}
              className={cn(
                "group relative flex flex-col p-5 sm:p-7 md:p-8 rounded-3xl border border-white/5 bg-white/[0.02] overflow-hidden transition-all duration-500 hover:bg-white/[0.04] active:scale-[0.99]",
                feature.border
              )}
            >
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500", feature.color)} />
              
              <div className="relative z-10 flex items-start justify-between">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10">
                  <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-white/30 group-hover:text-white transition-colors duration-300 transform group-hover:translate-x-1" />
              </div>
              
              <div className="relative z-10 mt-8 sm:mt-14">
                <h3 className="text-xl sm:text-2xl font-semibold text-white mb-1.5 sm:mb-2 tracking-tight">{feature.title}</h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">{feature.description}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Global Recent Activity Section */}
      <RecentActivitySection
        title="Recent Activity & Media"
        subtitle="Resume previous projects or reuse recent assets"
      />

    </div>
  );
}
