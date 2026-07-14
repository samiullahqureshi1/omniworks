export default function ConversationsLoading() {
  return (
    <div className="flex h-full w-full animate-pulse">
      <div className="flex-1 flex flex-col gap-6 p-8">
        <div className="h-12 w-64 bg-muted rounded-2xl" />
        <div className="flex-1 space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`h-16 bg-muted rounded-2xl ${i % 2 === 0 ? 'max-w-lg' : 'max-w-sm ml-auto'}`} />
          ))}
        </div>
        <div className="h-12 bg-muted rounded-2xl" />
      </div>
    </div>
  );
}
