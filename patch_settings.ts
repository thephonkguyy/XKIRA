import fs from "fs";
const file = "src/pages/Settings.tsx";
let content = fs.readFileSync(file, "utf8");

if (!content.includes('ToolHealthDiagnostics')) {
  // Add import
  content = content.replace(
    'import ResponsiveTabs from "../components/responsive/ResponsiveTabs";',
    'import ResponsiveTabs from "../components/responsive/ResponsiveTabs";\nimport ToolHealthDiagnostics from "../components/common/ToolHealthDiagnostics";'
  );
  
  // Add section to SECTIONS
  content = content.replace(
    '{ id: "about", icon: Info, label: "About XKIRA" },',
    '{ id: "about", icon: Info, label: "About XKIRA" },\n    { id: "diagnostics", icon: Server, label: "Tool Diagnostics" },'
  );
  content = content.replace(
    'import { Palette, Cpu, HardDrive, Shield, Info, Moon, Sun, Monitor, Trash2, CheckCircle, Smartphone } from "lucide-react";',
    'import { Palette, Cpu, HardDrive, Shield, Info, Moon, Sun, Monitor, Trash2, CheckCircle, Smartphone, Server } from "lucide-react";'
  );

  // Add the render
  const diagnosticSection = `
              {activeSection === "diagnostics" && (
                <motion.div
                  key="diagnostics"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col gap-8"
                >
                  <section className="flex flex-col gap-4">
                    <div>
                      <h2 className="text-sm font-semibold text-white tracking-tight">System Health & Diagnostics</h2>
                      <p className="text-xs text-zinc-400 mt-1">Real-time status of all configured AI tools and backend services. For developer use.</p>
                    </div>
                    <ToolHealthDiagnostics />
                  </section>
                </motion.div>
              )}
`;

  content = content.replace(
    '{activeSection === "about" && (',
    diagnosticSection + '\n              {activeSection === "about" && ('
  );
  
  fs.writeFileSync(file, content);
}
