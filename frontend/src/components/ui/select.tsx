"use client";

import * as React from "react";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "./utils";

type SelectContextValue = {
  value: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  triggerRef: React.RefObject<HTMLButtonElement>;
  contentId: string;
  getItemLabel: (value: string) => string | undefined;
  registerItemLabel: (value: string, label: string) => void;
};

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectContext(componentName: string) {
  const context = React.useContext(SelectContext);
  if (!context) {
    throw new Error(`${componentName} must be used inside <Select>`);
  }
  return context;
}

function textFromChildren(children: React.ReactNode): string {
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(textFromChildren).join("").trim();
  if (React.isValidElement(children)) return textFromChildren((children.props as { children?: React.ReactNode }).children);
  return "";
}

function collectItemLabels(children: React.ReactNode): Record<string, string> {
  const labels: Record<string, string> = {};

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;

    const props = child.props as { value?: string; children?: React.ReactNode };
    if (typeof props.value === "string") {
      const label = textFromChildren(props.children);
      if (label) labels[props.value] = label;
    }

    Object.assign(labels, collectItemLabels(props.children));
  });

  return labels;
}

function Select({
  value,
  defaultValue = "",
  onValueChange,
  children,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
}) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const [open, setOpen] = React.useState(false);
  const initialItemLabels = React.useMemo(() => collectItemLabels(children), [children]);
  const [itemLabels, setItemLabels] = React.useState<Record<string, string>>({});
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const reactId = React.useId();
  const currentValue = value !== undefined ? value : internalValue;

  const handleValueChange = React.useCallback(
    (nextValue: string) => {
      if (value === undefined) setInternalValue(nextValue);
      onValueChange?.(nextValue);
      setOpen(false);
    },
    [onValueChange, value],
  );

  const registerItemLabel = React.useCallback((itemValue: string, label: string) => {
    if (!label) return;
    setItemLabels((current) => {
      if (current[itemValue] === label) return current;
      return { ...current, [itemValue]: label };
    });
  }, []);

  const contextValue = React.useMemo<SelectContextValue>(
    () => ({
      value: currentValue,
      onValueChange: handleValueChange,
      open,
      setOpen,
      triggerRef,
      contentId: `${reactId}-content`,
      getItemLabel: (itemValue: string) => itemLabels[itemValue] || initialItemLabels[itemValue],
      registerItemLabel,
    }),
    [currentValue, handleValueChange, initialItemLabels, itemLabels, open, reactId, registerItemLabel],
  );

  return (
    <SelectContext.Provider value={contextValue}>
      <div data-slot="select-root" className="relative w-full">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

function SelectGroup({ children }: { children?: React.ReactNode }) {
  return <div data-slot="select-group">{children}</div>;
}

function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value, getItemLabel } = useSelectContext("SelectValue");
  return (
    <span data-slot="select-value" className="truncate text-left">
      {value ? getItemLabel(value) || value : placeholder}
    </span>
  );
}

function SelectTrigger({
  className,
  size = "default",
  children,
  onKeyDown,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: "sm" | "default";
}) {
  const { open, setOpen, triggerRef, contentId } = useSelectContext("SelectTrigger");

  return (
    <button
      ref={triggerRef}
      type="button"
      data-slot="select-trigger"
      data-size={size}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={contentId}
      className={cn(
        "border-input data-[placeholder]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-full items-center justify-between gap-2 rounded-md border bg-input-background px-3 py-2 text-sm whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) setOpen((current) => !current);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setOpen(true);
        }
        if (event.key === "Escape") setOpen(false);
      }}
      {...props}
    >
      {children}
      <ChevronDownIcon className={cn("size-4 shrink-0 opacity-50 transition-transform", open && "rotate-180")} />
    </button>
  );
}

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  position?: "popper" | "item-aligned";
}) {
  const { open, setOpen, triggerRef, contentId } = useSelectContext("SelectContent");
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (contentRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, setOpen, triggerRef]);

  if (!open) return null;

  return (
    <div
      ref={contentRef}
      id={contentId}
      data-slot="select-content"
      role="listbox"
      className={cn(
        "absolute left-0 right-0 top-full z-50 mt-1 max-h-96 min-w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        position === "popper" && "origin-top",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function SelectLabel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="select-label" className={cn("text-muted-foreground px-2 py-1.5 text-xs", className)} {...props} />;
}

function SelectItem({
  className,
  children,
  value,
  onClick,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  value: string;
}) {
  const { value: selectedValue, onValueChange, registerItemLabel } = useSelectContext("SelectItem");
  const isSelected = selectedValue === value;
  const label = React.useMemo(() => textFromChildren(children), [children]);

  React.useEffect(() => {
    registerItemLabel(value, label);
  }, [label, registerItemLabel, value]);

  return (
    <div
      data-slot="select-item"
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      className={cn(
        "relative flex w-full cursor-pointer items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        isSelected && "bg-accent/60 text-accent-foreground",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onValueChange?.(value);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onValueChange?.(value);
        }
      }}
      {...props}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">{isSelected && <CheckIcon className="size-4" />}</span>
      {children}
    </div>
  );
}

function SelectSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="select-separator" className={cn("bg-border -mx-1 my-1 h-px", className)} {...props} />;
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
