"use client";

import { Check, ChevronDown, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ProjectRulesHeaderControl({
  rules,
  attachedRuleIds,
  onAttachedRuleIdsChange,
  onCreateRule,
}: {
  rules: any[];
  attachedRuleIds: string[];
  onAttachedRuleIdsChange: (ids: string[]) => void;
  onCreateRule: () => void;
}) {
  const activeRules = rules.filter((rule) => rule.isActive);

  return (
    <div className="flex items-center gap-2">
      {attachedRuleIds.length > 0 && (
        <Badge variant="secondary" className="rounded-[8px] border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-400">
          {attachedRuleIds.length} Rule{attachedRuleIds.length === 1 ? "" : "s"}
        </Badge>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-9 rounded-[8px] px-3 text-xs font-semibold shadow-sm">
            Select Rules... <ChevronDown className="ml-1 size-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-[130] w-56 rounded-[8px] border border-black/5 bg-white p-1.5 shadow-lg dark:border-white/10 dark:bg-[#1f1f1f]">
          {activeRules.length === 0 ? (
            <div className="p-2.5 text-center text-xs text-muted-foreground">No active rules</div>
          ) : (
            activeRules.map((rule) => {
              const isAttached = attachedRuleIds.includes(rule.id);
              return (
                <DropdownMenuItem
                  key={rule.id}
                  onClick={() => onAttachedRuleIdsChange(
                    isAttached
                      ? attachedRuleIds.filter((id) => id !== rule.id)
                      : [...attachedRuleIds, rule.id],
                  )}
                  className="cursor-pointer rounded-[8px] px-2.5 py-2 text-xs"
                >
                  <span className="flex-1">{rule.name}</span>
                  {isAttached && <Check className="size-3.5" />}
                </DropdownMenuItem>
              );
            })
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onCreateRule} className="cursor-pointer rounded-[8px] px-2.5 py-2 text-xs font-semibold text-primary">
            <Plus className="mr-1 size-3.5" /> Create New Rule
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
