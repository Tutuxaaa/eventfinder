"use client";

import * as React from "react";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "./utils";

const SelectContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
}>({});

function Select({
  value,
  onValueChange,
  children,
  ...props
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
  defaultValue?: string;
}) {
  const [internalValue, setInternalValue] = React.useState(props.defaultValue || "");
  const currentValue = value !== undefined ? value : internalValue;

  const handleValueChange = (newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <SelectContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
      {children}
    </SelectContext.Provider>
  );
}

function SelectGroup({ children }: { children?: React.ReactNode }) {
  return <div data-slot="select-group">{children}</div>;
}

function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value } = React.useContext(SelectContext);
  return <span data-slot="select-value">{value || placeholder}</span>;
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.HTMLAttributes<HTMLButtonElement> & {
  size?: "sm" | "default";
}) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        data-slot="select-trigger"
        data-size={size}
        className={cn(
          "border-input data-[placeholder]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-full items-center justify-between gap-2 rounded-md border bg-input-background px-3 py-2 text-sm whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8",
          className,
        )}
        onClick={() => setOpen(!open)}
        {...props}
      >
        {children}
        <ChevronDownIcon className="size-4 opacity-50" />
      </button>
      {open && (
        <SelectContentPortal onClose={() => setOpen(false)} triggerRef={triggerRef} />
      )}
    </div>
  );
}

const SelectContentContext = React.createContext<{
  onClose: () => void;
}>({ onClose: () => {} });

function SelectContentPortal({
  onClose,
  triggerRef,
}: {
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
}) {
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, triggerRef]);

  return (
    <SelectContentContext.Provider value={{ onClose }}>
      <div
        ref={contentRef}
        data-slot="select-content"
        className="bg-popover text-popover-foreground animate-in fade-in-0 zoom-in-95 absolute z-50 mt-1 max-h-96 min-w-[8rem] overflow-auto rounded-md border shadow-md p-1"
      >
        <SelectContentSlot />
      </div>
    </SelectContentContext.Provider>
  );
}

const SelectContentSlotContext = React.createContext<React.ReactNode>(null);

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  position?: "popper" | "item-aligned";
}) {
  return <SelectContentSlotContext.Provider value={children}>{null}</SelectContentSlotContext.Provider>;
}

// Component to render content
function SelectContentSlot() {
  const content = React.useContext(SelectContentSlotContext);
  return <>{content}</>;
}

function SelectLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="select-label"
      className={cn("text-muted-foreground px-2 py-1.5 text-xs", className)}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  value,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  value: string;
}) {
  const { value: selectedValue, onValueChange } = React.useContext(SelectContext);
  const { onClose } = React.useContext(SelectContentContext);
  const isSelected = selectedValue === value;

  return (
    <div
      data-slot="select-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-pointer items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground",
        className,
      )}
      onClick={() => {
        onValueChange?.(value);
        onClose();
      }}
      {...props}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        {isSelected && <CheckIcon className="size-4" />}
      </span>
      {children}
    </div>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="select-separator"
      className={cn("bg-border -mx-1 my-1 h-px", className)}
      {...props}
    />
  );
}

function SelectScrollUpButton(props: React.HTMLAttributes<HTMLDivElement>) {
  return null;
}

function SelectScrollDownButton(props: React.HTMLAttributes<HTMLDivElement>) {
  return null;
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
