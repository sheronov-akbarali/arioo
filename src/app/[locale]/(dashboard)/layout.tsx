import { SessionTouch } from "@/components/dashboard/session-touch";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SessionTouch />
    </>
  );
}
