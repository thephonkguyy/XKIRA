import fs from "fs";
const file = "src/pages/Chat.tsx";
let content = fs.readFileSync(file, "utf8");

content = content.replace(
  '                onEditUserMessage={handleEditUserMessage}\n                onRegenerate={() => handleRegenerate(idx)}\n              />',
  '                onEditUserMessage={handleEditUserMessage}\n                onRegenerate={() => handleRegenerate(idx)}\n                onConfirmTool={handleConfirmTool}\n                onCancelTool={handleCancelTool}\n              />'
);

const handleConfirmToolFn = `
  const handleConfirmTool = async (messageId: string) => {
    if (!activeConversationId) return;
    const currentConv = useChatStore.getState().conversations.find(c => c.id === activeConversationId);
    if (!currentConv) return;
    const msg = currentConv.messages.find(m => m.id === messageId);
    if (!msg || !msg.toolCall) return;

    useChatStore.getState().updateToolCall(activeConversationId, messageId, { status: 'RUNNING' });
    setIsGenerating(true);

    try {
      if (msg.toolCall.toolId === 'image-studio') {
        const res = await fetch("/api/agnes/images/generations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "agnes-image-2.1-flash",
            prompt: msg.content || "An image",
            n: 1,
            size: "1024x1024"
          })
        });
        const resText = await res.text();
        if (!res.ok) throw new Error(safeExtractError(resText, res.status));
        const data = JSON.parse(resText);
        const imageUrl = data?.data?.[0]?.url || data?.url;
        
        if (imageUrl) {
          useChatStore.getState().updateToolCall(activeConversationId, messageId, {
            status: 'COMPLETED',
            result: \`![Generated Image](\${imageUrl})\`
          });
        } else {
          throw new Error("No image URL returned");
        }
      } else if (msg.toolCall.toolId === 'video-studio') {
        const { createJob } = useJobStore.getState();
        const jobId = createJob({
          type: "video",
          tool: "Video Studio",
          model: "agnes-video-v2.0",
          prompt: msg.content || "A video",
          status: "QUEUED",
          progress: "Starting video generation..."
        });
        
        // POST to video endpoint
        const res = await fetch("/api/agnes/videos/generations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "agnes-video-v2.0",
            prompt: msg.content || "A video",
            duration: 5,
            fps: 24,
            resolution: "1280x720",
            jobId: jobId
          })
        });
        const resText = await res.text();
        if (!res.ok) {
          useJobStore.getState().updateJob(jobId, { status: 'FAILED', error: safeExtractError(resText, res.status) });
          throw new Error(safeExtractError(resText, res.status));
        }
        
        const data = JSON.parse(resText);
        const videoId = data.id || data.videoId || data.generation_id || jobId;
        useJobStore.getState().updateJob(jobId, { videoId, status: 'PROCESSING', progress: 'Video job sent to server...' });
        
        // Let polling handle the rest.
        useChatStore.getState().updateToolCall(activeConversationId, messageId, {
          status: 'COMPLETED',
          result: \`Video generation started (Job ID: \${jobId}). Open Video Studio to view progress.\`
        });
      }
    } catch (err: any) {
      useChatStore.getState().updateToolCall(activeConversationId, messageId, {
        status: 'FAILED',
        error: err.message
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancelTool = (messageId: string) => {
    if (!activeConversationId) return;
    useChatStore.getState().updateToolCall(activeConversationId, messageId, {
      status: 'CANCELLED' as any
    });
  };
`;

content = content.replace(
  '  const handleSend = async () => {',
  handleConfirmToolFn + '\n  const handleSend = async () => {'
);

const executeToolReplace = `
    // If it's a Studio tool, ask for confirmation
    if (tool.category === "Studio" && tool.requiresConfirmation) {
      useChatStore.getState().updateToolCall(conversationId, assistantMsgId, {
        status: 'AWAITING_CONFIRMATION'
      });
      setIsGenerating(false);
      return;
    }
`;

content = content.replace(
  /    \/\/ If it's a Studio tool, create a job in jobStore instead of a fast chat completion[\s\S]*?return;\n    \}/,
  executeToolReplace
);

fs.writeFileSync(file, content);
