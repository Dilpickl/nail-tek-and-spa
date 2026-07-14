import { AdminNav } from "@/components/admin/AdminNav";
import { AdminPushPrompt } from "@/components/admin/AdminPushPrompt";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <AdminPushPrompt />
      {children}
    </div>
  );
}
