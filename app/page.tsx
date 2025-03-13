"use client";

import { ImageProcessor } from "@/components/image-processor";
import Link from "next/link";
import { useState } from "react";
import { AlertTriangleIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [dialogOpen, setDialogOpen] = useState(false);
  
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40">
        <div className="container mx-auto py-4 px-4">
          <h1 className="text-2xl font-bold">StableSnip</h1>
          <p className="text-muted-foreground">Crop images while preserving their creation info</p>
        </div>
      </header>
      
      <main className="container mx-auto py-8">
        <ImageProcessor />
      </main>
      
      <footer className="fixed bottom-4 left-0 right-0 flex justify-center">
        <div className="w-full px-20 py-2 flex items-center justify-between text-xs bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="hidden lg:block">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <span className="opacity-50 hover:opacity-100 transition-opacity duration-200 cursor-pointer">
                  Use responsibly; avoid misleading others.
                </span>
              </DialogTrigger>
              <DialogContent className="bg-background/60 backdrop-blur-md border border-white/10 shadow-xl rounded-xl">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-yellow-500/10">
                    <AlertTriangleIcon className="h-6 w-6 text-yellow-500" />
                  </div>
                  <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">Responsible Usage</DialogTitle>
                    <div className="text-sm text-muted-foreground mt-2 space-y-2">
                      <div>
                        Editing metadata to deceive others is not cool. This tool is meant for protecting privacy (i.e. redacting sensitive information). Use your noggin.
                      </div>
                    </div>
                  </DialogHeader>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)}
                    className="mt-2"
                  >
                    Got it
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Link
            href={"https://markury.dev"}
            target="_blank"
            className="opacity-50 hover:opacity-100 transition-opacity duration-200"
          >
            A Markury Project
          </Link>
        </div>
      </footer>
    </div>
  );
}