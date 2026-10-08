# XKIRA Feature Expansion: Implementation Plan

This document details the architectural additions and integration steps for the XKIRA feature expansion. We preserve the existing styling, glass effects, animations, and high-performance audio engine while introducing rich capability expansion.

---

## Architecture & Integration Strategy

### 1. File Storage & Persistence (IndexedDB)
- **Local Attachment Storage:** All file, document, image, and video attachments are stored inside a dedicated local IndexedDB database (via a lightweight wrapper or native wrapper).
- **Metadata Store:** Message records reference file IDs. The raw binaries are loaded reactively from IndexedDB only when rendering previews or submitting them to the generation context.
- **Why:** Keeps `localStorage` free from size limits, guarantees seamless page refreshes, and prevents network congestion during non-generation steps.

### 2. Conversation Folders & Organization
- **State Properties:**
  - `isPinned: boolean`
  - `isArchived: boolean`
  - `folderId: string | null`
- **Folders Manager:** User can create, rename, and delete custom folders.
- **Conversation Search:** Fuzzy search filter matching conversation titles and inline message contents.

### 3. File & Document System
- **Supported Formats:** PDF, DOC, DOCX, TXT, MD, CSV, XLSX, PNG, JPG, JPEG, WEBP, MP4, MP3.
- **Text Extraction:** Client-side fallback text extraction for raw text/MD, and basic server-side routing helper for heavy documents.
- **Image/Video Input:** Images are loaded as base64 payloads to feed into multi-modal models or image-to-video generation.

### 4. Sliding File Manager Drawer
- **UI Presentation:** A beautiful, responsive glassmorphic sliding drawer on the right side of the Chat screen.
- **Features:** File upload slot, list of active attachments, delete action, type filtering, and attachment-to-composer toggle.

### 5. Writing, Coding, and Productivity Tools
- **Tools Page Integration:** Standardized card panels in the `/tools` workspace that route directly to specialized generator overlays.
- **Grammar & Rewriting:** Dedicated UI to input, analyze, proofread, or paraphrase text.
- **Coding Suite:** Code generator, optimization explainer, and syntax refactoring.
- **Research Tools:** Integrated Web Search and Deep Research grounding using a lightweight server-side search/scraping proxy route.

---

## Detailed Phase Breakdown

### Phase 1: Basic Chat Improvements
- **Sidebar Integration:** A collapsable, glassmorphic left/right drawer within the `/chat` route listing folders, pinned chats, and active conversations.
- **Conversation Controls:** Pin, archive, folder organization, rename (inline double-click or action popover), delete, and clear actions.
- **Import/Export:** Export complete chat state to JSON; import JSON to restore conversations.
- **Message Controls:** Edit user message (regenerate path), regenerate assistant response, copy code blocks/texts, share response link/text.
- **Stop Generation:** Connect the frontend controller to abort active stream fetch requests cleanly.

### Phase 2: File & Document System
- **IndexedDB Schema Setup:** Define a `files` table containing `id`, `name`, `type`, `size`, `data` (binary blob/array buffer), and `timestamp`.
- **Parsing Engines:** Add a helper to parse files. Text-based files (txt, md) read locally via FileReader. Images convert to base64.
- **Composer Attachment Bar:** Beautiful horizontal carousel above the message input text area showing attached files with remove buttons.

### Phase 3 & 4: Writing & Coding Tools
- **Workspace UI:** Under `/tools`, create specific sections matching current design tokens:
  - **Writing:** Professional Rewriter, Proofreader, Paraphraser.
  - **Coding:** Code Explainer, Refactoring Suite, Regex Builder.
- **Action Triggers:** Submits raw content alongside system instruction presets directly to the preferred Agnes chat models.

### Phase 5 & 6: Research & Productivity
- **Dynamic Web Search Route:** Express proxy route (`/api/search/web`) that fetches Google or DuckDuckGo results and passes them as structural context to the LLM.
- **Deep Research:** Multi-step agent execution that loops search-scrape-summarize queries, outputting structured markdown reports.
- **Productivity UI:** Standard scientific/technical calculators and Unit Converters integrated within the Tools page.

### Phase 7 & 8: Image & Video Studio Expansions
- **Image Studio:** Multi-resolution, custom aspect-ratio selection (16:9, 1:1, 9:16, 4:3), variation generators, and advanced prompt-weight adjustments.
- **Video Studio:** High-quality frame extraction, timeline expansion (extend 5s to 10s), and specialized cinematic camera movement preset selectors (pan, zoom, orbit).

---

## File modification Plan

1. `/src/store/chatStore.ts` - Expand Store with folders, pins, archives, export/import, search filter, active attachments, and IndexedDB linkages.
2. `/src/pages/Chat.tsx` - Re-engineer Chat view with conversation drawer, file manager panel, model/search selectors, stop generator connections, and better status indicators.
3. `/src/components/chat/ChatMessageItem.tsx` - Enhance with attachment chips, citation sources, code action buttons, and better markdown rendering.
4. `/src/pages/Tools.tsx` - Upgrade Tools grid with sub-categories for Writing, Coding, Productivity, and Research workflows.
5. `/src/server/server.ts` - Expose search scraping proxy routes and parsing endpoint helpers to handle dynamic web searches and heavy file parsing.
