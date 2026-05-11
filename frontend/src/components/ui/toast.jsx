import * as React from "react";
import { cva } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const ToastProvider = React.forwardRef(({ ...props }, ref) => (
  <div
    ref={ref}
    className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]"
    {...props}
  />
));
ToastProvider.displayName = "ToastProvider";

const ToastViewport = React.forwardRef(({ ...props }, ref) => (
  <div
    ref={ref}
    className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]"
    {...props}
  />
));
ToastViewport.displayName = "ToastViewport";

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        success: "success border-emerald-200 bg-emerald-50 text-emerald-950",
        info: "info border-sky-200 bg-sky-50 text-sky-950",
        warning: "warning border-amber-200 bg-amber-50 text-amber-950",
        error: "error border-red-200 bg-red-50 text-red-950",
        destructive: "destructive error border-red-200 bg-red-50 text-red-950",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
);

const Toast = React.forwardRef(({ className, variant, ...props }, ref) => {
  return <div ref={ref} className={cn(toastVariants({ variant }), className)} {...props} />;
});
Toast.displayName = "Toast";

const ToastAction = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      "group-[.success]:border-emerald-200 group-[.success]:hover:bg-emerald-100 group-[.success]:hover:text-emerald-900 group-[.success]:focus:ring-emerald-300",
      "group-[.info]:border-sky-200 group-[.info]:hover:bg-sky-100 group-[.info]:hover:text-sky-900 group-[.info]:focus:ring-sky-300",
      "group-[.warning]:border-amber-200 group-[.warning]:hover:bg-amber-100 group-[.warning]:hover:text-amber-900 group-[.warning]:focus:ring-amber-300",
      "group-[.error]:border-red-200 group-[.error]:hover:bg-red-100 group-[.error]:hover:text-red-900 group-[.error]:focus:ring-red-300",
      className
    )}
    {...props}
  />
));
ToastAction.displayName = "ToastAction";

const ToastClose = React.forwardRef(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      "group-[.success]:text-emerald-500 group-[.success]:hover:text-emerald-700 group-[.success]:focus:ring-emerald-300",
      "group-[.info]:text-sky-500 group-[.info]:hover:text-sky-700 group-[.info]:focus:ring-sky-300",
      "group-[.warning]:text-amber-500 group-[.warning]:hover:text-amber-700 group-[.warning]:focus:ring-amber-300",
      "group-[.error]:text-red-500 group-[.error]:hover:text-red-700 group-[.error]:focus:ring-red-300",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </button>
));
ToastClose.displayName = "ToastClose";

const ToastTitle = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-sm font-semibold", className)} {...props} />
));
ToastTitle.displayName = "ToastTitle";

const ToastDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-sm opacity-90", className)} {...props} />
));
ToastDescription.displayName = "ToastDescription";

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
