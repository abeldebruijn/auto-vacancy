"use client";

import type React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select as SelectRoot,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { removeAt, replaceAt, type EvidenceId } from "@/lib/candidate-profile";

export function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

export function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

export function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Textarea
        className="min-h-24"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function ListField({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {values.map((value, index) => (
        <div key={index} className="flex gap-2">
          <Input
            className="min-w-0 flex-1"
            value={value}
            onChange={(event) => replaceAt(values, index, event.target.value, onChange)}
          />
          <IconButton label="Remove" onClick={() => removeAt(values, index, onChange)}>
            <Trash2 />
          </IconButton>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={() => onChange([...values, ""])}>
        <Plus className="size-3.5" />
        Add
      </Button>
    </div>
  );
}

export function SectionList<T>({
  items,
  addLabel,
  onAdd,
  render,
}: {
  items: T[];
  addLabel: string;
  onAdd: () => void;
  render: (item: T, index: number) => React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <Card key={index} size="sm" className="shadow-none">
          <CardContent className="space-y-3">{render(item, index)}</CardContent>
        </Card>
      ))}
      <Button size="sm" variant="outline" onClick={onAdd}>
        <Plus className="size-3.5" />
        {addLabel}
      </Button>
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <Field
      label={label}
      value={value?.toString() ?? ""}
      onChange={(next) => onChange(next === "" ? null : Number(next))}
    />
  );
}

export function FormSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <SelectRoot value={value} onValueChange={(next) => onChange(next ?? "")}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option || "None"}
            </SelectItem>
          ))}
        </SelectContent>
      </SelectRoot>
    </div>
  );
}

export function Checks({ values }: { values: [string, boolean, (checked: boolean) => void][] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {values.map(([label, checked, onChange]) => (
        <Label key={label} className="flex items-center gap-2">
          <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} />
          {label}
        </Label>
      ))}
    </div>
  );
}

export function Evidence<TId extends EvidenceId>({
  label,
  selected,
  options,
  onChange,
}: {
  label: string;
  selected: TId[];
  options: { id: TId; label: string }[];
  onChange: (ids: TId[]) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Label
            key={option.id}
            className="flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-xs"
          >
            <Checkbox
              checked={selected.includes(option.id)}
              onCheckedChange={(value) =>
                onChange(
                  value === true
                    ? [...selected, option.id]
                    : selected.filter((id) => id !== option.id),
                )
              }
            />
            {option.label}
          </Label>
        ))}
      </div>
    </div>
  );
}

export function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button size="icon-sm" variant="ghost" aria-label={label} title={label} onClick={onClick}>
      {children}
    </Button>
  );
}
