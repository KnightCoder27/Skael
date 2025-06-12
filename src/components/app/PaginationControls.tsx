
"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

interface PaginationControlsProps {
  currentPage: number;
  onPageChange: (newPage: number) => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  isLoading?: boolean;
}

export function PaginationControls({
  currentPage,
  onPageChange,
  canGoPrevious,
  canGoNext,
  isLoading = false,
}: PaginationControlsProps) {
  return (
    <div className="flex items-center justify-center space-x-4 py-4 mt-6 border-t">
      <Button
        variant="outline"
        size="default"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!canGoPrevious || isLoading}
        aria-label="Go to previous page"
      >
        {isLoading && currentPage - 1 === currentPage -1 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronLeft className="mr-2 h-4 w-4" />}
        Previous
      </Button>
      <span className="text-sm font-medium text-muted-foreground">
        Page {currentPage}
      </span>
      <Button
        variant="outline"
        size="default"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!canGoNext || isLoading}
        aria-label="Go to next page"
      >
        {isLoading && currentPage + 1 === currentPage +1 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Next
        {!isLoading && <ChevronRight className="ml-2 h-4 w-4" />}
      </Button>
    </div>
  );
}
