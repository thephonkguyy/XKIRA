import React, { useEffect, useRef } from "react";
import { VoiceSessionState } from "../../core/voice";

interface VoiceVisualizerProps {
  state: VoiceSessionState;
  audioLevel: number;
  frequencyData: number[];
  isMuted?: boolean;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
  state,
  audioLevel,
  frequencyData,
  isMuted = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      phase += 0.05;

      const numBars = 32;
      const barWidth = Math.max(3, (width - (numBars - 1) * 3) / numBars);
      const centerY = height / 2;

      // Color scheme based on state
      let primaryColor = "rgba(99, 102, 241, "; // Indigo
      let secondaryColor = "rgba(168, 85, 247, "; // Purple

      if (state === "SPEAKING") {
        primaryColor = "rgba(56, 189, 248, "; // Sky blue
        secondaryColor = "rgba(99, 102, 241, "; // Indigo
      } else if (state === "THINKING") {
        primaryColor = "rgba(236, 72, 153, "; // Pink
        secondaryColor = "rgba(168, 85, 247, "; // Purple
      } else if (state === "INTERRUPTED") {
        primaryColor = "rgba(251, 146, 60, "; // Orange
        secondaryColor = "rgba(239, 68, 68, "; // Red
      } else if (isMuted) {
        primaryColor = "rgba(113, 113, 122, "; // Zinc
        secondaryColor = "rgba(82, 82, 91, ";
      }

      // Draw mirrored frequency bars
      for (let i = 0; i < numBars; i++) {
        let barHeight = 4;

        if (state === "LISTENING" && !isMuted) {
          const rawFreq = frequencyData[i] || 0;
          const freqNorm = rawFreq / 255;
          const energy = Math.max(freqNorm, audioLevel * 1.2);
          barHeight = Math.max(4, energy * (height * 0.75));
        } else if (state === "SPEAKING") {
          // Synthetic audio rhythm based on sine waves
          const wave = Math.sin(phase * 1.5 + i * 0.3) * 0.5 + 0.5;
          const wave2 = Math.cos(phase * 2.2 + i * 0.5) * 0.5 + 0.5;
          barHeight = Math.max(6, (wave * 0.6 + wave2 * 0.4) * (height * 0.65));
        } else if (state === "THINKING") {
          // Subtle swirling wave
          const wave = Math.sin(phase * 1.8 + i * 0.4) * 0.5 + 0.5;
          barHeight = Math.max(4, wave * 14);
        } else if (state === "INTERRUPTED") {
          barHeight = Math.max(4, Math.random() * (height * 0.4));
        } else {
          // Ambient breathing
          const wave = Math.sin(phase * 0.8 + i * 0.2) * 0.5 + 0.5;
          barHeight = Math.max(3, wave * 8);
        }

        const x = i * (barWidth + 3);
        const y = centerY - barHeight / 2;

        const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
        grad.addColorStop(0, `${primaryColor}0.95)`);
        grad.addColorStop(1, `${secondaryColor}0.4)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 3);
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [state, audioLevel, frequencyData, isMuted]);

  return (
    <div className="w-full h-16 sm:h-20 flex items-center justify-center relative overflow-hidden rounded-2xl bg-black/20 border border-white/5 backdrop-blur-md p-2">
      <canvas
        ref={canvasRef}
        width={320}
        height={80}
        className="w-full h-full max-w-sm mx-auto"
      />
    </div>
  );
};
