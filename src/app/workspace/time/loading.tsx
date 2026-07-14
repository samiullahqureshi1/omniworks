export default function TimeLoading() {
  return (
    <div className="space-y-6 pb-12 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-44 bg-muted rounded-xl" />
        <div className="h-10 w-32 bg-muted rounded-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-muted rounded-2xl" />
        ))}
      </div>
      <div className="h-80 bg-muted rounded-2xl" />
    </div>
  );
}
