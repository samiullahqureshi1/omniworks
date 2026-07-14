export default function TeamOpsLoading() {
  return (
    <div className="space-y-6 pb-12 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-52 bg-muted rounded-xl" />
        <div className="h-10 w-36 bg-muted rounded-full" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-muted rounded-2xl" />
        ))}
      </div>
      <div className="h-64 bg-muted rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-48 bg-muted rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
