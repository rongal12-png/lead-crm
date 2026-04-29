import Header from "@/components/layout/Header";
import AIAssistantClient from "@/components/ai/AIAssistantClient";

export default function AIPage() {
  return (
    <div>
      <Header title="AI Assistant" />
      <div className="p-6">
        <AIAssistantClient />
      </div>
    </div>
  );
}
