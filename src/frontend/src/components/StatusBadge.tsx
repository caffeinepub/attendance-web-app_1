interface StatusBadgeProps {
  status: string;
}

const variants: Record<string, string> = {
  "Early Entry": "bg-sky-100 text-sky-800 border-sky-200",
  "On Time": "bg-green-100 text-green-800 border-green-200",
  "On Time Exit": "bg-green-100 text-green-800 border-green-200",
  "Half Day": "bg-orange-100 text-orange-800 border-orange-200",
  "Late Exit": "bg-red-100 text-red-800 border-red-200",
  "Week Off": "bg-gray-100 text-gray-700 border-gray-200",
  Absent: "bg-red-100 text-red-800 border-red-200",
  present: "bg-green-100 text-green-800 border-green-200",
  absent: "bg-red-100 text-red-800 border-red-200",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const cls = variants[status] ?? "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}
    >
      {status}
    </span>
  );
}
