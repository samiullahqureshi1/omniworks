export default function SettingsLoading() {
  return (
    <div className="space-y-6 pb-12 max-w-3xl animate-pulse">
      <div className="h-8 w-48 bg-muted rounded-xl" />
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-muted rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
