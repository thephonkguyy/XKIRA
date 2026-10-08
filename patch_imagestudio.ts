import fs from "fs";
const file = "src/pages/ImageStudio.tsx";
let content = fs.readFileSync(file, "utf8");

const oldHandle = `  const handleGenerateEditVariation = async () => {
    if (!editPrompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setErrorMsg(null);

    // Combine reference context with editing prompt
    const combinedPrompt = editReferenceUrl 
      ? \`High-quality cinematic visual variation: \${editPrompt}. Maintaining visual aesthetic, high fidelity, 8k render.\`
      : editPrompt;

    const jobId = createJob({
      type: 'image',
      tool: 'Image Studio',
      model: 'agnes-image-2.1-flash',
      prompt: combinedPrompt,
      inputUri: editReferenceUrl || undefined,
      status: 'PROCESSING',
      progress: 'Generating edited image variation...'
    });

    try {
      const res = await fetch("/api/agnes/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "agnes-image-2.1-flash",
          prompt: combinedPrompt,
          n: 1,
          size: "1024x1024"
        })
      });

      const resText = await res.text();
      if (!res.ok) {
        throw new Error(safeExtractError(resText, res.status));
      }

      const data = JSON.parse(resText);
      const imageUrl = extractImageUrl(data);

      if (imageUrl) {
        setGeneratedImage(imageUrl);
        setActiveTab("generate");
        updateJob(jobId, {
          status: 'COMPLETED',
          resultUrl: imageUrl,
          progress: '100%'
        });
      } else {
        throw new Error("No image URL returned in response.");
      }
    } catch (e: any) {
      console.error("Image Edit Generation Error:", e);
      const cleaned = e.message || "Failed to generate image variation.";
      setErrorMsg(cleaned);
      updateJob(jobId, {
        status: 'FAILED',
        error: cleaned
      });
    } finally {
      setIsGenerating(false);
    }
  };`;

const newHandle = `  const handleGenerateEditVariation = async () => {
    if (!editPrompt.trim() || isGenerating) return;
    if (!editReferenceUrl) {
      setErrorMsg("Please upload a reference image for editing.");
      return;
    }
    setIsGenerating(true);
    setErrorMsg(null);

    const jobId = createJob({
      type: 'image',
      tool: 'Image Studio',
      model: 'agnes-image-2.1-flash',
      prompt: editPrompt,
      inputUri: editReferenceUrl,
      status: 'UPLOADING',
      progress: 'Uploading image for edit...'
    });

    try {
      // 1. Upload/Fetch the blob
      const imgRes = await fetch(editReferenceUrl);
      if (!imgRes.ok) throw new Error("Failed to load reference image for editing.");
      const imgBlob = await imgRes.blob();

      updateJob(jobId, { status: 'PROCESSING', progress: 'Processing edits...' });

      const formData = new FormData();
      formData.append("image", imgBlob, "reference.png");
      formData.append("prompt", editPrompt);
      formData.append("model", "agnes-image-2.1-flash");
      formData.append("n", "1");
      formData.append("size", "1024x1024");

      const res = await fetch("/api/agnes/images/edits", {
        method: "POST",
        body: formData
      });

      updateJob(jobId, { progress: 'Finalizing output...' });

      const resText = await res.text();
      if (!res.ok) {
        throw new Error(safeExtractError(resText, res.status));
      }

      const data = JSON.parse(resText);
      const imageUrl = extractImageUrl(data);

      if (imageUrl) {
        setGeneratedImage(imageUrl);
        setActiveTab("generate");
        updateJob(jobId, {
          status: 'COMPLETED',
          resultUrl: imageUrl,
          progress: '100%'
        });
      } else {
        throw new Error("No image URL returned in response.");
      }
    } catch (e: any) {
      console.error("Image Edit Generation Error:", e);
      const cleaned = e.message || "Failed to edit image.";
      setErrorMsg(cleaned);
      updateJob(jobId, {
        status: 'FAILED',
        error: cleaned
      });
    } finally {
      setIsGenerating(false);
    }
  };`;

if (content.includes("const handleGenerateEditVariation = async () => {")) {
  content = content.replace(oldHandle, newHandle);
  fs.writeFileSync(file, content);
} else {
  console.log("Could not find old handle");
}
