"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";

import { SelectField } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  TASK_DUE_FILTER_LABELS,
  TASK_DUE_FILTERS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_SORT_FIELDS,
  TASK_SORT_LABELS,
  TASK_STATUS_LABELS,
  TASK_STATUSES,
} from "@/constants";
import { useLookups, useTaskFilters } from "@/hooks";
import { cn } from "@/lib/utils";
import type { TaskDueFilter, TaskSortField } from "@/types";

const ALL_PROJECTS = "__all__";

/**
 * Filter and sort controls for the tasks screen.
 *
 * All state lives in the URL (see `useTaskFilters`), so a filtered view survives
 * a reload and can be shared. On mobile the facets collapse into a sheet, since
 * six controls in a row is unusable at 375px, while the search box and the
 * active-filter count stay visible.
 */
export function TaskFilterBar() {
  const { filter, apply, clear, toggleInList, activeCount } = useTaskFilters();
  const { projects, tags } = useLookups();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchInput value={filter.search} onChange={(search) => apply({ search })} />

      <div className="hidden flex-wrap items-center gap-2 lg:flex">
        <Facets />
      </div>

      <Sheet>
        <SheetTrigger
          render={
            <Button variant="outline" size="sm" className="lg:hidden">
              <SlidersHorizontal data-icon="inline-start" aria-hidden />
              סינון
              {activeCount > 0 ? (
                <Badge variant="info" className="ms-1">
                  {activeCount}
                </Badge>
              ) : null}
            </Button>
          }
        />

        <SheetContent side="right" className="w-80 overflow-y-auto p-4">
          <SheetHeader className="p-0 pb-4">
            <SheetTitle>סינון ומיון</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-4">
            <Facets stacked />
          </div>
        </SheetContent>
      </Sheet>

      <div className="ms-auto flex items-center gap-2">
        <SelectField
          className="w-40"
          value={filter.sort}
          onChange={(value) => apply({ sort: value as TaskSortField })}
          options={TASK_SORT_FIELDS.map((field) => ({
            value: field,
            label: TASK_SORT_LABELS[field],
          }))}
        />

        <Button
          variant="outline"
          size="icon-sm"
          aria-label={filter.direction === "asc" ? "מיון יורד" : "מיון עולה"}
          onClick={() =>
            apply({ direction: filter.direction === "asc" ? "desc" : "asc" })
          }
        >
          <span aria-hidden className="text-xs">
            {filter.direction === "asc" ? "↑" : "↓"}
          </span>
        </Button>

        {activeCount > 0 ? (
          <Button variant="ghost" size="sm" onClick={clear}>
            <X data-icon="inline-start" aria-hidden />
            נקה
          </Button>
        ) : null}
      </div>
    </div>
  );

  function Facets({ stacked = false }: { stacked?: boolean }) {
    return (
      <>
        <ToggleGroup
          label="סטטוס"
          stacked={stacked}
          options={TASK_STATUSES.map((status) => ({
            value: status,
            label: TASK_STATUS_LABELS[status],
          }))}
          selected={filter.status}
          onToggle={(value) => toggleInList("status", value)}
        />

        <ToggleGroup
          label="עדיפות"
          stacked={stacked}
          options={TASK_PRIORITIES.map((priority) => ({
            value: priority,
            label: TASK_PRIORITY_LABELS[priority],
          }))}
          selected={filter.priority}
          onToggle={(value) => toggleInList("priority", value)}
        />

        <div className={cn(stacked && "space-y-1.5")}>
          {stacked ? (
            <p className="text-xs font-medium text-muted-foreground">פרויקט</p>
          ) : null}
          <SelectField
            className={stacked ? "w-full" : "w-44"}
            value={filter.projectId ?? ALL_PROJECTS}
            onChange={(value) =>
              apply({ projectId: value === ALL_PROJECTS ? null : value })
            }
            options={[
              { value: ALL_PROJECTS, label: "כל הפרויקטים" },
              ...projects.map((project) => ({
                value: project.id,
                label: project.name,
              })),
            ]}
          />
        </div>

        <div className={cn(stacked && "space-y-1.5")}>
          {stacked ? (
            <p className="text-xs font-medium text-muted-foreground">תאריך יעד</p>
          ) : null}
          <SelectField
            className={stacked ? "w-full" : "w-40"}
            value={filter.due}
            onChange={(value) => apply({ due: value as TaskDueFilter })}
            options={TASK_DUE_FILTERS.map((due) => ({
              value: due,
              label: TASK_DUE_FILTER_LABELS[due],
            }))}
          />
        </div>

        {tags.length > 0 ? (
          <ToggleGroup
            label="תגיות"
            stacked={stacked}
            options={tags.map((tag) => ({ value: tag.id, label: tag.name }))}
            selected={filter.tagIds}
            onToggle={(value) => toggleInList("tagIds", value)}
          />
        ) : null}
      </>
    );
  }
}

function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [lastApplied, setLastApplied] = useState(value);

  // Keep the box in step when the filter changes from elsewhere — "clear all",
  // or the back button restoring a previous URL. Adjusting state during render
  // rather than in an effect: React re-renders this component before touching
  // the DOM, so the stale value never paints, and no cascading render occurs.
  if (value !== lastApplied) {
    setLastApplied(value);
    setDraft(value);
  }

  // Debounced: writing to the URL on every keystroke would push a history entry
  // per character and make the back button useless.
  useEffect(() => {
    if (draft === value) return;

    const timer = setTimeout(() => onChange(draft), 300);
    return () => clearTimeout(timer);
  }, [draft, onChange, value]);

  return (
    <div className="relative w-full sm:w-64">
      <Search
        className="pointer-events-none absolute inset-y-0 start-2.5 my-auto size-4 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="חיפוש משימות…"
        aria-label="חיפוש משימות"
        className="ps-8"
      />
    </div>
  );
}

interface ToggleGroupProps {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  stacked?: boolean;
}

function ToggleGroup({
  label,
  options,
  selected,
  onToggle,
  stacked,
}: ToggleGroupProps) {
  return (
    <div className={cn(stacked ? "space-y-1.5" : "flex items-center gap-1")}>
      {stacked ? (
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      ) : null}

      <div className="flex flex-wrap gap-1" role="group" aria-label={label}>
        {options.map((option) => {
          const isSelected = selected.includes(option.value);

          return (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={isSelected ? "secondary" : "ghost"}
              aria-pressed={isSelected}
              onClick={() => onToggle(option.value)}
              className={cn(isSelected && "ring-1 ring-primary/30")}
            >
              {option.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
