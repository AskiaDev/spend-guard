"use client";

import { X } from "lucide-react";
import { createContext, use, type ComponentProps, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

type MutationDrawerContextValue = {
  state: {
    open: boolean;
  };
  actions: {
    close: () => void;
  };
  meta: {
    closeLabel: string;
  };
};

const MutationDrawerContext = createContext<MutationDrawerContextValue | null>(null);

function useMutationDrawer() {
  const context = use(MutationDrawerContext);

  if (!context) {
    throw new Error("MutationDrawer components must be used within MutationDrawer.Root.");
  }

  return context;
}

function MutationDrawerRoot({
  open,
  onOpenChange,
  closeLabel = "Close panel",
  className,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  closeLabel?: string;
  className?: string;
  children: ReactNode;
}) {
  const context: MutationDrawerContextValue = {
    state: { open },
    actions: { close: () => onOpenChange(false) },
    meta: { closeLabel },
  };

  return (
    <MutationDrawerContext value={context}>
      <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
        <DrawerContent className={cn("sm:max-w-[27rem]", className)}>
          {children}
        </DrawerContent>
      </Drawer>
    </MutationDrawerContext>
  );
}

function MutationDrawerForm({
  className,
  noValidate = true,
  ...props
}: ComponentProps<"form">) {
  return (
    <form
      className={cn("flex min-h-0 flex-1 flex-col", className)}
      noValidate={noValidate}
      {...props}
    />
  );
}

function MutationDrawerHeader({
  className,
  children,
  ...props
}: ComponentProps<typeof DrawerHeader>) {
  return (
    <DrawerHeader className={cn("border-b border-border", className)} {...props}>
      <div className="flex items-start justify-between gap-3">
        {children}
        <MutationDrawer.Close />
      </div>
    </DrawerHeader>
  );
}

function MutationDrawerBody({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("grid flex-1 content-start gap-4 overflow-y-auto p-5", className)}
      {...props}
    />
  );
}

function MutationDrawerFooter({
  className,
  ...props
}: ComponentProps<typeof DrawerFooter>) {
  return <DrawerFooter className={cn("border-t border-border", className)} {...props} />;
}

function MutationDrawerTitle(props: ComponentProps<typeof DrawerTitle>) {
  return <DrawerTitle {...props} />;
}

function MutationDrawerDescription(props: ComponentProps<typeof DrawerDescription>) {
  return <DrawerDescription {...props} />;
}

function MutationDrawerClose({
  className,
  children,
  "aria-label": ariaLabel,
  ...props
}: ComponentProps<typeof DrawerClose>) {
  const { meta } = useMutationDrawer();

  return (
    <DrawerClose
      aria-label={ariaLabel ?? meta.closeLabel}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-control text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      {...props}
    >
      {children ?? <X className="size-4" aria-hidden="true" />}
    </DrawerClose>
  );
}

function MutationDrawerCancel({
  children = "Cancel",
  onClick,
  ...props
}: ComponentProps<typeof Button>) {
  const {
    actions: { close },
  } = useMutationDrawer();

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={(event) => {
        onClick?.(event);

        if (!event.defaultPrevented) {
          close();
        }
      }}
      {...props}
    >
      {children}
    </Button>
  );
}

export const MutationDrawer = {
  Root: MutationDrawerRoot,
  Form: MutationDrawerForm,
  Header: MutationDrawerHeader,
  Body: MutationDrawerBody,
  Footer: MutationDrawerFooter,
  Title: MutationDrawerTitle,
  Description: MutationDrawerDescription,
  Close: MutationDrawerClose,
  Cancel: MutationDrawerCancel,
};
