export default function GenericPageLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-40 bg-muted rounded-xl" />
          <div className="h-4 w-60 bg-muted rounded-xl" />
        </div>
        <div className="h-10 w-32 bg-muted rounded-full" />
      </div>

      <div className="flex gap-3">
        <div className="h-9 w-72 bg-muted rounded-xl" />
      </div>

      <div className="bg-muted rounded-xl h-96" />
    </div>
  );
}
