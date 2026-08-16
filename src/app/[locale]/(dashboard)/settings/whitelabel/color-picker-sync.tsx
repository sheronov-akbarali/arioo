"use client";

export function ColorPickerSync({ defaultValue }: { defaultValue: string }) {
  return (
    <input
      type="color"
      defaultValue={defaultValue}
      className="size-9 rounded-md border border-input cursor-pointer p-0.5 bg-background"
      onChange={(e) => {
        const input = document.getElementById("primaryColorText") as HTMLInputElement;
        if (input) input.value = e.target.value;
      }}
    />
  );
}
