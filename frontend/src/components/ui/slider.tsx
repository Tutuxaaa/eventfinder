"use client";

import * as React from "react";
import { cn } from "./utils";

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  disabled,
  ...props
}: {
  className?: string;
  defaultValue?: number[];
  value?: number[];
  min?: number;
  max?: number;
  step?: number;
  onValueChange?: (value: number[]) => void;
  disabled?: boolean;
}) {
  const [internalValue, setInternalValue] = React.useState<number[]>(
    defaultValue || value || [min, max]
  );
  const currentValue = value !== undefined ? value : internalValue;

  const handleChange = (index: number, newValue: number) => {
    const newValues = [...currentValue];
    newValues[index] = newValue;
    
    if (value === undefined) {
      setInternalValue(newValues);
    }
    onValueChange?.(newValues);
  };

  const getPercentage = (val: number) => {
    return ((val - min) / (max - min)) * 100;
  };

  return (
    <div
      data-slot="slider"
      className={cn(
        "relative flex w-full touch-none items-center select-none",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
      {...props}
    >
      <div
        data-slot="slider-track"
        className="bg-muted relative h-4 w-full grow overflow-hidden rounded-full"
      >
        <div
          data-slot="slider-range"
          className="bg-primary absolute h-full"
          style={{
            left: currentValue.length > 1 ? `${getPercentage(currentValue[0])}%` : '0%',
            right: currentValue.length > 1 ? `${100 - getPercentage(currentValue[1])}%` : `${100 - getPercentage(currentValue[0])}%`,
          }}
        />
      </div>
      {currentValue.map((val, index) => (
        <input
          key={index}
          type="range"
          min={min}
          max={max}
          step={step}
          value={val}
          disabled={disabled}
          onChange={(e) => handleChange(index, Number(e.target.value))}
          className="absolute w-full opacity-0 cursor-pointer"
          style={{
            pointerEvents: disabled ? 'none' : 'auto'
          }}
        />
      ))}
      {currentValue.map((val, index) => (
        <div
          key={index}
          data-slot="slider-thumb"
          className="border-primary bg-background ring-ring/50 absolute block size-4 shrink-0 rounded-full border shadow-sm transition-[color,box-shadow] pointer-events-none"
          style={{
            left: `calc(${getPercentage(val)}% - 8px)`,
          }}
        />
      ))}
    </div>
  );
}

export { Slider };
