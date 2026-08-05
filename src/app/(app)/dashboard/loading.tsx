import { LoadingState } from "@/components/common";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <LoadingState variant="stats" count={4} />
      <LoadingState variant="list" count={3} />
    </div>
  );
}
