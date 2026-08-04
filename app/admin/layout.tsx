import { AdminAlertSoundListener } from "@/components/admin/AdminAlertSoundListener";
import { AdminNav } from "@/components/admin/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AdminAlertSoundListener />
      <AdminNav />
      {children}
    </div>
  );
}
