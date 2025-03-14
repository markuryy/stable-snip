"use client";

import { ImageProcessor } from "@/components/image-processor";
import Link from "next/link";
import StableSnipLogo from "@/components/logo";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto pt-[5%] pb-4 px-4 flex flex-col items-center">
        <Link href="/" className="mb-2">
          <StableSnipLogo className="h-30 w-auto" />
        </Link>
        <p className="text-sm text-muted-foreground text-center">
          Crop images while preserving their creation info
        </p>
      </div>
      
      <main className="container mx-auto">
        <ImageProcessor />
      </main>
      
    </div>
  );
}