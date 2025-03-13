import { ImageProcessor } from "@/components/image-processor";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto py-4 px-4">
          <h1 className="text-2xl font-bold">MetaCrop</h1>
          <p className="text-muted-foreground">Extract and view image metadata</p>
        </div>
      </header>
      
      <main className="container mx-auto py-8">
        <ImageProcessor />
      </main>
      
      <footer className="border-t mt-10">
        <div className="container mx-auto p-4 text-center text-sm text-muted-foreground">
          <p>Based on the metadata extraction from Civitai</p>
        </div>
      </footer>
    </div>
  );
}