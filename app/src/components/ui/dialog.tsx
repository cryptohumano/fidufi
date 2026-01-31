import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Card, CardContent, CardHeader, CardTitle } from "./card"

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

interface DialogContentProps extends React.ComponentProps<"div"> {
  children: React.ReactNode
}

interface DialogHeaderProps extends React.ComponentProps<"div"> {
  children: React.ReactNode
}

interface DialogTitleProps extends React.ComponentProps<"div"> {
  children: React.ReactNode
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-50 w-full max-w-lg mx-4">
        {children}
      </div>
    </div>
  )
}

function DialogContent({ className, children, ...props }: DialogContentProps) {
  return (
    <Card className={cn("shadow-lg", className)} {...props}>
      {children}
    </Card>
  )
}

function DialogHeader({ className, children, ...props }: DialogHeaderProps) {
  return (
    <CardHeader className={cn("pb-4", className)} {...props}>
      {children}
    </CardHeader>
  )
}

function DialogTitle({ className, children, ...props }: DialogTitleProps) {
  return (
    <CardTitle className={cn("text-xl", className)} {...props}>
      {children}
    </CardTitle>
  )
}

function DialogClose({ onClose }: { onClose: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
      onClick={onClose}
    >
      <X className="h-4 w-4" />
      <span className="sr-only">Cerrar</span>
    </Button>
  )
}

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose }
